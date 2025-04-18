import { NextResponse } from 'next/server';
import { createJob, updateJobStatus, getJobStatus, supabase } from '../../../../lib/supabase';

export const dynamic = 'force-dynamic'; // Prevent caching

export async function GET(request: Request) {
  try {
    console.log('Running job system test...');
    
    // Run connection test
    const connectionStatus = await testSupabaseConnection();
    
    // Create a test job
    const jobId = `test_job_${Date.now()}`;
    console.log(`Creating test job with ID: ${jobId}`);
    
    const created = await createJob(jobId);
    if (!created) {
      return NextResponse.json({
        success: false,
        message: 'Failed to create test job',
        connectionStatus
      }, { status: 500 });
    }
    
    // Get initial job status
    const initialJob = await getJobStatus(jobId);
    console.log('Initial job status:', initialJob);
    
    // Wait briefly to let any potential race conditions resolve
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Update job status
    const updated = await updateJobStatus(jobId, 'processing');
    if (!updated) {
      return NextResponse.json({
        success: false,
        message: 'Failed to update job to processing status',
        initialJob,
        connectionStatus
      }, { status: 500 });
    }
    
    // Get intermediate status to verify the update
    const processingJob = await getJobStatus(jobId);
    
    // Set to completed status
    const completed = await updateJobStatus(jobId, 'completed', {
      result: {
        message: 'Test job completed successfully'
      }
    });
    
    if (!completed) {
      return NextResponse.json({
        success: false,
        message: 'Failed to update job to completed status',
        initialJob, 
        processingJob,
        connectionStatus
      }, { status: 500 });
    }
    
    // Wait briefly to let any potential race conditions resolve
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Verify final status
    const finalJob = await getJobStatus(jobId);
    console.log('Final job status:', finalJob);
    
    // Test network calls
    const fetchTest = await testFetch();
    
    return NextResponse.json({
      success: true,
      message: 'Job system test completed successfully',
      initialJob,
      processingJob,
      finalJob,
      connectionStatus,
      fetchTest
    });
    
  } catch (error: any) {
    console.error('Job system test failed:', error);
    return NextResponse.json({
      success: false,
      message: `Job system test error: ${error.message}`,
      error: {
        message: error.message,
        stack: error.stack?.substring(0, 500)
      }
    }, { status: 500 });
  }
}

// Test connection to Supabase
async function testSupabaseConnection() {
  try {
    // Check environment variables first
    const envStatus = {
      hasUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      urlLength: process.env.NEXT_PUBLIC_SUPABASE_URL?.length || 0,
      hasKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      keyLength: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0
    };
    
    console.log('Testing direct Supabase connection...');
    
    // Test simple query
    const start = Date.now();
    const { data, error } = await supabase.from('_nonexistent_test_table')
      .select('*')
      .limit(1)
      .maybeSingle();
    const duration = Date.now() - start;
    
    // Even though we expect an error (table doesn't exist), the connection worked
    // if we get a proper PostgreSQL error code
    if (error && (error.code === 'PGRST116' || error.code === '42P01')) {
      return {
        connected: true,
        message: 'Successfully connected to Supabase',
        responseTime: `${duration}ms`,
        error: {
          code: error.code,
          message: error.message
        },
        envStatus
      };
    }
    
    if (error) {
      return {
        connected: false,
        message: 'Supabase returned an error',
        responseTime: `${duration}ms`,
        error: {
          code: error.code,
          message: error.message
        },
        envStatus
      };
    }
    
    return {
      connected: true,
      message: 'Successfully connected to Supabase (unexpected success)',
      responseTime: `${duration}ms`,
      data,
      envStatus
    };
    
  } catch (error: any) {
    return {
      connected: false,
      message: 'Failed to connect to Supabase',
      error: {
        message: error.message,
        type: error.constructor.name
      },
      envStatus: {
        hasUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
        urlLength: process.env.NEXT_PUBLIC_SUPABASE_URL?.length || 0,
        hasKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
        keyLength: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0
      }
    };
  }
}

// Test network fetch capability
async function testFetch() {
  try {
    const startTime = Date.now();
    const response = await fetch('https://httpbin.org/get');
    const duration = Date.now() - startTime;
    
    if (!response.ok) {
      return {
        success: false,
        message: `HTTP error: ${response.status} ${response.statusText}`,
        responseTime: `${duration}ms`
      };
    }
    
    const data = await response.json();
    return {
      success: true,
      message: 'Network fetch test successful',
      responseTime: `${duration}ms`,
      url: data.url,
    };
  } catch (error: any) {
    return {
      success: false,
      message: 'Network fetch test failed',
      error: {
        message: error.message,
        type: error.constructor.name
      }
    };
  }
} 