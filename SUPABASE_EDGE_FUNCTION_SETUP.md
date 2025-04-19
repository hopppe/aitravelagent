# Supabase Edge Function Setup Guide

This guide walks you through the process of setting up and deploying the Supabase Edge Functions used for generating travel itineraries.

## Prerequisites

Before you begin, make sure you have the following:

1. A Supabase account with an active project
2. The Supabase CLI installed on your machine
3. An OpenAI API key
4. Node.js and npm installed

## Install the Supabase CLI

If you haven't already installed the Supabase CLI, you can do so using npm:

```bash
npm install -g supabase
```

## Login to Supabase

You need to authenticate the CLI with your Supabase account:

```bash
supabase login
```

This will open a browser window where you can authorize the CLI.

## Link Your Project

Navigate to your project directory and link it to your Supabase project:

```bash
cd /path/to/your/project
supabase link --project-ref your-project-ref
```

You can find your project reference in the Supabase dashboard URL:
`https://app.supabase.com/project/your-project-ref`

## Set Up the Edge Function

The Edge Function is already included in the `supabase/functions/generate-itinerary` directory of this project.

### Set Environment Variables (Secrets)

Edge Functions need access to your OpenAI API key. Set it as a secret using the Supabase CLI:

```bash
supabase secrets set OPENAI_API_KEY=your-openai-api-key
```

You can verify your secrets with:

```bash
supabase secrets list
```

## Test the Edge Function Locally

Before deploying, you can test the Edge Function locally:

```bash
npm run supabase:serve-functions
```

This will start the Supabase Functions emulator and serve your functions locally.

You can test the function by sending a POST request to it:

```bash
curl -X POST 'http://localhost:54321/functions/v1/generate-itinerary' \
  -H 'Authorization: Bearer SUPABASE_ANON_KEY' \
  -H 'Content-Type: application/json' \
  --data '{"jobId":"test_123","surveyData":{"destination":"Paris","startDate":"2023-10-15","endDate":"2023-10-18","purpose":"vacation","budget":"moderate","preferences":["food","culture","history"]}}'
```

Replace `SUPABASE_ANON_KEY` with your actual anon key.

## Deploy the Edge Function

Once you're satisfied with the local testing, deploy the function:

```bash
npm run supabase:deploy-functions
```

Or directly with the Supabase CLI:

```bash
supabase functions deploy generate-itinerary
```

## Verify Deployment

After deployment, verify that your function appears in the Supabase Dashboard:

1. Go to your Supabase project dashboard
2. Navigate to "Edge Functions" in the left sidebar
3. Confirm that the `generate-itinerary` function is listed and active

## Understanding the Edge Function

The Edge Function (`supabase/functions/generate-itinerary/index.ts`) does the following:

1. Receives a request with a `jobId` and `surveyData`
2. Updates the job status to "processing" in the Supabase database
3. Generates a prompt based on the survey data
4. Calls the OpenAI API to generate a travel itinerary
5. Processes the response and updates the job status to "completed" with the result
6. Handles errors and updates the job status accordingly

## Debugging Edge Functions

If you encounter issues with your deployed Edge Function:

### View Function Logs

```bash
supabase functions logs generate-itinerary
```

### Redeploy After Changes

If you make changes to the function, redeploy it:

```bash
supabase functions deploy generate-itinerary
```

### Check for Errors

Common errors include:
- Missing or invalid environment variables
- Incorrect permissions
- Exceeded function timeout (default is 2 seconds)
- OpenAI API rate limits or errors

## Additional Configuration

### Increasing Function Timeout

The default timeout for Supabase Edge Functions is 2 seconds. If your function needs more time (especially for OpenAI API calls), you may need to increase this:

```ts
// In supabase/functions/generate-itinerary/index.ts
export const config = {
  timeout: 60 // 60 seconds timeout (maximum allowed)
};
```

### Handling CORS

If you need to call the Edge Function directly from a browser, you'll need to handle CORS. Add this to your function:

```ts
// Add CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Handle preflight OPTIONS request
if (req.method === 'OPTIONS') {
  return new Response(null, { headers: corsHeaders });
}

// Add corsHeaders to your responses
```

## Conclusion

Your Supabase Edge Function should now be properly set up and deployed. The Next.js application will call this function when generating travel itineraries, allowing for longer processing times than would be possible with standard serverless functions. 