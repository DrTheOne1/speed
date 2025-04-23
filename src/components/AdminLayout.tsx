import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  LayoutDashboard, 
  Users, 
  CreditCard, 
  Settings, 
  MessageSquare,
  FileText,
  Bell,
  LogOut,
  Server,
  Route,
  Send
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const { signOut } = useAuth();

  const navigation = [
    { name: t('admin.dashboard'), href: '/admin', icon: LayoutDashboard },
    { name: t('admin.users'), href: '/admin/users', icon: Users },
    { name: t('admin.gateways'), href: '/admin/gateways', icon: Server },
    { name: t('admin.gateway_routes'), href: '/admin/gateway-routes', icon: Route },
    { name: t('admin.gateway_logs'), href: '/admin/gateway-logs', icon: Bell },
    { name: t('admin.test_sms'), href: '/admin/test-sms', icon: Send },
    { name: t('admin.payment_methods'), href: '/admin/payment-methods', icon: CreditCard },
    { name: t('admin.subscription_plans'), href: '/admin/subscription-plans', icon: CreditCard },
    { name: t('admin.messages'), href: '/admin/messages', icon: MessageSquare },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="flex h-screen">
        {/* Sidebar */}
        <div className="hidden md:flex md:w-64 md:flex-col">
          <div className="flex flex-col flex-grow pt-5 bg-white overflow-y-auto">
            <div className="flex items-center flex-shrink-0 px-4">
              <h1 className="text-xl font-semibold text-gray-900">Admin Panel</h1>
            </div>
            <div className="mt-5 flex-grow flex flex-col">
              <nav className="flex-1 px-2 pb-4 space-y-1">
                {navigation.map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                        isActive
                          ? 'bg-gray-100 text-gray-900'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <item.icon
                        className={`mr-3 flex-shrink-0 h-6 w-6 ${
                          isActive ? 'text-gray-500' : 'text-gray-400 group-hover:text-gray-500'
                        }`}
                        aria-hidden="true"
                      />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
              <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
                <button
                  onClick={signOut}
                  className="flex-shrink-0 group block"
                >
                  <div className="flex items-center">
                    <div>
                      <LogOut className="inline-block h-6 w-6 text-gray-400 group-hover:text-gray-500" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                        {t('auth.sign_out')}
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex flex-col flex-1 overflow-hidden">
          <main className="flex-1 relative overflow-y-auto focus:outline-none">
            <div className="py-6">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
                {children}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
} 