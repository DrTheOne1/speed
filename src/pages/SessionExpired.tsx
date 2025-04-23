import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../contexts/TranslationContext';
import { useAuth } from '../contexts/AuthContext';

const SessionExpired: React.FC = () => {
  const { t } = useTranslation();
  const { signOut } = useAuth();

  // Ensure user is signed out when they land on this page
  React.useEffect(() => {
    signOut();
  }, [signOut]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <h1 className="mt-6 text-3xl font-extrabold text-gray-900">
            {t('session.expired.title')}
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            {t('session.expired.message')}
          </p>
        </div>
        <div className="mt-8 space-y-4">
          <Link
            to="/login"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            {t('session.expired.login')}
          </Link>
          <Link
            to="/"
            className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            {t('session.expired.home')}
          </Link>
        </div>
        <div className="mt-6 text-xs text-gray-500">
          <p>
            {t('session.expired.security')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default SessionExpired; 