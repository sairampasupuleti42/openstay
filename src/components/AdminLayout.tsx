import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { 
  AlertTriangle, 
  BarChart3, 
  Settings, 
  Users, 
  FileText,
  Home,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

const AdminLayout: React.FC = () => {
  const location = useLocation();

  const sidebarItems = [
    {
      name: 'Dashboard',
      href: '/admin/incidents',
      icon: BarChart3,
      current: location.pathname === '/admin/incidents'
    },
    {
      name: 'All Incidents',
      href: '/admin/incidents',
      icon: AlertTriangle,
      current: location.pathname === '/admin/incidents'
    },
    {
      name: 'Reports',
      href: '/admin/reports',
      icon: FileText,
      current: location.pathname === '/admin/reports'
    },
    {
      name: 'Users',
      href: '/admin/users',
      icon: Users,
      current: location.pathname === '/admin/users'
    },
    {
      name: 'Settings',
      href: '/admin/settings',
      icon: Settings,
      current: location.pathname === '/admin/settings'
    }
  ];

  const getBreadcrumbs = () => {
    const path = location.pathname;
    const breadcrumbs = [
      { name: 'Home', href: '/' },
      { name: 'Admin', href: '/admin/incidents' }
    ];

    if (path.includes('/incidents/')) {
      breadcrumbs.push({ name: 'Incidents', href: '/admin/incidents' });
      breadcrumbs.push({ name: 'Incident Details', href: path });
    } else if (path === '/admin/incidents') {
      breadcrumbs.push({ name: 'Incidents', href: '/admin/incidents' });
    }

    return breadcrumbs;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-lg z-30">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center px-6 border-b border-gray-200">
            <Link to="/" className="flex items-center space-x-2">
              <Home className="w-6 h-6 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">Openstay</span>
              <span className="text-sm text-gray-500">Admin</span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    item.current
                      ? "bg-blue-50 text-blue-700 border border-blue-200"
                      : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              Incident Response System v1.0
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="ml-64">
        {/* Top Bar */}
        <div className="bg-white border-b border-gray-200">
          <div className="px-6 py-4">
            {/* Breadcrumbs */}
            <nav className="flex items-center space-x-2 text-sm text-gray-600">
              {getBreadcrumbs().map((breadcrumb, index) => (
                <React.Fragment key={breadcrumb.href}>
                  {index > 0 && <ChevronRight className="w-4 h-4" />}
                  <Link
                    to={breadcrumb.href}
                    className={cn(
                      "hover:text-gray-900 transition-colors",
                      index === getBreadcrumbs().length - 1 && "text-gray-900 font-medium"
                    )}
                  >
                    {breadcrumb.name}
                  </Link>
                </React.Fragment>
              ))}
            </nav>
          </div>
        </div>

        {/* Page Content */}
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
