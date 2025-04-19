/**
 * Create a test job for debugging
 * Usage: node scripts/create-test-job.js
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Get Supabase credentials from environment
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local');
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set');
  process.exit(1);
}

// Initialize Supabase client
console.log('Initializing Supabase client...');
const supabase = createClient(supabaseUrl, supabaseKey);

// Helper function for generating job IDs
function getDbCompatibleId(id) {
  // If the ID is already numeric, return it as is
  if (!isNaN(Number(id))) {
    return Number(id);
  }
  
  // For job IDs that start with a timestamp, extract the timestamp
  const timestampMatch = id.match(/^(job|debug|test)_(\d+)/);
  if (timestampMatch && !isNaN(Number(timestampMatch[2]))) {
    return Number(timestampMatch[2]);
  }

  // For any other IDs, use a hash function
  let hash = 0;
  const prime = 31;
  
  for (let i = 0; i < id.length; i++) {
    const char = id.charCodeAt(i);
    hash = ((hash * prime) + char) & 0xFFFFFFFF;
  }
  
  return Math.abs(hash);
}

// Sample survey data
const sampleSurveyData = {
  destination: 'Paris, France',
  startDate: '2023-12-01',
  endDate: '2023-12-05',
  purpose: 'vacation',
  budget: 'moderate',
  preferences: ['food', 'culture', 'history', 'sightseeing']
};

// Mock itinerary result
const mockItinerary = {
  destination: 'Paris, France',
  tripName: 'Paris City of Lights Explorer',
  dates: {
    start: '2023-12-01',
    end: '2023-12-05'
  },
  summary: 'A perfect 5-day getaway to Paris combining iconic landmarks, culinary delights, and authentic cultural experiences. This moderate-budget trip focuses on food, culture, history, and sightseeing.',
  days: [
    {
      day: 1,
      date: '2023-12-01',
      activities: [
        {
          time: 'Morning',
          title: 'Arrival and Check-in',
          description: 'Arrive in Paris and check into your hotel. Grab a quick coffee and croissant at a nearby café to start your Parisian experience.',
          location: 'Le Marais District',
          coordinates: { lat: 48.8559, lng: 2.3609 },
          duration: '2 hours',
          cost: 'Moderate'
        },
        {
          time: 'Afternoon',
          title: 'Seine River Walk',
          description: 'Take a relaxing walk along the Seine River, crossing the famous Pont Neuf bridge and exploring the charming streets of Île de la Cité.',
          location: 'Seine Riverbank',
          coordinates: { lat: 48.8566, lng: 2.3522 },
          duration: '3 hours',
          cost: 'Free'
        },
        {
          time: 'Evening',
          title: 'Welcome Dinner at Bistrot Paul Bert',
          description: 'Enjoy a classic French bistro meal featuring steak frites, escargot, and other traditional dishes paired with excellent wine.',
          location: 'Bistrot Paul Bert',
          coordinates: { lat: 48.8522, lng: 2.3853 },
          duration: '2 hours',
          cost: 'Moderate'
        }
      ]
    },
    {
      day: 2,
      date: '2023-12-02',
      activities: [
        {
          time: 'Morning',
          title: 'Eiffel Tower Visit',
          description: 'Visit the iconic Eiffel Tower early to avoid crowds. Consider going to the second floor for the best views-to-cost ratio.',
          location: 'Eiffel Tower',
          coordinates: { lat: 48.8584, lng: 2.2945 },
          duration: '3 hours',
          cost: 'Moderate'
        }
      ]
    }
  ],
  budgetEstimate: {
    accommodation: 600,
    food: 400,
    activities: 200,
    transportation: 150,
    total: 1350
  },
  travelTips: [
    'Buy a carnet of metro tickets to save money on public transportation',
    'Many museums are free on the first Sunday of the month',
    'Tipping is not required in restaurants as service is included in the price'
  ]
};

// Create a test job
async function createTestJob() {
  // Generate job ID with current timestamp
  const jobId = `debug_${Date.now()}`;
  const dbId = getDbCompatibleId(jobId);
  
  console.log(`Creating test job with ID: ${jobId} (DB ID: ${dbId})`);
  
  try {
    // Insert the job with completed status and mock result
    const { error } = await supabase
      .from('jobs')
      .insert({
        id: dbId,
        status: 'completed',
        result: {
          itinerary: mockItinerary,
          prompt: 'This is a mocked prompt for testing',
          generatedAt: new Date().toISOString()
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    
    if (error) {
      console.error('Failed to create test job:', error);
      process.exit(1);
    }
    
    console.log(`Test job created successfully!`);
    console.log(`Job ID: ${jobId}`);
    console.log(`Use this ID to test job retrieval in your application.`);
    return jobId;
  } catch (err) {
    console.error('Error creating test job:', err);
    process.exit(1);
  }
}

// Run the job creation
createTestJob().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
}); 