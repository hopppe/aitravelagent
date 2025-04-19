# Updated AI Travel Agent Workflow

This document outlines the updated workflow for the AI Travel Agent application, where the web app formulates the OpenAI prompt rather than relying on the Supabase Edge Function to create it.

## Updated Application Flow

1. **User Form Submission**: 
   - User fills out the travel survey form with destination, dates, preferences, etc.
   - The form collects this data as structured JSON.

2. **Prompt Generation**:
   - Our web app (via the Next.js API route) generates the prompt for OpenAI using the user's data.
   - The prompt is carefully structured to ensure high-quality itinerary generation.

3. **Job Creation**:
   - The API creates a unique job ID and stores it in Supabase.
   - The job initially has a "queued" status.

4. **Supabase Edge Function Call**:
   - The API sends the pre-formulated prompt AND job ID to the Supabase Edge Function.
   - The Edge Function does NOT need to generate a prompt; it just uses what was provided.

5. **OpenAI API Call**:
   - The Edge Function has access to the OpenAI API key and makes the request to OpenAI.
   - It sends the exact prompt that was created by our web app.
   - The Edge Function stores the raw response from OpenAI in Supabase.

6. **Job Status Polling**:
   - While the Edge Function is processing, our frontend polls the `/api/job-status` endpoint.
   - This endpoint checks Supabase for the current status of the job.

7. **Result Processing**:
   - Once the Edge Function completes, the raw OpenAI response is processed and normalized.
   - The processed itinerary is stored in Supabase with the job.

8. **Displaying Results**:
   - When polling detects the job is complete, the frontend fetches the processed itinerary.
   - The UI renders the itinerary data in a user-friendly format.

## Benefits of This Approach

1. **Control**: We maintain full control over prompt engineering and can optimize it on our side.
2. **Flexibility**: We can update prompt generation logic without needing to redeploy Edge Functions.
3. **Transparency**: The prompt is stored alongside the raw response, making debugging easier.
4. **Separation of Concerns**: 
   - Web app: Handles user interface, data collection, and prompt generation
   - Edge Function: Handles secure API calls and database storage
5. **Security**: OpenAI API key still remains secure in the Supabase Edge Function.

## Data Flow Diagram

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐     ┌─────────┐
│ User submits │     │ Next.js API  │     │   Supabase   │     │ OpenAI  │
│    form     │────▶│  generates   │────▶│ Edge Function│────▶│   API   │
└─────────────┘     │   prompt     │     │    calls     │     └─────────┘
                    └──────────────┘     └──────────────┘          │
                           ▲                     │                  │
                           │                     │                  │
                           │                     ▼                  │
                    ┌──────────────┐     ┌──────────────┐          │
                    │  Frontend    │     │   Supabase   │          │
                    │ displays     │◀────│   Database   │◀─────────┘
                    │  results     │     │  stores data │
                    └──────────────┘     └──────────────┘
``` 