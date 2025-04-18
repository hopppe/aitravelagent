'use client';

import React from 'react';

interface ErrorDisplayProps {
  title?: string;
  message: string;
  details?: string;
  suggestion?: string;
  actionText?: string;
  actionFn?: () => void;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  title = 'An error occurred',
  message,
  details,
  suggestion = 'Please try again',
  actionText = 'Try Again',
  actionFn
}) => {
  return (
    <div className="p-6 max-w-lg mx-auto my-4 bg-white rounded-lg shadow-md border border-red-100">
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <svg 
            className="w-12 h-12 text-red-500" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth="2" 
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        
        <h2 className="text-xl font-bold text-gray-800 mb-2">{title}</h2>
        <p className="text-gray-600 mb-4">{message}</p>
        
        {details && (
          <div className="mb-4 p-3 bg-gray-50 rounded-md text-sm text-gray-700 text-left overflow-auto max-h-32">
            <p className="font-mono">{details}</p>
          </div>
        )}
        
        <p className="text-gray-600 mb-6">{suggestion}</p>
        
        {actionFn && (
          <button
            onClick={actionFn}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {actionText}
          </button>
        )}

        <div className="mt-6 text-xs text-gray-500">
          <p className="mb-1 font-medium">Troubleshooting Tips:</p>
          <ul className="list-disc text-left pl-6">
            <li>Check that your Supabase credentials are correct in your .env.local file</li>
            <li>Verify that the OpenAI API key is valid</li>
            <li>Make sure you've created the 'jobs' table in Supabase</li>
            <li>Try clearing your browser cache and refreshing</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ErrorDisplay; 