import { NextResponse } from 'next/server';
import { generateJobId } from '../job-processor';
import { createJob, getJobStatus } from '../../../lib/supabase';

export const runtime = 'nodejs';
export const maxDuration = 15; // 15 seconds for this debug endpoint

export async function GET(request: Request) {
  try {
    // Generate a job ID with a timestamp prefix to ensure uniqueness
    const timestamp = Date.now();
    const jobId = `debug_${timestamp}`;
    
    console.log(`Debug endpoint: Creating job with ID ${jobId}`);
    
    // Create the job
    const jobCreated = await createJob(jobId);
    
    if (!jobCreated) {
      return NextResponse.json({
        success: false,
        message: "Failed to create job",
        jobId
      }, { status: 500 });
    }
    
    console.log(`Debug endpoint: Job created, waiting 1 second before checking...`);
    
    // Wait a moment to ensure any eventual consistency issues have time to resolve
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log(`Debug endpoint: Checking job status for ${jobId}`);
    
    // Check if the job can be found
    const jobStatus = await getJobStatus(jobId);
    
    return NextResponse.json({
      success: jobStatus.status !== 'not_found',
      message: jobStatus.status === 'not_found' 
        ? "Job was created but could not be found immediately afterward" 
        : `Job was created and found with status: ${jobStatus.status}`,
      jobId,
      jobStatus,
      hashing: {
        explanation: "This shows how string IDs are converted to numeric IDs for Supabase"
      }
    });
  } catch (error: any) {
    console.error("Error in debug endpoint:", error);
    return NextResponse.json({
      success: false,
      message: "Error in debug endpoint",
      error: error.message
    }, { status: 500 });
  }
} 