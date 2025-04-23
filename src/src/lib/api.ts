import { useAuth } from '../contexts/AuthContext';

const API_BASE_URL = '/api';

export const useApi = () => {
  const { getSessionToken } = useAuth();

  const request = async (endpoint: string, options: RequestInit = {}) => {
    try {
      const token = await getSessionToken();
      if (!token) {
        throw new Error('No authentication token available. Please log in.');
      }

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      };

      console.log('Making API request to:', `${API_BASE_URL}${endpoint}`);
      console.log('Request headers:', headers);

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });

      console.log('API response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API error:', errorData);
        
        if (response.status === 401) {
          throw new Error('Authentication failed. Please log in again.');
        }
        
        throw new Error(errorData.message || `API request failed with status ${response.status}`);
      }

      const data = await response.json();
      console.log('API response data:', data);
      return data;
    } catch (error) {
      console.error('API request error:', error);
      throw error;
    }
  };

  return {
    get: (endpoint: string) => request(endpoint, { method: 'GET' }),
    post: (endpoint: string, data: any) => 
      request(endpoint, { method: 'POST', body: JSON.stringify(data) }),
    put: (endpoint: string, data: any) => 
      request(endpoint, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (endpoint: string) => request(endpoint, { method: 'DELETE' }),
  };
}; 