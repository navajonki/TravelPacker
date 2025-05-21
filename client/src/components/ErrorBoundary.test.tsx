import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ErrorBoundary from './ErrorBoundary';

// Create a component that will throw an error
const ErrorThrowingComponent = ({ shouldThrow = true }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error thrown</div>;
};

// Spy on console.error to silence it during tests and assert later
const originalConsoleError = console.error;
let consoleErrorSpy: jest.SpyInstance;

beforeAll(() => {
  consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterAll(() => {
  consoleErrorSpy.mockRestore();
  console.error = originalConsoleError;
});

describe('ErrorBoundary', () => {
  it('renders its children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Test Content</div>
      </ErrorBoundary>
    );
    
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });
  
  it('renders the fallback UI when an error occurs', () => {
    // We need to suppress the error boundary console output for this test
    const originalError = console.error;
    console.error = jest.fn();
    
    render(
      <ErrorBoundary>
        <ErrorThrowingComponent />
      </ErrorBoundary>
    );
    
    // The component should show the error message
    expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
    
    console.error = originalError;
  });
  
  it('calls the onError callback when an error occurs', () => {
    const handleError = jest.fn();
    
    render(
      <ErrorBoundary onError={handleError}>
        <ErrorThrowingComponent />
      </ErrorBoundary>
    );
    
    // The onError callback should have been called
    expect(handleError).toHaveBeenCalledTimes(1);
    expect(handleError.mock.calls[0][0]).toBeInstanceOf(Error);
    expect(handleError.mock.calls[0][0].message).toBe('Test error');
    expect(handleError.mock.calls[0][1]).toHaveProperty('componentStack');
  });
  
  it('uses the custom fallback when provided', () => {
    const customFallback = <div>Custom Error UI</div>;
    
    render(
      <ErrorBoundary fallback={customFallback}>
        <ErrorThrowingComponent />
      </ErrorBoundary>
    );
    
    // Should render the custom fallback
    expect(screen.getByText('Custom Error UI')).toBeInTheDocument();
  });
});