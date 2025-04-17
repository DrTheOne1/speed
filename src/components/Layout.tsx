import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Menu, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import Sidebar from './Sidebar';
import LanguageSelector from './LanguageSelector';
import { useTranslation } from 'react-i18next';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { i18n } = useTranslation();

  const { data: isAdmin } = useQuery({
    queryKey: ['user-role'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      return data?.role === 'admin';
    }
  });

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const HeaderActions = () => {
    return (
      <div className="flex items-center gap-x-4 lg:gap-x-6">
        <LanguageSelector />
        <button
          type="button"
          className="flex items-center gap-x-2 text-sm font-semibold leading-6 text-gray-900"
          onClick={handleSignOut}
        >
          <LogOut className="h-5 w-5" />
          Sign out
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Sidebar
        isAdmin={isAdmin}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />

      <div className="lg:pl-72">
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <button
            type="button"
            className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" aria-hidden="true" />
          </button>

          <div className="flex w-full justify-end">
            <HeaderActions />
          </div>
        </div>

        <main className="py-10">
          <div className="px-4 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
