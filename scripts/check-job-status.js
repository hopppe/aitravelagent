#!/usr/bin/env node

/**
 * Utility script to check and fix job status in Supabase
 * 
 * Usage:
 * node check-job-status.js <job_id> [--fix] [--status <status>]
 * 
 * Options:
 * --fix          Attempt to fix the job if it's stuck
 * --status       Set job status to this value (completed, failed)
 * 
 * Example:
 * node check-job-status.js job_1745073759779_kmiqjjt --fix --status completed
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Parse command line args
const args = process.argv.slice(2);
const jobId = args[0];
const shouldFix = args.includes('--fix');
const statusIndex = args.indexOf('--status');
const newStatus = statusIndex >= 0 && args.length > statusIndex + 1 ? args[statusIndex + 1] : 'completed';

if (!jobId) {
  console.error('Please provide a job ID as the first argument');
  process.exit(1);
}

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or key in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Helper to extract job ID components
function parseJobId(fullJobId) {
  // Format: job_TIMESTAMP_RANDOM
  const parts = fullJobId.split('_');
  if (parts.length !== 3 || parts[0] !== 'job') {
    console.error(`Invalid job ID format: ${fullJobId}`);
    return { dbId: null, fullId: fullJobId };
  }
  
  return {
    dbId: parts[1], // This is the database ID (timestamp)
    fullId: fullJobId
  };
}

async function checkJob() {
  try {
    console.log(`Checking job status for: ${jobId}`);
    const { dbId, fullId } = parseJobId(jobId);
    
    if (!dbId) {
      return;
    }
    
    console.log(`Using database ID: ${dbId}`);
    
    // First try with the numeric ID
    const { data: job, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', dbId)
      .maybeSingle();
    
    if (error) {
      console.error('Error fetching job by numeric ID:', error);
      return;
    }
    
    if (!job) {
      console.log(`No job found with numeric ID ${dbId}, trying full ID...`);
      
      // Try with the full job ID
      const { data: jobByFullId, error: fullIdError } = await supabase
        .from('jobs')
        .select('*')
        .eq('job_id', fullId)
        .maybeSingle();
      
      if (fullIdError) {
        console.error('Error fetching job by full ID:', fullIdError);
        return;
      }
      
      if (!jobByFullId) {
        console.error(`Job ${jobId} not found in the database`);
        return;
      }
      
      processJobData(jobByFullId);
    } else {
      processJobData(job);
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

function processJobData(job) {
  // Display job details
  console.log('\nJob Details:');
  console.log(`- ID: ${job.id}`);
  console.log(`- Job ID: ${job.job_id || 'N/A'}`);
  console.log(`- Status: ${job.status}`);
  console.log(`- Created At: ${job.created_at}`);
  console.log(`- Updated At: ${job.updated_at}`);
  console.log(`- Has Result: ${!!job.result}`);
  console.log(`- Has Error: ${!!job.error}`);
  
  if (job.error) {
    console.log(`- Error: ${job.error}`);
  }
  
  // Check if job is stuck
  const isStuck = job.status === 'processing' && 
    new Date(job.updated_at).getTime() < (Date.now() - 5 * 60 * 1000); // 5 minutes
  
  if (isStuck) {
    console.log('\nThis job appears to be stuck in processing state.');
    
    if (shouldFix) {
      updateJobStatus(job.id, newStatus);
    } else {
      console.log('\nTo fix this job, run this command with --fix flag:');
      console.log(`node check-job-status.js ${jobId} --fix --status completed`);
    }
  } else if (shouldFix) {
    console.log(`\nForcing job status update to "${newStatus}"...`);
    updateJobStatus(job.id, newStatus);
  }
}

async function updateJobStatus(id, status) {
  const updateData = { 
    status: status,
    updated_at: new Date().toISOString()
  };
  
  if (status === 'failed') {
    updateData.error = 'Manually marked as failed due to stuck processing state';
  }
  
  const { error: updateError } = await supabase
    .from('jobs')
    .update(updateData)
    .eq('id', id);
  
  if (updateError) {
    console.error('Error updating job:', updateError);
  } else {
    console.log(`Successfully updated job status to "${status}"`);
  }
}

checkJob(); 