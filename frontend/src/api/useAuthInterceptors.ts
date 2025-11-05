import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';

import { initializeAuthInterceptors } from './interceptors';

// Custom hook to initialize auth interceptors
export const useAuthInterceptors = () => {
  const { accessToken, setAccessToken } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Initialize interceptors with auth functions
    const cleanup = initializeAuthInterceptors(
      () => accessToken, // getAccessToken function
      setAccessToken,    // setAccessToken function
      (path: string) => {
        navigate(path);
      }
    );

    // Return cleanup function to remove interceptors
    return cleanup;
  }, [accessToken, setAccessToken, navigate]);
};