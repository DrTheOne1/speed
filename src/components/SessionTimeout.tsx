import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const TIMEOUT_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

export function SessionTimeout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleTimeout = async () => {
    if (user) {
      await signOut();
      navigate('/login', { replace: true });
    }
  };

  const resetTimeout = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    if (user) {
      timeoutRef.current = setTimeout(handleTimeout, TIMEOUT_DURATION);
    }
  };

  const handleUserActivity = () => {
    resetTimeout();
  };

  useEffect(() => {
    if (user) {
      resetTimeout();
      
      // Add event listeners for user activity
      window.addEventListener('mousemove', handleUserActivity);
      window.addEventListener('keydown', handleUserActivity);
      window.addEventListener('click', handleUserActivity);
      window.addEventListener('scroll', handleUserActivity);

      return () => {
        window.removeEventListener('mousemove', handleUserActivity);
        window.removeEventListener('keydown', handleUserActivity);
        window.removeEventListener('click', handleUserActivity);
        window.removeEventListener('scroll', handleUserActivity);
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }
  }, [user]);

  return null;
}

export default SessionTimeout; 