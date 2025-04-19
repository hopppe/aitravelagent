# Edge Function Debugging Guide

We've identified an issue where your Supabase Edge Function is being called but is not successfully updating the job status. After examining the logs, I noticed that the Edge Function invocation appears successful, but the job remains stuck in "processing" state.

## The Problem

1. The form submission successfully creates a job with ID (e.g., job_1745073759779_kmiqjjt)
2. The Edge Function is called successfully 
3. However, the job status never changes from "processing" to "completed"
4. The `updatedAt` timestamp never changes from the initial processing state

## Likely Causes

1. **Permission Issues**: The Edge Function might not have proper permissions to update the database
2. **Missing or Invalid Environment Variables**: The OPENAI_API_KEY might not be set correctly
3. **Error in the Edge Function**: The function might be encountering errors that aren't being reported back

## How to Fix It

Since we can't deploy from the command line without Docker, please follow these steps to update the Edge Function via the Supabase Dashboard:

1. **Log in to your Supabase Dashboard**: Go to https://app.supabase.io/ and select your project

2. **Go to Edge Functions**: Navigate to "Edge Functions" from the left menu

3. **Find the generate-itinerary function**: Look for the function named "generate-itinerary"

4. **Deploy the updated code**: 
   - Click on the function to edit it
   - Replace the existing code with the improved version that includes better error handling (from the file `supabase/functions/generate-itinerary/index.ts`)
   - Save and deploy the changes

5. **Check the Environment Variables**:
   - Click on "Environment Variables" for the Edge Function
   - Make sure `OPENAI_API_KEY` is set correctly with a valid key starting with "sk-"
   - Ensure `SUPABASE_URL` and `SUPABASE_ANON_KEY` are properly set

6. **Test the Function**:
   - After deploying, try the application flow again
   - Check the Edge Function logs in the Supabase Dashboard for any errors
   - The new logging should provide more detailed information about what's happening

## Checking the Database Directly

If you continue to have issues, you can directly check the jobs table in the Supabase Database:

1. In the Supabase Dashboard, navigate to "Table Editor"
2. Find the "jobs" table
3. Look for your job ID and check its status, result, and error fields
4. If there's an error, it will give you more information about what's going wrong

## Recovering Stuck Jobs

If you have jobs stuck in "processing" state:

1. Find the job ID in the Supabase Database
2. Manually update its status to "failed" or "completed" depending on whether you want to retry or skip it
3. If updating to "failed", include an error message to help with debugging

Once the Edge Function is working correctly, new jobs should properly update their status to "completed" when finished. 