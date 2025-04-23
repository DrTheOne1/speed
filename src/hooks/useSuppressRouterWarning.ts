import { useEffect } from 'react';

/**
 * This hook suppresses the React Router warning about v7_startTransition.
 * It's a temporary solution until the app is upgraded to React 18 and React Router v7.
 */
export function useSuppressRouterWarning() {
  useEffect(() => {
    // Store the original console.warn function
    const originalWarn = console.warn;
    
    // Override console.warn to filter out the specific React Router warning
    console.warn = (...args) => {
      const warningMessage = args[0]?.toString() || '';
      if (warningMessage.includes('React Router Future Flag Warning') && 
          warningMessage.includes('v7_startTransition')) {
        // Suppress this specific warning
        return;
      }
      
      // Pass through all other warnings
      originalWarn.apply(console, args);
    };
    
    // Restore the original console.warn when the component unmounts
    return () => {
      console.warn = originalWarn;
    };
  }, []);
} 