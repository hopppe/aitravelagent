import { NextResponse } from 'next/server';
import { getJobStatus } from '../../../lib/supabase';

// Maximum duration to handle potential Supabase connection issues
export const runtime = 'nodejs';
export const maxDuration = 10; // 10 seconds for a status check should be plenty

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
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get('jobId');
  
  console.log(`Job status API called at ${new Date().toISOString()}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  
  if (!jobId) {
    console.error('Missing jobId parameter in request');
    return NextResponse.json(
      { error: 'Missing jobId parameter' },
      { status: 400 }
    );
  }
  
  console.log(`Checking status for job: ${jobId}`);
  
  // Debug info about the job ID conversion for logging
  const dbCompatibleId = getDbCompatibleId(jobId);
  console.log(`Job ID conversion: "${jobId}" -> ${dbCompatibleId} (db-compatible)`);
  
  try {
    console.log(`Getting status for job ${jobId}`);
    const jobStatus = await getJobStatus(jobId);
    
    console.log(`Job ${jobId} status result:`, {
      statusFound: jobStatus.status !== 'not_found',
      status: jobStatus.status,
      hasResult: !!jobStatus.result,
      hasError: !!jobStatus.error
    });
    
    if (jobStatus.status === 'not_found') {
      console.log(`Job ${jobId} not found`);
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }
    
    console.log(`Returning job status: ${jobStatus.status}`);
    return NextResponse.json({
      ...jobStatus,
      _debug: {
        originalJobId: jobId,
        dbCompatibleId,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    console.error(`Error retrieving job status for ${jobId}:`, error);
    
    // Enhanced error logging
    console.error('Error details:', {
      message: error.message,
      stack: error.stack?.substring(0, 200),
      name: error.name,
      jobId,
      dbCompatibleId
    });
    
    return NextResponse.json(
      { 
        error: 'Failed to retrieve job status', 
        message: error.message,
        _debug: {
          originalJobId: jobId,
          dbCompatibleId,
          timestamp: new Date().toISOString()
        }
      },
      { status: 500 }
    );
  }
} 