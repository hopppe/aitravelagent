import { NextResponse } from 'next/server';
import { generateJobId, processItineraryJob } from '../job-processor';
import { createJob, updateJobStatus, supabase } from '../../../lib/supabase';

// Configure runtime for serverless function
export const runtime = 'nodejs';
export const maxDuration = 60; // Set max duration to 60 seconds

// Use API key from environment variables
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

// Check if running in production environment
const isProduction = process.env.NODE_ENV === 'production';

// Check if Supabase is properly configured
const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

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
    // Log environment variables (without exposing actual values)
    console.log('Supabase connection check:', {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      urlLength: process.env.NEXT_PUBLIC_SUPABASE_URL?.length || 0,
      keyLength: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0
    });

    // Only test Supabase connection if properly configured
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.from('jobs').select('count').limit(1);
        if (error) {
          console.error('Supabase connection test failed:', {
            message: error.message,
            hint: error.hint || '',
            code: error.code || ''
          });
          // Continue execution despite connection error
          // The job will be stored in memory
        } else {
          console.log('Supabase connection test successful:', data);
        }
      } catch (connError: any) {
        console.error('Supabase connection test exception:', {
          message: connError.message,
          details: connError.toString(),
          hint: '',
          code: ''
        });
        // Continue execution despite connection error
        // The job will be stored in memory
      }
    } else {
      console.log('Skipping Supabase connection test - not configured');
    }

    // Parse the request body
    const surveyData: SurveyData = await request.json();

    // Create a unique job ID
    const jobId = generateJobId();

    // If we're in development or testing, return mock data immediately
    if (process.env.NODE_ENV === 'development' && !OPENAI_API_KEY.startsWith('sk-')) {
      console.log('Development mode: Returning mock data');
      const mockItinerary = createMockItinerary(surveyData);
      const updateResult = await updateJobStatus(jobId, 'completed', { 
        result: { 
          itinerary: mockItinerary, 
          prompt: generatePrompt(surveyData) 
        }
      });
      
      if (!updateResult) {
        console.error('Failed to update job status in development mode');
        return NextResponse.json(
          { error: 'Failed to update job status' },
          { status: 500 }
        );
      }
      
      return NextResponse.json({ jobId, status: 'completed' });
    }

    // Create a new job
    console.log('Creating new job with ID:', jobId);
    const jobCreated = await createJob(jobId);
    
    if (!jobCreated) {
      console.error('Failed to create job');
      return NextResponse.json(
        { error: 'Failed to create job in database' },
        { status: 500 }
      );
    }

    // Start processing in the background without awaiting
    console.log(`Starting background processing for job ${jobId}...`);
    setTimeout(async () => {
      try {
        console.log(`Background processing started for job ${jobId}`);
        // First update to processing status to indicate we've started
        await updateJobStatus(jobId, 'processing');
        
        // Process the job
        await processItineraryJob(jobId, surveyData, generatePrompt, OPENAI_API_KEY);
        
        console.log(`Background processing completed successfully for job ${jobId}`);
      } catch (error: any) {
        console.error(`Background processing error for job ${jobId}:`, error);
        // Make extra sure we update the job status on error
        try {
          await updateJobStatus(jobId, 'failed', { 
            error: error.message || 'Internal server error'
          });
        } catch (updateError) {
          console.error(`Failed to update job status after error for ${jobId}:`, updateError);
        }
      }
    }, 100); // Small delay to ensure job is created first

    // Return immediately with the job ID
    return NextResponse.json({ 
      jobId, 
      status: 'queued',
      message: 'Your itinerary is being generated. Poll the job-status endpoint for updates.'
    });
    
  } catch (error: any) {
    console.error('Error initiating itinerary generation:', error);
    return NextResponse.json(
      { error: `Failed to initiate itinerary generation: ${error.message || 'Unknown error'}` },
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