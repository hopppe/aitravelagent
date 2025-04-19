// Simple test script to invoke the Edge Function and check the raw response
// Usage: node test-raw-response.js

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or key. Please check your .env.local file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testEdgeFunction() {
  console.log('Testing Edge Function with simple query...');

  // Use numeric job ID to avoid type conversion issues
  const timestamp = Date.now();
  const jobId = timestamp;
  const surveyData = {
    destination: 'Paris, France',
    startDate: '2023-06-01',
    endDate: '2023-06-03', // Short duration for faster test
    purpose: 'vacation',
    budget: 'budget',
    preferences: ['food']
  };

  try {
    console.log('Invoking generate-itinerary edge function...');
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
  const maxAttempts = 30;

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
        
        if (data.result?.rawContent) {
          console.log('Raw Content found!');
          const rawContent = data.result.rawContent;
          
          // Only show the first 200 characters to avoid flooding the console
          console.log('Raw Content (first 200 chars):', rawContent.substring(0, 200) + '...');
          
          // Try to parse the raw content
          try {
            const itinerary = JSON.parse(rawContent);
            console.log('JSON Parsed Successfully!');
            
            // Check for coordinates in the first activity
            if (itinerary.days && itinerary.days.length > 0 && 
                itinerary.days[0].activities && itinerary.days[0].activities.length > 0) {
              const firstActivity = itinerary.days[0].activities[0];
              console.log('First activity:', {
                title: firstActivity.title,
                coordinates: firstActivity.coordinates
              });
            }
          } catch (err) {
            console.error('Error parsing JSON:', err);
            
            // Try to extract JSON using regex
            const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              try {
                const itinerary = JSON.parse(jsonMatch[0]);
                console.log('JSON extracted and parsed successfully!');
              } catch (err2) {
                console.error('Failed to extract valid JSON:', err2);
              }
            }
          }
        } else {
          console.log('No raw content found in job result:', data.result);
        }
        
        completed = true;
      } else if (data.status === 'failed') {
        console.error('Job failed:', data.error);
        completed = true;
      } else {
        // Wait for 5 seconds before polling again
        console.log('Waiting 5 seconds before next poll...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        attempts++;
      }
    } catch (err) {
      console.error('Poll error:', err);
      attempts++;
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  if (!completed) {
    console.log(`Reached maximum polling attempts (${maxAttempts}). Job might still be processing.`);
  }
}

testEdgeFunction().catch(console.error); 