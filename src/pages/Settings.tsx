import React from 'react';
import { Settings, Shield, Bell, Eye, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import Title from '@/helpers/Title';
import SEOMeta from '@/helpers/SEOMeta';

const SettingsPage: React.FC = () => {
  const { currentUser } = useAuth();

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Please sign in</h2>
          <p className="text-gray-600">You need to be signed in to access settings.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Title>Settings - Openstay</Title>
      <SEOMeta
        title="Settings - Openstay"
        description="Manage your Openstay account settings and preferences"
        keywords="settings, account, preferences, security, Openstay"
      />
      
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Settings className="w-8 h-8 mr-3" />
              Settings
            </h1>
            <p className="text-gray-600 mt-2">Manage your account settings and preferences</p>
          </div>

          {/* Settings Sections */}
          <div className="space-y-6">
            {/* Account Security */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Shield className="w-5 h-5 mr-2" />
                  Security
                </h2>
              </div>
              
              <div className="px-6 py-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Password</h3>
                    <p className="text-sm text-gray-500">Change your account password</p>
                  </div>
                  <Button variant="outline">Change Password</Button>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Two-Factor Authentication</h3>
                    <p className="text-sm text-gray-500">Add an extra layer of security to your account</p>
                  </div>
                  <Button variant="outline">Enable 2FA</Button>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Active Sessions</h3>
                    <p className="text-sm text-gray-500">See where you're logged in and log out of other sessions</p>
                  </div>
                  <Button variant="outline">Manage Sessions</Button>
                </div>
              </div>
            </div>

            {/* Notifications */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Bell className="w-5 h-5 mr-2" />
                  Notifications
                </h2>
              </div>
              
              <div className="px-6 py-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Email Notifications</h3>
                    <p className="text-sm text-gray-500">Receive notifications about your bookings and account</p>
                  </div>
                  <Button variant="outline">Configure</Button>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Push Notifications</h3>
                    <p className="text-sm text-gray-500">Get push notifications on your devices</p>
                  </div>
                  <Button variant="outline">Configure</Button>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Marketing Communications</h3>
                    <p className="text-sm text-gray-500">Receive updates about new features and offers</p>
                  </div>
                  <Button variant="outline">Configure</Button>
                </div>
              </div>
            </div>

            {/* Privacy */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Eye className="w-5 h-5 mr-2" />
                  Privacy
                </h2>
              </div>
              
              <div className="px-6 py-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Profile Visibility</h3>
                    <p className="text-sm text-gray-500">Control who can see your profile information</p>
                  </div>
                  <Button variant="outline">Manage</Button>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Data Export</h3>
                    <p className="text-sm text-gray-500">Download a copy of your data</p>
                  </div>
                  <Button variant="outline">Export Data</Button>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Activity History</h3>
                    <p className="text-sm text-gray-500">View and manage your activity history</p>
                  </div>
                  <Button variant="outline">View History</Button>
                </div>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-white rounded-lg shadow border-red-200">
              <div className="px-6 py-4 border-b border-red-200">
                <h2 className="text-lg font-semibold text-red-900 flex items-center">
                  <Trash2 className="w-5 h-5 mr-2" />
                  Danger Zone
                </h2>
              </div>
              
              <div className="px-6 py-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-red-900">Delete Account</h3>
                    <p className="text-sm text-red-600">Permanently delete your account and all associated data</p>
                  </div>
                  <Button variant="destructive">Delete Account</Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SettingsPage;
