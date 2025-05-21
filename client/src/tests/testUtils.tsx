import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NetworkProvider } from '@/contexts/NetworkContext';
import { PackingListProvider } from '@/contexts/PackingListContext';

// Create a mock query client
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      cacheTime: 0,
    },
  },
});

// Create a custom render function that includes providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient;
}

export function renderWithProviders(
  ui: ReactElement,
  {
    queryClient = createTestQueryClient(),
    ...renderOptions
  }: CustomRenderOptions = {}
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <NetworkProvider>
          <PackingListProvider>
            {children}
          </PackingListProvider>
        </NetworkProvider>
      </QueryClientProvider>
    );
  }
  
  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

// Mock API request
export const mockApiRequest = (
  response: any,
  options = { success: true, status: 200 }
) => {
  // Reset fetch mock
  (global.fetch as jest.Mock).mockReset();
  
  // Mock successful response
  if (options.success) {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: options.status,
      json: async () => response,
    });
  } 
  // Mock error response
  else {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: options.status,
      statusText: typeof response === 'string' ? response : 'Error',
      json: async () => {
        if (typeof response === 'string') {
          throw new Error('Invalid JSON');
        }
        return response;
      },
      text: async () => {
        return typeof response === 'string' ? response : JSON.stringify(response);
      }
    });
  }
};

export * from '@testing-library/react';