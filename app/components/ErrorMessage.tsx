import React from 'react';

type ErrorMessageProps = {
  error: string;
  retry?: () => void;
};

const ErrorMessage: React.FC<ErrorMessageProps> = ({ error, retry }) => {
  // Check if it's a timeout-related error
  const isTimeout = 
    error.includes('timeout') || 
    error.includes('timed out') || 
    error.includes('exceeded');
  
  return (
    <div className="bg-red-50 border-l-4 border-red-500 p-4 my-4 rounded-md">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-red-800">
            {isTimeout ? 'Request Timeout' : 'Error'}
          </h3>
          <div className="mt-2 text-sm text-red-700">
            <p>{error}</p>
            
            {isTimeout && (
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Our AI generation process may take longer than expected in certain environments</li>
                <li>The server might be experiencing high demand at the moment</li>
                <li>Try a shorter trip duration or less specific requirements</li>
              </ul>
            )}
          </div>
          
          {retry && (
            <div className="mt-4">
              <button
                type="button"
                onClick={retry}
                className="rounded-md bg-red-50 px-3.5 py-2 text-sm font-semibold text-red-800 shadow-sm ring-1 ring-inset ring-red-300 hover:bg-red-100"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ErrorMessage; 