import { updateJobStatus } from '../../lib/supabase';
import { createLogger } from '../../lib/logger';

// Create a logger for the job processor
const logger = createLogger('job-processor');

// Helper function to generate a unique job ID
export function generateJobId(): string {
  return `job_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// Function to sanitize JSON - fixes common JSON syntax issues
export function sanitizeJSON(content: string): string {
  logger.debug('Sanitizing JSON content');
  
  // Remove JavaScript-style comments
  let sanitized = content.replace(/\/\/.*?(\r?\n|$)/g, '$1')
                        .replace(/\/\*[\s\S]*?\*\//g, '');
                        
  // Fix property names without quotes
  sanitized = sanitized.replace(/(\{|\,)\s*([a-zA-Z0-9_]+)\s*\:/g, '$1"$2":');
  
  // Remove trailing commas
  sanitized = sanitized.replace(/,(\s*[\]\}])/g, '$1');
  
  // Replace single quotes with double quotes
  sanitized = sanitized.replace(/'/g, '"');
  
  return sanitized;
}

// Ensure valid coordinates in the itinerary
export function ensureValidCoordinates(itinerary: any): any {
  logger.debug('Validating and fixing coordinates in itinerary');
  
  // Default backup coordinates for Paris (use as last resort)
  const defaultCoordinates = { lat: 48.8566, lng: 2.3522 };
  
  // Helper to validate a single coordinates object
  const isValidCoordinates = (coords: any): boolean => {
    return coords && 
           typeof coords === 'object' && 
           typeof coords.lat === 'number' && 
           typeof coords.lng === 'number' &&
           !isNaN(coords.lat) && 
           !isNaN(coords.lng);
  };
  
  // If there are no days, nothing to do
  if (!itinerary.days || !Array.isArray(itinerary.days)) {
    logger.warn('No days array found in itinerary');
    return itinerary;
  }
  
  // Track issues found
  let issuesFound = 0;
  
  // Check each day and activity
  itinerary.days.forEach((day: any, dayIndex: number) => {
    if (!day.activities || !Array.isArray(day.activities)) {
      logger.warn(`Day ${dayIndex + 1} has no activities array`);
      return;
    }
    
    day.activities.forEach((activity: any, activityIndex: number) => {
      // Skip if there's no activity object
      if (!activity || typeof activity !== 'object') {
        logger.warn(`Invalid activity at day ${dayIndex + 1}, index ${activityIndex}`);
        return;
      }
      
      // Check if coordinates exist and are valid
      if (!isValidCoordinates(activity.coordinates)) {
        issuesFound++;
        logger.warn(`Invalid coordinates found for activity "${activity.title}" on day ${dayIndex + 1}`, {
          coordinates: activity.coordinates,
          activityIndex,
          dayIndex
        });
        
        // If the coordinates exist but are invalid, try to fix them
        if (activity.coordinates && typeof activity.coordinates === 'object') {
          // Try to convert string values to numbers
          if (typeof activity.coordinates.lat === 'string') {
            activity.coordinates.lat = parseFloat(activity.coordinates.lat);
          }
          if (typeof activity.coordinates.lng === 'string') {
            activity.coordinates.lng = parseFloat(activity.coordinates.lng);
          }
          
          // If still invalid, use default
          if (!isValidCoordinates(activity.coordinates)) {
            activity.coordinates = { ...defaultCoordinates };
          }
        } else {
          // No coordinates or completely invalid, use default
          activity.coordinates = { ...defaultCoordinates };
        }
        
        logger.debug(`Fixed coordinates for activity "${activity.title}"`, activity.coordinates);
      }
    });
  });
  
  if (issuesFound > 0) {
    logger.info(`Fixed ${issuesFound} coordinate issues in itinerary`);
  } else {
    logger.debug('All coordinates in itinerary are valid');
  }
  
  return itinerary;
}

// Parse and process the OpenAI response from Edge Function
export async function processItineraryResponse(jobId: string, contentData: any): Promise<boolean> {
  try {
    logger.info(`Processing itinerary response for job ${jobId}`);
    
    if (!contentData || !contentData.rawContent) {
      logger.error(`Invalid response data for job ${jobId}`);
      await updateJobStatus(jobId, 'failed', { 
        error: 'Invalid response data from Supabase edge function' 
      });
      return false;
    }
    
    const itineraryContent = contentData.rawContent;
    logger.debug(`Content length for job ${jobId}: ${itineraryContent.length} characters`);
    
    // Parse the JSON response with error handling
    try {
      logger.debug(`Parsing JSON response for job ${jobId}`);
      
      // Try direct parse first
      let itinerary;
      try {
        itinerary = JSON.parse(itineraryContent);
        logger.info(`JSON for job ${jobId} parsed successfully on first attempt`);
      } catch (err) {
        const parseError = err as Error;
        logger.error(`Initial JSON parse failed for job ${jobId}:`, parseError.message);
        
        // First try to extract JSON content from the response
        const jsonMatch = itineraryContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            logger.debug(`Attempting to extract JSON from response for job ${jobId}`);
            itinerary = JSON.parse(jsonMatch[0]);
            logger.info(`JSON extracted and parsed successfully for job ${jobId}`);
          } catch (err2) {
            const extractError = err2 as Error;
            logger.error(`Failed to extract valid JSON for job ${jobId}:`, extractError.message);
            
            // Try to sanitize and repair the JSON
            try {
              logger.debug(`Attempting to sanitize and repair the JSON for job ${jobId}`);
              const sanitizedJSON = sanitizeJSON(itineraryContent);
              
              itinerary = JSON.parse(sanitizedJSON);
              logger.info(`Sanitized JSON parsed successfully for job ${jobId}`);
            } catch (err3) {
              throw parseError; // Fallback to the original error
            }
          }
        } else {
          throw parseError;
        }
      }
      
      // Quick validation of the itinerary
      if (!itinerary || typeof itinerary !== 'object') {
        throw new Error('Parsed result is not a valid object');
      }
      
      logger.debug(`Validating coordinates for job ${jobId}`);
      
      // Ensure coordinates exist for all activities
      ensureValidCoordinates(itinerary);
      logger.info(`Coordinates validated successfully for job ${jobId}`);
      
      // Update job status with the successful result
      logger.info(`Updating job ${jobId} status to completed`);
      await updateJobStatus(jobId, 'completed', { result: { 
        itinerary,
        prompt: contentData.prompt, // Include the prompt for reference
        generatedAt: new Date().toISOString()
      }});
      
      logger.info(`Job ${jobId} completed successfully`);
      return true;
    } catch (parseError: any) {
      logger.error(`JSON parsing error for job ${jobId}:`, {
        message: parseError.message,
        stack: parseError.stack?.substring(0, 200)
      });
      
      // Content may be too long to include in logs, write to a debug file in development
      if (process.env.NODE_ENV === 'development') {
        try {
          const fs = require('fs');
          fs.writeFileSync(`debug-job-${jobId}.txt`, itineraryContent);
          logger.debug(`Wrote debug content to debug-job-${jobId}.txt`);
        } catch (fsError) {
          logger.error(`Failed to write debug file for job ${jobId}:`, fsError);
        }
      }
      
      // Update job status to failed
      await updateJobStatus(jobId, 'failed', {
        error: `Failed to parse itinerary JSON: ${parseError.message}`
      });
      
      logger.info(`Job ${jobId} failed due to JSON parsing error`);
      return false;
    }
  } catch (error: any) {
    logger.error(`Error processing itinerary job ${jobId}:`, {
      message: error.message,
      stack: error.stack?.substring(0, 200)
    });
    await updateJobStatus(jobId, 'failed', { error: error.message || 'Unknown error' });
    return false;
  }
}

// Process itinerary job by making a direct OpenAI API call
export async function processItineraryJob(
  jobId: string, 
  surveyData: any, 
  promptGenerator: ((surveyData: any) => string) | string,
  apiKey: string
): Promise<boolean> {
  try {
    logger.info(`Processing itinerary job for job ${jobId}`);
    
    // Use the provided prompt or generate one using the generator function
    let prompt: string;
    if (typeof promptGenerator === 'function') {
      prompt = promptGenerator(surveyData);
      logger.debug(`Generated prompt for job ${jobId}, length: ${prompt.length} characters`);
    } else {
      prompt = promptGenerator;
      logger.debug(`Using pre-formulated prompt for job ${jobId}, length: ${prompt.length} characters`);
    }
    
    // Call OpenAI API directly
    logger.info(`Calling OpenAI API for job ${jobId}`);
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an expert travel planner. Generate a detailed travel itinerary based on the user\'s preferences. Return your response in a structured JSON format only, with no additional text, explanation, or markdown formatting. Do not wrap the JSON in code blocks. Ensure all property names use double quotes. IMPORTANT: Every activity MUST include a valid "coordinates" object with "lat" and "lng" numerical values - never omit coordinates or use empty objects. For price fields, DO NOT use $ symbols directly - use price descriptors like "Budget", "Moderate", "Expensive" or numeric values without currency symbols.'
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
    const rawContent = openAIData.choices[0].message.content;
    
    // Process the raw response
    await processItineraryResponse(jobId, { 
      rawContent, 
      prompt,
      usage: openAIData.usage
    });
    
    return true;
  } catch (error: any) {
    logger.error(`Failed to process itinerary job ${jobId}:`, error);
    
    // Update job status to failed
    await updateJobStatus(jobId, 'failed', {
      error: `OpenAI API error: ${error.message || 'Unknown error'}`
    });
    
    return false;
  }
} 