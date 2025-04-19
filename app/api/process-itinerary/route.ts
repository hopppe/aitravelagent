import { NextResponse } from 'next/server';
import { processItineraryJob } from '../job-processor';
import { updateJobStatus } from '../../../lib/supabase';
import { generatePrompt } from '../generate-itinerary/route';

// Configure runtime for serverless function - we need longer timeout here
export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes - plenty for API processing

// Allow the API to be dynamic
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    console.log(`Process itinerary API called at ${new Date().toISOString()}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
    
    // Parse the request body
    let jobData;
    try {
      jobData = await request.json();
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }
    
    const { jobId, surveyData, prompt } = jobData;
    
    if (!jobId || !surveyData) {
      console.error('Missing required fields in request body');
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    console.log(`Processing itinerary for job ${jobId}`);
    
    // Update the job status to processing
    await updateJobStatus(jobId, 'processing');
    
    // Check if the OpenAI API key is configured
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
    if (!OPENAI_API_KEY || !OPENAI_API_KEY.startsWith('sk-')) {
      console.error('Invalid OpenAI API key configuration');
      await updateJobStatus(jobId, 'failed', {
        error: 'Invalid OpenAI API key configuration',
      });
      return NextResponse.json(
        { error: 'API configuration error' },
        { status: 500 }
      );
    }
    
    try {
      // Process the itinerary - the magic happens here
      console.log(`Calling OpenAI for job ${jobId}`);
      
      // Use provided prompt if available, otherwise generate one
      const promptToUse = prompt || generatePrompt(surveyData);
      
      await processItineraryJob(jobId, surveyData, promptToUse, OPENAI_API_KEY);
      console.log(`Successfully generated itinerary for job ${jobId}`);
      
      return NextResponse.json({ success: true, jobId });
    } catch (error: any) {
      console.error(`Error processing itinerary for job ${jobId}:`, error);
      
      // Update job status to failed
      await updateJobStatus(jobId, 'failed', {
        error: error.message || 'Unknown error',
      });
      
      return NextResponse.json(
        { error: `Processing error: ${error.message}` },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error in process-itinerary handler:', error);
    return NextResponse.json(
      { error: `Server error: ${error.message}` },
      { status: 500 }
    );
  }
} 