# Using Vercel Edge Functions for Long-Running Tasks

This document explains how we're using Vercel Edge Functions to handle long-running OpenAI API calls without hitting timeout limits.

## The Problem

Vercel's serverless functions on the free tier have a 10-second timeout limit, but our OpenAI API calls typically take 15-30 seconds to generate travel itineraries.

## The Solution: Edge Functions

We've switched our API to use Vercel's Edge Runtime, which offers several advantages:

1. **Continued Execution After Response**: Edge Functions can continue processing after sending a response to the client.

2. **No Need for External Queue**: Unlike traditional serverless functions, we don't need an external job queue or worker.

3. **Simpler Architecture**: Just create the job, return the response, and let the Edge Function complete the processing in the background.

## How It Works

1. **Client Makes Request**: The user submits a form to generate an itinerary.

2. **Edge Function Creates Job**: Our `/api/generate-itinerary` endpoint (running on Edge) creates a job in Supabase and marks it as "processing".

3. **Early Response**: The Edge Function sends an immediate response with the job ID (within the 10-second limit).

4. **Background Processing**: The Edge Function continues running after sending the response, making the OpenAI API call.

5. **Status Updates**: Once processing is complete, the Edge Function updates the job status in Supabase to either "completed" or "failed".

6. **Client Polling**: Throughout this process, the client polls the `/api/job-status` endpoint to check when the job is complete.

## Code Implementation

The key part that makes this work is in our `generate-itinerary/route.ts` file:

```typescript
// Configure Edge runtime
export const runtime = 'edge';
export const maxDuration = 60; // 60 seconds max duration

// In our handler:
// Start the processing, but don't await it
const processingPromise = processItineraryJob(jobId, surveyData, generatePrompt, OPENAI_API_KEY);

// Return the response immediately
return NextResponse.json({ 
  jobId, 
  status: 'processing',
  message: 'Your itinerary is being generated. Poll the job-status endpoint for updates.'
});
```

## Limitations

- **Max Duration**: Edge Functions still have a maximum duration (60 seconds). If OpenAI takes longer, the job might not complete.
- **Cold Starts**: First invocation might be slower due to cold starts.
- **Regional Deployment**: Edge Functions run in the region closest to the user, which might affect database connections.

## Advantages Over Traditional Solutions

1. **No Additional Services**: No need for Upstash, Redis, or any other queuing service.
2. **No Worker Deployment**: No need to deploy and maintain a separate worker.
3. **Simplified Code**: Cleaner implementation without complex queueing logic.
4. **Cost Effective**: Works within Vercel's free tier limitations.

## Testing

To test this implementation:

1. Deploy your application to Vercel
2. Submit a travel itinerary request
3. Observe that the response comes back quickly (under 10 seconds)
4. Watch as the job status changes from "processing" to "completed" in the UI
5. Verify the job data is correctly stored in Supabase

If you encounter any issues, check the function logs in Vercel's dashboard. 