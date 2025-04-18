import { createClient } from '@supabase/supabase-js';

// Explicitly log all environment variables for debugging
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('Environment Variables Overview:', {
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
console.log('Direct Supabase URL:', supabaseUrl?.substring(0, 12) + '...' || 'undefined');
console.log('Direct Supabase Key:', supabaseAnonKey?.substring(0, 6) + '...' || 'undefined');

// Fallback to empty string if undefined
supabaseUrl = supabaseUrl || '';
supabaseAnonKey = supabaseAnonKey || '';

// Debug Supabase setup without exposing keys
console.log('Supabase configuration check:', {
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
  status: 'queued' | 'processing' | 'completed' | 'failed';
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
  console.log('Supabase not properly configured. Using in-memory job storage as fallback.');
} else {
  console.log('Supabase client initialized, verifying connection...');
  // Attempt to verify connection and ensure the jobs table exists
  verifySupabaseConnection().catch(err => {
    console.warn('Failed to verify Supabase connection:', err.message);
  });
}

// In-memory fallback store for development or when Supabase isn't configured
const inMemoryJobs: Record<string, JobData> = {};

// Function to verify the Supabase connection
async function verifySupabaseConnection() {
  if (!isSupabaseConfigured) return;
  
  try {
    console.log('Checking Supabase connection...');
    
    // First try to directly query if the jobs table exists
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .limit(1);
    
    if (error) {
      // Table might not exist
      if (error.code === '42P01') {
        console.log('Jobs table does not exist, will attempt to create it');
        await ensureJobsTableExists();
      } else {
        console.error('Supabase connection verification failed:', {
          message: error.message,
          code: error.code,
          details: error.details
        });
      }
    } else {
      console.log('Supabase connection verified successfully, jobs table exists');
      // Check to see if we have the right columns
      await checkTableStructure(data);
    }
  } catch (error: any) {
    console.error('Error verifying Supabase connection:', {
      message: error.message,
      stack: error.stack?.substring(0, 200)
    });
    
    // If this is a network error, disable Supabase
    if (error.message?.includes('fetch failed') || 
        error.message?.includes('network error') ||
        error instanceof TypeError) {
      console.warn('Disabling Supabase due to connection issues');
      supabaseDisabled = true;
    }
  }
}

// Check and adapt to existing table structure
async function checkTableStructure(sampleData: any[]) {
  if (sampleData && sampleData.length > 0) {
    // Log the structure we found for debugging
    const firstRow = sampleData[0];
    console.log('Found existing jobs table with columns:', Object.keys(firstRow).join(', '));
  }
}

// Function to check and create the jobs table if it doesn't exist
async function ensureJobsTableExists() {
  if (!isSupabaseConfigured) return;
  
  try {
    console.log('Attempting to create jobs table...');
    
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
        console.error('Failed to create jobs table via SQL:', createError);
        
        // Try an alternative approach - using the insert API
        console.log('Trying to create jobs table via insert...');
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
          console.error('Cannot create jobs table automatically:', insertError);
          console.error('Please create the jobs table manually with this SQL:');
          console.error(createTableSQL);
        } else {
          console.log('Jobs table created successfully through insert');
          
          // Clean up test record
          await supabase.from('jobs').delete().eq('id', 0);
        }
      } else {
        console.log('Jobs table created successfully through SQL');
      }
    } catch (sqlError: any) {
      console.error('Error executing SQL:', sqlError.message);
    }
  } catch (error: any) {
    console.error('Error ensuring jobs table exists:', error.message);
    // This error is handled gracefully, we'll just use in-memory storage
  }
}

// Convert string ID to a numeric hash if needed for Supabase compatibility
function getDbCompatibleId(id: string): number {
  // If the ID is already numeric, return it as is
  if (!isNaN(Number(id))) {
    return Number(id);
  }
  
  // Simple hash function to convert string to number 
  // This helps if Supabase table requires numeric IDs
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    const char = id.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Ensure positive number by using absolute value
  return Math.abs(hash);
}

// Check if Supabase should be used
function shouldUseSupabase(): boolean {
  return isSupabaseConfigured && !supabaseDisabled;
}

// Handle Supabase errors consistently
function handleSupabaseError(error: any): void {
  console.error('Supabase operation failed:', {
    message: error.message,
    name: error.name,
    code: error.code,
    hint: error.hint,
    details: error.details,
    isTypeError: error instanceof TypeError
  });
  
  // If we get a fetch error, disable Supabase for this session
  if (error instanceof TypeError && 
      (error.message?.includes('fetch failed') || error.message?.includes('network error'))) {
    console.warn('Disabling Supabase due to connectivity issues. Using in-memory storage as fallback.');
    supabaseDisabled = true;
  }
}

// Function to create or update a job
export async function updateJobStatus(
  jobId: string, 
  status: string, 
  data?: { result?: any; error?: string }
): Promise<boolean> {
  // Create in-memory fallback entry
  const memoryJob: JobData = {
    id: jobId,
    status: status as any,
    result: data?.result || undefined,
    error: data?.error || undefined,
    created_at: inMemoryJobs[jobId]?.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // Save to in-memory store
  inMemoryJobs[jobId] = memoryJob;

  // If we shouldn't use Supabase, return early with success
  if (!shouldUseSupabase()) {
    return true;
  }

  try {
    const dbId = getDbCompatibleId(jobId);
    
    // Ensure result is properly serialized before sending to Supabase
    let safeResult = null;
    if (data?.result) {
      try {
        // Log coordinates before serialization if they exist
        if (data.result?.itinerary?.days) {
          console.log('Checking coordinates before serialization...');
          const days = data.result.itinerary.days;
          let hasCoordinateIssues = false;
          
          for (let i = 0; i < days.length; i++) {
            const day = days[i];
            if (day.activities && Array.isArray(day.activities)) {
              for (let j = 0; j < day.activities.length; j++) {
                const activity = day.activities[j];
                if (!activity.coordinates || typeof activity.coordinates !== 'object') {
                  console.error(`Missing coordinates in day ${i}, activity ${j}: ${activity.title}`);
                  hasCoordinateIssues = true;
                } else {
                  if (activity.coordinates.lat === undefined || activity.coordinates.lng === undefined) {
                    console.error(`Incomplete coordinates in day ${i}, activity ${j}: ${JSON.stringify(activity.coordinates)}`);
                    hasCoordinateIssues = true;
                  }
                }
              }
            }
          }
          
          if (!hasCoordinateIssues) {
            console.log('All coordinates look valid before serialization');
          }
        }
        
        // Test serialization first to catch any issues
        JSON.stringify(data.result);
        safeResult = data.result;
      } catch (e) {
        console.error('Failed to serialize job result to JSON:', e);
        safeResult = { error: 'Result contained unserializable data' };
      }
    }
    
    console.log(`Updating job ${jobId} (dbId: ${dbId}) status to ${status}`);
    
    // First, get the current job to preserve created_at
    let created_at = memoryJob.created_at;
    try {
      const { data: existingJob } = await supabase
        .from('jobs')
        .select('created_at')
        .eq('id', dbId)
        .single();
      
      if (existingJob?.created_at) {
        created_at = existingJob.created_at;
        console.log(`Using existing created_at timestamp: ${created_at}`);
      } else {
        console.log(`No existing created_at found, using default created_at: ${created_at}`);
      }
    } catch (err) {
      console.log(`Could not fetch existing job, using default created_at: ${created_at}`);
    }
    
    // Now update with the preserved created_at
    const { error } = await supabase
      .from('jobs')
      .upsert({
        id: dbId,
        status,
        result: safeResult,
        error: data?.error || null,
        created_at: created_at,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      });

    if (error) {
      console.error('Error updating job status in Supabase:', {
        code: error.code,
        message: error.message,
        details: error.details,
        jobId,
        dbId,
        status
      });
    } else {
      console.log(`Successfully updated job ${jobId} in Supabase`);
    }
  } catch (error) {
    handleSupabaseError(error);
  }
  
  // Always return true since we saved to in-memory storage
  return true;
}

// Get the status of a job
export async function getJobStatus(jobId: string): Promise<{ status: string; result?: any; error?: string }> {
  // First check in-memory cache for faster response and fallback
  const memoryJob = inMemoryJobs[jobId];
  
  // Not even in memory
  if (!memoryJob) {
    return { status: 'not_found' };
  }
  
  // If Supabase is disabled or improperly configured, only use in-memory storage
  if (!shouldUseSupabase()) {
    return {
      status: memoryJob.status,
      result: memoryJob.result,
      error: memoryJob.error
    };
  }
  
  // Add retry logic for fetching status from Supabase
  const maxRetries = 3;
  let attempts = 0;
  
  while (attempts < maxRetries) {
    try {
      const dbId = getDbCompatibleId(jobId);
      console.log(`Fetching job status for ${jobId} (dbId: ${dbId}) from Supabase (attempt ${attempts + 1})`);
      
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', dbId)
        .maybeSingle();

      if (error) {
        console.error('Error retrieving job status from Supabase:', {
          message: error.message,
          code: error.code,
          details: error.details,
          jobId,
          dbId,
          attempt: attempts + 1
        });
        
        attempts++;
        if (attempts < maxRetries) {
          // Wait before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, attempts)));
          continue;
        }
        
        // Fall back to in-memory after all retries
        console.log(`All ${maxRetries} attempts to fetch job from Supabase failed, using in-memory data`);
        handleSupabaseError(error);
        return {
          status: memoryJob.status,
          result: memoryJob.result,
          error: memoryJob.error
        };
      }

      if (!data) {
        console.log(`Job ${jobId} not found in Supabase, using in-memory data`);
        // Not found in DB but in memory, return memory version
        return {
          status: memoryJob.status,
          result: memoryJob.result,
          error: memoryJob.error
        };
      }
      
      console.log(`Successfully retrieved job ${jobId} status from Supabase: ${data.status}`);
      
      // Update in-memory store to keep in sync
      inMemoryJobs[jobId] = {
        id: jobId,
        status: data.status,
        result: data.result,
        error: data.error,
        created_at: data.created_at,
        updated_at: data.updated_at
      };
      
      return {
        status: data.status,
        result: data.result,
        error: data.error
      };
    } catch (error) {
      attempts++;
      console.error(`Error fetching job status (attempt ${attempts}):`, error);
      
      if (attempts < maxRetries) {
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, attempts)));
        continue;
      }
      
      // All retries failed, fall back to in-memory
      handleSupabaseError(error);
      return {
        status: memoryJob.status,
        result: memoryJob.result,
        error: memoryJob.error
      };
    }
  }
  
  // This should never be reached due to the returns in the loop, but TypeScript needs it
  return {
    status: memoryJob.status,
    result: memoryJob.result,
    error: memoryJob.error
  };
}

// Function to create a new job
export async function createJob(jobId: string): Promise<boolean> {
  // Create in-memory entry
  const memoryJob: JobData = {
    id: jobId,
    status: 'queued',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  // Save to in-memory store
  inMemoryJobs[jobId] = memoryJob;

  // If we shouldn't use Supabase, return early with success
  if (!shouldUseSupabase()) {
    console.log(`Created job ${jobId} in memory only (Supabase disabled)`);
    return true;
  }

  try {
    const dbId = getDbCompatibleId(jobId);
    console.log(`Creating job ${jobId} (dbId: ${dbId}) in Supabase`);
    
    const { error } = await supabase
      .from('jobs')
      .insert({
        id: dbId,
        status: 'queued',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error creating job in Supabase:', {
        code: error.code,
        message: error.message,
        details: error.details,
        jobId,
        dbId
      });
    } else {
      console.log(`Successfully created job ${jobId} in Supabase`);
    }
  } catch (error) {
    handleSupabaseError(error);
  }
  
  // Always return true since we saved to in-memory storage
  return true;
} 