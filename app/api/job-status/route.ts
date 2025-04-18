import { NextResponse } from 'next/server';
import { getJobStatus } from '../../../lib/supabase';

// Maximum duration to handle potential Supabase connection issues
export const runtime = 'nodejs';
export const maxDuration = 10; // 10 seconds for a status check should be plenty

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
    return NextResponse.json(jobStatus);
  } catch (error: any) {
    console.error(`Error retrieving job status for ${jobId}:`, error);
    
    // Enhanced error logging
    console.error('Error details:', {
      message: error.message,
      stack: error.stack?.substring(0, 200),
      name: error.name,
      jobId
    });
    
    return NextResponse.json(
      { error: 'Failed to retrieve job status', message: error.message },
      { status: 500 }
    );
  }
} 