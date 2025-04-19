# Using Supabase Edge Functions for OpenAI API Calls

This document explains how we've restructured our application to use Supabase Edge Functions for handling OpenAI API calls. This approach offers several advantages:

1. **Cost Efficiency**: OpenAI API calls are made directly from Supabase instead of through our Next.js API routes
2. **Scalability**: Edge functions run in the background, allowing your web server to handle more traffic
3. **Separation of Concerns**: API operations are decoupled from the web application

## Architecture

### Previous Architecture
- User submits a form to our Next.js API
- Next.js API calls OpenAI directly
- Next.js API stores the result in Supabase
- Client polls Next.js API for status updates

### New Architecture
- User submits a form to our Next.js API
- Next.js API creates a job record in Supabase and invokes the Edge Function
- Edge Function calls OpenAI and updates the job in Supabase when complete
- Client polls Supabase directly for status updates

## Implementation Details

### 1. Supabase Edge Function
We've created a Supabase Edge Function (`generate-itinerary`) that:
- Accepts job ID and survey data
- Updates the job status to "processing"
- Calls the OpenAI API
- Processes and validates the response
- Updates the Supabase job record with the result

### 2. Next.js API Route Changes
We've updated the API route to:
- Create a job in Supabase
- Invoke the Edge Function
- Return immediately to the client
- Handle errors if they occur during Edge Function invocation

### 3. Database Structure
We're using a `jobs` table in Supabase with the following structure:
- `id`: The job ID
- `status`: "queued", "processing", "completed", or "failed"
- `result`: JSON object with the generated itinerary
- `error`: Error message if the job failed
- `created_at`: Timestamp when the job was created
- `updated_at`: Timestamp when the job was last updated

### 4. Client-side Polling
The client continues to poll the `/api/job-status` endpoint, which now just passes through to Supabase.

## Deployment Instructions

1. Set up Supabase CLI:
```bash
npm install -g supabase
```

2. Deploy Edge Function:
```bash
supabase functions deploy generate-itinerary
```

3. Set secrets in Supabase:
```bash
supabase secrets set OPENAI_API_KEY=sk-your-openai-api-key
```

4. Test locally:
```bash
node supabase/test-edge-function.js
```

## Configuration

Make sure your `.env.local` file contains:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
OPENAI_API_KEY=your_openai_api_key
```

## Additional Notes

- The Edge Function runs with a 50-second timeout by default, which should be sufficient for most OpenAI API calls
- All logs are available in the Supabase dashboard under Functions
- We handle various error cases and retry mechanisms 