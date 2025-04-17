'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

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
  
  // Add loading state
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // Submit the form
  const handleSubmit = async () => {
    try {
      setIsGenerating(true);
      setError(null);
      
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
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('API error response:', errorData);
        
        // Show more detailed error message if available
        const errorMessage = errorData.details 
          ? `${errorData.error}: ${errorData.details}` 
          : errorData.error || 'Failed to generate itinerary';
        
        throw new Error(errorMessage);
      }
      
      console.log('Successfully received response from API');
      
      // Parse the response as JSON
      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error('Error parsing API response:', parseError);
        throw new Error('Invalid response format from server');
      }
      
      console.log('Received data structure:', Object.keys(data).join(', '));
      
      if (!data.itinerary) {
        console.error('No itinerary data in API response');
        throw new Error('API response missing itinerary data');
      }
      
      if (!data.itinerary.days || !Array.isArray(data.itinerary.days)) {
        console.error('Invalid itinerary structure - days array is missing or not an array');
        console.log('Itinerary structure received:', JSON.stringify(data.itinerary, null, 2));
        throw new Error('Invalid itinerary structure received from API');
      }
      
      console.log(`Itinerary has ${data.itinerary.days.length} days`);
      
      // Store the generated itinerary in localStorage for demo purposes
      try {
        console.log('Saving itinerary to localStorage...');
        const itineraryJson = JSON.stringify(data.itinerary);
        console.log('Stringified length:', itineraryJson.length);
        localStorage.setItem('generatedItinerary', itineraryJson);
        console.log('Successfully saved to localStorage');
      } catch (storageError) {
        console.error('Error saving to localStorage:', storageError);
        throw new Error('Failed to save itinerary data: ' + (storageError instanceof Error ? storageError.message : 'Unknown error'));
      }
      
      // Navigate to the generated trip page
      console.log('Navigating to generated trip page...');
      router.push('/trips/generated-trip');
    } catch (err) {
      console.error('Error generating itinerary:', err);
      
      // Display a more user-friendly error message
      let errorMessage = 'An unexpected error occurred';
      
      if (err instanceof Error) {
        // Clean up technical error messages to make them more user-friendly
        const message = err.message;
        
        if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
          errorMessage = 'Network error: Please check your internet connection and try again.';
        } else if (message.includes('timeout')) {
          errorMessage = 'The request timed out. Our servers might be busy, please try again.';
        } else if (message.includes('parse')) {
          errorMessage = 'There was a problem with the response from our server. Please try again.';
        } else if (message.includes('itinerary')) {
          errorMessage = 'We had trouble creating your itinerary. Please try again or modify your preferences.';
        } else {
          // Use the error message but ensure it's not too technical
          errorMessage = message;
        }
      }
      
      setError(errorMessage);
    } finally {
      setIsGenerating(false);
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
  
  // Render loading state when generating itinerary
  if (isGenerating) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold mb-2">Creating Your Perfect Trip</h2>
          <p className="text-gray-600">
            Our AI is planning your personalized itinerary for {formData.destination}.
            <br />This may take a minute...
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
      {/* Error message */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
          <div className="flex">
            <div>
              <p className="text-sm text-red-700">
                {error}
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex justify-between mb-2">
          <span className="text-sm font-medium text-gray-500">Step {currentStepIndex} of {totalSteps}</span>
          <span className="text-sm font-medium text-primary">{Math.round((currentStepIndex / totalSteps) * 100)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div 
            className="bg-primary rounded-full h-2.5 transition-all" 
            style={{ width: `${(currentStepIndex / totalSteps) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* Form step content */}
      <form className="mb-6" onSubmit={(e) => e.preventDefault()}>
        {renderFormStep()}
      </form>

      {/* Navigation buttons */}
      <div className="flex justify-between pt-4 border-t">
        <button
          type="button"
          onClick={prevStep}
          disabled={currentStep === 'destination'}
          className={`
            px-4 py-2 rounded-md 
            ${currentStep === 'destination' 
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}
          `}
        >
          Back
        </button>
        
        <button
          type="button"
          onClick={nextStep}
          className="px-4 py-2 bg-primary text-white rounded-md hover:bg-opacity-90"
        >
          {currentStep === 'preferences' ? 'Create Trip' : 'Next'}
        </button>
      </div>
    </div>
  );
} 