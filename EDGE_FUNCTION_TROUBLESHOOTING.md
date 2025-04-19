# Supabase Edge Function Troubleshooting Guide

This document provides solutions for common issues when deploying Supabase Edge Functions for the AI Travel Agent application.

## Common Deployment Errors

### Module Not Found Error

**Error message:**
```
Failed to deploy edge function: failed to create the graph Caused by: Module not found "file:///tmp/user_fn_****/config.ts"
```

**Solution:**
This error occurs when Deno can't resolve the import paths in your edge function. The fix:

1. Make sure all imports are valid URLs or relative paths without file extensions
2. For configuration, define it directly in the index.ts file instead of importing:

```typescript
// Good: Define config directly in index.ts
export const config = {
  timeout: 60
};

// Bad: Trying to import from another file
import { config } from './config.ts';
```

### Timeout-Related Errors

**Error message:**
```
Function execution timed out after 2000 ms
```

**Solution:**
By default, Supabase Edge Functions have a 2-second timeout. For OpenAI API calls:

1. Make sure you've configured a longer timeout in your index.ts:
```typescript
export const config = {
  timeout: 60  // 60 seconds is the maximum allowed
};
```

2. Verify this configuration is being properly deployed.

### Authentication Errors

**Error message:**
```
Error: JWT must be provided
```

**Solution:**
When testing your edge function:

1. Use the `--no-verify-jwt` flag when deploying:
```bash
supabase functions deploy generate-itinerary --no-verify-jwt
```

2. Make sure you're including the correct authentication header in your requests:
```bash
curl -X POST 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/generate-itinerary' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  --data '{...}'
```

### OpenAI API Errors

**Error message:**
```
"error": "Failed to generate itinerary: OpenAI API error: 401 - Invalid API key"
```

**Solution:**
1. Make sure you've set the OpenAI API key as a secret:
```bash
supabase secrets set OPENAI_API_KEY=your-api-key
```

2. Verify it's being accessed correctly in the code:
```typescript
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') ?? '';
```

3. Check the OpenAI API key is valid and has not expired.

## Debugging Edge Functions

### Viewing Logs

To see what's happening in your edge function:

```bash
supabase functions logs generate-itinerary
```

This will show the most recent logs from your function.

### Testing Locally

Before deploying, test your function locally:

```bash
npm run supabase:serve-functions
```

Then use curl to test it:

```bash
curl -X POST 'http://localhost:54321/functions/v1/generate-itinerary' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  --data '{"jobId":"test_123","surveyData":{"destination":"Paris"}}'
```

### Cleaning Up and Redeploying

If you're having persistent issues:

1. Delete the function and redeploy:
```bash
supabase functions delete generate-itinerary
supabase functions deploy generate-itinerary --no-verify-jwt
```

2. Check function status:
```bash
supabase functions list
```

## Performance Considerations

- Edge Functions have limited memory (150MB) and CPU
- The 60-second timeout is the maximum allowed
- For very complex itineraries, consider breaking down the processing

## Monitoring in Production

For production deployments:

1. Add more detailed logging in your function
2. Set up alerts for repeated failures
3. Consider implementing a retry mechanism in your Next.js API routes

By following this guide, you should be able to resolve most common issues with Supabase Edge Functions. 