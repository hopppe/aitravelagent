'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import JobStatusPoller from './JobStatusPoller';
import ErrorDisplay from '../ErrorDisplay';

// Define the survey steps
type SurveyStep = 'destination' | 'dates' | 'purpose' | 'budget' | 'preferences';

// Define preference categories and options
const preferenceOptions = [
  { id: 'nature', label: 'Nature & Outdoors' },
  { id: 'culture', label: 'Culture & Arts' },
  { id: 'food', label: 'Food & Dining' },
  { id: 'adventure', label: 'Adventure Activities' },
  { id: 'relaxation', label: 'Relaxation & Wellness' },
  { id: 'history', label: 'History & Landmarks' },
  { id: 'nightlife', label: 'Nightlife & Entertainment' },
  { id: 'shopping', label: 'Shopping' },
  { id: 'family', label: 'Family-friendly Activities' },
];

// Define trip purpose options
const tripPurposeOptions = [
  { id: 'vacation', label: 'Vacation' },
  { id: 'honeymoon', label: 'Honeymoon' },
  { id: 'family', label: 'Family Trip' },
  { id: 'solo', label: 'Solo Adventure' },
  { id: 'business', label: 'Business Trip' },
  { id: 'weekend', label: 'Weekend Getaway' },
  { id: 'roadtrip', label: 'Road Trip' },
];

// Budget range options
const budgetOptions = [
  { id: 'budget', label: 'Budget-friendly', description: 'Economical options, hostels, street food' },
  { id: 'moderate', label: 'Moderate', description: 'Mid-range hotels, some nice restaurants' },
  { id: 'luxury', label: 'Luxury', description: 'High-end hotels, fine dining, premium experiences' },
];

export default function TripSurveyForm() {
  const router = useRouter();
  
  // State for form inputs
  const [currentStep, setCurrentStep] = useState<SurveyStep>('destination');
  const [formData, setFormData] = useState({
    destination: '',
    startDate: '',
    endDate: '',
    purpose: '',
    budget: '',
    preferences: [] as string[],
  });
  
  // Add loading and job tracking state
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);

  // Add error details state
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  // Add testing connection state
  const [isTestingConnection, setIsTestingConnection] = useState<boolean>(false);

  // Handle text input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Handle radio button selection
  const handleRadioChange = (name: string, value: string) => {
    setFormData({ ...formData, [name]: value });
  };

  // Handle checkbox preferences
  const handlePreferenceToggle = (preferenceId: string) => {
    const updatedPreferences = formData.preferences.includes(preferenceId)
      ? formData.preferences.filter(id => id !== preferenceId)
      : [...formData.preferences, preferenceId];
    
    setFormData({ ...formData, preferences: updatedPreferences });
  };

  // Move to next step
  const nextStep = () => {
    switch (currentStep) {
      case 'destination':
        if (formData.destination) setCurrentStep('dates');
        break;
      case 'dates':
        if (formData.startDate && formData.endDate) setCurrentStep('purpose');
        break;
      case 'purpose':
        if (formData.purpose) setCurrentStep('budget');
        break;
      case 'budget':
        if (formData.budget) setCurrentStep('preferences');
        break;
      case 'preferences':
        // Submit the form
        handleSubmit();
        break;
    }
  };

  // Move back a step
  const prevStep = () => {
    switch (currentStep) {
      case 'dates': setCurrentStep('destination'); break;
      case 'purpose': setCurrentStep('dates'); break;
      case 'budget': setCurrentStep('purpose'); break;
      case 'preferences': setCurrentStep('budget'); break;
    }
  };

  // Test the job system connection
  const testJobSystem = async () => {
    try {
      setIsTestingConnection(true);
      setError(null);
      setErrorDetails(null);
      
      const response = await fetch('/api/test-job');
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Connection test failed');
      }
      
      console.log('Job system test successful:', data);
      return true;
    } catch (err) {
      console.error('Job system test failed:', err);
      return false;
    } finally {
      setIsTestingConnection(false);
    }
  };

  // Submit the form
  const handleSubmit = async () => {
    try {
      // Test connection first
      const connectionOk = await testJobSystem();
      if (!connectionOk) {
        throw new Error('Job system connection test failed. Please check your Supabase configuration.');
      }
      
      setIsGenerating(true);
      setError(null);
      setErrorDetails(null);
      setJobId(null);
      
      console.log('Submitting trip form with data:', JSON.stringify(formData, null, 2));
      
      // Call the API to generate an itinerary
      console.log('Calling API to generate itinerary...');
      const response = await fetch('/api/generate-itinerary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      console.log('API response status:', response.status);
      
      // Get the response data first, then check if it's ok
      let data;
      try {
        data = await response.json();
        console.log('Raw API response:', data);
      } catch (parseError) {
        console.error('Error parsing API response:', parseError);
        throw new Error('Invalid response format from server');
      }
      
      // Now check if the response was ok
      if (!response.ok) {
        console.error('API error response:', data);
        
        // Show more detailed error message if available
        const errorMessage = data.error || 'Failed to generate itinerary';
        throw new Error(errorMessage);
      }
      
      console.log('Successfully received response from API');
      
      // Check if the response contains a job ID (background processing)
      if (data.jobId) {
        console.log('Received job ID:', data.jobId);
        setJobId(data.jobId);
        
        // If job is already completed (for mock data in development)
        if (data.status === 'completed') {
          handleJobComplete(data.result);
        }
        
        // Background job will be polled by JobStatusPoller component
        return;
      }
      
      // Legacy mode: direct itinerary response
      console.log('Received data structure:', Object.keys(data).join(', '));
      
      if (!data.itinerary) {
        console.error('No itinerary data in API response');
        throw new Error('API response missing itinerary data');
      }
      
      // Store the itinerary and navigate
      handleStoreItineraryAndNavigate(data.itinerary);
      
    } catch (err) {
      console.error('Error generating itinerary:', err);
      
      // Display a more user-friendly error message
      let errorMessage = 'An unexpected error occurred';
      let details = '';
      
      if (err instanceof Error) {
        // Clean up technical error messages to make them more user-friendly
        const message = err.message;
        details = message; // Store original message as details
        
        if (message.includes('Supabase')) {
          errorMessage = 'Database connection error. Please check your Supabase setup.';
        } else if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
          errorMessage = 'Network error: Please check your internet connection and try again.';
        } else if (message.includes('timeout')) {
          errorMessage = 'The request timed out. Our servers might be busy, please try again.';
        } else if (message.includes('parse')) {
          errorMessage = 'There was a problem with the response from our server. Please try again.';
        } else if (message.includes('pattern')) {
          errorMessage = 'There was a problem with the data format. Please try again with different preferences.';
        } else if (message.includes('itinerary')) {
          errorMessage = 'We had trouble creating your itinerary. Please try again or modify your preferences.';
        } else {
          // Use the error message but ensure it's not too technical
          errorMessage = message;
        }
      }
      
      setError(errorMessage);
      setErrorDetails(details);
      setIsGenerating(false);
    }
  };
  
  // Handle job completion from the JobStatusPoller
  const handleJobComplete = (result: any) => {
    console.log('Job completed with result:', result);
    
    try {
      // Check if we have rawContent from the OpenAI API
      if (result && result.rawContent) {
        console.log('Processing raw content from OpenAI');
        
        // Try to parse the JSON from the raw content
        try {
          // First try direct JSON parse
          const itinerary = JSON.parse(result.rawContent);
          handleStoreItineraryAndNavigate(itinerary);
          return;
        } catch (jsonError) {
          console.error('Error parsing raw JSON:', jsonError);
          
          // Try to extract JSON if it's wrapped in other text
          const jsonMatch = result.rawContent.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try {
              const itinerary = JSON.parse(jsonMatch[0]);
              console.log('Successfully extracted JSON from raw content');
              handleStoreItineraryAndNavigate(itinerary);
              return;
            } catch (extractError) {
              console.error('Error parsing extracted JSON:', extractError);
            }
          }
          
          // If all parsing attempts fail, show error
          setError('Failed to parse the generated itinerary. Please try again.');
          setErrorDetails('The AI generated an invalid JSON response.');
          setIsGenerating(false);
          return;
        }
      }
      
      // Fallback to old format if rawContent is not available
      if (result && result.itinerary) {
        handleStoreItineraryAndNavigate(result.itinerary);
        return;
      }
      
      // If we reach here, something went wrong
      throw new Error('Invalid result format from job');
    } catch (err) {
      console.error('Error processing job result:', err);
      setError('Error processing the generated itinerary');
      setErrorDetails('Error processing the generated itinerary');
      setIsGenerating(false);
    }
  };
  
  // Handle job errors from the JobStatusPoller
  const handleJobError = (errorMessage: string) => {
    console.error('Job error:', errorMessage);
    setError(errorMessage);
    setErrorDetails(errorMessage);
    setIsGenerating(false);
  };
  
  // Store itinerary and navigate to results page
  const handleStoreItineraryAndNavigate = (itinerary: any) => {
    try {
      console.log('Saving itinerary to localStorage...');
      
      // Validate the itinerary data
      if (!itinerary.days || !Array.isArray(itinerary.days)) {
        console.error('Invalid itinerary structure - days array is missing or not an array');
        throw new Error('Invalid itinerary structure received');
      }
      
      console.log(`Itinerary has ${itinerary.days.length} days`);

      // Validate and fix coordinates client-side
      let coordinatesFixed = 0;
      
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
            activity.coordinates = { lat: 40.7128, lng: -74.0060 }; // Default to NYC coordinates
            coordinatesFixed++;
          } else {
            // Make sure lat and lng are numbers
            if (typeof activity.coordinates.lat !== 'number' && activity.coordinates.lat !== undefined) {
              activity.coordinates.lat = parseFloat(String(activity.coordinates.lat)) || 40.7128;
              coordinatesFixed++;
            } else if (activity.coordinates.lat === undefined) {
              activity.coordinates.lat = 40.7128;
              coordinatesFixed++;
            }
            
            if (typeof activity.coordinates.lng !== 'number' && activity.coordinates.lng !== undefined) {
              activity.coordinates.lng = parseFloat(String(activity.coordinates.lng)) || -74.0060;
              coordinatesFixed++;
            } else if (activity.coordinates.lng === undefined) {
              activity.coordinates.lng = -74.0060;
              coordinatesFixed++;
            }
          }
        }
      }
      
      if (coordinatesFixed > 0) {
        console.log(`Fixed ${coordinatesFixed} coordinate issues in the itinerary`);
      }
      
      // Check coordinates after validation
      if (itinerary.days.length > 0 && itinerary.days[0].activities?.length > 0) {
        const firstActivity = itinerary.days[0].activities[0];
        console.log('First activity before storing:', {
          title: firstActivity.title,
          hasCoordinates: !!firstActivity.coordinates,
          coordinates: firstActivity.coordinates ? JSON.stringify(firstActivity.coordinates) : 'none'
        });
        
        // Log all activities coordinates for the first day
        const missingCoordinates = itinerary.days[0].activities.filter(
          (activity: any) => !activity.coordinates || 
          typeof activity.coordinates !== 'object' || 
          activity.coordinates.lat === undefined || 
          activity.coordinates.lng === undefined
        );
        
        console.log(`First day has ${missingCoordinates.length} activities with missing coordinates out of ${itinerary.days[0].activities.length} total`);
      }
      
      // Store in localStorage
      const itineraryJson = JSON.stringify(itinerary);
      console.log('Stringified length:', itineraryJson.length);
      localStorage.setItem('generatedItinerary', itineraryJson);
      console.log('Successfully saved to localStorage');
      
      // Navigate to the generated trip page
      console.log('Navigating to generated trip page...');
      router.push('/trips/generated-trip');
    } catch (storageError) {
      console.error('Error saving to localStorage:', storageError);
      throw new Error('Failed to save itinerary data: ' + 
        (storageError instanceof Error ? storageError.message : 'Unknown error'));
    }
  };

  // Render different form sections based on current step
  const renderFormStep = () => {
    switch (currentStep) {
      case 'destination':
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Where do you want to go?</h2>
            <div>
              <label htmlFor="destination" className="block text-sm font-medium text-gray-700 mb-1">
                Destination
              </label>
              <input
                id="destination"
                name="destination"
                type="text"
                value={formData.destination}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                placeholder="City, country, or region"
                required
              />
            </div>
          </div>
        );
      
      case 'dates':
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">When are you traveling?</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg overflow-hidden shadow-sm border border-gray-200">
                <label htmlFor="startDate" className="block text-sm font-medium bg-gray-50 p-3 border-b border-gray-200">
                  Start Date
                </label>
                <input
                  id="startDate"
                  name="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={handleInputChange}
                  className="w-full p-4 text-lg focus:ring-primary focus:border-primary calendar-input"
                  required
                />
              </div>
              <div className="bg-white rounded-lg overflow-hidden shadow-sm border border-gray-200">
                <label htmlFor="endDate" className="block text-sm font-medium bg-gray-50 p-3 border-b border-gray-200">
                  End Date
                </label>
                <input
                  id="endDate"
                  name="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={handleInputChange}
                  className="w-full p-4 text-lg focus:ring-primary focus:border-primary calendar-input"
                  required
                />
              </div>
            </div>
            <p className="text-sm text-gray-500 italic mt-2">Select your travel dates to help us plan the perfect itinerary length.</p>
          </div>
        );
      
      case 'purpose':
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">What's the purpose of your trip?</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {tripPurposeOptions.map(option => (
                <div
                  key={option.id}
                  className={`
                    p-4 border rounded-md cursor-pointer transition-all
                    ${formData.purpose === option.id 
                      ? 'border-primary bg-primary bg-opacity-10' 
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }
                  `}
                  onClick={() => handleRadioChange('purpose', option.id)}
                >
                  <div className="flex items-center">
                    <div className="h-4 w-4 flex items-center justify-center">
                      <div 
                        className={`rounded-full ${formData.purpose === option.id ? 'h-4 w-4 bg-primary' : 'h-3 w-3 border border-gray-400'}`}
                      ></div>
                    </div>
                    <span className="ml-2 text-sm font-medium text-gray-700">
                      {option.label}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      
      case 'budget':
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">What's your budget range?</h2>
            <div className="space-y-3">
              {budgetOptions.map(option => (
                <div
                  key={option.id}
                  className={`
                    p-4 border rounded-md cursor-pointer transition-all
                    ${formData.budget === option.id 
                      ? 'border-primary bg-primary bg-opacity-10' 
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }
                  `}
                  onClick={() => handleRadioChange('budget', option.id)}
                >
                  <div className="flex items-start">
                    <div className="h-4 w-4 mt-1 flex items-center justify-center">
                      <div 
                        className={`rounded-full ${formData.budget === option.id ? 'h-4 w-4 bg-primary' : 'h-3 w-3 border border-gray-400'}`}
                      ></div>
                    </div>
                    <div className="ml-2">
                      <span className="text-sm font-medium text-gray-700">
                        {option.label}
                      </span>
                      <p className="text-sm text-gray-500">{option.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      
      case 'preferences':
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">What do you enjoy when traveling?</h2>
            <p className="text-gray-600 text-sm">Select all that apply. This helps us tailor your itinerary.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {preferenceOptions.map(option => (
                <div
                  key={option.id}
                  className={`
                    p-3 border rounded-md cursor-pointer transition-all
                    ${formData.preferences.includes(option.id) 
                      ? 'border-primary bg-primary bg-opacity-10' 
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }
                  `}
                  onClick={() => handlePreferenceToggle(option.id)}
                >
                  <div className="flex items-center">
                    <div className="h-4 w-4 flex items-center justify-center">
                      <div 
                        className={`${formData.preferences.includes(option.id) 
                          ? 'h-3 w-3 bg-primary rounded-sm' 
                          : 'h-3 w-3 border border-gray-400 rounded-sm'}`}
                      ></div>
                    </div>
                    <span className="ml-2 text-sm font-medium text-gray-700">
                      {option.label}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
    }
  };

  // Progress indicators
  const totalSteps = 5;
  const currentStepIndex = ['destination', 'dates', 'purpose', 'budget', 'preferences'].indexOf(currentStep) + 1;
  
  // Show a better loading state with the job status poller
  const renderLoadingState = () => {
    if (!isGenerating) return null;
    
    if (jobId) {
      return (
        <JobStatusPoller 
          jobId={jobId}
          onComplete={handleJobComplete}
          onError={handleJobError}
          pollingInterval={2000} // Poll every 2 seconds
          maxPolls={60} // Up to 2 minutes (60 * 2s)
        />
      );
    }
    
    // Legacy loading spinner if no job ID
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Generating Your Itinerary</h3>
          <p className="text-sm text-gray-500">This may take up to a minute...</p>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {renderFormStep()}
      
      {/* Error message */}
      {error && (
        <ErrorDisplay 
          title="Error Generating Itinerary"
          message={error}
          details={errorDetails || undefined}
          suggestion="Please try again or modify your preferences"
          actionText="Try Again"
          actionFn={() => {
            setError(null);
            setErrorDetails(null);
          }}
        />
      )}
      
      {/* Navigation buttons */}
      <div className="flex justify-between mt-6">
        {currentStep !== 'destination' && (
          <button
            type="button"
            onClick={prevStep}
            disabled={isGenerating}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
          >
            Back
          </button>
        )}
        <div className={`${currentStep === 'destination' ? 'ml-auto' : ''}`}>
          <button
            type="button"
            onClick={nextStep}
            disabled={isGenerating}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
          >
            {currentStep === 'preferences' ? 'Generate Itinerary' : 'Next'}
          </button>
        </div>
      </div>
      
      {/* Loading overlay and job status poller */}
      {renderLoadingState()}
    </div>
  );
} 