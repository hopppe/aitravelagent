import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FaMapMarkerAlt } from 'react-icons/fa';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow, Polyline } from '@react-google-maps/api';

// Location type with coordinates
type Location = {
  lat: number;
  lng: number;
};

// Activity type with all details
type Activity = {
  id: string;
  time: string;
  title: string;
  description: string;
  location: string;
  coordinates: Location;
  cost: number;
  image?: string;
};

// Day with activities
type Day = {
  date: string;
  activities: Activity[];
};

// Props for the map component
interface ItineraryMapViewProps {
  days: Day[];
}

// Colors for different days
const dayColors = [
  '#e74c3c', // Red
  '#3498db', // Blue
  '#2ecc71', // Green
  '#f39c12', // Orange
  '#9b59b6', // Purple
  '#1abc9c', // Teal
  '#34495e', // Dark Blue
];

// Google Maps API libraries to load
const libraries: ["places"] = ["places"];

// Google Maps container style
const containerStyle = {
  width: '100%',
  height: '100%'
};

// Get the API key once at module level, outside of component
const googleMapsApiKey = typeof window !== 'undefined' 
  ? (process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '') 
  : '';

export default function ItineraryMapView({ days }: ItineraryMapViewProps) {
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Load Google Maps JS API with consistent parameters
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey,
    libraries,
  });

  // Log any errors with the API key
  useEffect(() => {
    if (!googleMapsApiKey) {
      console.error('Google Maps API key is not defined in environment variables');
      setError('Google Maps API key is missing. Please add it to your .env.local file.');
    }
    
    if (loadError) {
      console.error('Google Maps loading error:', loadError);
      setError(`Failed to load Google Maps: ${loadError.message}`);
    }
  }, [loadError]);

  // Flatten all activities into a single array
  const allActivities = days.flatMap(day => day.activities);
  
  // Find center coordinates for the map (average of all points)
  const getCenterCoordinates = useCallback((): google.maps.LatLngLiteral => {
    // Default to center of USA if no activities
    if (allActivities.length === 0) return { lat: 39.8283, lng: -98.5795 };
    
    // Filter out invalid coordinates
    const validActivities = allActivities.filter(
      activity => activity && 
      activity.coordinates && 
      typeof activity.coordinates === 'object' &&
      activity.coordinates.lat !== undefined && 
      activity.coordinates.lng !== undefined &&
      !isNaN(Number(activity.coordinates.lat)) && 
      !isNaN(Number(activity.coordinates.lng)) &&
      isFinite(Number(activity.coordinates.lat)) && 
      isFinite(Number(activity.coordinates.lng))
    );
    
    if (validActivities.length === 0) return { lat: 39.8283, lng: -98.5795 };
    
    const sumLat = validActivities.reduce((sum, activity) => sum + Number(activity.coordinates.lat), 0);
    const sumLng = validActivities.reduce((sum, activity) => sum + Number(activity.coordinates.lng), 0);
    
    return { 
      lat: sumLat / validActivities.length, 
      lng: sumLng / validActivities.length 
    };
  }, [allActivities]);

  // Callback for when the map loads
  const onMapLoad = useCallback((map: google.maps.Map) => {
    setMapInstance(map);
    
    // Check if we have valid coordinates
    const validActivities = allActivities.filter(
      activity => activity && 
      activity.coordinates && 
      typeof activity.coordinates === 'object' &&
      activity.coordinates.lat !== undefined && 
      activity.coordinates.lng !== undefined &&
      !isNaN(Number(activity.coordinates.lat)) && 
      !isNaN(Number(activity.coordinates.lng)) &&
      isFinite(Number(activity.coordinates.lat)) && 
      isFinite(Number(activity.coordinates.lng))
    );
    
    // Fit bounds to include all markers if we have valid coordinates
    if (validActivities.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      
      validActivities.forEach(activity => {
        bounds.extend({
          lat: Number(activity.coordinates.lat),
          lng: Number(activity.coordinates.lng)
        });
      });
      
      map.fitBounds(bounds);
      
      // Set a reasonable zoom level if we only have one marker
      if (validActivities.length === 1) {
        map.setZoom(14);
      }
    }
  }, [allActivities]);

  // Callback for when the map is unmounted
  const onUnmount = useCallback(() => {
    setMapInstance(null);
  }, []);

  // Create a custom marker icon with day number and activity index
  const createMarkerIcon = (dayIndex: number, activityIndex: number) => {
    const dayColor = dayColors[dayIndex % dayColors.length];
    
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
        <g transform="translate(20,20)">
          <circle r="16" fill="${dayColor}" />
          <text x="0" y="5" text-anchor="middle" fill="white" font-size="14px" font-weight="bold" font-family="Arial">${activityIndex + 1}</text>
          <circle cx="10" cy="10" r="8" fill="white" stroke="#ccc" />
          <text x="10" y="13" text-anchor="middle" fill="#333" font-size="8px" font-weight="bold" font-family="Arial">${dayIndex + 1}</text>
        </g>
      </svg>
    `;
    
    return {
      url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
      scaledSize: new google.maps.Size(40, 40),
      origin: new google.maps.Point(0, 0),
      anchor: new google.maps.Point(20, 20)
    };
  };

  // Format date for the legend
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch (e) {
      return dateString;
    }
  };

  // Handle loading errors
  if (loadError) {
    return (
      <div className="relative w-full h-[400px] rounded-lg overflow-hidden shadow-md bg-gray-100 flex items-center justify-center">
        <div className="text-center p-8">
          <div className="text-red-500 mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-800">Google Maps Error</h3>
          <p className="text-gray-600 mt-1">Failed to load Google Maps API. This could be due to:</p>
          <ul className="text-sm text-left list-disc pl-8 mt-2 text-gray-700">
            <li>Invalid API key</li>
            <li>API key restrictions (domain, IP, etc)</li>
            <li>API key not enabled for Maps JavaScript API</li>
            <li>Billing not enabled for the project</li>
          </ul>
          <p className="text-sm text-gray-500 mt-4 bg-gray-100 p-2 rounded overflow-auto">
            Error details: {loadError.message}
          </p>
        </div>
      </div>
    );
  }

  // Show loading state
  if (!isLoaded) {
    return (
      <div className="relative w-full h-[400px] rounded-lg overflow-hidden shadow-md bg-gray-100 flex items-center justify-center">
        <div className="text-center p-8">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading map...</p>
        </div>
      </div>
    );
  }

  // Show error if specified
  if (error) {
    return (
      <div className="relative w-full h-[400px] rounded-lg overflow-hidden shadow-md bg-gray-100 flex items-center justify-center">
        <div className="text-center p-8">
          <div className="text-red-500 mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-800">Map Error</h3>
          <p className="text-gray-600 mt-1">{error}</p>
          <p className="text-sm text-gray-500 mt-4">Try refreshing the page or check your internet connection.</p>
        </div>
      </div>
    );
  }

  // Legend for day colors
  const renderLegend = () => {
    return (
      <div className="absolute bottom-4 left-4 bg-white p-2 rounded-md shadow-md z-10">
        <p className="font-medium text-sm mb-1">Days:</p>
        <div className="space-y-1">
          {days.map((day, index) => (
            <div key={day.date} className="flex items-center gap-2">
              <div 
                className="w-4 h-4 rounded-full" 
                style={{ backgroundColor: dayColors[index % dayColors.length] }}
              ></div>
              <span className="text-xs">
                Day {index + 1}: {formatDate(day.date)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="relative w-full h-[500px] rounded-lg overflow-hidden shadow-md">
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={getCenterCoordinates()}
        zoom={10}
        onLoad={onMapLoad}
        onUnmount={onUnmount}
        options={{
          mapTypeControl: true,
          streetViewControl: true,
          fullscreenControl: true,
        }}
      >
        {/* Render markers for each activity */}
        {days.map((day, dayIndex) => {
          const dayColor = dayColors[dayIndex % dayColors.length];
          
          // Filter activities with valid coordinates
          const validActivities = day.activities.filter(
            activity => activity && 
            activity.coordinates && 
            typeof activity.coordinates === 'object' &&
            activity.coordinates.lat !== undefined && 
            activity.coordinates.lng !== undefined &&
            !isNaN(Number(activity.coordinates.lat)) && 
            !isNaN(Number(activity.coordinates.lng)) &&
            isFinite(Number(activity.coordinates.lat)) && 
            isFinite(Number(activity.coordinates.lng))
          );
          
          return (
            <div key={day.date}>
              {/* Markers for each activity */}
              {validActivities.map((activity, activityIndex) => (
                <Marker
                  key={activity.id}
                  position={{
                    lat: Number(activity.coordinates.lat),
                    lng: Number(activity.coordinates.lng)
                  }}
                  icon={createMarkerIcon(dayIndex, activityIndex)}
                  onClick={() => setSelectedActivity(activity)}
                />
              ))}
              
              {/* Polyline connecting activities for the day */}
              {validActivities.length >= 2 && (
                <Polyline
                  path={validActivities.map(activity => ({
                    lat: Number(activity.coordinates.lat),
                    lng: Number(activity.coordinates.lng)
                  }))}
                  options={{
                    strokeColor: dayColor,
                    strokeOpacity: 0.8,
                    strokeWeight: 3,
                  }}
                />
              )}
            </div>
          );
        })}
        
        {/* Info window for selected activity */}
        {selectedActivity && (
          <InfoWindow
            position={{
              lat: Number(selectedActivity.coordinates.lat),
              lng: Number(selectedActivity.coordinates.lng)
            }}
            onCloseClick={() => setSelectedActivity(null)}
          >
            <div className="p-2 max-w-xs">
              <h3 className="font-bold text-gray-800 mb-1">{selectedActivity.title}</h3>
              <p className="text-sm text-gray-600 mb-1">{selectedActivity.time}</p>
              <p className="text-sm mb-2">{selectedActivity.description}</p>
              <p className="text-sm text-gray-600">
                <FaMapMarkerAlt className="inline-block mr-1" size={12} />
                {selectedActivity.location}
              </p>
              <p className="text-sm font-medium text-right mt-2">
                Cost: ${selectedActivity.cost}
              </p>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
      
      {days.length > 0 && renderLegend()}
    </div>
  );
} 