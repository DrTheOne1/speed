// src/components/DatabaseStatus.tsx
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export const DatabaseStatus = () => {
  const [status, setStatus] = useState<'connecting'|'connected'|'error'>('connecting');
  const [errorDetails, setErrorDetails] = useState<string|null>(null);
  
  useEffect(() => {
    async function checkConnection() {
      try {
        const { data, error } = await supabase
          .from('users') // Use an actual table from your DB
          .select('count(*)', { count: 'exact', head: true });
          
        if (error) {
          console.error('Database connection error:', error);
          setStatus('error');
          setErrorDetails(error.message);
        } else {
          console.log('Database connected successfully');
          setStatus('connected');
        }
      } catch (err) {
        console.error('Database connection exception:', err);
        setStatus('error');
        setErrorDetails(err instanceof Error ? err.message : 'Unknown error');
      }
    }
    
    checkConnection();
  }, []);
  
  if (status === 'connected' || process.env.NODE_ENV !== 'development') {
    return null;
  }
  
  return (
    <div style={{
      position: 'fixed',
      bottom: 10,
      left: 10,
      zIndex: 9999,
      padding: '8px 12px',
      borderRadius: '4px',
      backgroundColor: status === 'connecting' ? '#fff3cd' : '#f8d7da',
      border: `1px solid ${status === 'connecting' ? '#ffecb5' : '#f5c2c7'}`,
      color: status === 'connecting' ? '#664d03' : '#842029',
      fontSize: '14px',
      maxWidth: '300px'
    }}>
      <strong>{status === 'connecting' ? 'Connecting to database...' : 'Database Error'}</strong>
      {errorDetails && <div style={{ marginTop: '6px', fontSize: '12px' }}>{errorDetails}</div>}
    </div>
  );
};