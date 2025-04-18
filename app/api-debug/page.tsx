"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function ApiDebugPage() {
  const [testResults, setTestResults] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [jobId, setJobId] = useState('');
  const [jobStatus, setJobStatus] = useState<any>(null);
  const [jobLoading, setJobLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdJob, setCreatedJob] = useState<any>(null);
  const [createJobLoading, setCreateJobLoading] = useState(false);
  
  const runApiTest = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/supabase-test');
      const data = await response.json();
      setTestResults(data);
    } catch (err: any) {
      setError(err.message || 'Failed to test API');
    } finally {
      setIsLoading(false);
    }
  };
  
  const checkJobStatus = async () => {
    if (!jobId.trim()) {
      setError('Please enter a job ID');
      return;
    }
    
    setJobLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/job-status?jobId=${jobId}`);
      const data = await response.json();
      
      if (!response.ok) {
        setError(data.error || `Error: ${response.status}`);
        setJobStatus(null);
      } else {
        setJobStatus(data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to check job status');
      setJobStatus(null);
    } finally {
      setJobLoading(false);
    }
  };

  const createTestJob = async () => {
    setCreateJobLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/debug-job-creation');
      const data = await response.json();
      setCreatedJob(data);
      
      // Auto-set the job ID to the newly created job
      if (data.jobId) {
        setJobId(data.jobId);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create test job');
    } finally {
      setCreateJobLoading(false);
    }
  };
  
  // Auto-run the test on page load
  useEffect(() => {
    runApiTest();
  }, []);
  
  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <header className="mb-6">
        <h1 className="text-2xl font-bold mb-2">API and Supabase Debug Page</h1>
        <p className="text-gray-600">
          Use this page to diagnose issues with the API and Supabase connection
        </p>
        <div className="mt-2">
          <Link href="/" className="text-blue-600 hover:text-blue-800">
            Return to Home
          </Link>
        </div>
      </header>
      
      <div className="grid grid-cols-1 gap-6">
        <section className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Create Test Job</h2>
          <p className="text-sm text-gray-600 mb-4">
            Create a test job and check if it can be found immediately. This helps diagnose job creation and retrieval issues.
          </p>
          
          <button 
            onClick={createTestJob}
            disabled={createJobLoading}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-purple-300"
          >
            {createJobLoading ? 'Creating...' : 'Create Test Job'}
          </button>
          
          {createdJob && (
            <div className="mt-4">
              <h3 className="font-semibold text-lg">
                Job Creation: <span className={createdJob.success ? 'text-green-600' : 'text-red-600'}>
                  {createdJob.success ? 'SUCCESS' : 'FAILED'}
                </span>
              </h3>
              
              <p className="my-2">{createdJob.message}</p>
              
              {createdJob.jobId && (
                <p className="text-sm">
                  Job ID: <span className="font-mono bg-gray-100 px-1">{createdJob.jobId}</span>
                </p>
              )}
              
              <div className="mt-4">
                <h4 className="font-semibold">Creation Results:</h4>
                <pre className="mt-2 bg-gray-100 p-3 rounded text-sm overflow-auto max-h-96">
                  {JSON.stringify(createdJob, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </section>
      
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <section className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Supabase Connection Test</h2>
            
            <button 
              onClick={runApiTest}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-300"
            >
              {isLoading ? 'Testing...' : 'Run Supabase Test'}
            </button>
            
            {testResults && (
              <div className="mt-4">
                <h3 className="font-semibold text-lg">
                  Status: <span className={testResults.success ? 'text-green-600' : 'text-red-600'}>
                    {testResults.success ? 'SUCCESS' : 'FAILED'}
                  </span>
                </h3>
                
                <p className="my-2">{testResults.message}</p>
                
                {testResults.errors && testResults.errors.length > 0 && (
                  <div className="mt-2">
                    <h4 className="font-semibold">Errors:</h4>
                    <ul className="list-disc pl-5">
                      {testResults.errors.map((err: string, idx: number) => (
                        <li key={idx} className="text-red-600">{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                <div className="mt-4">
                  <h4 className="font-semibold">Test Results:</h4>
                  <pre className="mt-2 bg-gray-100 p-3 rounded text-sm overflow-auto max-h-96">
                    {JSON.stringify(testResults, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </section>
          
          <section className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Check Job Status</h2>
            
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={jobId}
                onChange={(e) => setJobId(e.target.value)}
                placeholder="Enter Job ID"
                className="flex-1 px-3 py-2 border rounded"
              />
              <button 
                onClick={checkJobStatus}
                disabled={jobLoading}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-green-300"
              >
                {jobLoading ? 'Checking...' : 'Check Status'}
              </button>
            </div>
            
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700">
                {error}
              </div>
            )}
            
            {jobStatus && (
              <div className="mt-4">
                <h3 className="font-semibold text-lg">
                  Job Status: <span className={
                    jobStatus.status === 'completed' ? 'text-green-600' : 
                    jobStatus.status === 'failed' ? 'text-red-600' : 
                    'text-blue-600'
                  }>
                    {jobStatus.status.toUpperCase()}
                  </span>
                </h3>
                
                {jobStatus.error && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-100 rounded">
                    <h4 className="font-semibold">Error:</h4>
                    <p className="text-red-700">{jobStatus.error}</p>
                  </div>
                )}
                
                <div className="mt-4">
                  <h4 className="font-semibold">Full Response:</h4>
                  <pre className="mt-2 bg-gray-100 p-3 rounded text-sm overflow-auto max-h-96">
                    {JSON.stringify(jobStatus, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
} 