import { NextResponse } from 'next/server';
import { getJobStatus } from '../../../lib/supabase';

// Remove the in-memory store and functions since we're using Supabase now

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get('jobId');
  
  if (!jobId) {
    return NextResponse.json(
      { error: 'Missing jobId parameter' },
      { status: 400 }
    );
  }
  
  const jobStatus = await getJobStatus(jobId);
  
  if (!jobStatus) {
    return NextResponse.json(
      { error: 'Job not found' },
      { status: 404 }
    );
  }
  
  return NextResponse.json(jobStatus);
} 