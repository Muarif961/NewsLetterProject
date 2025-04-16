import { useState, useCallback } from 'react';
import { useUser } from "./use-user";
import { useToast } from "./use-toast";

interface FetchOptions extends RequestInit {
  skipAuthHeader?: boolean;
}

interface UseFetchReturn {
  get: (url: string, options?: FetchOptions) => Promise<Response>;
  post: (url: string, data?: any, options?: FetchOptions) => Promise<Response>;
  put: (url: string, data?: any, options?: FetchOptions) => Promise<Response>;
  delete: (url: string, options?: FetchOptions) => Promise<Response>;
  patch: (url: string, data?: any, options?: FetchOptions) => Promise<Response>;
  isLoading: boolean;
  error: Error | null;
}

/**
 * A custom hook to handle API fetch requests with authentication
 * 
 * @returns {UseFetchReturn} An object with methods for making HTTP requests
 */
export default function useFetch(): UseFetchReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { user, logout } = useUser();
  const { toast } = useToast();

  /**
   * Core fetch function with authentication handling
   */
  const fetchWithAuth = useCallback(
    async (url: string, options: FetchOptions = {}): Promise<Response> => {
      setIsLoading(true);
      setError(null);

      try {
        const { skipAuthHeader = false, ...fetchOptions } = options;
        const headers = new Headers(fetchOptions.headers);

        // Add auth header if we have a user and skipAuthHeader is false
        if (user && !skipAuthHeader) {
          // In a real app, this would use a token from the user object
          headers.set('Authorization', `Bearer user-is-authenticated`);
        }

        // Add default headers if not present
        if (!headers.has('Content-Type') && !options.body?.toString().includes('FormData')) {
          headers.set('Content-Type', 'application/json');
        }

        const response = await fetch(url, {
          ...fetchOptions,
          headers,
        });

        // Handle auth errors (401)
        if (response.status === 401) {
          console.error('Authentication failed, logging out...');
          toast({
            title: 'Session Expired',
            description: 'Your session has expired. Please log in again.',
            variant: 'destructive',
          });
          logout();
          throw new Error('Authentication failed');
        }

        return response;
      } catch (err: any) {
        setError(err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [user, logout, toast]
  );

  // HTTP GET request
  const get = useCallback(
    (url: string, options?: FetchOptions) => 
      fetchWithAuth(url, { method: 'GET', ...options }),
    [fetchWithAuth]
  );

  // HTTP POST request
  const post = useCallback(
    (url: string, data?: any, options?: FetchOptions) => {
      const body = data ? (
        typeof data === 'string' ? data : JSON.stringify(data)
      ) : undefined;

      return fetchWithAuth(url, {
        method: 'POST',
        body,
        ...options,
      });
    },
    [fetchWithAuth]
  );

  // HTTP PUT request
  const put = useCallback(
    (url: string, data?: any, options?: FetchOptions) => {
      const body = data ? (
        typeof data === 'string' ? data : JSON.stringify(data)
      ) : undefined;

      return fetchWithAuth(url, {
        method: 'PUT',
        body,
        ...options,
      });
    },
    [fetchWithAuth]
  );

  // HTTP DELETE request
  const deleteRequest = useCallback(
    (url: string, options?: FetchOptions) => 
      fetchWithAuth(url, { method: 'DELETE', ...options }),
    [fetchWithAuth]
  );

  // HTTP PATCH request
  const patch = useCallback(
    (url: string, data?: any, options?: FetchOptions) => {
      const body = data ? (
        typeof data === 'string' ? data : JSON.stringify(data)
      ) : undefined;

      return fetchWithAuth(url, {
        method: 'PATCH',
        body,
        ...options,
      });
    },
    [fetchWithAuth]
  );

  return {
    get,
    post,
    put,
    delete: deleteRequest,
    patch,
    isLoading,
    error,
  };
}