/**
 * Supabase connection and job handling test script
 * Usage: node scripts/test-supabase.js
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Get Supabase credentials from environment
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local');
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set');
  process.exit(1);
}

// Initialize Supabase client
console.log('Initializing Supabase client with:');
console.log(`URL: ${supabaseUrl.substring(0, 15)}...`);
console.log(`Key: ${supabaseKey.substring(0, 5)}...`);

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});

// Helper function for generating job IDs
function getDbCompatibleId(id) {
  // If the ID is already numeric, return it as is
  if (!isNaN(Number(id))) {
    return Number(id);
  }
  
  // For job IDs that start with a timestamp, extract the timestamp
  const timestampMatch = id.match(/^(job|debug|test)_(\d+)/);
  if (timestampMatch && !isNaN(Number(timestampMatch[2]))) {
    return Number(timestampMatch[2]);
  }

  // For any other IDs, use a hash function
  let hash = 0;
  const prime = 31;
  
  for (let i = 0; i < id.length; i++) {
    const char = id.charCodeAt(i);
    hash = ((hash * prime) + char) & 0xFFFFFFFF;
  }
  
  return Math.abs(hash);
}

// Test functions
async function testConnection() {
  console.log('\n--- Testing Supabase Connection ---');
  try {
    // First attempt a simple select with a limit to check connection
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('Connection test failed:', error);
      return false;
    }
    
    console.log('Connection successful!');
    
    // Now try to get the job count
    const { count, error: countError } = await supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('Count query failed:', countError);
      console.log(`Found at least ${data.length} jobs in the jobs table`);
    } else {
      console.log(`Found ${count} rows in jobs table`);
    }
    
    return true;
  } catch (err) {
    console.error('Connection test error:', err);
    return false;
  }
}

async function testJobCreation() {
  console.log('\n--- Testing Job Creation ---');
  
  const jobId = `test_${Date.now()}`;
  const dbId = getDbCompatibleId(jobId);
  
  console.log(`Creating test job with ID: ${jobId} (DB ID: ${dbId})`);
  
  try {
    const { error } = await supabase
      .from('jobs')
      .insert({
        id: dbId,
        status: 'queued',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    
    if (error) {
      console.error('Job creation failed:', error);
      return false;
    }
    
    console.log(`Job ${jobId} created successfully!`);
    return jobId;
  } catch (err) {
    console.error('Job creation error:', err);
    return false;
  }
}

async function testJobUpdate(jobId) {
  console.log('\n--- Testing Job Update ---');
  
  if (!jobId) {
    console.error('No job ID provided for update test');
    return false;
  }
  
  const dbId = getDbCompatibleId(jobId);
  console.log(`Updating job ${jobId} (DB ID: ${dbId}) to 'processing'`);
  
  try {
    const { error } = await supabase
      .from('jobs')
      .update({
        status: 'processing',
        updated_at: new Date().toISOString()
      })
      .eq('id', dbId);
    
    if (error) {
      console.error('Job update failed:', error);
      return false;
    }
    
    console.log(`Job ${jobId} updated successfully!`);
    return true;
  } catch (err) {
    console.error('Job update error:', err);
    return false;
  }
}

async function testJobCompletion(jobId) {
  console.log('\n--- Testing Job Completion ---');
  
  if (!jobId) {
    console.error('No job ID provided for completion test');
    return false;
  }
  
  const dbId = getDbCompatibleId(jobId);
  console.log(`Completing job ${jobId} (DB ID: ${dbId})`);
  
  const testResult = {
    message: 'This is a test result',
    timestamp: new Date().toISOString()
  };
  
  try {
    const { error } = await supabase
      .from('jobs')
      .update({
        status: 'completed',
        result: testResult,
        updated_at: new Date().toISOString()
      })
      .eq('id', dbId);
    
    if (error) {
      console.error('Job completion failed:', error);
      return false;
    }
    
    console.log(`Job ${jobId} completed successfully!`);
    return true;
  } catch (err) {
    console.error('Job completion error:', err);
    return false;
  }
}

async function testJobRetrieval(jobId) {
  console.log('\n--- Testing Job Retrieval ---');
  
  if (!jobId) {
    console.error('No job ID provided for retrieval test');
    return false;
  }
  
  const dbId = getDbCompatibleId(jobId);
  console.log(`Retrieving job ${jobId} (DB ID: ${dbId})`);
  
  try {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', dbId)
      .single();
    
    if (error) {
      console.error('Job retrieval failed:', error);
      return false;
    }
    
    console.log('Job retrieved successfully!');
    console.log('Job data:');
    console.log(JSON.stringify(data, null, 2));
    return true;
  } catch (err) {
    console.error('Job retrieval error:', err);
    return false;
  }
}

async function testJobDeletion(jobId) {
  console.log('\n--- Testing Job Deletion ---');
  
  if (!jobId) {
    console.error('No job ID provided for deletion test');
    return false;
  }
  
  const dbId = getDbCompatibleId(jobId);
  console.log(`Deleting job ${jobId} (DB ID: ${dbId})`);
  
  try {
    const { error } = await supabase
      .from('jobs')
      .delete()
      .eq('id', dbId);
    
    if (error) {
      console.error('Job deletion failed:', error);
      return false;
    }
    
    console.log(`Job ${jobId} deleted successfully!`);
    return true;
  } catch (err) {
    console.error('Job deletion error:', err);
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log('Starting Supabase tests...');
  
  // Test connection
  const connected = await testConnection();
  if (!connected) {
    console.error('Connection test failed, aborting remaining tests');
    process.exit(1);
  }
  
  // Test job creation
  const jobId = await testJobCreation();
  if (!jobId) {
    console.error('Job creation test failed, aborting remaining tests');
    process.exit(1);
  }
  
  // Test job update
  const updated = await testJobUpdate(jobId);
  if (!updated) {
    console.error('Job update test failed, aborting remaining tests');
    process.exit(1);
  }
  
  // Test job completion
  const completed = await testJobCompletion(jobId);
  if (!completed) {
    console.error('Job completion test failed, aborting remaining tests');
    process.exit(1);
  }
  
  // Test job retrieval
  const retrieved = await testJobRetrieval(jobId);
  if (!retrieved) {
    console.error('Job retrieval test failed, aborting remaining tests');
    process.exit(1);
  }
  
  // Clean up by deleting test job
  const deleted = await testJobDeletion(jobId);
  if (!deleted) {
    console.warn('Job deletion test failed, but other tests passed');
  }
  
  console.log('\nAll tests completed successfully!');
}

// Run the tests
runTests().catch(err => {
  console.error('Unhandled error during tests:', err);
  process.exit(1);
}); 