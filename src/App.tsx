import React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { TranslationProvider } from './contexts/TranslationContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import UserRoute from './components/UserRoute';
import AdminCMS from './pages/admin/AdminCMS';

// User pages
import Dashboard from './pages/Dashboard';
import SendSMS from './pages/SendSMS';
import BulkSend from './pages/BulkSend';
import Contacts from './pages/Contacts';
import Groups from './pages/Groups';
import ImportContactsPage from './pages/ImportContactsPage';
import Templates from './pages/Templates';
import Scheduled from './pages/Scheduled';
import History from './pages/History';
import Analytics from './pages/Analytics';
import Usage from './pages/Usage';
import Billing from './pages/Billing';
import Settings from './pages/Settings';
import Messages from './pages/Messages';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ActivationSuccess from './pages/auth/ActivationSuccess';
import ForgotPassword from './pages/auth/ForgotPassword';
import SendGroupMessages from './pages/SendGroupMessages';

// Admin pages
import AdminDashboard from './pages/admin/Dashboard';
import UserManagement from './pages/admin/UserManagement';
import GatewayManagement from './pages/admin/GatewayManagement';
import GatewayRoutes from './pages/admin/GatewayRoutes';
import GatewayLogs from './pages/admin/GatewayLogs';
import TestSMS from './pages/admin/TestSMS';
import PaymentMethods from './pages/admin/PaymentMethods';
import SubscriptionPlans from './pages/admin/SubscriptionPlans';
import AdminMessages from './pages/admin/Messages';

const queryClient = new QueryClient();

const router = createBrowserRouter([
  {
    path: "/login",
    element: <Login />
  },
  {
    path: "/register",
    element: <Register />
  },
  {
    path: "/activation-success",
    element: <ActivationSuccess />
  },
  {
    path: "/forgot-password",
    element: <ForgotPassword />
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <Layout />,
        children: [
          {
            element: <AdminRoute />,
            children: [
              {
                path: "/admin",
                element: <AdminDashboard />
              },
              {
                path: "/admin/users",
                element: <UserManagement />
              },
              {
                path: "/admin/gateways",
                element: <GatewayManagement />
              },
              {
                path: "/admin/gateway-routes",
                element: <GatewayRoutes />
              },
              {
                path: "/admin/gateway-logs",
                element: <GatewayLogs />
              },
              {
                path: "/admin/test-sms",
                element: <TestSMS />
              },
              {
                path: "/admin/payment-methods",
                element: <PaymentMethods />
              },
              {
                path: "/admin/subscription-plans",
                element: <SubscriptionPlans />
              },
              {
                path: "/admin/messages",
                element: <AdminMessages />
              },
              {
                path: "/admin/cms",
                element: <AdminCMS />
              }
            ]
          },
          {
            element: <UserRoute />,
            children: [
              {
                path: "/",
                element: <Dashboard />
              },
              {
                path: "/send",
                element: <SendSMS />
              },
              {
                path: "/send-group-messages",
                element: <SendGroupMessages />
              },
              {
                path: "/bulk-send",
                element: <BulkSend />
              },
              {
                path: "/contacts",
                element: <Contacts />
              },
              {
                path: "/groups",
                element: <Groups />
              },
              {
                path: "/import-contacts",
                element: <ImportContactsPage />
              },
              {
                path: "/templates",
                element: <Templates />
              },
              {
                path: "/scheduled",
                element: <Scheduled />
              },
              {
                path: "/history",
                element: <History />
              },
              {
                path: "/analytics",
                element: <Analytics />
              },
              {
                path: "/usage",
                element: <Usage />
              },
              {
                path: "/billing",
                element: <Billing />
              },
              {
                path: "/settings",
                element: <Settings />
              },
              {
                path: "/messages",
                element: <Messages />
              }
            ]
          }
        ]
      }
    ]
  }
], {
  future: {
    v7_relativeSplatPath: true
  }
});

function App() {
  return (
    <TranslationProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <LanguageProvider>
            <RouterProvider router={router} />
            <Toaster position="top-right" />
          </LanguageProvider>
        </AuthProvider>
      </QueryClientProvider>
    </TranslationProvider>
  );
}

export default App;