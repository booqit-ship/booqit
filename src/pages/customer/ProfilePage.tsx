import React from 'react';
import { Link } from 'react-router-dom';
import { Settings, User, Calendar, Star, ChevronRight, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';

const ProfilePage: React.FC = () => {
  const { user, logout } = useAuth();

  const profileItems = [
    {
      icon: Calendar,
      title: 'My Bookings',
      description: 'View your appointment history',
      href: '/calendar'
    },
    {
      icon: Star,
      title: 'Reviews',
      description: 'Your reviews and ratings',
      href: '/reviews'
    },
    {
      icon: Settings,
      title: 'Settings',
      description: 'Account settings and preferences',
      href: '/settings'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-booqit-primary to-booqit-primary/80 text-white">
        <div className="p-6 pt-12">
          <div className="text-center">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold">{user?.email}</h1>
            <p className="text-booqit-primary/20 mt-1">Customer Account</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4 pb-24 -mt-6">
        {/* Profile Actions */}
        <Card className="shadow-lg">
          <CardContent className="p-0">
            {profileItems.map((item, index) => (
              <Link key={item.href} to={item.href}>
                <div className={`flex items-center justify-between p-4 hover:bg-gray-50 transition-colors ${
                  index !== profileItems.length - 1 ? 'border-b border-gray-100' : ''
                }`}>
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
              </Link>
            ))}
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <h3 className="text-2xl font-bold text-booqit-primary">12</h3>
              <p className="text-sm text-gray-600">Total Bookings</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <h3 className="text-2xl font-bold text-green-600">8</h3>
              <p className="text-sm text-gray-600">Completed</p>
            </CardContent>
          </Card>
        </div>

        {/* Account Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              variant="outline" 
              className="w-full justify-start" 
              onClick={logout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProfilePage;
