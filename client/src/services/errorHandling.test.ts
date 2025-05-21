import {
  formatApiError,
  detectNetworkErrorType,
  NetworkErrorType,
  getUserFriendlyErrorMessage,
  processError,
  retryWithBackoff,
  safeJsonParse
} from './errorHandling';

describe('Error Handling Service', () => {
  describe('formatApiError', () => {
    it('should format a JSON error response', async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        headers: {
          get: jest.fn().mockReturnValue('application/json')
        },
        json: jest.fn().mockResolvedValue({
          message: 'Invalid input',
          errors: ['Field is required']
        }),
        text: jest.fn()
      } as unknown as Response;

      const error = await formatApiError(mockResponse);
      
      expect(error).toEqual({
        message: 'Invalid input',
        status: 400,
        errors: ['Field is required']
      });
    });

    it('should handle text error responses', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Server Error',
        headers: {
          get: jest.fn().mockReturnValue('text/plain')
        },
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON')),
        text: jest.fn().mockResolvedValue('Internal Server Error')
      } as unknown as Response;

      const error = await formatApiError(mockResponse);
      
      expect(error).toEqual({
        message: 'Internal Server Error',
        status: 500
      });
    });
  });

  describe('detectNetworkErrorType', () => {
    it('should detect timeout errors', () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      
      const result = detectNetworkErrorType(abortError);
      expect(result).toBe(NetworkErrorType.TIMEOUT);
    });

    it('should detect server errors based on status code', () => {
      const result = detectNetworkErrorType({}, 500);
      expect(result).toBe(NetworkErrorType.SERVER_ERROR);
    });

    it('should detect auth errors based on status code', () => {
      const result = detectNetworkErrorType({}, 401);
      expect(result).toBe(NetworkErrorType.AUTH_ERROR);
    });
  });

  describe('getUserFriendlyErrorMessage', () => {
    it('should return the explicit message if available', () => {
      const error = { 
        message: 'Specific error message', 
        status: 400 
      };
      
      const result = getUserFriendlyErrorMessage(error);
      expect(result).toBe('Specific error message');
    });

    it('should return network-specific messages for network errors', () => {
      const error = { 
        message: 'Unknown error', 
        status: 0,
        networkErrorType: NetworkErrorType.OFFLINE
      };
      
      const result = getUserFriendlyErrorMessage(error);
      expect(result).toContain('offline');
    });
  });

  describe('processError', () => {
    it('should process API errors correctly', () => {
      const apiError = { 
        message: 'Not found', 
        status: 404 
      };
      
      const result = processError(apiError);
      
      expect(result.message).toBe('Not found');
      expect(result.status).toBe(404);
    });

    it('should handle standard Error objects', () => {
      const error = new Error('Something went wrong');
      
      const result = processError(error);
      
      expect(result.message).toBe('Something went wrong');
      expect(result.originalError).toBe(error);
    });

    it('should add context if provided', () => {
      const error = new Error('API failure');
      const context = { endpoint: '/api/users', method: 'GET' };
      
      const result = processError(error, context);
      
      expect(result.context).toEqual(context);
    });
  });

  describe('retryWithBackoff', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should retry a failing function the specified number of times', async () => {
      const mockFn = jest.fn()
        .mockRejectedValueOnce(new Error('Attempt 1'))
        .mockRejectedValueOnce(new Error('Attempt 2'))
        .mockResolvedValue('success');
      
      const promise = retryWithBackoff(mockFn, { maxRetries: 3 });
      
      // Advance timers to handle the delay between retries
      await jest.runAllTimersAsync();
      
      await expect(promise).resolves.toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('should give up after the maximum number of retries', async () => {
      const error = new Error('Always fails');
      const mockFn = jest.fn().mockRejectedValue(error);
      
      const promise = retryWithBackoff(mockFn, { maxRetries: 2 });
      
      // Advance timers to handle the delay between retries
      await jest.runAllTimersAsync();
      
      await expect(promise).rejects.toThrow('Always fails');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });
  });

  describe('safeJsonParse', () => {
    it('should parse valid JSON', () => {
      const json = '{"name":"John","age":30}';
      const result = safeJsonParse(json);
      
      expect(result).toEqual({ name: 'John', age: 30 });
    });

    it('should return null for invalid JSON', () => {
      const invalidJson = '{"name":John,"age":30}'; // Missing quotes around John
      const result = safeJsonParse(invalidJson);
      
      expect(result).toBeNull();
    });
  });
});