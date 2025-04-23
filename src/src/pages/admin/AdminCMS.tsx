import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const AdminCMS: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is authenticated and is an admin
    if (!user || user.role !== 'admin') {
      navigate('/login');
      return;
    }

    // Initialize Netlify CMS
    if (typeof window !== 'undefined') {
      const CMS = require('netlify-cms');
      CMS.init();
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-gray-100">
      <div id="nc-root" />
    </div>
  );
};

export default AdminCMS; 