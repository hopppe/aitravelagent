import { logger } from './logger';

type DayType = {
  date?: string;
  activities?: Array<{
    id?: string;
    time?: string;
    title?: string;
    description?: string;
    location?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
    cost?: number;
    image?: string;
  }>;
};

type ProcessedItinerary = {
  id?: string;
  title?: string;
  destination?: string;
  dates?: {
    start?: string;
    end?: string;
  };
  days?: DayType[];
  budget?: {
    accommodation?: number;
    food?: number;
    activities?: number;
    transport?: number;
    total?: number;
  };
  error?: string;
};

/**
 * Processes the raw response from OpenAI into a structured itinerary object
 * with validation and normalization of data
 */
export function processRawResponse(rawResponse: string): ProcessedItinerary {
  logger.info('Processing raw OpenAI response', { 
    responseLength: rawResponse?.length || 0,
    hasResponse: !!rawResponse
  });
  
  if (!rawResponse) {
    logger.error('Received empty response from OpenAI');
    throw new Error('Received empty response from OpenAI');
  }
  
  // Try to parse the JSON response
  let parsedItinerary: any;
  try {
    // Clean up any potential markdown formatting
    const cleanedResponse = cleanResponse(rawResponse);
    parsedItinerary = JSON.parse(cleanedResponse);
    logger.info('Successfully parsed OpenAI response as JSON');
  } catch (error: any) {
    logger.error('Failed to parse OpenAI response as JSON:', error);
    logger.debug('Raw response:', rawResponse.substring(0, 200) + '...');
    throw new Error(`Failed to parse OpenAI response: ${error.message}`);
  }
  
  // Process and validate the itinerary
  const processedItinerary = validateAndNormalizeItinerary(parsedItinerary);
  logger.info('Successfully processed and normalized itinerary data');
  
  return processedItinerary;
}

/**
 * Cleans the response string to handle potential formatting issues
 */
function cleanResponse(response: string): string {
  // Remove any potential markdown code block indicators
  let cleaned = response.trim();
  
  // Check if the response is wrapped in code blocks
  if (cleaned.startsWith('```') && cleaned.endsWith('```')) {
    // Remove the first line that might contain "```json"
    cleaned = cleaned.substring(cleaned.indexOf('\n') + 1);
    // Remove the closing code block
    cleaned = cleaned.substring(0, cleaned.lastIndexOf('```'));
    cleaned = cleaned.trim();
  }
  
  // Handle potential JSON with newlines
  return cleaned;
}

/**
 * Validates and normalizes an itinerary object
 */
function validateAndNormalizeItinerary(itinerary: any): ProcessedItinerary {
  if (!itinerary || typeof itinerary !== 'object') {
    logger.error('Itinerary is not an object', { itinerary });
    throw new Error('Invalid itinerary format: not an object');
  }
  
  // Ensure the itinerary has the expected structure
  const validatedItinerary: ProcessedItinerary = {
    id: itinerary.id || `trip-${Date.now()}`,
    title: itinerary.title || `Trip to ${itinerary.destination || 'Destination'}`,
    destination: itinerary.destination || 'Unknown Destination',
    dates: {
      start: itinerary.dates?.start || new Date().toISOString().split('T')[0],
      end: itinerary.dates?.end
    },
    days: [],
    budget: {
      accommodation: 0,
      food: 0,
      activities: 0,
      transport: 0,
      total: 0
    }
  };
  
  // Process days and activities
  if (Array.isArray(itinerary.days)) {
    for (let i = 0; i < itinerary.days.length; i++) {
      const day = itinerary.days[i];
      if (!day || typeof day !== 'object') continue;
      
      const processedDay: DayType = {
        date: day.date || null,
        activities: []
      };
      
      // Process activities for this day
      if (Array.isArray(day.activities)) {
        for (let j = 0; j < day.activities.length; j++) {
          const activity = day.activities[j];
          if (!activity || typeof activity !== 'object') continue;
          
          // Ensure coordinates are valid
          let coordinates = { lat: 0, lng: 0 };
          if (activity.coordinates && typeof activity.coordinates === 'object') {
            coordinates = {
              lat: parseFloat(String(activity.coordinates.lat)) || 0,
              lng: parseFloat(String(activity.coordinates.lng)) || 0
            };
          }
          
          // Parse cost as number if it's not already
          let cost = 0;
          if (activity.cost !== undefined) {
            cost = typeof activity.cost === 'number' ? 
              activity.cost : 
              parseFloat(String(activity.cost)) || 0;
          }
          
          // Add processed activity to the day
          processedDay.activities!.push({
            id: activity.id || `act-${i}-${j}`,
            time: activity.time || '',
            title: activity.title || `Activity ${j+1}`,
            description: activity.description || '',
            location: activity.location || '',
            coordinates,
            cost,
            image: activity.image || ''
          });
        }
      }
      
      validatedItinerary.days!.push(processedDay);
    }
  }
  
  // Process budget
  if (itinerary.budget && typeof itinerary.budget === 'object') {
    const budget = itinerary.budget;
    
    // Get budget values and convert to numbers if needed
    const accommodation = typeof budget.accommodation === 'number' ? 
      budget.accommodation : 
      parseFloat(String(budget.accommodation)) || 0;
      
    const food = typeof budget.food === 'number' ? 
      budget.food : 
      parseFloat(String(budget.food)) || 0;
      
    const activities = typeof budget.activities === 'number' ? 
      budget.activities : 
      parseFloat(String(budget.activities)) || 0;
      
    const transport = typeof budget.transport === 'number' ? 
      budget.transport : 
      parseFloat(String(budget.transport)) || 0;
    
    // Calculate total from components if not provided
    let total = typeof budget.total === 'number' ? 
      budget.total : 
      parseFloat(String(budget.total)) || 0;
      
    // If total is 0 or NaN, calculate from components
    if (!total || isNaN(total)) {
      total = accommodation + food + activities + transport;
    }
    
    validatedItinerary.budget = {
      accommodation,
      food,
      activities,
      transport,
      total
    };
  } else {
    // If no budget provided, calculate from activities
    let totalActivityCost = 0;
    
    // Sum up all activity costs
    if (validatedItinerary.days) {
      for (const day of validatedItinerary.days) {
        if (day.activities) {
          for (const activity of day.activities) {
            if (typeof activity.cost === 'number') {
              totalActivityCost += activity.cost;
            }
          }
        }
      }
    }
    
    // Set a default budget based on activity costs
    validatedItinerary.budget = {
      accommodation: Math.round(totalActivityCost * 0.4), // 40% of total for accommodation
      food: Math.round(totalActivityCost * 0.3), // 30% for food
      activities: totalActivityCost,
      transport: Math.round(totalActivityCost * 0.2), // 20% for transport
      total: totalActivityCost + 
        Math.round(totalActivityCost * 0.4) + 
        Math.round(totalActivityCost * 0.3) + 
        Math.round(totalActivityCost * 0.2)
    };
  }
  
  return validatedItinerary;
} 