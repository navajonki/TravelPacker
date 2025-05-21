import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { NetworkProvider, useNetwork } from './NetworkContext';
import { useToast } from '@/hooks/use-toast';

// Mock useToast hook
jest.mock('@/hooks/use-toast', () => ({
  useToast: jest.fn(),
}));

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  configurable: true,
  value: true,
});

// Component that displays network status
const TestComponent = () => {
  const { isOnline, connectionQuality } = useNetwork();
  return (
    <div>
      <div data-testid="online-status">{isOnline ? 'Online' : 'Offline'}</div>
      <div data-testid="connection-quality">{connectionQuality}</div>
    </div>
  );
};

describe('NetworkContext', () => {
  const mockToast = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
    (useToast as jest.Mock).mockReturnValue({ toast: mockToast });
  });
  
  it('should provide initial online status', () => {
    render(
      <NetworkProvider>
        <TestComponent />
      </NetworkProvider>
    );
    
    expect(screen.getByTestId('online-status')).toHaveTextContent('Online');
  });
  
  it('should update when online status changes', () => {
    render(
      <NetworkProvider>
        <TestComponent />
      </NetworkProvider>
    );
    
    // Simulate going offline
    act(() => {
      Object.defineProperty(navigator, 'onLine', { value: false });
      window.dispatchEvent(new Event('offline'));
    });
    
    expect(screen.getByTestId('online-status')).toHaveTextContent('Offline');
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'No Internet Connection',
      variant: 'destructive'
    }));
    
    // Simulate coming back online
    act(() => {
      Object.defineProperty(navigator, 'onLine', { value: true });
      window.dispatchEvent(new Event('online'));
    });
    
    expect(screen.getByTestId('online-status')).toHaveTextContent('Online');
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Connection Restored',
      variant: 'default'
    }));
  });
  
  it('should throw error when used outside provider', () => {
    // Suppress console.error for this test
    const originalError = console.error;
    console.error = jest.fn();
    
    expect(() => {
      render(<TestComponent />);
    }).toThrow('useNetwork must be used within a NetworkProvider');
    
    console.error = originalError;
  });
});