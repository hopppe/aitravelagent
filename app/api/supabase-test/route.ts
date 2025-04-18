import { NextResponse } from 'next/server';
import { supabase, createJob, getJobStatus, updateJobStatus } from '../../../lib/supabase';

// Maximum duration to handle potential Supabase connection issues
export const runtime = 'nodejs';
export const maxDuration = 15; // 15 seconds for the test

// Simple test endpoint to diagnose Supabase connectivity issues
export async function GET(request: Request) {
  const results: any = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    tests: {},
    errors: [],
  };
  
  try {
    // 1. Test environment variables
    results.tests.envVars = {
      hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      urlLength: process.env.NEXT_PUBLIC_SUPABASE_URL?.length || 0,
      keyPrefix: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 5) || ''
    };
    
    // 2. Test Supabase connection
    try {
      const { data, error } = await supabase.from('jobs').select('count').limit(1);
      results.tests.connection = {
        success: !error,
        error: error ? { code: error.code, message: error.message } : null,
        data
      };
    } catch (connErr: any) {
      results.tests.connection = {
        success: false,
        error: { message: connErr.message }
      };
      results.errors.push(`Connection error: ${connErr.message}`);
    }
    
    // 3. Test job creation
    const testJobId = `test_${Date.now()}`;
    let jobCreated = false;
    
    try {
      const createResult = await createJob(testJobId);
      jobCreated = createResult;
      results.tests.createJob = {
        success: createResult,
        jobId: testJobId
      };
    } catch (createErr: any) {
      results.tests.createJob = {
        success: false,
        error: { message: createErr.message }
      };
      results.errors.push(`Job creation error: ${createErr.message}`);
    }
    
    // 4. Test job status retrieval
    if (jobCreated) {
      try {
        const statusResult = await getJobStatus(testJobId);
        results.tests.getJobStatus = {
          success: statusResult.status !== 'not_found',
          status: statusResult.status
        };
        
        if (statusResult.status === 'not_found') {
          results.errors.push(`Job status error: Job not found immediately after creation`);
        }
      } catch (statusErr: any) {
        results.tests.getJobStatus = {
          success: false,
          error: { message: statusErr.message }
        };
        results.errors.push(`Job status error: ${statusErr.message}`);
      }
      
      // 5. Test job status update
      try {
        const updateResult = await updateJobStatus(testJobId, 'completed', { 
          result: { test: 'Successful test' } 
        });
        
        results.tests.updateJobStatus = {
          success: updateResult
        };
        
        if (!updateResult) {
          results.errors.push(`Job update error: Failed to update job status`);
        }
      } catch (updateErr: any) {
        results.tests.updateJobStatus = {
          success: false,
          error: { message: updateErr.message }
        };
        results.errors.push(`Job update error: ${updateErr.message}`);
      }
    }
    
    // 6. Overall assessment
    results.success = results.errors.length === 0;
    results.message = results.success 
      ? "All Supabase connectivity tests passed successfully!" 
      : `Failed ${results.errors.length} tests. See 'errors' for details.`;
    
    return NextResponse.json(results);
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: "Error running Supabase connectivity tests",
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 