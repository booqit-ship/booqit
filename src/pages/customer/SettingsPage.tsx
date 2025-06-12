
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, User, Shield, Mail, Info, Trash2, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';

const CustomerSettingsPage: React.FC = () => {
  const { user, logout } = useAuth();

  const settingsItems = [
    {
      icon: User,
      title: 'Account Information',
      description: 'Manage your personal details',
      href: '/settings/account'
    },
    {
      icon: Shield,
      title: 'Privacy Policy',
      description: 'Learn how we protect your data',
      href: '/settings/privacy-policy'
    },
    {
      icon: Info,
      title: 'Terms & Conditions',
      description: 'Our terms of service',
      href: '/settings/terms-conditions'
    },
    {
      icon: Mail,
      title: 'Contact Us',
      description: 'Get in touch with our support team',
      href: '/settings/contact'
    },
    {
      icon: Info,
      title: 'About BooqIt',
      description: 'App information and version details',
      href: '/settings/about'
    }
  ];

  const dangerItems = [
    {
      icon: Trash2,
      title: 'Delete Account',
      description: 'Permanently delete your account and data',
      href: '/settings/delete-account',
      isDestructive: true
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Link to="/profile">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-semibold">Settings</h1>
              <p className="text-sm text-gray-600">Manage your account and preferences</p>
            </div>
          </div>
          <Button variant="outline" onClick={logout} className="text-sm">
            Logout
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-6 pb-24">
        {/* User Info */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-booqit-primary/10 rounded-full flex items-center justify-center">
                <User className="h-6 w-6 text-booqit-primary" />
              </div>
              <div>
                <h3 className="font-medium">{user?.email}</h3>
                <p className="text-sm text-gray-600">Customer Account</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* General Settings */}
        <div className="space-y-1">
          <h2 className="text-lg font-semibold px-1 mb-3">General</h2>
          {settingsItems.map((item) => (
            <Link key={item.href} to={item.href}>
              <Card className="hover:bg-gray-50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                        <item.icon className="h-5 w-5 text-gray-600" />
                      </div>
                      <div>
                        <h3 className="font-medium">{item.title}</h3>
                        <p className="text-sm text-gray-600">{item.description}</p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Danger Zone */}
        <div className="space-y-1">
          <h2 className="text-lg font-semibold px-1 mb-3 text-red-600">Danger Zone</h2>
          {dangerItems.map((item) => (
            <Link key={item.href} to={item.href}>
              <Card className="hover:bg-red-50 transition-colors border-red-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                        <item.icon className="h-5 w-5 text-red-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-red-700">{item.title}</h3>
                        <p className="text-sm text-red-600">{item.description}</p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-red-400" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CustomerSettingsPage;
