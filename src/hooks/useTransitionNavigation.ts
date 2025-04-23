import { useNavigate, NavigateOptions, To } from 'react-router-dom';
import { startTransition } from 'react';

export function useTransitionNavigation() {
  const navigate = useNavigate();

  const transitionNavigate = (to: To, options?: NavigateOptions) => {
    startTransition(() => {
      navigate(to, options);
    });
  };

  return transitionNavigate;
} 