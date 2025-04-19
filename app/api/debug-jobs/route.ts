import { NextResponse } from 'next/server';
import { getRecentJobs, countJobsByStatus, getInMemoryJobs } from '../../../lib/supabase';
import { createLogger } from '../../../lib/logger';
import * as fs from 'fs';
import * as path from 'path';

const logger = createLogger('debug-jobs-api');

// API endpoint for debugging job processing
export async function GET(request: Request) {
  try {
    logger.info('Debug jobs API called');
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const action = searchParams.get('action') || 'recent';
    
    // Get environment and config information
    const envInfo = {
      apiVersion: '1.0',
      nodeEnv: process.env.NODE_ENV,
      hasSupabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      hasSupabaseKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      hasOpenAIKey: Boolean(process.env.OPENAI_API_KEY?.startsWith('sk-')),
      serverTime: new Date().toISOString()
    };
    
    // Different actions based on the query parameter
    if (action === 'count') {
      // Get job counts by status
      const statusCounts = await countJobsByStatus();
      return NextResponse.json({
        success: true,
        environment: envInfo,
        counts: statusCounts
      });
    } 
    else if (action === 'memory') {
      // Get the in-memory jobs
      const memoryJobs = getInMemoryJobs();
      return NextResponse.json({
        success: true,
        environment: envInfo,
        inMemoryJobs: memoryJobs
      });
    }
    else if (action === 'logs') {
      // Read recent logs
      const logs = await getRecentLogs(limit);
      return NextResponse.json({
        success: true,
        environment: envInfo,
        logs
      });
    }
    else {
      // Default action - get recent jobs
      const recentJobs = await getRecentJobs(limit);
      
      // Simplify the response to avoid large payloads
      const simplifiedJobs = recentJobs.map(job => ({
        id: job.id,
        status: job.status,
        created_at: job.created_at,
        updated_at: job.updated_at,
        error: job.error,
        hasResult: !!job.result,
        resultSize: job.result ? JSON.stringify(job.result).length : 0
      }));
      
      return NextResponse.json({
        success: true,
        environment: envInfo,
        jobCount: recentJobs.length,
        jobs: simplifiedJobs
      });
    }
  } catch (error: any) {
    logger.error('Error in debug-jobs API:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

// Helper to read recent logs
async function getRecentLogs(limit: number = 100): Promise<string[]> {
  try {
    const logDir = process.env.LOG_DIR || 'logs';
    const logFile = process.env.LOG_FILE || 'app.log';
    const logPath = path.join(process.cwd(), logDir, logFile);
    
    // Check if the log file exists
    if (!fs.existsSync(logPath)) {
      return [`Log file not found at ${logPath}`];
    }
    
    // Read the log file
    const logContent = fs.readFileSync(logPath, 'utf8');
    
    // Split into lines and get the most recent ones
    const logLines = logContent.split('\n')
      .filter(line => line.trim() !== '')
      // Sanitize the lines to ensure valid JSON when returned
      .map(line => line.replace(/\\/g, '\\\\').replace(/"/g, '\\"'));
    
    // Return the most recent logs (up to the limit)
    return logLines.slice(-limit);
  } catch (error: any) {
    logger.error('Error reading logs:', error);
    return [`Error reading logs: ${error.message}`];
  }
} 