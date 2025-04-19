// @ts-ignore
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

// Types
type SurveyData = {
  destination: string;
  startDate: string;
  endDate: string;
  purpose: string;
  budget: string;
  preferences: string[];
};

// This is a Deno runtime, so we need to use Deno.env
// @ts-ignore
const supabaseClient = createClient(
  // @ts-ignore
  Deno.env.get('SUPABASE_URL') ?? '',
  // @ts-ignore
  Deno.env.get('SUPABASE_ANON_KEY') ?? '',
  {
    global: {
      // @ts-ignore
      headers: { Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` },
    },
  }
);

// Get OpenAI API key from environment
// @ts-ignore
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') ?? '';

// Generate a prompt based on survey data
function generatePrompt(surveyData: SurveyData): string {
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

// Ensure all activities have valid coordinates
function ensureValidCoordinates(itinerary: any) {
  if (!itinerary || !itinerary.days || !Array.isArray(itinerary.days)) {
    return itinerary;
  }
  
  console.log('Validating coordinates in generated itinerary...');
  
  for (const day of itinerary.days) {
    if (!day.activities || !Array.isArray(day.activities)) {
      day.activities = [];
      continue;
    }
    
    for (const activity of day.activities) {
      // Skip if not an object
      if (!activity || typeof activity !== 'object') continue;
      
      // Ensure coordinates exist and are properly formatted
      if (!activity.coordinates || typeof activity.coordinates !== 'object') {
        activity.coordinates = { lat: 40.7128, lng: -74.0060 }; // Default to NYC coordinates
      } else {
        // Make sure lat and lng are numbers
        if (typeof activity.coordinates.lat !== 'number' && activity.coordinates.lat !== undefined) {
          activity.coordinates.lat = parseFloat(String(activity.coordinates.lat)) || 40.7128;
        } else if (activity.coordinates.lat === undefined) {
          activity.coordinates.lat = 40.7128;
        }
        
        if (typeof activity.coordinates.lng !== 'number' && activity.coordinates.lng !== undefined) {
          activity.coordinates.lng = parseFloat(String(activity.coordinates.lng)) || -74.0060;
        } else if (activity.coordinates.lng === undefined) {
          activity.coordinates.lng = -74.0060;
        }
      }
    }
  }
  
  return itinerary;
}

// Main handler for Edge Function
serve(async (req: Request) => {
  try {
    // Only accept POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const data = await req.json();
    const { jobId, surveyData } = data;

    // Validate required data
    if (!jobId || !surveyData) {
      return new Response(
        JSON.stringify({ error: 'Missing required data (jobId or surveyData)' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    try {
      // Update job status to processing
      await supabaseClient
        .from('jobs')
        .update({ status: 'processing', updated_at: new Date().toISOString() })
        .eq('id', jobId);

      // Create the prompt for OpenAI
      const prompt = generatePrompt(surveyData);
      
      // Call OpenAI API
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are an expert travel planner. Generate a detailed travel itinerary based on the user\'s preferences. Return your response in a structured JSON format only, with no additional text, explanation, or markdown formatting. Do not wrap the JSON in code blocks. Ensure all property names use double quotes. IMPORTANT: Every activity MUST include a valid "coordinates" object with "lat" and "lng" numerical values - never omit coordinates or use empty objects. For price fields, DO NOT use $ symbols directly - use price descriptors like "Budget", "Moderate", "Expensive" or numeric values without currency symbols. ALL city names and locations with periods (like "St. Louis") must be properly escaped in JSON. Return a valid JSON object that can be parsed with JSON.parse().'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 3000,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
      }

      const openAIData = await response.json();
      const itineraryContent = openAIData.choices[0].message.content;
      
      // Parse and validate the JSON response
      let itinerary;
      try {
        itinerary = JSON.parse(itineraryContent);
      } catch (err: any) {
        // Try to extract JSON if it's wrapped in other text
        const jsonMatch = itineraryContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            itinerary = JSON.parse(jsonMatch[0]);
          } catch (err2: any) {
            throw new Error(`Failed to parse itinerary JSON: ${err2.message}`);
          }
        } else {
          throw new Error(`Failed to parse itinerary JSON: ${err.message}`);
        }
      }

      // Validate coordinates
      itinerary = ensureValidCoordinates(itinerary);

      // Update job status to completed with result
      await supabaseClient
        .from('jobs')
        .update({
          status: 'completed',
          result: { itinerary, prompt },
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId);

      return new Response(
        JSON.stringify({ success: true, jobId }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } catch (error: any) {
      // Update job status to failed
      await supabaseClient
        .from('jobs')
        .update({
          status: 'failed',
          error: error.message || 'Unknown error',
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId);

      throw error;
    }
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        error: `Failed to generate itinerary: ${error.message || 'Unknown error'}`,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}); 