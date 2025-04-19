# AI Travel Agent Workflow

This document outlines the data flow in the AI Travel Agent application.

## Application Flow

1. **User Form Submission**: 
   - User fills out the travel survey form with destination, dates, preferences, etc.
   - The form collects this data as structured JSON.

2. **API Request**:
   - The form data is sent to our `/api/generate-itinerary` API endpoint.
   - This API creates a unique job ID and stores it in Supabase.

3. **Supabase Edge Function**:
   - The API calls a Supabase Edge Function named `generate-itinerary`.
   - The Edge Function has access to the OpenAI API key and makes the request to OpenAI.
   - The Edge Function stores the raw response from OpenAI in Supabase.

4. **Job Status Polling**:
   - While the Edge Function is processing, our frontend polls the `/api/job-status` endpoint.
   - This endpoint checks Supabase for the current status of the job.

5. **Result Processing**:
   - Once the Edge Function completes, the raw OpenAI response is processed and normalized.
   - The processed itinerary is stored in Supabase with the job.

6. **Displaying Results**:
   - When polling detects the job is complete, the frontend fetches the processed itinerary.
   - The UI renders the itinerary data in a user-friendly format.

## Key Components

- **TripSurveyForm**: Collects user input and initiates the API request.
- **JobStatusPoller**: Polls the job status endpoint to track progress.
- **Supabase Edge Function**: Runs the OpenAI request in a serverless environment.
- **Supabase Database**: Stores jobs, their status, and the resulting itineraries.

## Benefits of This Architecture

- **Security**: OpenAI API key remains secure in the Supabase Edge Function.
- **Scalability**: Long-running AI requests are handled asynchronously.
- **Reliability**: Job status tracking ensures results aren't lost if the user reloads.
- **Performance**: The frontend remains responsive while the AI request is processed. 