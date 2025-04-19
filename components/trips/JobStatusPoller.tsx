'use client';

import React, { useState, useEffect } from 'react';
import { JobData } from '../../lib/supabase';

// Props type definition
interface JobStatusPollerProps {
  jobId: string;
  onComplete: (result: any) => void;
  onError: (error: string) => void;
  pollingInterval?: number; // ms between polls
  maxPolls?: number; // max number of polls before giving up
}

// Type guard functions to help TypeScript narrow types
const isCompleted = (status: string): boolean => status === 'completed';
const isFailed = (status: string): boolean => status === 'failed';

const JobStatusPoller: React.FC<JobStatusPollerProps> = ({
  jobId,
  onComplete,
  onError,
  pollingInterval = 3000, // Default 3 seconds (increased from 2)
  maxPolls = 120, // Default max 6 minutes (increased from 60)
}) => {
  const [status, setStatus] = useState<string>('queued');
  const [pollCount, setPollCount] = useState(0);
  const [message, setMessage] = useState('Your itinerary is being generated...');
  const [showDetails, setShowDetails] = useState(false);
  const [details, setDetails] = useState<JobData | null>(null);
  const [notFoundCount, setNotFoundCount] = useState(0);
  const [hasErrored, setHasErrored] = useState(false);
  const [errorDetails, setErrorDetails] = useState<string>('');
  
  // Maximum number of "not found" responses before considering it an error
  // This helps with eventual consistency in cloud environments
  const MAX_NOT_FOUND_RETRIES = 20; // Increased from 5 to be more resilient

  useEffect(() => {
    if (!jobId) {
      onError('No job ID provided');
      return;
    }

    // If job is completed or failed, or we've exceeded max polls, don't continue polling
    if (isCompleted(status) || isFailed(status) || (pollCount >= maxPolls)) {
      return;
    }

    const pollJobStatus = async () => {
      try {
        console.log(`Polling job status for ${jobId} (attempt ${pollCount + 1})`);
        
        const startTime = Date.now();
        const response = await fetch(`/api/job-status?jobId=${jobId}`);
        const responseTime = Date.now() - startTime;
        
        console.log(`Job status response received in ${responseTime}ms, status: ${response.status}`);
        
        if (!response.ok) {
          // Try to parse error response for debugging
          let errorData;
          try {
            errorData = await response.json();
            console.log('Error response body:', errorData);
          } catch (e) {
            console.error('Failed to parse error response:', e);
            errorData = { error: `HTTP Error ${response.status}` };
          }
          
          // Log response headers for debugging
          const headers: Record<string, string> = {};
          response.headers.forEach((value, key) => {
            headers[key] = value;
          });
          console.log('Response headers:', headers);
          
          console.error(`Error response from job-status API: ${response.status}`, errorData);
          
          // Special handling for 404 Not Found errors
          if (response.status === 404) {
            // Increment not found counter
            const newNotFoundCount = notFoundCount + 1;
            setNotFoundCount(newNotFoundCount);
            
            console.log(`Job ${jobId} not found count: ${newNotFoundCount}/${MAX_NOT_FOUND_RETRIES}`);
            
            // Only throw an error if we've exceeded max retries for not found
            if (newNotFoundCount >= MAX_NOT_FOUND_RETRIES) {
              const errMsg = `Job ${jobId} not found after ${MAX_NOT_FOUND_RETRIES} attempts. The job may have been lost or failed to create properly.`;
              console.error(errMsg);
              setErrorDetails(errMsg);
              throw new Error(errMsg);
            } else {
              // For the first few "not found" responses, just keep polling
              console.log(`Job ${jobId} not found (attempt ${newNotFoundCount}/${MAX_NOT_FOUND_RETRIES}), will retry`);
              setMessage(`Your request is being processed (attempt ${newNotFoundCount}/${MAX_NOT_FOUND_RETRIES})...`);
              
              // Add increasing delay for each retry (exponential backoff)
              const backoffDelay = Math.min(1000 * Math.pow(1.5, newNotFoundCount - 1), 10000);
              console.log(`Applying backoff delay of ${backoffDelay}ms before next attempt`);
              await new Promise(resolve => setTimeout(resolve, backoffDelay));
              
              // Don't throw, just continue polling
              setPollCount(prev => prev + 1);
              return;
            }
          }
          
          throw new Error(errorData.error || 'Failed to fetch job status');
        }
        
        // Reset not found counter on successful response
        if (notFoundCount > 0) setNotFoundCount(0);
        
        const data: JobData = await response.json();
        
        // Update state with the job status data
        setStatus(data.status);
        setDetails(data);
        
        // Handle different status cases
        switch (data.status) {
          case 'completed':
            if (data.result?.rawContent) {
              console.log(`[${jobId}] Job contains raw content`);
              
              // The result has the raw content from OpenAI - client will parse
              onComplete(data.result);
            } else if (data.result?.itinerary) {
              console.log(`[${jobId}] Job contains parsed itinerary`);
              
              // Legacy format with parsed itinerary
              onComplete(data.result);
            } else {
              // No recognizable result format
              const errMsg = 'Completed job has no valid result format';
              console.error(`[${jobId}] ${errMsg}`);
              setErrorDetails(errMsg);
              onError(errMsg);
            }
            break;
            
          case 'failed':
            const errMsg = data.error || 'Job failed';
            console.error(`Job ${jobId} failed:`, errMsg);
            setErrorDetails(errMsg);
            onError(errMsg);
            setMessage('The itinerary generation failed. Please try again.');
            break;
            
          case 'processing':
            console.log(`Job ${jobId} is processing`);
            setMessage('Your itinerary is being created. This may take up to 2 minutes...');
            break;
            
          case 'queued':
            console.log(`Job ${jobId} is queued`);
            setMessage('Your request is in the queue. Processing will begin shortly...');
            break;
            
          default:
            console.log(`Job ${jobId} has status: ${data.status}`);
            setMessage(`Status: ${data.status}`);
        }
      } catch (error: any) {
        console.error('Error polling job status:', error);
        setHasErrored(true);
        setErrorDetails(error.message || 'Unknown error');
        
        // After a certain number of polls with errors, show an error to the user
        if (pollCount > 5) {
          onError(error.message || 'Failed to check job status');
        } else {
          setMessage('Failed to check job status. Retrying...');
        }
      }
      
      // Increment poll count
      setPollCount(prev => prev + 1);
    };

    // Set up polling
    const timer = setTimeout(pollJobStatus, pollingInterval);
    
    return () => clearTimeout(timer);
  }, [jobId, status, pollCount, maxPolls, pollingInterval, onComplete, onError, notFoundCount]);

  // Progress calculation based on poll count and max polls
  const progress = Math.min(Math.floor((pollCount / maxPolls) * 100), 99);
  
  // Calculate color based on status
  const getStatusColor = () => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      case 'processing': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  // Only show the progress bar if we're still waiting
  if (isCompleted(status) || isFailed(status)) {
    return null;
  }

  // If we've exceeded max polls but haven't completed or failed
  if (pollCount >= maxPolls && !isCompleted(status) && !isFailed(status)) {
    return (
      <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="text-lg font-semibold text-yellow-800">Taking longer than expected</h3>
        <p className="text-sm text-yellow-700 mb-2">
          Your itinerary is still being generated, but it's taking longer than usual.
        </p>
        <div className="flex space-x-3">
          <button 
            onClick={() => window.location.reload()}
            className="px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700"
          >
            Refresh page
          </button>
          <button 
            onClick={() => setPollCount(0)}
            className="px-3 py-1 bg-gray-100 text-gray-800 text-sm rounded hover:bg-gray-200"
          >
            Keep waiting
          </button>
        </div>
        {errorDetails && (
          <div className="mt-2 text-xs text-red-700">
            <p>Error details: {errorDetails}</p>
            <p className="mt-1">Try checking your network connection or testing if the API is working.</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-lg">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-md font-medium text-blue-800">Generating your itinerary</h3>
        <span className="text-sm text-blue-600">{progress}%</span>
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div 
          className={`h-2.5 rounded-full ${getStatusColor()}`} 
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      
      <p className="text-sm text-blue-700 mt-2">{message}</p>
      
      {hasErrored && (
        <p className="text-xs text-red-600 mt-1">
          Encountered some connection issues, retrying...
        </p>
      )}
      
      <div className="mt-2 text-xs text-gray-500">
        <button 
          onClick={() => setShowDetails(!showDetails)}
          className="underline focus:outline-none"
        >
          {showDetails ? 'Hide details' : 'Show details'}
        </button>
        
        {showDetails && (
          <div className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
            <p>Job ID: {jobId}</p>
            <p>Status: {status}</p>
            <p>Poll count: {pollCount}/{maxPolls}</p>
            {hasErrored && <p className="text-red-600">Error: {errorDetails}</p>}
            {details && (
              <pre className="mt-2">{JSON.stringify(details, null, 2)}</pre>
            )}
          </div>
        )}
      </div>
      
      {notFoundCount > 0 && (
        <div className="mt-2 text-xs text-orange-600">
          <p>Job not found (attempt {notFoundCount}/{MAX_NOT_FOUND_RETRIES}). Still searching...</p>
        </div>
      )}
    </div>
  );
};

export default JobStatusPoller; 