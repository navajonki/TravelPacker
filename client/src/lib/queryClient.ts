import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    try {
      // Try to parse as JSON first
      const contentType = res.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        const errorData = await res.json();
        
        // Create an error with the response data attached
        const error: any = new Error(`${res.status}: ${errorData.message || 'Unknown error'}`);
        error.response = { 
          status: res.status, 
          data: errorData 
        };
        throw error;
      } else {
        // Fall back to text
        const text = await res.text() || res.statusText;
        throw new Error(`${res.status}: ${text}`);
      }
    } catch (parseError) {
      // If JSON parsing fails, use the status text
      if (parseError instanceof Error && !parseError.message.includes(res.status.toString())) {
        throw new Error(`${res.status}: ${res.statusText}`);
      }
      throw parseError;
    }
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<any> {
  try {
    console.log(`API Request: ${method} ${url}`, data);
    
    const res = await fetch(url, {
      method,
      headers: data ? { "Content-Type": "application/json" } : {},
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });

    await throwIfResNotOk(res);
    
    // If there's no content, return an empty object
    if (res.status === 204) {
      return {};
    }
    
    // Parse the response as JSON
    const responseData = await res.json();
    console.log(`API Response: ${method} ${url}`, responseData);
    return responseData;
  } catch (error) {
    console.error(`API Error: ${method} ${url}`, error);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
