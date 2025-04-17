import { NextResponse } from 'next/server';

// Use API key from environment variables
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

// Survey data type
type SurveyData = {
  destination: string;
  startDate: string;
  endDate: string;
  purpose: string;
  budget: string;
  preferences: string[];
};

export async function POST(request: Request) {
  try {
    // Parse the request body
    const surveyData: SurveyData = await request.json();

    // Create the prompt for GPT
    const prompt = generatePrompt(surveyData);

    // If we're in development or testing, return the prompt without calling the API
    if (process.env.NODE_ENV === 'development' && !OPENAI_API_KEY.startsWith('sk-')) {
      console.log('Development mode: Returning mock data');
      return NextResponse.json({
        itinerary: createMockItinerary(surveyData),
        prompt
      });
    }

    // Call OpenAI API with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000); // 25 second timeout
    
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are an expert travel planner. Generate a detailed travel itinerary based on the user\'s preferences. Return your response in a structured JSON format only, with no additional text, explanation, or markdown formatting. Do not wrap the JSON in code blocks. Ensure all property names use double quotes. IMPORTANT: Every activity MUST include a valid "coordinates" object with "lat" and "lng" numerical values - never omit coordinates or use empty objects. Return a valid JSON object that can be parsed with JSON.parse().'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 2000, // Reduced from 3000 to help with timeouts
        }),
        signal: controller.signal,
      });
      
      clearTimeout(timeout);
      
      if (!response.ok) {
        const error = await response.json();
        console.error('OpenAI API error:', error);
        return NextResponse.json(
          { error: `Failed to generate itinerary: ${error.error?.message || 'Unknown error'}` },
          { status: response.status }
        );
      }

      const data = await response.json();
      const itineraryContent = data.choices[0].message.content;
      
      // Debug: Log the complete content from the API
      console.log('Raw content from API:', itineraryContent);
      
      // Parse the JSON response with a simpler approach
      let itinerary;
      try {
        // Simple direct parsing first
        try {
          itinerary = JSON.parse(itineraryContent);
        } catch (initialError) {
          console.log('Initial parsing failed, trying to clean up JSON');
          
          // Try to find valid JSON within the response
          const firstBrace = itineraryContent.indexOf('{');
          const lastBrace = itineraryContent.lastIndexOf('}');
          
          if (firstBrace === -1 || lastBrace === -1 || firstBrace >= lastBrace) {
            throw new Error('Invalid JSON structure - missing braces');
          }
          
          // Extract just the JSON part
          const jsonContent = itineraryContent.substring(firstBrace, lastBrace + 1);
          
          // Try parsing again, if still fails, try more aggressive cleaning
          try {
            itinerary = JSON.parse(jsonContent);
          } catch (parseError: any) {
            console.error('Error parsing extracted JSON:', parseError.message);
            
            // For debugging - log a smaller portion around the error
            if (parseError instanceof SyntaxError && parseError.message.includes('position')) {
              const posMatch = parseError.message.match(/position (\d+)/);
              if (posMatch && posMatch[1]) {
                const errorPos = parseInt(posMatch[1]);
                const contextStart = Math.max(0, errorPos - 50);
                const contextEnd = Math.min(jsonContent.length, errorPos + 50);
                console.error(`JSON context around error: '${jsonContent.substring(contextStart, errorPos)}|ERROR HERE|${jsonContent.substring(errorPos, contextEnd)}'`);
              }
            }
            
            // Try to repair the JSON manually
            let fixedJSON = jsonContent;
            
            // Fix missing quotes around property names (more comprehensive)
            fixedJSON = fixedJSON.replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3');
            
            // Fix missing quotes around string values
            fixedJSON = fixedJSON.replace(/:\s*([a-zA-Z][a-zA-Z0-9_]*)\s*([,}])/g, ': "$1"$2');
            
            // Fix missing comma after activities array item
            fixedJSON = fixedJSON.replace(/}\s*{/g, '}, {');
            
            // Fix missing coordinates or empty coordinates objects
            fixedJSON = fixedJSON.replace(/"coordinates"\s*:\s*{}\s*([,}])/g, '"coordinates": {"lat": 0, "lng": 0}$1');
            fixedJSON = fixedJSON.replace(/"coordinates"\s*:\s*"([^"]*)"\s*([,}])/g, '"coordinates": {"lat": 0, "lng": 0}$2');
            
            // Fix malformed coordinates that might be causing position 779 line 27 error
            fixedJSON = fixedJSON.replace(/"coordinates"\s*:\s*([^{][\s\S]*?[,}])/g, (match: string, p1: string) => {
              if (p1.trim().startsWith('{')) return match; // Already properly formatted
              return '"coordinates": {"lat": 0, "lng": 0}' + (p1.endsWith(',') ? ',' : p1.endsWith('}') ? '}' : p1);
            });
            
            // Fix activities without coordinates by adding a default
            const checkAndAddCoordinates = (obj: any) => {
              if (obj && typeof obj === 'object') {
                if (obj.activities && Array.isArray(obj.activities)) {
                  for (let i = 0; i < obj.activities.length; i++) {
                    const activity = obj.activities[i];
                    if (activity && !activity.coordinates) {
                      activity.coordinates = { lat: 0, lng: 0 };
                    }
                  }
                }
                
                // Process all nested objects
                for (const key in obj) {
                  if (obj[key] && typeof obj[key] === 'object') {
                    checkAndAddCoordinates(obj[key]);
                  }
                }
              }
            };

            try {
              itinerary = JSON.parse(fixedJSON);
              console.log('Successfully parsed JSON after manual repairs');
              
              // Add default coordinates for any activities missing them
              checkAndAddCoordinates(itinerary);
            } catch (finalError) {
              console.error('Even after repairs, parsing failed:', finalError);
              throw new Error('Unable to parse the generated itinerary data');
            }
          }
        }
        
        // Log the structure of the parsed itinerary
        console.log('Parsed itinerary top-level structure:', Object.keys(itinerary).join(', '));
        
        // Make sure dates exist and are correctly formatted
        if (!itinerary.dates) {
          itinerary.dates = {
            start: surveyData.startDate,
            end: surveyData.endDate
          };
        }
        
        // Ensure days array exists
        if (!itinerary.days) {
          console.error('Days array missing from parsed itinerary, creating it');
          itinerary.days = [];
        } else if (!Array.isArray(itinerary.days)) {
          console.error('Days property exists but is not an array, fixing:', typeof itinerary.days);
          itinerary.days = [];
        }

        // Ensure all days have properly formed activities with coordinates
        for (let i = 0; i < itinerary.days.length; i++) {
          const day = itinerary.days[i];
          
          if (!day.activities) {
            day.activities = [];
            continue;
          }
          
          for (let j = 0; j < day.activities.length; j++) {
            const activity = day.activities[j];
            
            // Skip if not an object
            if (!activity || typeof activity !== 'object') {
              day.activities[j] = {
                id: `auto-${i}-${j}`,
                time: 'Morning',
                title: 'Placeholder Activity',
                description: 'Auto-generated activity.',
                location: itinerary.destination || surveyData.destination,
                coordinates: { lat: 40.7128, lng: -74.0060 }, // Default coordinates
                cost: 0
              };
              continue;
            }
            
            // Ensure ID exists
            if (!activity.id) {
              activity.id = `auto-${i}-${j}`;
            }
            
            // Ensure coordinates exist and are properly formatted
            if (!activity.coordinates) {
              activity.coordinates = { lat: 40.7128, lng: -74.0060 }; // Default coordinates
            } else if (typeof activity.coordinates !== 'object') {
              activity.coordinates = { lat: 40.7128, lng: -74.0060 }; // Default coordinates
            } else {
              // Make sure lat and lng are numbers, not strings or undefined
              if (activity.coordinates.lat === undefined || activity.coordinates.lat === null) {
                activity.coordinates.lat = 40.7128; // Default latitude
              } else if (typeof activity.coordinates.lat === 'string') {
                activity.coordinates.lat = parseFloat(activity.coordinates.lat) || 40.7128;
              }
              
              if (activity.coordinates.lng === undefined || activity.coordinates.lng === null) {
                activity.coordinates.lng = -74.0060; // Default longitude
              } else if (typeof activity.coordinates.lng === 'string') {
                activity.coordinates.lng = parseFloat(activity.coordinates.lng) || -74.0060;
              }
            }
            
            // Ensure cost is a number
            if (activity.cost === undefined || activity.cost === null) {
              activity.cost = 0;
            } else if (typeof activity.cost === 'string') {
              activity.cost = parseFloat(activity.cost) || 0;
            }
          }
        }
        
        // Calculate expected number of days based on the date range
        const startDate = new Date(surveyData.startDate);
        const endDate = new Date(surveyData.endDate);
        
        // Set time to noon to avoid timezone issues
        startDate.setHours(12, 0, 0, 0);
        endDate.setHours(12, 0, 0, 0);
        
        const diffTime = endDate.getTime() - startDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const expectedDays = diffDays + 1; // Add 1 to include both start and end date
        
        console.log(`Expected days: ${expectedDays}, Actual days in itinerary: ${itinerary.days.length}`);
        
        // Fix the days array if needed
        if (itinerary.days.length !== expectedDays) {
          console.warn(`Days count mismatch. Expected ${expectedDays} days but got ${itinerary.days.length} days. Fixing...`);
          
          // Create a new array with the correct number of days
          const correctedDays = [];
          
          for (let i = 0; i < expectedDays; i++) {
            const currentDate = new Date(startDate);
            currentDate.setDate(startDate.getDate() + i);
            const formattedDate = currentDate.toISOString().split('T')[0];
            
            // Check if we have a day for this date in the original array
            const existingDay = itinerary.days.find((day: any) => 
              day.date === formattedDate || 
              new Date(day.date).toISOString().split('T')[0] === formattedDate
            );
            
            if (existingDay) {
              // Make sure the date is in the correct format
              existingDay.date = formattedDate;
              correctedDays.push(existingDay);
            } else {
              // Create a new day if missing
              correctedDays.push({
                date: formattedDate,
                activities: [
                  {
                    id: `act-${i}-1`,
                    time: 'Morning',
                    title: `Explore ${itinerary.destination || surveyData.destination} - Day ${i + 1} Morning`,
                    description: 'Start your day with a visit to a popular local attraction.',
                    location: `${itinerary.destination || surveyData.destination} City Center`,
                    coordinates: { lat: 40.7128, lng: -74.0060 }, // NYC coordinates as placeholder
                    cost: 25,
                  },
                  {
                    id: `act-${i}-2`,
                    time: 'Afternoon',
                    title: `${itinerary.destination || surveyData.destination} Afternoon Activity`,
                    description: 'Enjoy a relaxing afternoon activity based on your preferences.',
                    location: `${itinerary.destination || surveyData.destination} Park`,
                    coordinates: { lat: 40.7828, lng: -73.9654 }, // Central Park coordinates as placeholder
                    cost: 15,
                  },
                  {
                    id: `act-${i}-3`,
                    time: 'Evening',
                    title: `${itinerary.destination || surveyData.destination} Night Experience`,
                    description: 'Experience the local nightlife and culture.',
                    location: `${itinerary.destination || surveyData.destination} Entertainment District`,
                    coordinates: { lat: 40.7590, lng: -73.9845 }, // Times Square coordinates as placeholder
                    cost: 50,
                  },
                ]
              });
            }
          }
          
          // Replace the original days array with our corrected one
          itinerary.days = correctedDays;
        }
        
        // Log the final structure before returning
        console.log('Final itinerary days count:', itinerary.days.length);
        
      } catch (error) {
        console.error('Failed to parse itinerary JSON:', error);
        
        // Return a simple error that doesn't expose internal details
        return NextResponse.json(
          { error: 'We were unable to generate a valid itinerary. Please try again.' },
          { status: 500 }
        );
      }

      return NextResponse.json({ itinerary, prompt });
    } catch (error: any) {
      clearTimeout(timeout);
      console.error('Fetch error:', error);
      
      if (error.name === 'AbortError') {
        return NextResponse.json(
          { error: 'Request timed out. Please try again with a simpler itinerary request.' },
          { status: 504 }
        );
      }
      
      return NextResponse.json(
        { error: `API request failed: ${error.message}` },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error generating itinerary:', error);
    return NextResponse.json(
      { error: 'Failed to generate itinerary' },
      { status: 500 }
    );
  }
}

// Function to generate a prompt based on survey data
function generatePrompt(surveyData: SurveyData): string {
  // Calculate trip duration - adding 1 to include both start and end date
  const startDate = new Date(surveyData.startDate);
  const endDate = new Date(surveyData.endDate);
  
  // Set time to noon to avoid timezone issues
  startDate.setHours(12, 0, 0, 0);
  endDate.setHours(12, 0, 0, 0);
  
  // Calculate days including both start and end date
  // Using Math.floor instead of Math.round and adding 1 to include both start and end date
  const diffTime = endDate.getTime() - startDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const durationDays = diffDays + 1; // Add 1 to include both start and end date
  
  console.log('Date calculation:', {
    startDate: surveyData.startDate,
    endDate: surveyData.endDate,
    startTimestamp: startDate.getTime(),
    endTimestamp: endDate.getTime(),
    diffTime,
    diffDays,
    durationDays
  });

  // Format preferences
  const preferencesText = surveyData.preferences.length > 0
    ? `They particularly enjoy ${surveyData.preferences.join(', ')}.`
    : '';

  // Format budget level
  let budgetLevel = '';
  switch (surveyData.budget) {
    case 'budget':
      budgetLevel = 'budget-friendly options, looking for economical accommodations, affordable dining, and free or low-cost activities';
      break;
    case 'moderate':
      budgetLevel = 'mid-range options, with comfortable accommodations, good quality restaurants, and a mix of paid and free activities';
      break;
    case 'luxury':
      budgetLevel = 'high-end options, with luxury accommodations, fine dining, and premium experiences';
      break;
    default:
      budgetLevel = 'a mix of affordable and premium options';
  }

  // Format trip purpose
  let purposeText = '';
  switch (surveyData.purpose) {
    case 'vacation':
      purposeText = 'a relaxing vacation';
      break;
    case 'honeymoon':
      purposeText = 'their honeymoon, so include romantic activities and settings';
      break;
    case 'family':
      purposeText = 'a family trip, so include family-friendly activities';
      break;
    case 'solo':
      purposeText = 'a solo adventure, with opportunities for both exploration and meeting people';
      break;
    case 'business':
      purposeText = 'a business trip with some leisure time';
      break;
    case 'weekend':
      purposeText = 'a quick weekend getaway';
      break;
    case 'roadtrip':
      purposeText = 'a road trip, including notable stops and routes';
      break;
    default:
      purposeText = 'a vacation';
  }

  // Construct the prompt
  const prompt = `
Create a detailed ${durationDays}-day travel itinerary for a trip to ${surveyData.destination} from ${formatDate(startDate)} to ${formatDate(endDate)}.

This trip is for ${purposeText}. ${preferencesText} The traveler is looking for ${budgetLevel}.

IMPORTANT: You MUST create exactly ${durationDays} days in the itinerary, with dates from ${surveyData.startDate} to ${surveyData.endDate} inclusive.

For each day, provide:
1. Morning activity or attraction with: name, description, location, approximate cost
2. Lunch recommendation with: restaurant name, cuisine type, price range
3. Afternoon activity or attraction with: name, description, location, approximate cost
4. Dinner recommendation with: restaurant name, cuisine type, price range
5. Evening activity (if applicable) with: name, description, location, approximate cost

Also include:
- Recommended accommodation options with estimated nightly rates
- Transportation suggestions within the destination
- Total estimated budget breakdown for accommodation, food, activities, and transport

Return this as a JSON object exactly as shown below. Do not include any markdown formatting, code blocks, or additional text. Use ONLY double quotes for all property names and string values - never use single quotes.

{
  "title": "Trip title",
  "destination": "Destination name",
  "dates": {
    "start": "YYYY-MM-DD",
    "end": "YYYY-MM-DD"
  },
  "days": [
    {
      "date": "YYYY-MM-DD",
      "activities": [
        {
          "id": "unique-id",
          "time": "Morning/Afternoon/Evening",
          "title": "Activity name",
          "description": "Detailed description",
          "location": "Address or area",
          "coordinates": { "lat": 41.3851, "lng": 2.1734 },
          "cost": 0
        }
      ]
    }
  ],
  "accommodation": [
    {
      "name": "Accommodation name",
      "description": "Description",
      "location": "Address",
      "pricePerNight": 0
    }
  ],
  "transportation": [
    {
      "type": "Type of transport",
      "description": "Description",
      "estimatedCost": 0
    }
  ],
  "budget": {
    "accommodation": 0,
    "food": 0,
    "activities": 0,
    "transport": 0,
    "total": 0
  }
}

Ensure all costs are in USD and are realistic estimates. For coordinates, use approximate latitude and longitude for each location. Remember to provide a properly formatted JSON response with all property names in double quotes.
`;

  return prompt;
}

// Helper function to format dates
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
}

// Create mock itinerary data for development
function createMockItinerary(surveyData: SurveyData): any {
  const startDate = new Date(surveyData.startDate);
  const endDate = new Date(surveyData.endDate);
  
  // Set time to noon to avoid timezone issues
  startDate.setHours(12, 0, 0, 0);
  endDate.setHours(12, 0, 0, 0);
  
  // Calculate days including both start and end date
  // Using Math.floor instead of Math.round and adding 1 to include both start and end date
  const diffTime = endDate.getTime() - startDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const durationDays = diffDays + 1; // Add 1 to include both start and end date
  
  console.log('Mock Date calculation:', {
    startDate: surveyData.startDate,
    endDate: surveyData.endDate,
    diffTime,
    diffDays,
    durationDays
  });
  
  const days = [];
  
  // Generate mock days
  for (let i = 0; i < durationDays; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + i);
    
    days.push({
      date: currentDate.toISOString().split('T')[0],
      activities: [
        {
          id: `act-${i}-1`,
          time: 'Morning',
          title: `Explore ${surveyData.destination} - Day ${i + 1} Morning`,
          description: 'Start your day with a visit to a popular local attraction.',
          location: `${surveyData.destination} City Center`,
          coordinates: { lat: 40.7128, lng: -74.0060 }, // NYC coordinates as placeholder
          cost: 25,
        },
        {
          id: `act-${i}-2`,
          time: 'Afternoon',
          title: `${surveyData.destination} Afternoon Activity`,
          description: 'Enjoy a relaxing afternoon activity based on your preferences.',
          location: `${surveyData.destination} Park`,
          coordinates: { lat: 40.7828, lng: -73.9654 }, // Central Park coordinates as placeholder
          cost: 15,
        },
        {
          id: `act-${i}-3`,
          time: 'Evening',
          title: `${surveyData.destination} Night Experience`,
          description: 'Experience the local nightlife and culture.',
          location: `${surveyData.destination} Entertainment District`,
          coordinates: { lat: 40.7590, lng: -73.9845 }, // Times Square coordinates as placeholder
          cost: 50,
        },
      ]
    });
  }
  
  // Create mock budget based on preferences
  let accommodationCost = 0;
  switch (surveyData.budget) {
    case 'budget':
      accommodationCost = 75;
      break;
    case 'moderate':
      accommodationCost = 150;
      break;
    case 'luxury':
      accommodationCost = 300;
      break;
    default:
      accommodationCost = 150;
  }
  
  const totalAccommodation = accommodationCost * durationDays;
  const totalFood = 60 * durationDays;
  const totalActivities = 90 * durationDays;
  const totalTransport = 30 * durationDays;
  
  return {
    title: `${surveyData.destination} ${surveyData.purpose.charAt(0).toUpperCase() + surveyData.purpose.slice(1)} Trip`,
    destination: surveyData.destination,
    dates: {
      start: surveyData.startDate,
      end: surveyData.endDate,
    },
    days,
    accommodation: [
      {
        name: `${surveyData.destination} Hotel`,
        description: 'A comfortable hotel in a convenient location.',
        location: `Central ${surveyData.destination}`,
        pricePerNight: accommodationCost
      },
      {
        name: `${surveyData.destination} Boutique Stay`,
        description: 'A charming boutique accommodation with local character.',
        location: `Historic District, ${surveyData.destination}`,
        pricePerNight: accommodationCost * 1.2
      }
    ],
    transportation: [
      {
        type: 'Public Transit',
        description: 'Convenient and affordable public transportation network.',
        estimatedCost: totalTransport * 0.5
      },
      {
        type: 'Taxi/Rideshare',
        description: 'On-demand rides for convenience.',
        estimatedCost: totalTransport * 0.5
      }
    ],
    budget: {
      accommodation: totalAccommodation,
      food: totalFood,
      activities: totalActivities,
      transport: totalTransport,
      total: totalAccommodation + totalFood + totalActivities + totalTransport
    }
  };
} 