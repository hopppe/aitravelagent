import { NextResponse } from 'next/server';
import { getJobStatus } from '../../../lib/supabase';
import { processRawResponse } from '../../../lib/itinerary-processor';
import { logger } from '../../../lib/logger';

// Configure runtime
export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds - plenty for a status check

// Use dynamic configurations
export const dynamic = 'force-dynamic';

// Helper function to get DB-compatible ID (copied for debugging)
function getDbCompatibleId(id: string): number {
  // If the ID is already numeric, return it as is
  if (!isNaN(Number(id))) {
    return Number(id);
  }
  
  // For job IDs that start with a timestamp (job_ or debug_), extract the timestamp
  const timestampMatch = id.match(/^(job|debug|test)_(\d+)/);
  if (timestampMatch && !isNaN(Number(timestampMatch[2]))) {
    // Use the timestamp portion as the numeric ID
    return Number(timestampMatch[2]);
  }

  // For any other IDs, use a hash function to generate a numeric ID
  let hash = 0;
  const prime = 31; // Use a prime number for better distribution
  
  for (let i = 0; i < id.length; i++) {
    // Get the character code
    const char = id.charCodeAt(i);
    // Multiply the current hash by the prime and add the character code
    hash = Math.imul(hash, prime) + char | 0;
  }
  
  // Ensure positive number by using absolute value
  return Math.abs(hash);
}

export async function GET(request: Request) {
  try {
    logger.info(`Job status API called at ${new Date().toISOString()}`);
    
    // Get the job ID from the query params
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    
    if (!jobId) {
      logger.error('Missing jobId parameter');
      return NextResponse.json(
        { error: 'Missing jobId parameter' },
        { status: 400 }
      );
    }
    
    logger.info(`Checking status for job: ${jobId}`);
    
    // Debug info about the job ID conversion for logging
    const dbCompatibleId = getDbCompatibleId(jobId);
    logger.debug(`Job ID conversion: "${jobId}" -> ${dbCompatibleId} (db-compatible)`);
    
    // Get the job status from Supabase
    const statusResult = await getJobStatus(jobId);
    
    logger.info(`Job ${jobId} status result:`, statusResult);
    
    // For completed jobs with raw results that haven't been processed yet,
    // process them and return the processed data
    if (
      statusResult.status === 'completed' &&
      statusResult.result &&
      typeof statusResult.result === 'object' &&
      !statusResult.result.processed &&
      statusResult.result.raw
    ) {
      try {
        // Process the raw OpenAI response
        const processedItinerary = processRawResponse(statusResult.result.raw);
        
        // Return the processed itinerary along with the status
        return NextResponse.json({
          status: statusResult.status,
          itinerary: processedItinerary
        });
      } catch (processingError: any) {
        logger.error(`Error processing raw response for job ${jobId}:`, processingError);
        return NextResponse.json({
          status: 'failed',
          error: `Error processing response: ${processingError.message}`
        });
      }
    }
    
    // Return the status as-is if it's not a completed job with raw results
    logger.info(`Returning job status: ${statusResult.status}`);
    return NextResponse.json({
      status: statusResult.status,
      result: statusResult.result,
      error: statusResult.error
    });
  } catch (error: any) {
    logger.error('Error in job status API:', error);
    return NextResponse.json(
      { error: `Server error: ${error.message}` },
      { status: 500 }
    );
  }
} 