import { useEffect } from 'react';
import { CMS } from 'netlify-cms';

export default function AdminCMS() {
  useEffect(() => {
    // Initialize Netlify CMS
    if (typeof window !== 'undefined') {
      CMS.init();
    }
  }, []);

  return (
    <div className="min-h-screen">
      <div id="nc-root" />
    </div>
  );
} 