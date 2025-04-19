# Supabase Edge Functions

This directory contains the Edge Functions used by the AI Travel Agent application.

## generate-itinerary

The `generate-itinerary` edge function handles making the OpenAI API call to generate travel itineraries. It runs in Supabase's serverless environment, with direct access to the database.

### Workflow

1. The function receives a request from the main application containing:
   - `jobId`: A unique identifier for the job
   - `surveyData`: The user's travel preferences (optional, for backwards compatibility)
   - `prompt`: The pre-formulated OpenAI prompt created by the web app

2. It updates the job status to "processing" in the database
3. It uses the provided prompt to call the OpenAI API 
4. Once the response is received, it stores the raw response in the database
5. The job status is updated to "completed"

### API

#### Request body:

```json
{
  "jobId": "unique_job_identifier",
  "prompt": "The pre-formulated OpenAI prompt for generating the itinerary",
  "surveyData": {
    "destination": "Paris",
    "startDate": "2023-06-01",
    "endDate": "2023-06-07",
    "purpose": "Vacation",
    "budget": "Moderate",
    "preferences": ["Culture", "Food"]
  }
}
```

#### Response:

```json
{
  "success": true,
  "jobId": "unique_job_identifier"
}
```

### Deployment

To deploy this edge function to your Supabase project:

1. Install the Supabase CLI if you haven't already:
   ```
   npm install -g supabase
   ```

2. Login to your Supabase account:
   ```
   supabase login
   ```

3. Link your project (replace 'your-project-id' with your actual Supabase project ID):
   ```
   supabase link --project-ref your-project-id
   ```

4. Deploy the edge function:
   ```
   supabase functions deploy generate-itinerary
   ```

### Configuration

The edge function requires the following environment variables to be set in your Supabase project:

- `OPENAI_API_KEY` - Your OpenAI API key for making API calls

You can set these using the Supabase CLI:

```
supabase secrets set OPENAI_API_KEY=your-openai-api-key
```

Or through the Supabase dashboard under Settings > API > Edge Functions. 