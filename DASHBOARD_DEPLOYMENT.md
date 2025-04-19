# Deploying Edge Functions via Supabase Dashboard

Since we've encountered issues with the Supabase CLI deployment (Docker requirement), here's how to deploy the Edge Function directly through the Supabase Dashboard:

## Deployment Steps

1. Log in to your Supabase Dashboard: https://supabase.com/dashboard

2. Select your project: "aitravelagent"

3. In the left sidebar, navigate to "Edge Functions"

4. Click "Create a new function"

5. Enter the following details:
   - Name: `generate-itinerary`
   - Click "Create Function"

6. After the function is created, you'll see a code editor. Delete any default code.

7. Copy the entire contents of `supabase/functions/generate-itinerary/index.ts` and paste it into the editor.

8. Click "Deploy" to save and deploy your function.

## Setting Secrets

Your function needs access to your OpenAI API key:

1. In the Edge Functions section, find the "Secrets" tab
2. Click "Add Secret"
3. Add the following key-value pair:
   - Key: `OPENAI_API_KEY`
   - Value: Your OpenAI API key (from your .env.local file)
4. Click "Save"

## Testing the Deployment

You can test the function directly from the Dashboard:

1. Go to the "Logs" tab of your function
2. Click "Test Function"
3. In the request body, enter:

```json
{
  "jobId": "test_dashboard_123",
  "surveyData": {
    "destination": "Paris, France",
    "startDate": "2023-06-01",
    "endDate": "2023-06-05",
    "purpose": "vacation",
    "budget": "moderate",
    "preferences": ["culture", "food", "history"]
  }
}
```

4. Click "Send Request"
5. Check the logs to see if the function executes successfully

## Alternative: Local Testing

If you want to test the function locally without deploying:

1. Use the JavaScript test script we created:
   ```bash
   node supabase/test-edge-function.js
   ```

This script will send a request to your deployed Edge Function and poll for the results.

## Important Update

The Edge Function has been updated to return the raw OpenAI response without parsing or validating it. This change ensures that:

1. The Edge Function is simpler and more focused on just calling the OpenAI API
2. All JSON parsing and validation happens on the client side
3. The client has full control over how to handle and fix any issues with the response

This is reflected in the updated Edge Function code below. 