import { updateJobStatus } from '../../lib/supabase';

// Helper function to generate a unique job ID
export function generateJobId() {
  const timestamp = Date.now();
  // Use a simple format with just the timestamp to ensure consistency across environments
  return `job_${timestamp}`;
}

// Process the itinerary generation in the background
export async function processItineraryJob(jobId: string, surveyData: any, generatePrompt: Function, OPENAI_API_KEY: string) {
  try {
    console.log(`[${jobId}] Starting itinerary generation process...`);
    
    // Update status to processing (already done in the caller, but make sure)
    await updateJobStatus(jobId, 'processing');
    
    // Create the prompt for GPT
    const prompt = generatePrompt(surveyData);
    console.log(`[${jobId}] Generated prompt (${prompt.length} chars)`);
    
    // Make the OpenAI API call
    console.log(`[${jobId}] Calling OpenAI API...`);
    const startTime = Date.now();
    
    // Check if we have a valid API key first
    if (!OPENAI_API_KEY || !OPENAI_API_KEY.startsWith('sk-')) {
      console.error(`[${jobId}] Invalid OpenAI API key`);
      await updateJobStatus(jobId, 'failed', { 
        error: 'Invalid OpenAI API key configuration. Please check your environment variables.' 
      });
      return;
    }
    
    // Create AbortController for timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000); // 45 second timeout
    
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
              content: 'You are an expert travel planner. Generate a detailed travel itinerary based on the user\'s preferences. Return your response in a structured JSON format only, with no additional text, explanation, or markdown formatting. Do not wrap the JSON in code blocks. Ensure all property names use double quotes. IMPORTANT: Every activity MUST include a valid "coordinates" object with "lat" and "lng" numerical values - never omit coordinates or use empty objects. For price fields, DO NOT use $ symbols directly - use price descriptors like "Budget", "Moderate", "Expensive" or numeric values without currency symbols. ALL city names and locations with periods (like "St. Louis") must be properly escaped in JSON. Return a valid JSON object that can be parsed with JSON.parse().'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 3000, // Increased token limit to avoid truncated responses
        }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId); // Clear the timeout if request completes
      
      const responseTime = Date.now() - startTime;
      console.log(`[${jobId}] OpenAI API response received in ${responseTime}ms`);

      if (!response.ok) {
        const error = await response.json();
        console.error(`[${jobId}] OpenAI API error:`, error);
        await updateJobStatus(jobId, 'failed', { 
          error: `Failed to generate itinerary: ${error.error?.message || 'API error'}`
        });
        return;
      }

      const data = await response.json();
      console.log(`[${jobId}] OpenAI response received with ${data.usage?.total_tokens || 'unknown'} tokens`);
      
      const itineraryContent = data.choices[0].message.content;
      console.log(`[${jobId}] Content length: ${itineraryContent.length} characters`);
      
      // Parse the JSON response with better error handling
      try {
        console.log(`[${jobId}] Parsing JSON response...`);
        
        // Try direct parse first
        let itinerary;
        try {
          itinerary = JSON.parse(itineraryContent);
          console.log(`[${jobId}] JSON parsed successfully on first attempt`);
        } catch (err) {
          const parseError = err as Error;
          console.error(`[${jobId}] Initial JSON parse failed:`, parseError.message);
          
          // First try to extract JSON content from the response
          const jsonMatch = itineraryContent.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try {
              console.log(`[${jobId}] Attempting to extract JSON from response...`);
              itinerary = JSON.parse(jsonMatch[0]);
              console.log(`[${jobId}] JSON extracted and parsed successfully`);
            } catch (err2) {
              const extractError = err2 as Error;
              console.error(`[${jobId}] Failed to extract valid JSON:`, extractError.message);
              
              // Try to sanitize and repair the JSON
              try {
                console.log(`[${jobId}] Attempting to sanitize and repair the JSON...`);
                const sanitizedJSON = sanitizeJSON(itineraryContent);
                console.log(`[${jobId}] JSON sanitized, attempting to parse...`);
                
                itinerary = JSON.parse(sanitizedJSON);
                console.log(`[${jobId}] Sanitized JSON parsed successfully`);
              } catch (err3) {
                const sanitizeError = err3 as Error;
                console.error(`[${jobId}] Failed to parse sanitized JSON:`, sanitizeError.message);
                
                // Last resort: try to fix common JSON syntax errors
                try {
                  console.log(`[${jobId}] Using last resort JSON repair attempt...`);
                  
                  // Replace single quotes with double quotes for property names and values
                  let lastResortJSON = itineraryContent.replace(/'/g, '"');
                  
                  // Fix property names without quotes (common error)
                  lastResortJSON = lastResortJSON.replace(/([{,]\s*)([a-zA-Z0-9_\.]+)(\s*:)/g, '$1"$2"$3');
                  
                  // Fix dollar signs in price fields (a common source of problems)
                  lastResortJSON = lastResortJSON.replace(/"(price|priceRange|cost|estimatedCost)"(\s*):(\s*)"(\$+)"/g, '"$1"$2:$3"Price Range $4"');
                  
                  // Handle common patterns with dollar signs
                  lastResortJSON = lastResortJSON.replace(/:(\s*)\$(\d+)/g, ': "$$$2"');
                  lastResortJSON = lastResortJSON.replace(/:(\s*)\$(\d+)-(\d+)/g, ': "$$$2-$$$3"');
                  
                  // Replace unquoted property values
                  lastResortJSON = lastResortJSON.replace(/:(\s*)([^"{}\[\],\s][^,}\]]*?)(\s*[,}])/g, ':"$2"$3');
                  
                  // Handle St. Louis and other places with periods
                  // First ensure property names with periods are properly quoted
                  lastResortJSON = lastResortJSON.replace(/"([^"]*?\.)([^"]*?)"/g, '"$1$2"');
                  
                  // Fix quotes and unescaped characters around periods in content
                  lastResortJSON = lastResortJSON.replace(/St\.\s*Louis/g, 'St. Louis');
                  
                  console.log(`[${jobId}] Repaired JSON sample:`, lastResortJSON.substring(0, 200) + '...');
                  
                  try {
                    itinerary = JSON.parse(lastResortJSON);
                    console.log(`[${jobId}] Last resort JSON repair successful`);
                  } catch (directParseError) {
                    // If direct parsing still fails, try the sliding window approach as a final attempt
                    console.log(`[${jobId}] Direct repair failed, trying JSON substring extraction...`);
                    
                    // Try to find valid JSON objects within the repair attempt
                    const matches = lastResortJSON.match(/(\{[\s\S]*\})/g) || [];
                    
                    for (const match of matches) {
                      try {
                        const possibleJSON = JSON.parse(match);
                        if (possibleJSON && typeof possibleJSON === 'object' && possibleJSON.days) {
                          console.log(`[${jobId}] Found valid JSON object in repair attempt`);
                          itinerary = possibleJSON;
                          break;
                        }
                      } catch (e) {
                        // Continue to the next match
                      }
                    }
                    
                    if (!itinerary) {
                      console.error(`[${jobId}] All JSON repair attempts failed`);
                      throw parseError; // Throw the original error
                    }
                  }
                } catch (err4) {
                  console.error(`[${jobId}] All JSON repair attempts failed`);
                  throw parseError; // Throw the original error
                }
              }
            }
          } else {
            console.error(`[${jobId}] No JSON object found in response`);
            
            // Try one more approach - search for valid JSON in substrings
            try {
              console.log(`[${jobId}] Attempting to extract valid JSON from content chunks...`);
              const contentLength = itineraryContent.length;
              let validJSON = null;
              
              // Try parsing from different starting positions
              for (let startPos = 0; startPos < 200 && startPos < contentLength; startPos++) {
                const subContent = itineraryContent.substring(startPos);
                const subMatch = subContent.match(/\{[\s\S]*\}/);
                
                if (subMatch) {
                  try {
                    validJSON = JSON.parse(subMatch[0]);
                    console.log(`[${jobId}] Found valid JSON starting at position ${startPos}`);
                    break;
                  } catch (e) {
                    // Continue trying
                  }
                }
              }
              
              if (validJSON) {
                itinerary = validJSON;
              } else {
                throw parseError;
              }
            } catch (e) {
              throw parseError;
            }
          }
        }
        
        // Quick validation of the itinerary
        if (!itinerary || typeof itinerary !== 'object') {
          throw new Error('Parsed result is not a valid object');
        }
        
        console.log(`[${jobId}] Validating coordinates...`);
        
        // Ensure coordinates exist for all activities
        ensureValidCoordinates(itinerary);
        console.log(`[${jobId}] Coordinates validated successfully`);
        
        // Update job status with the successful result
        console.log(`[${jobId}] Updating job status to completed...`);
        
        await updateJobStatus(jobId, 'completed', { 
          result: { 
            itinerary, 
            prompt 
          }
        });
        
        console.log(`[${jobId}] Job completed successfully!`);
      } catch (err) {
        const parseError = err as Error;
        console.error(`[${jobId}] Failed to parse itinerary JSON:`, parseError);
        console.error(`[${jobId}] Raw content sample:`, itineraryContent.substring(0, 200));
        
        // Log the position where the error occurred if available
        if (parseError instanceof SyntaxError && parseError.message.includes('position')) {
          const positionMatch = parseError.message.match(/position (\d+)/);
          if (positionMatch) {
            const position = parseInt(positionMatch[1]);
            const errorContext = itineraryContent.substring(
              Math.max(0, position - 30),
              Math.min(itineraryContent.length, position + 30)
            );
            console.error(`[${jobId}] Error context around position ${position}:`, errorContext);
          }
        }
        
        console.log(`[${jobId}] Updating job status to failed due to parsing error...`);
        await updateJobStatus(jobId, 'failed', { 
          error: 'Unable to parse the generated itinerary data',
          result: { 
            rawContent: itineraryContent.substring(0, 500),
            errorMessage: parseError.message
          } 
        });
      }
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        console.error(`[${jobId}] OpenAI API request timed out after 45 seconds`);
        await updateJobStatus(jobId, 'failed', {
          error: 'The request to generate an itinerary timed out. Please try again.'
        });
        return;
      }
      
      // Re-throw for the outer catch block to handle
      throw fetchError;
    }
  } catch (error: any) {
    console.error(`[${jobId}] Error processing itinerary job:`, error);
    await updateJobStatus(jobId, 'failed', { error: error.message || 'Unknown error' });
  }
}

// Helper function to ensure all activities have valid coordinates
function ensureValidCoordinates(itinerary: any) {
  if (!itinerary.days || !Array.isArray(itinerary.days)) {
    itinerary.days = [];
    return;
  }
  
  console.log('Validating coordinates for all activities...');
  let issuesFixed = 0;
  
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
        console.log(`Missing coordinates for activity "${activity.title}", adding default coordinates`);
        activity.coordinates = { lat: 40.7128, lng: -74.0060 }; // Default to NYC coordinates
        issuesFixed++;
      } else {
        // Make sure lat and lng are numbers
        let coordinateFixed = false;
        
        if (typeof activity.coordinates.lat !== 'number') {
          console.log(`Invalid lat coordinate for activity "${activity.title}": ${activity.coordinates.lat} (${typeof activity.coordinates.lat})`);
          activity.coordinates.lat = parseFloat(activity.coordinates.lat) || 40.7128;
          coordinateFixed = true;
          issuesFixed++;
        }
        if (typeof activity.coordinates.lng !== 'number') {
          console.log(`Invalid lng coordinate for activity "${activity.title}": ${activity.coordinates.lng} (${typeof activity.coordinates.lng})`);
          activity.coordinates.lng = parseFloat(activity.coordinates.lng) || -74.0060;
          coordinateFixed = true;
          issuesFixed++;
        }
        
        if (coordinateFixed) {
          console.log(`Fixed coordinates for activity "${activity.title}": ${JSON.stringify(activity.coordinates)}`);
        }
      }
    }
  }
  
  console.log(`Coordinates validation complete. Fixed ${issuesFixed} issues.`);
}

// Helper function to sanitize and repair JSON string
function sanitizeJSON(jsonString: string): string {
  console.log('Sanitizing JSON string...');
  
  // Step 1: Remove any markdown code block formatting
  let cleanedJSON = jsonString.replace(/```json\s*|\s*```/g, '');
  
  // Step 2: Remove any non-JSON content before the first curly brace and after the last curly brace
  const firstCurlyIndex = cleanedJSON.indexOf('{');
  const lastCurlyIndex = cleanedJSON.lastIndexOf('}');
  
  if (firstCurlyIndex !== -1 && lastCurlyIndex !== -1 && lastCurlyIndex > firstCurlyIndex) {
    cleanedJSON = cleanedJSON.substring(firstCurlyIndex, lastCurlyIndex + 1);
  }
  
  // Step 3: Fix dollar sign issues in price fields
  // Replace patterns like "price": "$", "priceRange": "$$", etc. with proper escaped versions
  cleanedJSON = cleanedJSON.replace(/"(price|priceRange|cost|estimatedCost)"(\s*):(\s*)"(\$+)"/g, '"$1"$2:$3"\\$4"');
  
  // Step 4: Fix potential issues with double quotes
  // Replace single quotes used for property names with double quotes
  cleanedJSON = cleanedJSON.replace(/(\s*)'([^']+)'(\s*):(\s*)/g, '$1"$2"$3:$4');
  
  // Step 5: Fix quotes inside string values
  // This regex works for most cases but isn't perfect for nested quotes
  let inString = false;
  let inEscape = false;
  let fixedJSON = '';
  let i = 0;
  
  while (i < cleanedJSON.length) {
    const char = cleanedJSON[i];
    
    if (inEscape) {
      // Always add escaped characters directly
      fixedJSON += char;
      inEscape = false;
    } else if (char === '\\') {
      fixedJSON += char;
      inEscape = true;
    } else if (char === '"' && !inEscape) {
      inString = !inString;
      fixedJSON += char;
    } else if (char === "'" && inString) {
      // Replace single quotes inside strings with escaped double quotes
      fixedJSON += "\\'";
    } else if (char === '$' && inString) {
      // Properly escape dollar signs in strings
      fixedJSON += "\\$";
    } else {
      fixedJSON += char;
    }
    i++;
  }
  
  // Step 6: Fix missing quotes around property values
  // This is a simplified approach and might not catch all cases
  fixedJSON = fixedJSON.replace(/:\s*([^",{\[\]\s][^,}\]\s]*)(\s*[,}])/g, ': "$1"$2');
  
  // Step 7: Fix comma issues (trailing commas and missing commas)
  fixedJSON = fixedJSON.replace(/,\s*}/g, '}'); // Remove trailing commas
  fixedJSON = fixedJSON.replace(/,\s*,/g, ','); // Remove double commas
  
  // Step 8: Fix common property name issues in price and cost fields (direct approach for most common errors)
  fixedJSON = fixedJSON.replace(/([{,]\s*)price(\s*:)/g, '$1"price"$2');
  fixedJSON = fixedJSON.replace(/([{,]\s*)priceRange(\s*:)/g, '$1"priceRange"$2');
  fixedJSON = fixedJSON.replace(/([{,]\s*)cost(\s*:)/g, '$1"cost"$2');
  fixedJSON = fixedJSON.replace(/([{,]\s*)estimatedCost(\s*:)/g, '$1"estimatedCost"$2');
  
  console.log('Cleaned JSON sample:', fixedJSON.substring(0, 200) + '...');
  
  return fixedJSON;
} 