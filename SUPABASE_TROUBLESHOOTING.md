# Supabase Job Processing Troubleshooting Guide

This document outlines the steps taken to debug and fix issues with the Supabase job processing system in the AI Travel Agent application.

## Background

The application uses Supabase as a database to track job status for generating travel itineraries. Users submit their travel preferences, and the application queues a job for processing. The status of these jobs is stored in a Supabase table called `jobs`.

## Issues Addressed

1. Jobs were getting stuck in the "queued" state
2. Poor visibility into what was happening during job processing
3. Lack of diagnostic tools to inspect job statuses
4. Error handling and retry mechanisms

## Changes Made

### 1. Enhanced Logging System

We implemented a comprehensive structured logging system that:

- Writes logs to files with proper timestamps and context
- Includes log rotation to manage log file size
- Captures detailed information about job processing
- Can be accessed via API for remote diagnostics

**Files added/modified:**
- `lib/logger.ts` - Core logging functionality
- `scripts/cleanup-logs.js` - Log file maintenance

### 2. Improved Error Handling

We added robust error handling throughout the job processing flow:

- Retry mechanisms for failed Supabase operations
- Better error reporting with stack traces and context
- Fallback to in-memory storage when Supabase is unavailable
- Timeout detection for hung jobs

### 3. Diagnostic Tools

We created several tools to diagnose issues with the job processing:

- `scripts/test-supabase.js` - Tests Supabase connection and job operations
- `scripts/create-test-job.js` - Creates a mock job for testing
- `app/api/debug-jobs/route.ts` - API endpoint for viewing job status and logs

### 4. Job Processing Enhancement

We made the job processing more robust:

- Added detailed state tracking
- Improved coordination between different components
- Enhanced error detection and reporting
- Better handling of API responses

## How to Troubleshoot

### Checking Job Status

To check the status of a specific job:

```bash
curl "http://localhost:3000/api/job-status?jobId=YOUR_JOB_ID" | jq
```

### Viewing All Jobs

To see all recent jobs and their status:

```bash
curl "http://localhost:3000/api/debug-jobs" | jq
```

### Viewing Application Logs

```bash
curl "http://localhost:3000/api/debug-jobs?action=logs&limit=20" | jq
```

### Testing Supabase Connection

```bash
npm run test:supabase
```

### Creating a Test Job

To create a mock job for testing:

```bash
npm run test:mock-job
```

## Common Issues and Solutions

### Jobs Stuck in "Queued" State

This usually indicates an issue with the worker process:

1. Check if the worker is running: `npm run worker`
2. Check if Upstash Redis is configured properly in `.env.local`
3. Check logs for errors during job processing

### Database Connection Issues

1. Verify Supabase credentials in `.env.local`
2. Run the diagnostic test: `npm run test:supabase`
3. Check network connectivity to Supabase

### OpenAI API Errors

1. Check the OPENAI_API_KEY is valid
2. Look for rate limiting or quota errors in the logs
3. Test the OpenAI connection directly: `npm run test:api`

## Monitoring Recommendations

1. Keep an eye on the logs regularly
2. Set up alerts for jobs that remain in "processing" state for too long
3. Periodically run the diagnostic tools to ensure everything is working
4. Consider adding external monitoring if deploying to production

## Future Improvements

1. Add more detailed metrics about job processing time
2. Implement a proper queuing system with priority and retry
3. Add a user-friendly admin dashboard for job monitoring
4. Improve the performance of the job processing worker 