import React from 'react';
import { useNavigate, useRouteError, isRouteErrorResponse } from 'react-router-dom';
import { HomeIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';

interface RouteErrorInfo {
  status?: number;
  statusText?: string;
  message?: string;
  stack?: string;
}

export default function RouteErrorBoundary() {
  const error = useRouteError();
  const navigate = useNavigate();

  const getErrorInfo = (): RouteErrorInfo => {
    if (isRouteErrorResponse(error)) {
      return {
        status: error.status,
        statusText: error.statusText,
        message: error.data?.message || error.statusText
      };
    }
    
    if (error instanceof Error) {
      return {
        message: error.message,
        stack: error.stack
      };
    }
    
    return {
      message: 'An unexpected error occurred'
    };
  };

  const errorInfo = getErrorInfo();

  const getErrorTitle = () => {
    if (errorInfo.status === 404) {
      return 'Page Not Found';
    }
    if (errorInfo.status === 403) {
      return 'Access Denied';
    }
    if (errorInfo.status === 500) {
      return 'Server Error';
    }
    return 'Something went wrong';
  };

  const getErrorMessage = () => {
    if (errorInfo.status === 404) {
      return "The page you're looking for doesn't exist or has been moved.";
    }
    if (errorInfo.status === 403) {
      return "You don't have permission to access this page.";
    }
    if (errorInfo.status === 500) {
      return "We're experiencing technical difficulties. Please try again later.";
    }
    return errorInfo.message || "We encountered an unexpected error.";
  };

  const getErrorIcon = () => {
    if (errorInfo.status === 404) {
      return (
        <svg
          className="w-12 h-12 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1}
            d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.291-1.007-5.691-2.709M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
      );
    }
    
    return (
      <svg
        className="w-12 h-12 text-red-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
        />
      </svg>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
              {getErrorIcon()}
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {getErrorTitle()}
            </h2>
            
            {errorInfo.status && (
              <p className="text-sm text-gray-500 mb-4">
                Error {errorInfo.status}
              </p>
            )}
            
            <p className="text-gray-600 mb-8">
              {getErrorMessage()}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => navigate(-1)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <ArrowLeftIcon className="w-4 h-4 mr-2" />
                Go Back
              </button>
              
              <button
                onClick={() => navigate('/')}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <HomeIcon className="w-4 h-4 mr-2" />
                Go Home
              </button>
            </div>
            
            {process.env.NODE_ENV === 'development' && errorInfo.stack && (
              <details className="mt-8 text-left">
                <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                  Show Error Details
                </summary>
                <pre className="mt-2 text-xs text-gray-600 bg-gray-100 p-3 rounded overflow-auto max-h-40">
                  {errorInfo.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}