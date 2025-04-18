# Supabase Setup Guide

This guide will help you set up Supabase for the AI Travel Agent application and troubleshoot common issues.

## Step 1: Create a Supabase Account

1. Go to [Supabase](https://supabase.com/) and sign up for a free account.
2. Verify your email address.

## Step 2: Create a New Project

1. Click "New Project" in the Supabase dashboard.
2. Choose an organization (create one if needed).
3. Name your project (e.g., "ai-travel-agent").
4. Set a strong password for the database.
5. Choose a region close to your users.
6. Wait for the project to be created (usually takes 1-2 minutes).

## Step 3: Set Up the Database Table

1. Go to the "Table Editor" in your Supabase dashboard.
2. Click "Create a new table".
3. Table configuration:
   - Name: `jobs`
   - Enable Row Level Security (RLS): Yes
   - Columns:
     - `id` (type: text, primary key)
     - `status` (type: text)
     - `result` (type: jsonb, nullable: yes)
     - `error` (type: text, nullable: yes)
     - `created_at` (type: timestamptz, default: `now()`)
     - `updated_at` (type: timestamptz)
4. Click "Save" to create the table.

## Step 4: Configure Row Level Security (Optional but Recommended)

1. Go to "Authentication" > "Policies" in the sidebar.
2. Find the `jobs` table and click "Add Policy".
3. Choose "Create a policy from scratch".
4. For basic access, create these policies:
   - **Read Policy**:
     - Policy Name: `Enable read access for all users`
     - Policy Definition: `true`
   - **Insert Policy**:
     - Policy Name: `Enable insert for all users`
     - Policy Definition: `true`
   - **Update Policy**:
     - Policy Name: `Enable update for all users`
     - Policy Definition: `true`

## Step 5: Get Your API Keys

1. Go to "Project Settings" > "API" in the sidebar.
2. Find your project URL and anon/public key.
3. Copy these values to your `.env.local` file:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   ```
4. Save the file and restart your development server.

## Testing the Connection

The application includes a simple test endpoint to verify your Supabase connection:

1. Start your development server: `npm run dev`
2. Visit: `http://localhost:3000/api/test-job`
3. You should see a JSON response confirming a successful connection.

## Troubleshooting Common Issues

### 1. "Failed to connect to Supabase database" Error

**Possible causes and solutions:**

- **Incorrect API credentials**: Double-check your URL and anon key in `.env.local`.
- **Environment variables not loaded**: Restart your development server after changing `.env.local`.
- **CORS issues**: In Supabase dashboard > Settings > API, add your domain to the allowed origins.

### 2. "Missing or malformed JWT" Error

**Possible causes and solutions:**

- **Invalid anon key**: Make sure you're using the "anon" key, not the "service role" key.
- **JWT configuration**: Check if your JWT configuration is correct in Supabase settings.

### 3. "Table jobs does not exist" Error

**Possible causes and solutions:**

- **Table not created**: Follow Step 3 to create the jobs table.
- **Different table name**: Check if you accidentally named the table differently.
- **Schema issues**: Make sure the table is in the public schema.

### 4. "Permission denied for table jobs" Error

**Possible causes and solutions:**

- **RLS policies**: Make sure you've configured RLS policies correctly.
- **Using anon key**: The anon key has limited permissions. Make sure your policies allow all operations.

## Using In-Memory Fallback Mode

If you can't set up Supabase immediately, the application includes an in-memory fallback mode. This stores job data temporarily in memory and works without Supabase, but data will be lost when the server restarts.

To use this mode:
1. Leave the Supabase environment variables blank or remove them from `.env.local`.
2. The app will automatically use in-memory mode.

Note that this mode is intended for development and testing only, not for production use.

## Advanced: Custom Database Setup

If you want to use a different database:

1. Modify the `lib/supabase.ts` file to connect to your preferred database.
2. Implement the same functions (`createJob`, `updateJobStatus`, `getJobStatus`).
3. Make sure to handle connection errors and provide fallbacks.

## Need More Help?

If you're still having issues, try these steps:

1. Check the server logs for detailed error messages.
2. Look at the browser console for frontend errors.
3. Try the troubleshooting endpoint: `http://localhost:3000/api/test-job`.
4. Ensure your Supabase project is on the active plan and not paused. 