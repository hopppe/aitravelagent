// Simple test script to invoke the Edge Function locally
// Usage: node test-edge-function.js

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log("Loading config from:", process.cwd(), "/.env.local");
console.log("SUPABASE_URL:", supabaseUrl ? "Found" : "Not found");
console.log("SUPABASE_KEY:", supabaseKey ? "Found" : "Not found");

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or key. Please check your .env.local file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testEdgeFunction() {
  console.log('Invoking generate-itinerary edge function...');

  const jobId = `test_${Date.now()}`;
  const surveyData = {
    destination: 'Paris, France',
    startDate: '2023-06-01',
    endDate: '2023-06-05',
    purpose: 'vacation',
    budget: 'moderate',
    preferences: ['culture', 'food', 'history']
  };

  try {
    const { data, error } = await supabase.functions.invoke('generate-itinerary', {
      body: {
        jobId,
        surveyData
      }
    });

    if (error) {
      console.error('Error invoking edge function:', error);
      return;
    }

    console.log('Edge function invoked successfully:', data);
    console.log(`Job ID: ${jobId}`);
    
    // Poll for job status
    await pollJobStatus(jobId);
  } catch (error) {
    console.error('Error:', error);
  }
}

async function pollJobStatus(jobId) {
  console.log(`Polling for job status (${jobId})...`);
  let completed = false;
  let attempts = 0;
  const maxAttempts = 30; // Poll for up to 5 minutes (30 attempts * 10 seconds)

  while (!completed && attempts < maxAttempts) {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (error) {
        console.error('Error polling job status:', error);
        break;
      }

      console.log(`Job status: ${data.status}`);

      if (data.status === 'completed') {
        console.log('Job completed successfully!');
        console.log('Result:', data.result);
        completed = true;
      } else if (data.status === 'failed') {
        console.error('Job failed:', data.error);
        completed = true;
      } else {
        // Wait for 10 seconds before polling again
        console.log('Waiting 10 seconds before next poll...');
        await new Promise(resolve => setTimeout(resolve, 10000));
        attempts++;
      }
    } catch (err) {
      console.error('Poll error:', err);
      attempts++;
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }

  if (!completed) {
    console.log(`Reached maximum polling attempts (${maxAttempts}). Job might still be processing.`);
  }
}

testEdgeFunction().catch(console.error); 