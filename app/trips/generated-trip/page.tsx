'use client';

import React, { useState, useEffect } from 'react';
import { FaEdit, FaShare } from 'react-icons/fa';
import { useRouter } from 'next/navigation';
import ItineraryTabs from '../../../components/trips/ItineraryTabs';
import BookingServices from '../../../components/trips/BookingServices';

// Helper function to ensure valid coordinates
function ensureValidCoordinates(itinerary: any) {
  if (!itinerary || !itinerary.days || !Array.isArray(itinerary.days)) {
    return itinerary;
  }
  
  console.log('Validating coordinates in loaded itinerary...');
  let issuesFixed = 0;
  
  for (const day of itinerary.days) {
    if (!day.activities || !Array.isArray(day.activities)) {
      day.activities = [];
      continue;
    }
    
    for (const activity of day.activities) {
      // Skip if not an object
      if (!activity || typeof activity !== 'object') continue;
      
      // Ensure coordinates exist and are properly formatted
      if (!activity.coordinates || typeof activity.coordinates !== 'object') {
        console.log(`Missing coordinates for activity "${activity.title}", adding default coordinates`);
        activity.coordinates = { lat: 40.7128, lng: -74.0060 }; // Default to NYC coordinates
        issuesFixed++;
      } else {
        // Make sure lat and lng are numbers
        let coordinateFixed = false;
        
        if (typeof activity.coordinates.lat !== 'number' && activity.coordinates.lat !== undefined) {
          console.log(`Converting lat coordinate for activity "${activity.title}" from ${typeof activity.coordinates.lat} to number`);
          activity.coordinates.lat = parseFloat(String(activity.coordinates.lat)) || 40.7128;
          coordinateFixed = true;
          issuesFixed++;
        } else if (activity.coordinates.lat === undefined) {
          console.log(`Missing lat coordinate for activity "${activity.title}", adding default`);
          activity.coordinates.lat = 40.7128;
          coordinateFixed = true;
          issuesFixed++;
        }
        
        if (typeof activity.coordinates.lng !== 'number' && activity.coordinates.lng !== undefined) {
          console.log(`Converting lng coordinate for activity "${activity.title}" from ${typeof activity.coordinates.lng} to number`);
          activity.coordinates.lng = parseFloat(String(activity.coordinates.lng)) || -74.0060;
          coordinateFixed = true;
          issuesFixed++;
        } else if (activity.coordinates.lng === undefined) {
          console.log(`Missing lng coordinate for activity "${activity.title}", adding default`);
          activity.coordinates.lng = -74.0060;
          coordinateFixed = true;
          issuesFixed++;
        }
        
        if (coordinateFixed) {
          console.log(`Fixed coordinates for activity "${activity.title}": ${JSON.stringify(activity.coordinates)}`);
        }
      }
    }
  }
  
  console.log(`Coordinates validation complete. Fixed ${issuesFixed} issues.`);
  return itinerary;
}

// Mock itinerary data as fallback
const mockItinerary = {
  id: 'trip-123',
  title: 'Paris Adventure',
  destination: 'Paris, France',
  dates: {
    start: '2023-10-15',
    end: '2023-10-18',
  },
  days: [
    {
      date: '2023-10-15',
      activities: [
        {
          id: 'act-1',
          time: 'Morning',
          title: 'Eiffel Tower Visit',
          description: 'Start your day with a visit to the iconic Eiffel Tower. Get there early to avoid crowds.',
          location: 'Champ de Mars, 5 Avenue Anatole France, 75007 Paris',
          coordinates: { lat: 48.8584, lng: 2.2945 },
          cost: 25,
          image: '/images/eiffel.jpg',
        },
        {
          id: 'act-2',
          time: 'Afternoon',
          title: 'Lunch at Le Jules Verne',
          description: 'Enjoy a luxurious lunch at Le Jules Verne restaurant with panoramic views of the city.',
          location: 'Eiffel Tower, Avenue Gustave Eiffel, 75007 Paris',
          coordinates: { lat: 48.8580, lng: 2.2946 },
          cost: 150,
          image: '/images/jules-verne.jpg',
        },
        {
          id: 'act-3',
          time: 'Evening',
          title: 'Seine River Cruise',
          description: 'End your first day with a romantic Seine River cruise, seeing Paris illuminated at night.',
          location: 'Port de la Conférence, 75008 Paris',
          coordinates: { lat: 48.8637, lng: 2.3085 },
          cost: 35,
          image: '/images/seine-cruise.jpg',
        },
      ],
    },
    {
      date: '2023-10-16',
      activities: [
        {
          id: 'act-4',
          time: 'Morning',
          title: 'Louvre Museum',
          description: 'Spend your morning exploring the world-famous Louvre Museum, home to thousands of works of art including the Mona Lisa.',
          location: 'Rue de Rivoli, 75001 Paris',
          coordinates: { lat: 48.8606, lng: 2.3376 },
          cost: 17,
          image: '/images/louvre.jpg',
        },
        {
          id: 'act-5',
          time: 'Afternoon',
          title: 'Lunch at Café Marly',
          description: 'Have lunch at the elegant Café Marly with a view of the Louvre Pyramid.',
          location: '93 Rue de Rivoli, 75001 Paris',
          coordinates: { lat: 48.8631, lng: 2.3353 },
          cost: 40,
          image: '/images/cafe-marly.jpg',
        },
        {
          id: 'act-6',
          time: 'Evening',
          title: 'Champs-Élysées & Arc de Triomphe',
          description: 'Walk along the famous Champs-Élysées avenue and visit the Arc de Triomphe.',
          location: 'Champs-Élysées, 75008 Paris',
          coordinates: { lat: 48.8738, lng: 2.2950 },
          cost: 12,
          image: '/images/arc-de-triomphe.jpg',
        },
      ],
    },
    {
      date: '2023-10-17',
      activities: [
        {
          id: 'act-7',
          time: 'Morning',
          title: 'Montmartre & Sacré-Cœur',
          description: 'Explore the charming district of Montmartre and visit the beautiful Sacré-Cœur Basilica.',
          location: '35 Rue du Chevalier de la Barre, 75018 Paris',
          coordinates: { lat: 48.8867, lng: 2.3431 },
          cost: 0,
          image: '/images/sacre-coeur.jpg',
        },
        {
          id: 'act-8',
          time: 'Afternoon',
          title: 'Lunch at La Maison Rose',
          description: 'Enjoy lunch at the picturesque La Maison Rose, a favorite spot for artists throughout history.',
          location: '2 Rue de l\'Abreuvoir, 75018 Paris',
          coordinates: { lat: 48.8867, lng: 2.3385 },
          cost: 35,
          image: '/images/maison-rose.jpg',
        },
        {
          id: 'act-9',
          time: 'Evening',
          title: 'Moulin Rouge Show',
          description: 'Experience a spectacular cabaret show at the famous Moulin Rouge.',
          location: '82 Boulevard de Clichy, 75018 Paris',
          coordinates: { lat: 48.8841, lng: 2.3322 },
          cost: 120,
          image: '/images/moulin-rouge.jpg',
        },
      ],
    },
    {
      date: '2023-10-18',
      activities: [
        {
          id: 'act-10',
          time: 'Morning',
          title: 'Notre-Dame Cathedral',
          description: 'Visit the exterior of Notre-Dame Cathedral (currently under restoration) and explore the surrounding Île de la Cité.',
          location: '6 Parvis Notre-Dame - Pl. Jean-Paul II, 75004 Paris',
          coordinates: { lat: 48.8530, lng: 2.3499 },
          cost: 0,
          image: '/images/notre-dame.jpg',
        },
        {
          id: 'act-11',
          time: 'Afternoon',
          title: 'Luxembourg Gardens',
          description: 'Relax in the beautiful Luxembourg Gardens and enjoy your final afternoon in Paris.',
          location: '75006 Paris',
          coordinates: { lat: 48.8462, lng: 2.3372 },
          cost: 0,
          image: '/images/luxembourg-gardens.jpg',
        },
        {
          id: 'act-12',
          time: 'Evening',
          title: 'Farewell Dinner at Le Comptoir du Relais',
          description: 'Say goodbye to Paris with a delicious meal at the popular Le Comptoir du Relais.',
          location: '9 Carrefour de l\'Odéon, 75006 Paris',
          coordinates: { lat: 48.8511, lng: 2.3390 },
          cost: 60,
          image: '/images/le-comptoir.jpg',
        },
      ],
    },
  ],
  budget: {
    accommodation: 450,
    food: 305,
    activities: 209,
    transport: 150,
    total: 1114,
  },
};

export default function GeneratedTripPage() {
  const router = useRouter();
  const [itinerary, setItinerary] = useState(mockItinerary);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Try to get the itinerary from localStorage
    try {
      console.log('Attempting to load itinerary from localStorage...');
      const savedItinerary = localStorage.getItem('generatedItinerary');
      
      if (savedItinerary) {
        console.log('Found itinerary in localStorage');
        console.log('First 100 characters:', savedItinerary.substring(0, 100));
        console.log('Last 100 characters:', savedItinerary.substring(savedItinerary.length - 100));
        
        // Check if it's valid JSON format
        const jsonCheck = savedItinerary.trim();
        const startsWithBrace = jsonCheck.startsWith('{');
        const endsWithBrace = jsonCheck.endsWith('}');
        
        console.log('JSON validation check - starts with {:', startsWithBrace, ', ends with }:', endsWithBrace);
        
        try {
          const parsedItinerary = JSON.parse(savedItinerary);
          console.log('Successfully parsed itinerary from localStorage');
          console.log('Itinerary structure:', Object.keys(parsedItinerary).join(', '));
          
          // Check for expected structure
          if (!parsedItinerary.days) {
            console.error('Missing days array in parsed itinerary');
            // Fall back to mock data
          } else if (!Array.isArray(parsedItinerary.days)) {
            console.error('Days property exists but is not an array:', typeof parsedItinerary.days);
            // Fall back to mock data
          } else if (parsedItinerary.days.length === 0) {
            console.error('Days array is empty');
            // Fall back to mock data
          } else {
            console.log(`Successfully loaded itinerary with ${parsedItinerary.days.length} days`);
            // Log the structure of the first day to help diagnose issues
            if (parsedItinerary.days[0]) {
              console.log('First day structure:', Object.keys(parsedItinerary.days[0]).join(', '));
              console.log('First day has activities:', Array.isArray(parsedItinerary.days[0].activities), 
                parsedItinerary.days[0].activities ? parsedItinerary.days[0].activities.length : 0);
              
              // Debug coordinates specifically
              if (parsedItinerary.days[0].activities && parsedItinerary.days[0].activities.length > 0) {
                const firstActivity = parsedItinerary.days[0].activities[0];
                console.log('First activity properties:', Object.keys(firstActivity).join(', '));
                console.log('First activity coordinates exists:', !!firstActivity.coordinates);
                if (firstActivity.coordinates) {
                  console.log('Coordinates type:', typeof firstActivity.coordinates);
                  console.log('Coordinates structure:', JSON.stringify(firstActivity.coordinates));
                  console.log('Coordinates lat/lng values:', 
                    firstActivity.coordinates.lat, 
                    firstActivity.coordinates.lng);
                  console.log('Are lat/lng valid numbers:', 
                    !isNaN(Number(firstActivity.coordinates.lat)) && isFinite(Number(firstActivity.coordinates.lat)),
                    !isNaN(Number(firstActivity.coordinates.lng)) && isFinite(Number(firstActivity.coordinates.lng))
                  );
                }
              }
            }
            setItinerary(ensureValidCoordinates(parsedItinerary));
          }
        } catch (parseError) {
          console.error('Error parsing itinerary JSON:', parseError);
          // Fall back to mock data
        }
      } else {
        console.log('No itinerary found in localStorage, using mock data');
      }
    } catch (error) {
      console.error('Error accessing localStorage:', error);
      // If there's an error, we'll use the mock data
    } finally {
      // If we're using the mock data, make sure it also has valid coordinates
      if (!isLoading && itinerary === mockItinerary) {
        console.log('Using mock itinerary, validating coordinates...');
        setItinerary(ensureValidCoordinates(mockItinerary));
      }
      setIsLoading(false);
    }
  }, []);

  // Handler for edit button
  const handleEditTrip = () => {
    router.push('/trips/new'); // Redirect back to the survey form
  };

  // Handler for share button (simplified demo)
  const handleShareTrip = () => {
    alert('Sharing functionality would be implemented here in a real application.');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your itinerary...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">{itinerary.title}</h1>
        <div className="flex gap-2">
          <button 
            onClick={handleEditTrip}
            className="bg-primary text-white py-2 px-4 rounded-md hover:bg-opacity-90 flex items-center gap-1"
          >
            <FaEdit /> <span>Edit Trip</span>
          </button>
          <button 
            onClick={handleShareTrip}
            className="bg-accent text-white py-2 px-4 rounded-md hover:bg-opacity-90 flex items-center gap-1"
          >
            <FaShare /> <span>Share</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-4 flex flex-wrap gap-6">
        <div className="flex-1 min-w-[250px]">
          <h2 className="font-semibold text-lg mb-2">Trip Details</h2>
          <p className="text-gray-600">
            <strong>Destination:</strong> {itinerary.destination}
          </p>
          <p className="text-gray-600">
            <strong>Dates:</strong> {new Date(itinerary.dates.start).toLocaleDateString()} - {new Date(itinerary.dates.end).toLocaleDateString()}
          </p>
          <p className="text-gray-600">
            <strong>Duration:</strong> {itinerary.days.length} days
          </p>
        </div>
        <div className="flex-1 min-w-[250px]">
          <h2 className="font-semibold text-lg mb-2">Total Budget</h2>
          <p className="text-2xl font-bold text-primary">${itinerary.budget.total}</p>
          <p className="text-sm text-gray-500">View detailed breakdown below</p>
        </div>
      </div>

      {/* Tabs - Calendar, Map, Budget Views */}
      <ItineraryTabs days={itinerary.days} budget={itinerary.budget} />
      
      {/* Booking Services */}
      <div className="mt-10">
        <BookingServices 
          destination={itinerary.destination}
          startDate={itinerary.dates.start}
          endDate={itinerary.dates.end}
        />
      </div>
    </div>
  );
} 