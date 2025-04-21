import { resetAuthState } from '../lib/supabase';

export const DebugResetAuthStateButton = () => {
  if (import.meta.env.DEV !== true) return null;
  
  return (
    <button
      type="button"
      onClick={resetAuthState}
      className="mt-4 p-2 bg-red-100 text-red-800 text-xs rounded"
    >
      Debug: Reset Auth State
    </button>
  );
}; 