import { createClient } from '@supabase/supabase-js';
import { createLogger } from './logger';

// Create a logger for the Supabase module
const logger = createLogger('supabase');

// Explicitly log all environment variables for debugging
logger.info('Supabase initialization', {
  NODE_ENV: process.env.NODE_ENV,
  hasProcessEnv: typeof process !== 'undefined' && !!process.env,
  nodeEnv: process.env.NODE_ENV,
  hasSbUrl: 'NEXT_PUBLIC_SUPABASE_URL' in process.env,
  hasSbKey: 'NEXT_PUBLIC_SUPABASE_ANON_KEY' in process.env,
  nextConfig: typeof process.env.NEXT_CONFIG_AVAILABLE === 'string',
  envVarCount: Object.keys(process.env).filter(key => key.startsWith('NEXT_')).length
});

// Supabase client setup
// Directly access variables for debugging rather than using || '' pattern initially
let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
let supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Debug Supabase setup without exposing keys
logger.debug('Supabase credentials', {
  urlPrefix: supabaseUrl?.substring(0, 12) + '...' || 'undefined',
  keyPrefix: supabaseAnonKey?.substring(0, 6) + '...' || 'undefined',
});

// Fallback to empty string if undefined
supabaseUrl = supabaseUrl || '';
supabaseAnonKey = supabaseAnonKey || '';

// Debug Supabase setup without exposing keys
logger.info('Supabase configuration check', {
  hasUrl: Boolean(supabaseUrl),
  urlLength: supabaseUrl?.length || 0,
  urlPrefix: supabaseUrl?.substring(0, 8) || '',
  hasKey: Boolean(supabaseAnonKey),
  keyLength: supabaseAnonKey?.length || 0,
  keyPrefix: supabaseAnonKey?.substring(0, 4) || ''
});

// Type definition for job data
export type JobData = {
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'not_found';
  result?: any;
  error?: string;
  created_at?: string;
  updated_at: string;
};

// Check if Supabase is configured properly
const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// In-memory store to track if Supabase connectivity failed during runtime
let supabaseDisabled = false;

// Initialize the Supabase client with explicit options for better reliability
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          'Content-Type': 'application/json'
        },
      },
      db: {
        schema: 'public'
      }
    })
  : createClient('https://placeholder-url.supabase.co', 'placeholder-key', {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

// Log initialization status
if (!isSupabaseConfigured) {
  logger.warn('Supabase not properly configured. Using in-memory job storage as fallback.');
} else {
  logger.info('Supabase client initialized, verifying connection...');
  // Attempt to verify connection and ensure the jobs table exists
  verifySupabaseConnection().catch(err => {
    logger.error('Failed to verify Supabase connection:', err.message);
  });
}

// In-memory fallback store for development or when Supabase isn't configured
const inMemoryJobs: Record<string, JobData> = {};

// Function to verify the Supabase connection
async function verifySupabaseConnection() {
  if (!isSupabaseConfigured) return;
  
  try {
    logger.info('Checking Supabase connection...');
    
    // First try to directly query if the jobs table exists
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .limit(1);
    
    if (error) {
      // Table might not exist
      if (error.code === '42P01') {
        logger.warn('Jobs table does not exist, will attempt to create it');
        await ensureJobsTableExists();
      } else {
        logger.error('Supabase connection verification failed:', {
          message: error.message,
          code: error.code,
          details: error.details
        });
      }
    } else {
      logger.info('Supabase connection verified successfully, jobs table exists');
      // Check to see if we have the right columns
      await checkTableStructure(data);
    }
  } catch (error: any) {
    logger.error('Error verifying Supabase connection:', {
      message: error.message,
      stack: error.stack?.substring(0, 200)
    });
    
    // If this is a network error, disable Supabase
    if (error.message?.includes('fetch failed') || 
        error.message?.includes('network error') ||
        error instanceof TypeError) {
      logger.warn('Disabling Supabase due to connection issues');
      supabaseDisabled = true;
    }
  }
}

// Check and adapt to existing table structure
async function checkTableStructure(sampleData: any[]) {
  if (sampleData && sampleData.length > 0) {
    // Log the structure we found for debugging
    const firstRow = sampleData[0];
    logger.debug('Found existing jobs table with columns:', Object.keys(firstRow).join(', '));
  }
}

// Function to check and create the jobs table if it doesn't exist
async function ensureJobsTableExists() {
  if (!isSupabaseConfigured) return;
  
  try {
    logger.info('Attempting to create jobs table...');
    
    // Check if we have permission to execute SQL
    try {
      // First, try to create a simple table with the minimum required fields
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS jobs (
          id BIGINT PRIMARY KEY,
          status TEXT,
          result JSONB,
          error TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `;
      
      const { error: createError } = await supabase.rpc('execute_sql', { sql: createTableSQL });
      
      if (createError) {
        logger.error('Failed to create jobs table via SQL:', createError);
        
        // Try an alternative approach - using the insert API
        logger.info('Trying to create jobs table via insert...');
        const { error: insertError } = await supabase
          .from('jobs')
          .insert({
            id: 0,
            status: 'test',
            result: null,
            error: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
          
        if (insertError) {
          // If Supabase doesn't let us create the table, log what needs to be created
          logger.error('Cannot create jobs table automatically:', insertError);
          logger.error('Please create the jobs table manually with this SQL:');
          logger.error(createTableSQL);
        } else {
          logger.info('Jobs table created successfully through insert');
          
          // Clean up test record
          await supabase.from('jobs').delete().eq('id', 0);
        }
      } else {
        logger.info('Jobs table created successfully through SQL');
      }
    } catch (sqlError: any) {
      logger.error('Error executing SQL:', sqlError.message);
    }
  } catch (error: any) {
    logger.error('Error ensuring jobs table exists:', error);
  }
}

// Helper function to convert job ID to database-compatible ID
function getDbCompatibleId(id: string): number {
  // If the ID is already numeric, return it as is
  if (!isNaN(Number(id))) {
    return Number(id);
  }
  
  // For job IDs that start with a timestamp (job_ or debug_), extract the timestamp
  const timestampMatch = id.match(/^(job|debug|test)_(\d+)/);
  if (timestampMatch && !isNaN(Number(timestampMatch[2]))) {
    // Use the timestamp portion as the numeric ID
    return Number(timestampMatch[2]);
  }

  // For any other IDs, use a hash function to generate a numeric ID
  let hash = 0;
  const prime = 31; // Use a prime number for better distribution
  
  for (let i = 0; i < id.length; i++) {
    // Get the character code
    const char = id.charCodeAt(i);
    // Multiply the current hash by the prime and add the character code
    hash = Math.imul(hash, prime) + char | 0;
  }
  
  // Ensure positive number by using absolute value
  return Math.abs(hash);
}

// Helper function to determine if we should use Supabase
function shouldUseSupabase(): boolean {
  return isSupabaseConfigured && !supabaseDisabled;
}

// Helper function to handle and log Supabase errors
function handleSupabaseError(error: any): void {
  logger.error('Supabase operation failed:', {
    message: error.message,
    code: error.code,
    details: error.details || error.stack?.substring(0, 200)
  });
  
  // If this is a network error, disable Supabase for future operations
  if (error.message?.includes('fetch failed') || 
      error.message?.includes('network error') ||
      error instanceof TypeError) {
    logger.warn('Disabling Supabase due to connection issues');
    supabaseDisabled = true;
  }
}

// Update the status of a job
export async function updateJobStatus(
  jobId: string, 
  status: 'queued' | 'processing' | 'completed' | 'failed', 
  data?: { result?: any; error?: string }
): Promise<boolean> {
  const updateTime = new Date().toISOString();
  const dbId = getDbCompatibleId(jobId);
  
  logger.info(`Updating job status: ${jobId} -> ${status}`, { 
    dbId, 
    hasResult: !!data?.result, 
    hasError: !!data?.error 
  });

  if (shouldUseSupabase()) {
    try {
      const updateData: any = {
        status,
        updated_at: updateTime
      };
      
      if (data) {
        if (data.result !== undefined) {
          updateData.result = data.result;
        }
        
        if (data.error !== undefined) {
          updateData.error = data.error;
        }
      }
      
      logger.debug(`Supabase update job ${jobId} with data:`, updateData);
      
      // Implement retry logic for job updates
      let retries = 0;
      const maxRetries = 3;
      let success = false;
      
      while (retries < maxRetries && !success) {
        const { error } = await supabase
          .from('jobs')
          .update(updateData)
          .eq('id', dbId);
        
        if (error) {
          logger.warn(`Failed to update job status (attempt ${retries + 1}):`, error);
          retries++;
          
          if (retries < maxRetries) {
            // Wait a bit before retrying (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, 200 * Math.pow(2, retries)));
          } else {
            handleSupabaseError(error);
            break;
          }
        } else {
          logger.info(`Job ${jobId} status updated successfully to ${status}`);
          success = true;
        }
      }
      
      return success;
    } catch (error) {
      handleSupabaseError(error);
      // Fallback to in-memory storage
      logger.info(`Falling back to in-memory storage for job ${jobId}`);
    }
  }
  
  // Fallback to in-memory storage if Supabase is not available
  if (!inMemoryJobs[jobId]) {
    inMemoryJobs[jobId] = {
      id: jobId,
      status: status,
      updated_at: updateTime
    };
  } else {
    inMemoryJobs[jobId].status = status;
    inMemoryJobs[jobId].updated_at = updateTime;
  }
  
  if (data) {
    if (data.result !== undefined) {
      inMemoryJobs[jobId].result = data.result;
    }
    
    if (data.error !== undefined) {
      inMemoryJobs[jobId].error = data.error;
    }
  }
  
  logger.info(`Updated in-memory job ${jobId} status to ${status}`);
  return true;
}

// Get the status of a job
export async function getJobStatus(jobId: string): Promise<{ status: string; result?: any; error?: string }> {
  const dbId = getDbCompatibleId(jobId);
  
  logger.info(`Getting status for job: ${jobId} (db id: ${dbId})`);
  
  if (shouldUseSupabase()) {
    try {
      logger.debug(`Querying Supabase for job ${jobId}`);
      
      // Implement retry logic for job status fetching
      let retries = 0;
      const maxRetries = 3;
      
      while (retries < maxRetries) {
        const { data, error } = await supabase
          .from('jobs')
          .select('status, result, error, updated_at')
          .eq('id', dbId)
          .single();
        
        if (error) {
          logger.warn(`Failed to get job status (attempt ${retries + 1}):`, error);
          retries++;
          
          if (retries < maxRetries) {
            // Wait a bit before retrying (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, 200 * Math.pow(2, retries)));
          } else {
            handleSupabaseError(error);
            break;
          }
        } else if (data) {
          logger.info(`Job ${jobId} status retrieved: ${data.status}`, {
            hasResult: !!data.result,
            hasError: !!data.error,
            updatedAt: data.updated_at
          });
          
          return {
            status: data.status,
            result: data.result,
            error: data.error
          };
        } else {
          logger.warn(`Job ${jobId} not found in database`);
          // No data found, break the loop
          break;
        }
      }
      
      // At this point, either we hit max retries or no data was found
      // Try fallback to in-memory storage
      logger.info(`Supabase lookup failed, checking in-memory storage for job ${jobId}`);
    } catch (error) {
      handleSupabaseError(error);
      logger.info(`Falling back to in-memory storage for job ${jobId} after error`);
    }
  }
  
  // Fallback to in-memory storage
  if (inMemoryJobs[jobId]) {
    logger.info(`Found job ${jobId} in memory with status: ${inMemoryJobs[jobId].status}`);
    return {
      status: inMemoryJobs[jobId].status,
      result: inMemoryJobs[jobId].result,
      error: inMemoryJobs[jobId].error
    };
  }
  
  logger.warn(`Job ${jobId} not found in any storage`);
  return { status: 'not_found' };
}

// Create a new job
export async function createJob(jobId: string): Promise<boolean> {
  const dbId = getDbCompatibleId(jobId);
  const timestamp = new Date().toISOString();
  
  logger.info(`Creating new job: ${jobId} (db id: ${dbId})`);
  
  if (shouldUseSupabase()) {
    try {
      // Implement retry logic for job creation
      let retries = 0;
      const maxRetries = 3;
      let success = false;
      
      while (retries < maxRetries && !success) {
        // Try to insert a new job
        const { error } = await supabase
          .from('jobs')
          .insert({
            id: dbId,
            status: 'queued',
            created_at: timestamp,
            updated_at: timestamp
          });
        
        if (error) {
          logger.warn(`Failed to create job (attempt ${retries + 1}):`, error);
          retries++;
          
          if (retries < maxRetries) {
            // Wait a bit before retrying (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, 200 * Math.pow(2, retries)));
          } else {
            handleSupabaseError(error);
            break;
          }
        } else {
          logger.info(`Job ${jobId} created successfully`);
          success = true;
        }
      }
      
      if (success) {
        return true;
      }
      
      // If we get here, we hit max retries
      logger.info(`Supabase job creation failed after retries, falling back to in-memory`);
    } catch (error) {
      handleSupabaseError(error);
      logger.info(`Falling back to in-memory storage for job ${jobId} creation`);
    }
  }
  
  // Fallback to in-memory storage
  inMemoryJobs[jobId] = {
    id: jobId,
    status: 'queued',
    created_at: timestamp,
    updated_at: timestamp
  };
  
  logger.info(`Created in-memory job ${jobId}`);
  return true;
}

// Export the in-memory jobs for debugging
export function getInMemoryJobs() {
  return { ...inMemoryJobs };
}

// Function to count jobs by status - useful for diagnostics
export async function countJobsByStatus(): Promise<Record<string, number>> {
  if (shouldUseSupabase()) {
    try {
      logger.debug('Counting jobs by status from Supabase');
      
      // Fetch all jobs
      const { data, error } = await supabase
        .from('jobs')
        .select('status')
        .order('created_at', { ascending: false })
        .limit(500);
      
      if (error) {
        handleSupabaseError(error);
      } else if (data) {
        // Count jobs by status
        const statusCounts: Record<string, number> = {};
        data.forEach(job => {
          statusCounts[job.status] = (statusCounts[job.status] || 0) + 1;
        });
        
        logger.info('Job count by status:', statusCounts);
        return statusCounts;
      }
    } catch (error) {
      handleSupabaseError(error);
    }
  }
  
  // Fallback to in-memory count
  const statusCounts: Record<string, number> = {};
  Object.values(inMemoryJobs).forEach(job => {
    statusCounts[job.status] = (statusCounts[job.status] || 0) + 1;
  });
  
  logger.info('In-memory job count by status:', statusCounts);
  return statusCounts;
}

// Get recent jobs for diagnostics
export async function getRecentJobs(limit = 50): Promise<JobData[]> {
  if (shouldUseSupabase()) {
    try {
      logger.debug(`Fetching ${limit} recent jobs from Supabase`);
      
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) {
        handleSupabaseError(error);
      } else if (data) {
        logger.info(`Retrieved ${data.length} recent jobs from Supabase`);
        return data;
      }
    } catch (error) {
      handleSupabaseError(error);
    }
  }
  
  // Fallback to in-memory jobs
  const jobs = Object.values(inMemoryJobs)
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
    .slice(0, limit);
  
  logger.info(`Retrieved ${jobs.length} recent jobs from in-memory storage`);
  return jobs;
} 