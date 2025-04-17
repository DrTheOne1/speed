import { 
  Home, 
  MessageSquare, 
  Users, 
  FileText, 
  Clock, 
  Settings,
  Upload,
  UserPlus,
  BarChart2,
  CreditCard,
  Server,
  Route,
  Activity,
  UserCog,
  Send,
  Wallet,
  Package
} from 'lucide-react';

interface NavigationItem {
  name: string;
  href?: string;
  icon: any;
  children?: NavigationItem[];
}

export const userNavigation: NavigationItem[] = [
  { name: 'navigation.dashboard', href: '/', icon: Home },
  { 
    name: 'navigation.messaging',
    icon: MessageSquare,
    children: [
      { name: 'navigation.sendSMS', href: '/send', icon: MessageSquare },
      { name: 'navigation.bulkSend', href: '/bulk-send', icon: Upload },
      { name: 'navigation.scheduled', href: '/scheduled', icon: Clock },
      { name: 'navigation.messages', href: '/messages', icon: MessageSquare },
    ]
  },
  {
    name: 'navigation.contacts',
    icon: Users,
    children: [
      { name: 'navigation.allContacts', href: '/contacts', icon: Users },
      { name: 'navigation.groups', href: '/groups', icon: UserPlus },
      { name: 'navigation.import', href: '/import-contacts', icon: Upload },
    ]
  },
  { name: 'navigation.templates', href: '/templates', icon: FileText },
  {
    name: 'navigation.reports',
    icon: BarChart2,
    children: [
      { name: 'navigation.analytics', href: '/analytics', icon: BarChart2 },
      { name: 'navigation.usage', href: '/usage', icon: CreditCard },
      { name: 'navigation.billing', href: '/billing', icon: CreditCard },
    ]
  },
  { name: 'navigation.settings', href: '/settings', icon: Settings }
];

export const adminNavigation: NavigationItem[] = [
  { name: 'navigation.adminDashboard', href: '/admin', icon: Home },
  { name: 'navigation.userManagement', href: '/admin/users', icon: UserCog },
  { name: 'navigation.gatewayManagement', href: '/admin/gateways', icon: Server },
  { name: 'navigation.gatewayRoutes', href: '/admin/gateway-routes', icon: Route },
  { name: 'navigation.gatewayLogs', href: '/admin/gateway-logs', icon: Activity },
  { name: 'navigation.testSMS', href: '/admin/test-sms', icon: Send },
  { name: 'navigation.paymentMethods', href: '/admin/payment-methods', icon: Wallet },
  { name: 'navigation.subscriptionPlans', href: '/admin/subscription-plans', icon: Package },
  { name: 'navigation.messages', href: '/admin/messages', icon: MessageSquare },
];