import { NextResponse } from 'next/server';
import { generateJobId, processItineraryResponse } from '../job-processor';
import { createJob, updateJobStatus, getJobStatus, supabase } from '../../../lib/supabase';
import { createLogger } from '../../../lib/logger';

// Initialize logger
const logger = createLogger('generate-itinerary');

// Configure runtime for serverless function - using edge for more consistent timeout behavior
export const runtime = 'nodejs';
export const maxDuration = 60; // Set max duration to 60 seconds

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
    // Log key information for debugging
    logger.info(`========== ITINERARY GENERATION REQUEST ==========`);
    logger.info(`API Request started: ${new Date().toISOString()}`);
    logger.info('Environment:', {
      nodeEnv: process.env.NODE_ENV,
      isProduction: process.env.NODE_ENV === 'production'
    });
    
    // Log environment variables (without exposing actual values)
    logger.info('Supabase connection details:', {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      urlPrefix: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 10) || 'missing',
      keyPrefix: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 5) || 'missing',
      urlLength: process.env.NEXT_PUBLIC_SUPABASE_URL?.length || 0,
      keyLength: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0
    });

    // Only test Supabase connection if properly configured
    if (isSupabaseConfigured) {
      try {
        logger.info('Testing Supabase connection...');
        const { data, error } = await supabase.from('jobs').select('*').limit(1);
        if (error) {
          logger.error('❌ Supabase connection test failed:', {
            message: error.message,
            hint: error.hint || '',
            code: error.code || ''
          });
        } else {
          logger.info('✅ Supabase connection test successful');
        }
      } catch (connError: any) {
        logger.error('❌ Supabase connection test exception:', {
          message: connError.message,
          details: connError.toString(),
          name: connError.name,
          stack: connError.stack?.substring(0, 200)
        });
      }
    } else {
      logger.warn('⚠️ Skipping Supabase connection test - not configured');
    }

    // Parse the request body
    const surveyData: SurveyData = await request.json();
    logger.info('Received survey data:', {
      destination: surveyData.destination,
      startDate: surveyData.startDate,
      endDate: surveyData.endDate,
      purpose: surveyData.purpose,
      budget: surveyData.budget,
      preferences: surveyData.preferences 
    });

    // Create a unique job ID
    const jobId = generateJobId();
    logger.info(`Generated new job ID: ${jobId}`);

    // Generate the prompt on the server side
    const prompt = generatePrompt(surveyData);
    logger.info(`Generated prompt for job ${jobId}, length: ${prompt.length} characters`);

    // If we're in development or testing, return mock data immediately
    if (process.env.NODE_ENV === 'development' && process.env.USE_MOCK_DATA === 'true') {
      logger.info('Development mode with mock data: Returning mock data');
      const mockItinerary = createMockItinerary(surveyData);
      const updateResult = await updateJobStatus(jobId, 'completed', { 
        result: { 
          itinerary: mockItinerary, 
          prompt: prompt 
        }
      });
      
      if (!updateResult) {
        logger.error('Failed to update job status in development mode');
        return NextResponse.json(
          { error: 'Failed to update job status' },
          { status: 500 }
        );
      }
      
      return NextResponse.json({ jobId, status: 'completed' });
    }

    // Create a new job in Supabase
    logger.info('Creating new job with ID:', jobId);
    let jobCreated = false;
    let retryCount = 0;
    const maxRetries = 3;
    
    // Add retry logic for job creation
    while (!jobCreated && retryCount < maxRetries) {
      try {
        jobCreated = await createJob(jobId);
        if (!jobCreated) {
          logger.error(`Failed to create job on attempt ${retryCount + 1}/${maxRetries}`);
          retryCount++;
          if (retryCount < maxRetries) {
            // Exponential backoff
            await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, retryCount)));
          }
        }
      } catch (error) {
        logger.error(`Error creating job on attempt ${retryCount + 1}/${maxRetries}:`, error);
        retryCount++;
        if (retryCount < maxRetries) {
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, retryCount)));
        }
      }
    }
    
    if (!jobCreated) {
      logger.error('Failed to create job after multiple attempts');
      return NextResponse.json(
        { error: 'Failed to create job in database after multiple attempts' },
        { status: 500 }
      );
    }
    
    logger.info(`Job ${jobId} created successfully, current status: queued`);

    // Verify the job was created properly by fetching its status
    let statusCheck;
    try {
      statusCheck = await getJobStatus(jobId);
      logger.info(`Initial job status check: ${statusCheck.status}`);
      
      if (statusCheck.status === 'not_found') {
        logger.error(`Critical error: Job ${jobId} was not found immediately after creation`);
        // Try to recreate the job one more time in case of race condition
        jobCreated = await createJob(jobId);
        if (jobCreated) {
          logger.info(`Job ${jobId} recreated successfully after initial not_found status`);
          statusCheck = await getJobStatus(jobId);
          logger.info(`Second job status check: ${statusCheck.status}`);
        }
      }
    } catch (statusCheckError) {
      logger.error('Error checking initial job status:', statusCheckError);
    }

    // Call the Supabase Edge Function to process the itinerary
    try {
      logger.info(`Invoking Supabase Edge Function for job ${jobId}`);
      
      // Update job status to processing
      await updateJobStatus(jobId, 'processing');
      
      if (!isSupabaseConfigured) {
        throw new Error('Supabase URL or key is missing');
      }

      // Invoke the Edge Function with the generated prompt
      const { data: functionData, error: functionError } = await supabase.functions.invoke(
        'generate-itinerary',
        {
          body: {
            jobId,
            surveyData,
            prompt // Send the prompt to the edge function
          }
        }
      );

      if (functionError) {
        logger.error(`Error invoking Supabase Edge Function:`, functionError);
        throw new Error(`Edge Function error: ${functionError.message || 'Unknown error'}`);
      }

      logger.info(`Supabase Edge Function invoked successfully for job ${jobId}:`, functionData);
      
      // If the edge function returned a result directly, process it
      if (functionData && functionData.result) {
        logger.info(`Processing immediate result from edge function for job ${jobId}`);
        await processItineraryResponse(jobId, functionData.result);
      }
    } catch (edgeFunctionError: any) {
      logger.error(`Failed to invoke Supabase Edge Function:`, edgeFunctionError);
      
      // Update job status to reflect the error but don't fail the response
      // We want the client to keep polling the job status
      await updateJobStatus(jobId, 'processing', {
        error: `Edge function invocation error (will retry): ${edgeFunctionError.message || 'Unknown error'}`
      });
    }

    // Return immediately with the job ID
    logger.info(`Returning response for job ${jobId} with status: processing`);
    return NextResponse.json({ 
      jobId, 
      status: 'processing',
      message: 'Your itinerary is being generated. Poll the job-status endpoint for updates.'
    });
    
  } catch (error: any) {
    logger.error('Error initiating itinerary generation:', error);
    return NextResponse.json(
      { error: `Failed to initiate itinerary generation: ${error.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
}

// Function to generate a prompt based on survey data
export function generatePrompt(surveyData: SurveyData): string {
  // Calculate trip duration - adding 1 to include both start and end date
  const startDate = new Date(surveyData.startDate);
  const endDate = new Date(surveyData.endDate);
  
  // Set time to noon to avoid timezone issues
  startDate.setHours(12, 0, 0, 0);
  endDate.setHours(12, 0, 0, 0);
  
  // Calculate number of days
  const tripDuration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  
  // Format dates for display
  const formattedStartDate = formatDate(startDate);
  const formattedEndDate = formatDate(endDate);
  
  // Build the preferences section
  let preferencesText = '';
  if (surveyData.preferences && surveyData.preferences.length > 0) {
    preferencesText = 'The traveler has expressed interest in the following: ' + 
      surveyData.preferences.join(', ') + '. ';
  }

  // Construct the prompt
  return `
Create a personalized travel itinerary for a trip to ${surveyData.destination} from ${formattedStartDate} to ${formattedEndDate} (${tripDuration} days).

Trip purpose: ${surveyData.purpose}
Budget level: ${surveyData.budget}
${preferencesText}

Generate a comprehensive day-by-day travel itinerary with the following structure (as a valid JSON object):

{
  "destination": "${surveyData.destination}",
  "tripName": "<create a catchy name for this trip>",
  "dates": {
    "start": "${surveyData.startDate}",
    "end": "${surveyData.endDate}"
  },
  "summary": "<brief overview of the trip highlighting key attractions and experiences>",
  "days": [
    {
      "day": 1,
      "date": "${surveyData.startDate}",
      "activities": [
        {
          "time": "<morning/afternoon/evening>",
          "title": "<activity name>",
          "description": "<detailed description>",
          "location": "<specific location name>",
          "coordinates": {
            "lat": <latitude as number>,
            "lng": <longitude as number>
          },
          "duration": "<estimated duration>",
          "cost": "<cost estimate or budget level>"
        },
        ... more activities ...
      ]
    },
    ... more days ...
  ],
  "budgetEstimate": {
    "accommodation": <estimated total cost as number>,
    "food": <estimated total cost as number>,
    "activities": <estimated total cost as number>,
    "transportation": <estimated total cost as number>,
    "total": <total estimated cost as number>
  },
  "travelTips": [
    "<useful tip for this destination>",
    ... more tips ...
  ]
}

Remember, EACH activity MUST include valid and accurate coordinates (latitude and longitude) as numerical values - never use empty or placeholder coordinates. Research real locations in ${surveyData.destination} and include their actual coordinates.

Only return valid JSON that can be parsed with JSON.parse(). Do not include any explanations, markdown formatting, or code blocks outside the JSON object. Ensure all property names and string values use double quotes, not single quotes.
  `;
}

// Format date for display
function formatDate(date: Date): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  
  // Add suffix to day
  let suffix = 'th';
  if (day === 1 || day === 21 || day === 31) suffix = 'st';
  else if (day === 2 || day === 22) suffix = 'nd';
  else if (day === 3 || day === 23) suffix = 'rd';
  
  return `${month} ${day}${suffix}, ${year}`;
}

// Helper function to create mock data for development testing
function createMockItinerary(surveyData: SurveyData): any {
  return {
    destination: surveyData.destination,
    tripName: `${surveyData.purpose} trip to ${surveyData.destination}`,
    dates: {
      start: surveyData.startDate,
      end: surveyData.endDate
    },
    summary: `A ${surveyData.budget} ${surveyData.purpose} adventure in ${surveyData.destination}, featuring ${surveyData.preferences.join(', ')}.`,
    days: [
      {
        day: 1,
        date: surveyData.startDate,
        activities: [
          {
            time: "morning",
            title: "Breakfast at local cafe",
            description: "Start your day with a delicious local breakfast",
            location: "Central Cafe",
            coordinates: {
              lat: 48.8566,
              lng: 2.3522
            },
            duration: "1 hour",
            cost: "moderate"
          },
          {
            time: "afternoon",
            title: "City Tour",
            description: "Explore the main attractions of the city",
            location: "City Center",
            coordinates: {
              lat: 48.8584,
              lng: 2.3536
            },
            duration: "3 hours",
            cost: surveyData.budget
          }
        ]
      },
      {
        day: 2,
        date: new Date(new Date(surveyData.startDate).setDate(new Date(surveyData.startDate).getDate() + 1)).toISOString().split('T')[0],
        activities: [
          {
            time: "morning",
            title: "Museum Visit",
            description: "Visit the famous local museum",
            location: "National Museum",
            coordinates: {
              lat: 48.8606,
              lng: 2.3376
            },
            duration: "2 hours",
            cost: surveyData.budget
          }
        ]
      }
    ],
    budgetEstimate: {
      accommodation: 500,
      food: 300,
      activities: 200,
      transportation: 100,
      total: 1100
    },
    travelTips: [
      "Pack comfortable walking shoes",
      "Try the local specialty dishes",
      "Learn a few phrases in the local language"
    ]
  };
} 