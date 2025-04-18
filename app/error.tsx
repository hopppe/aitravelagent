'use client';

import { useEffect } from 'react';
import ErrorDisplay from '../components/ErrorDisplay';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="container mx-auto py-8">
      <ErrorDisplay
        title="Something went wrong!"
        message="An error occurred in the application"
        details={error.message}
        suggestion="You can try resetting the application by clicking below."
        actionText="Try Again"
        actionFn={reset}
      />
      
      <div className="mt-8 p-4 bg-gray-50 rounded-lg shadow max-w-lg mx-auto">
        <h3 className="text-lg font-semibold mb-2">Additional Troubleshooting:</h3>
        <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700">
          <li>Check your browser console for specific error details.</li>
          <li>Verify that your environment variables are correctly set up.</li>
          <li>If you're using Supabase, make sure the connection is properly configured.</li>
          <li>Ensure your OpenAI API key is valid and has sufficient credits.</li>
          <li>Try reloading the page or clearing your browser cache.</li>
        </ul>
      </div>
    </div>
  );
} 