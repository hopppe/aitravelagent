import { NextResponse } from 'next/server';
import { getJobStatus } from '../../../lib/supabase';

// Maximum duration to handle potential Supabase connection issues
export const maxDuration = 10; // 10 seconds for a status check should be plenty

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get('jobId');
  
  if (!jobId) {
    return NextResponse.json(
      { error: 'Missing jobId parameter' },
      { status: 400 }
    );
  }
  
  try {
    console.log(`Getting status for job ${jobId}`);
    const jobStatus = await getJobStatus(jobId);
    
    if (jobStatus.status === 'not_found') {
      console.log(`Job ${jobId} not found`);
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }
    
    console.log(`Returning job status: ${jobStatus.status}`);
    return NextResponse.json(jobStatus);
  } catch (error: any) {
    console.error(`Error retrieving job status for ${jobId}:`, error);
    return NextResponse.json(
      { error: 'Failed to retrieve job status', message: error.message },
      { status: 500 }
    );
  }
} 