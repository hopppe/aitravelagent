import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

// Directly import the private function in a way that works around isolation
// This is only for debugging and should not be used in production code
const getDbCompatibleId = new Function(
  'id',
  `
  // If the ID is already numeric, return it as is
  if (!isNaN(Number(id))) {
    return Number(id);
  }
  
  // For job IDs that start with a timestamp (job_ or debug_), extract the timestamp
  // This ensures consistent ID generation across environments
  const timestampMatch = id.match(/^(job|debug|test)_(\\d+)/);
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
  `
);

// Define a type for our database result
type DbResult = {
  found: boolean;
  data: any;
  error: { code?: string; message: string } | null;
};

// Helper function to test job ID storage and retrieval
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get('jobId');
  
  if (!jobId) {
    return NextResponse.json({ error: 'jobId parameter is required' }, { status: 400 });
  }
  
  const dbCompatibleId = getDbCompatibleId(jobId);
  
  // Test direct lookup in Supabase
  let dbResult: DbResult = { found: false, data: null, error: null };
  
  try {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', dbCompatibleId)
      .maybeSingle();
      
    dbResult = {
      found: !!data,
      data,
      error: error ? { code: error.code, message: error.message } : null
    };
  } catch (e: any) {
    dbResult.error = { message: e.message };
  }
  
  // Return information about the job ID conversion
  return NextResponse.json({
    originalJobId: jobId,
    dbCompatibleId,
    dbResult,
    explanation: `
      This endpoint shows how job IDs are converted for database storage.
      For jobs with the format "job_1234567890", the numeric part is extracted.
      For other formats, a hash is generated.
    `
  });
} 