import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { useErrorHandler } from './use-error-handler';
import { useToast } from './use-toast';

// Mock the useToast hook
jest.mock('./use-toast', () => ({
  useToast: jest.fn(),
}));

describe('useErrorHandler', () => {
  // Setup mock toast function
  const mockToast = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
    (useToast as jest.Mock).mockReturnValue({ toast: mockToast });
  });
  
  it('should handle errors and show toast notifications', () => {
    const { result } = renderHook(() => useErrorHandler());
    
    // Create a test error
    const testError = { 
      message: 'Test error message', 
      status: 500 
    };
    
    // Call the handleError function
    act(() => {
      result.current.handleError(testError);
    });
    
    // Verify toast was called with the error message
    expect(mockToast).toHaveBeenCalledTimes(1);
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Error',
      description: 'Test error message',
      variant: 'destructive'
    }));
  });
  
  it('should not show toast when showToast is false', () => {
    const { result } = renderHook(() => useErrorHandler({ showToast: false }));
    
    // Create a test error
    const testError = { 
      message: 'Test error message', 
      status: 500 
    };
    
    // Call the handleError function
    act(() => {
      result.current.handleError(testError);
    });
    
    // Verify toast was not called
    expect(mockToast).not.toHaveBeenCalled();
  });
  
  it('should call the onError callback when provided', () => {
    const onErrorMock = jest.fn();
    const { result } = renderHook(() => useErrorHandler({ onError: onErrorMock }));
    
    // Create a test error
    const testError = { 
      message: 'Test error message', 
      status: 500 
    };
    
    // Call the handleError function
    act(() => {
      result.current.handleError(testError);
    });
    
    // Verify onError callback was called with the error
    expect(onErrorMock).toHaveBeenCalledTimes(1);
    expect(onErrorMock).toHaveBeenCalledWith(testError);
  });
  
  it('should create async error handlers', async () => {
    const { result } = renderHook(() => useErrorHandler());
    
    // Mock async function that throws an error
    const mockAsyncFn = jest.fn().mockRejectedValue(new Error('Async error'));
    
    // Create wrapped function
    const wrappedFn = result.current.createAsyncErrorHandler(mockAsyncFn);
    
    // Call the wrapped function
    await act(async () => {
      await wrappedFn();
    });
    
    // Verify error was handled and toast was shown
    expect(mockToast).toHaveBeenCalledTimes(1);
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
      description: expect.stringContaining('Async error')
    }));
  });
});