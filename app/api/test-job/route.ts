import { NextResponse } from 'next/server';
import { createJob, getJobStatus, updateJobStatus } from '../../../lib/supabase';
import { generateJobId } from '../job-processor';

export async function GET(request: Request) {
  try {
    // Generate a test job ID
    const jobId = `test_job_${Date.now()}`;
    
    // Create a job
    console.log('Creating test job:', jobId);
    await createJob(jobId);
    
    // Update job status
    console.log('Updating test job status to processing:', jobId);
    await updateJobStatus(jobId, 'processing');
    
    // Check job status
    console.log('Fetching test job status:', jobId);
    const job = await getJobStatus(jobId);
    
    // Complete the job
    console.log('Completing test job:', jobId);
    await updateJobStatus(jobId, 'completed', { 
      result: { message: 'Test job completed successfully' } 
    });
    
    // Check final status
    const finalJob = await getJobStatus(jobId);
    
    return NextResponse.json({
      success: true,
      message: 'Job system test completed successfully',
      initialJob: job,
      finalJob: finalJob
    });
  } catch (error: any) {
    console.error('Test job error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown error'
    }, { 
      status: 500 
    });
  }
} 