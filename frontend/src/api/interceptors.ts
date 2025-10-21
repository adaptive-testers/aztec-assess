import { privateApi, publicApi } from './axios';

let isRefreshing = false;
let failedQueue: { resolve: (value?: unknown) => void; reject: (reason?: unknown) => void }[] = [];

// Function to process the queue of failed requests
const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Store references to auth functions
let authFunctions: {
  getAccessToken: () => string | null;
  setAccessToken: (token: string | null) => void;
  navigate: (path: string) => void;
} | null = null;

// Function to initialize auth functions
export const initializeAuthInterceptors = (
  getAccessToken: () => string | null,
  setAccessToken: (token: string | null) => void,
  navigate: (path: string) => void
) => {
  authFunctions = { getAccessToken, setAccessToken, navigate };

  // Add the request interceptor and store its ID
  const requestInterceptorId = privateApi.interceptors.request.use(
    (config) => {
      if (!config.headers['Authorization'] && authFunctions) {
        const accessToken = authFunctions.getAccessToken();
        if (accessToken) {
          config.headers['Authorization'] = `Bearer ${accessToken}`;
        }
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Add the response interceptor and store its ID
  const responseInterceptorId = privateApi.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;
      
      // If the error is 401 and not a retry
      if (error.response?.status === 401 && !originalRequest._isRetry) {
        if (isRefreshing) {
          // If a refresh is already in progress, queue the failed request
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          }).then(token => {
            originalRequest.headers['Authorization'] = `Bearer ${token}`;
            return privateApi(originalRequest);
          }).catch(err => Promise.reject(err));
        }

        originalRequest._isRetry = true;
        isRefreshing = true;

        try {
          // Attempt to refresh the token using a public endpoint
          const response = await publicApi.post('/auth/token/refresh');
          const newAccessToken = response.data.tokens.access;
          
          if (authFunctions) {
            authFunctions.setAccessToken(newAccessToken); // Store new token in context
            processQueue(null, newAccessToken); // Process the queue
            
            originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
            return privateApi(originalRequest); // Retry the original request
          }
        } catch (refreshError) {
          // If refresh fails, log out the user and clear the queue
          try {
            await publicApi.post('/auth/logout');
          } catch (logoutError) {
            // Optionally log the error, but continue with local logout
            console.log(logoutError)
          }
          if (authFunctions) {
            authFunctions.setAccessToken(null);
            processQueue(refreshError instanceof Error ? refreshError : new Error('Token refresh failed'), null);
            authFunctions.navigate('/login');
          }
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }

      return Promise.reject(error);
    }
  );

  // Return cleanup function to eject both interceptors
  return () => {
    privateApi.interceptors.request.eject(requestInterceptorId);
    privateApi.interceptors.response.eject(responseInterceptorId);
    authFunctions = null; // Clear auth functions reference
  };
};

// Export the configured privateApi
export { privateApi };