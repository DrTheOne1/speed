import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const Header = () => {
  const { user, signOut } = useAuth();

  return (
    <header className="bg-white shadow-sm dark:bg-gray-800">
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between items-center">
          <div className="flex items-center">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              Dashboard
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-gray-700 dark:text-gray-300">
              {user?.email}
            </span>
            <button
              onClick={signOut}
              className="rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;