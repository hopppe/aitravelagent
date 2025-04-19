# AI Travel Agent

A modern web application that uses AI to generate personalized travel itineraries based on user preferences.

## Features

- Create personalized trip itineraries using AI
- View trips in calendar and map formats
- Track and manage travel budgets
- Edit and customize generated itineraries
- Save and share trip plans

## Technologies Used

- Next.js (React framework)
- TypeScript
- Tailwind CSS
- React Icons
- React Calendar
- Mapbox GL for maps

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/ai-travel-agent.git
cd ai-travel-agent
```

2. Install dependencies
```bash
npm install
```

3. Run the development server
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

- `/app` - Next.js app router pages
- `/components` - Reusable UI components
- `/components/trips` - Trip-related components
- `/components/layout` - Layout components
- `/public` - Static assets

## Roadmap

See the [todo.md](todo.md) file for the list of planned features and current development status.

## Supabase Setup

This application uses Supabase for persistently storing job status information. To set up Supabase:

1. **Create a Supabase Account**:
   - Go to [Supabase](https://supabase.com/) and sign up for a free account
   - Create a new project with a name of your choice

2. **Create the Jobs Table**:
   - Go to the "Table Editor" in your Supabase dashboard
   - Click "Create a new table"
   - Name the table `jobs`
   - Add the following columns:
     - `id` (type: text, primary key)
     - `status` (type: text)
     - `result` (type: jsonb, nullable)
     - `error` (type: text, nullable)
     - `created_at` (type: timestamptz, default: now())
     - `updated_at` (type: timestamptz)

3. **Get Your API Keys**:
   - Go to "Project Settings" > "API"
   - Find your project URL and anon/public key
   - Add these to your `.env.local` file:
     ```
     NEXT_PUBLIC_SUPABASE_URL=your_project_url
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
     ```

4. **Set Row-Level Security** (Optional but Recommended):
   - Go to the "Authentication" > "Policies" section
   - Create policies that restrict access as needed

## OpenAI API Setup

To generate travel itineraries, you need an OpenAI API key:

1. **Create an OpenAI Account**:
   - Go to [OpenAI](https://platform.openai.com/signup) and sign up for an account
   - Navigate to the API section

2. **Create an API Key**:
   - Go to "API keys" in your account
   - Click "Create new secret key"
   - Add this to your `.env.local` file:
     ```
     OPENAI_API_KEY=your_openai_api_key
     ```

## Google Maps API Setup

To use the Google Maps functionality in this application, you need to set up a valid API key:

1. **Create a Google Cloud Project**:
   - Go to the [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one

2. **Enable the Maps JavaScript API**:
   - Go to "APIs & Services" > "Library"
   - Search for "Maps JavaScript API" and enable it
   - Also enable "Places API" if you're using location search functionality

3. **Create API Key**:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "API Key"
   - A new API key will be created

4. **Restrict the API Key** (recommended for production):
   - In the credentials page, find your API key and click "Edit"
   - Under "Application restrictions", you can restrict by:
     - HTTP referrers (websites): Add your domains
     - IP addresses: Add your server IPs
   - Under "API restrictions", restrict to Maps JavaScript API and any other APIs you're using

5. **Add to Environment Variables**:
   - Create a `.env.local` file in the project root (if it doesn't exist)
   - Add this line with your key: `GOOGLE_MAPS_API_KEY=your_api_key_here`
   - The API key is handled securely through a server-side API route, not exposed to the client
   - Restart your development server for changes to take effect

6. **Enable Billing**:
   - Google Maps Platform requires a billing account
   - Set up billing in Google Cloud Console
   - Google provides a monthly free tier that's sufficient for many small to medium applications

### Troubleshooting API Key Issues

If you see `InvalidKeyMapError` or other API key related errors:

1. Check that your key is correctly added to `.env.local`
2. Verify the key is correctly formatted without spaces or quotes
3. Make sure you've enabled the Maps JavaScript API in your Google Cloud project
4. Check if you have billing enabled
5. If using API restrictions, ensure your domain/IP is properly allowed
6. For local development, you might need to set the API key to allow localhost

## License

MIT 