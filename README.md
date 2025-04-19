# AI Travel Agent

An AI-powered travel agent that generates personalized travel itineraries using OpenAI and Supabase.

## Architecture

This application uses a serverless architecture with Next.js, Supabase, and OpenAI:

1. **Frontend**: Next.js React application where users submit travel preferences
2. **Backend API**: Next.js API routes that handle job creation and status checks
3. **Database**: Supabase PostgreSQL database to store jobs and results
4. **Processing**: Supabase Edge Functions to handle the OpenAI API calls

### Key Components

- `app/api/generate-itinerary/route.ts`: API endpoint that receives travel survey data and creates jobs
- `app/api/job-status/route.ts`: API endpoint to check job status
- `app/api/job-processor.ts`: Utilities for processing job responses
- `lib/supabase.ts`: Supabase client and job management utilities
- `lib/logger.ts`: Structured logging system
- `supabase/functions/generate-itinerary/index.ts`: Supabase Edge Function that calls OpenAI

## How It Works

1. User submits travel preferences through the UI
2. The frontend calls the `/api/generate-itinerary` endpoint
3. The server creates a job in Supabase and triggers a Supabase Edge Function
4. The Edge Function calls OpenAI to generate a travel itinerary
5. Results are stored in Supabase
6. The frontend polls the `/api/job-status` endpoint to check progress
7. When the job is complete, the frontend displays the generated itinerary

## Setup

### Prerequisites

- Node.js 16+
- Supabase account
- OpenAI API key

### Environment Variables

Create a `.env.local` file with the following variables:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
OPENAI_API_KEY=your_openai_api_key
```

For the Supabase Edge Function, you'll need to set these secrets:

```bash
supabase secrets set OPENAI_API_KEY=your_openai_api_key
```

### Database Setup

Create a `jobs` table in your Supabase database:

```sql
CREATE TABLE jobs (
  id BIGINT PRIMARY KEY,
  status TEXT,
  result JSONB,
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Deploy the Supabase Edge Function:
   ```bash
   npm run supabase:deploy-functions
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

## Development

### Testing the Supabase Connection

```bash
npm run test:supabase
```

### Creating a Test Job

```bash
npm run test:mock-job
```

### Testing the Edge Function Locally

```bash
npm run supabase:serve-functions
```

## Troubleshooting

### Job Processing Issues

If jobs get stuck in the "processing" state:

1. Check the Supabase logs for the Edge Function
2. Look at the application logs in the `logs/` directory
3. Check if the OpenAI API key is valid

### Database Issues

1. Verify your Supabase credentials in `.env.local`
2. Make sure the `jobs` table exists in your Supabase database
3. Check that the database permissions allow read/write access to the `jobs` table

## License

MIT 