
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Merchant, BankInfo } from '@/types';
import { LogOut, Settings, Mail, Info, Shield, FileText, Trash2, ChevronRight, User, CreditCard, Bell } from 'lucide-react';
import SettingsBusinessForm from '@/components/merchant/SettingsBusinessForm';
import SettingsBankingForm from '@/components/merchant/SettingsBankingForm';
import BookingUrlManager from '@/components/merchant/BookingUrlManager';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

interface SqlResponse {
  success: boolean;
  message?: string;
  error?: string;
}

const SettingsPage: React.FC = () => {
  const { userId, logout, user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [merchant, setMerchant] = useState<Merchant | null>(null);

  useEffect(() => {
    const fetchMerchantData = async () => {
      if (!userId) return;
      try {
        setIsLoading(true);
        const {
          data: merchantData,
          error: merchantError
        } = await supabase.from('merchants').select('*').eq('user_id', userId).single();
        if (merchantError) {
          console.error('Error fetching merchant data:', merchantError);
          return;
        }
        if (merchantData) {
          setMerchant(merchantData);
        }
      } catch (error) {
        console.error('Error:', error);
        toast('Failed to load merchant data', {
          description: 'Please try again later',
          style: {
            backgroundColor: 'red',
            color: 'white'
          }
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchMerchantData();
  }, [userId]);

  const handleLogout = async () => {
    try {
      await logout();
      window.location.href = '/auth';
    } catch (error) {
      console.error('Logout error:', error);
      toast('Logout failed', {
        description: 'Failed to logout. Please try again.',
        style: {
          backgroundColor: 'red',
          color: 'white'
        }
      });
    }
  };

  const settingsItems = [
    {
      icon: User,
      title: 'Business Information',
      description: 'Manage your shop details and hours',
      href: '/merchant/settings/business-information'
    },
    {
      icon: CreditCard,
      title: 'Banking Details',
      description: 'Manage payment and banking information',
      href: '/merchant/settings/banking-details'
    },
    {
      icon: Bell,
      title: 'Notifications',
      description: 'Manage and test push notifications',
      href: '/merchant/settings/notifications'
    },
    {
      icon: Mail,
      title: 'Contact Us',
      description: 'Get in touch with our support team',
      href: '/merchant/settings/contact'
    },
    {
      icon: Info,
      title: 'About BooqIt',
      description: 'App information and version details',
      href: '/merchant/settings/about'
    },
    {
      icon: Shield,
      title: 'Privacy Policy',
      description: 'Learn how we protect your data',
      href: '/merchant/settings/privacy-policy'
    },
    {
      icon: FileText,
      title: 'Terms & Conditions',
      description: 'Our terms of service',
      href: '/merchant/settings/terms-conditions'
    }
  ];

  const dangerItems = [
    {
      icon: Trash2,
      title: 'Delete Account',
      description: 'Permanently delete your account and data',
      href: '/merchant/settings/delete-account',
      isDestructive: true
    }
  ];

  if (isLoading) {
    return <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-booqit-primary"></div>
      </div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Settings className="h-6 w-6 text-booqit-primary" />
            <div>
              <h1 className="text-xl font-semibold">Settings</h1>
              <p className="text-sm text-gray-600">Manage your account and preferences</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout} className="text-sm">
            <LogOut className="h-4 w-4 mr-2" />
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
                <h3 className="font-medium">{merchant?.shop_name || 'Shop Name'}</h3>
                <p className="text-sm text-gray-600">{user?.email}</p>
                <p className="text-xs text-gray-500">Merchant Account</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Booking URL Manager */}
        {merchant && (
          <div className="space-y-1">
            <h2 className="text-lg font-semibold px-1 mb-3">Share Your Business</h2>
            <BookingUrlManager merchantId={merchant.id} shopName={merchant.shop_name} />
          </div>
        )}

        {/* Business Management */}
        <div className="space-y-1">
          <h2 className="text-lg font-semibold px-1 mb-3">Business Management</h2>
          {settingsItems.slice(0, 3).map((item) => (
            <Link key={item.href} to={item.href}>
              <Card className="hover:bg-gray-50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <item.icon className="h-5 w-5 text-blue-600" />
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

        {/* General Settings */}
        <div className="space-y-1">
          <h2 className="text-lg font-semibold px-1 mb-3">General Settings</h2>
          {settingsItems.slice(3).map((item) => (
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

export default SettingsPage;
