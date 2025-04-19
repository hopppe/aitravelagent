import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

// Helper function to list all jobs in the database
export async function GET(request: Request) {
  try {
    console.log('Fetching all jobs from database for debugging');
    
    // Get all jobs from the database, limited to 100 to prevent overload
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
      
    if (error) {
      console.error('Error fetching jobs from database:', error);
      return NextResponse.json({
        success: false,
        error: {
          message: error.message,
          code: error.code
        }
      }, { status: 500 });
    }
    
    // Return the jobs with some statistics
    const jobsByStatus = data.reduce((acc: {[key: string]: number}, job) => {
      acc[job.status] = (acc[job.status] || 0) + 1;
      return acc;
    }, {});
    
    return NextResponse.json({
      success: true,
      count: data.length,
      statistics: {
        byStatus: jobsByStatus,
        recentJobTime: data.length > 0 ? new Date(data[0].created_at) : null
      },
      jobs: data.map(job => ({
        id: job.id,
        status: job.status,
        created_at: job.created_at,
        updated_at: job.updated_at,
        hasResult: !!job.result,
        hasError: !!job.error
      }))
    });
  } catch (error: any) {
    console.error('Error in debug-jobs-list endpoint:', error);
    return NextResponse.json({
      success: false,
      error: {
        message: error.message
      }
    }, { status: 500 });
  }
} 