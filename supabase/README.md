# Supabase Edge Functions

This directory contains Supabase Edge Functions that are deployed to your Supabase project.

## Setup Instructions

1. Make sure you have the Supabase CLI installed:
   ```bash
   npm install -g supabase
   ```

2. Login to your Supabase account:
   ```bash
   supabase login
   ```

3. Link to your Supabase project:
   ```bash
   supabase link --project-ref <your-project-id>
   ```

4. Deploy your Edge Functions:
   ```bash
   supabase functions deploy generate-itinerary
   ```

5. Add the necessary secrets to your Supabase project:
   ```bash
   supabase secrets set OPENAI_API_KEY=sk-your-openai-api-key
   ```

## Edge Functions

### `generate-itinerary`

This Edge Function takes a travel survey and generates a detailed itinerary using OpenAI.

It accepts a JSON payload with the following structure:
```json
{
  "jobId": "job_123456789",
  "surveyData": {
    "destination": "Paris, France",
    "startDate": "2023-06-01",
    "endDate": "2023-06-07",
    "purpose": "vacation",
    "budget": "moderate",
    "preferences": ["culture", "food", "history"]
  }
}
```

It stores the results in your Supabase database in the `jobs` table, which can be polled by the client application.

## Local Development

To test Edge Functions locally:

1. Start the local Supabase development server:
   ```bash
   supabase start
   ```

2. Serve the function locally:
   ```bash
   supabase functions serve generate-itinerary
   ```

3. Make a test request (using your local JWT token):
   ```bash
   curl -L -X POST 'http://localhost:54321/functions/v1/generate-itinerary' \
     -H 'Authorization: Bearer YOUR_LOCAL_JWT' \
     -H 'Content-Type: application/json' \
     --data-raw '{
       "jobId": "test_123",
       "surveyData": {
         "destination": "New York",
         "startDate": "2023-06-01",
         "endDate": "2023-06-07",
         "purpose": "vacation",
         "budget": "moderate",
         "preferences": ["culture", "food"]
       }
     }'
   ``` 