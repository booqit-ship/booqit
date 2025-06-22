import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Heart, Smartphone, MapPin, Users, Star, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
const MerchantAboutPage: React.FC = () => {
  const features = [{
    icon: Calendar,
    title: 'Smart Booking System',
    description: 'Real-time slot management and customer tracking'
  }, {
    icon: Users,
    title: 'Customer Management',
    description: 'Track customer preferences and booking history'
  }, {
    icon: Star,
    title: 'Reviews & Ratings',
    description: 'Build trust with customer feedback system'
  }, {
    icon: MapPin,
    title: 'Location Discovery',
    description: 'Help customers find your salon easily'
  }];
  const appInfo = [{
    label: 'Version',
    value: '1.0.0'
  }, {
    label: 'Platform',
    value: 'Android'
  }, {
    label: 'App ID',
    value: 'com.booqit.app'
  }, {
    label: 'Developer',
    value: '16xstudios'
  }, {
    label: 'Last Updated',
    value: new Date().toLocaleDateString('en-IN')
  }];
  const technologies = ['React', 'Tailwind CSS', 'Capacitor', 'Firebase', 'Google Maps', 'Supabase'];
  const permissions = ['Location (to help customers find your salon)', 'Push Notifications (for booking alerts and reminders)', 'Camera (for uploading salon photos)', 'Storage (for app data and images)'];
  return <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="flex items-center gap-3 p-4">
          <Link to="/merchant/settings">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-semibold">About BooqIt</h1>
            <p className="text-sm text-gray-600">App information and details</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6 pb-24">
        {/* App Header */}
        <Card className="bg-gradient-to-br from-booqit-primary to-booqit-primary/80 text-white">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Smartphone className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-2xl">BooqIt</CardTitle>
            <p className="text-white">
              Modern Beauty & Salon Booking Platform
            </p>
          </CardHeader>
        </Card>

        {/* About Description */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-red-500" />
              Built with ❤️ in India
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-700 leading-relaxed">
              BooqIt is a modern beauty and salon appointment booking platform tailored for Indian cities. 
              We help customers discover nearby salons and parlours, book slots in real-time, and avoid waiting queues.
            </p>
            <p className="text-gray-700 leading-relaxed">
              For merchants, BooqIt offers a streamlined booking system, customer tracking, and sales insights – 
              all in one comprehensive app designed to grow your business.
            </p>
          </CardContent>
        </Card>

        {/* Key Features */}
        <Card>
          <CardHeader>
            <CardTitle>Key Features for Merchants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {features.map((feature, index) => <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-10 h-10 bg-booqit-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <feature.icon className="h-5 w-5 text-booqit-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{feature.title}</h4>
                    <p className="text-sm text-gray-600">{feature.description}</p>
                  </div>
                </div>)}
            </div>
          </CardContent>
        </Card>

        {/* App Information */}
        <Card>
          <CardHeader>
            <CardTitle>App Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {appInfo.map((info, index) => <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                  <span className="text-gray-600">{info.label}</span>
                  <span className="font-medium text-gray-900">{info.value}</span>
                </div>)}
            </div>
          </CardContent>
        </Card>

        {/* Technologies Used */}
        <Card>
          <CardHeader>
            <CardTitle>Technologies Used</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {technologies.map((tech, index) => <span key={index} className="px-3 py-1 bg-booqit-primary/10 text-booqit-primary rounded-full text-sm font-medium">
                  {tech}
                </span>)}
            </div>
          </CardContent>
        </Card>

        {/* Permissions */}
        <Card>
          <CardHeader>
            <CardTitle>Permissions Used</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {permissions.map((permission, index) => <div key={index} className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-booqit-primary rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-gray-700 text-sm">{permission}</p>
                </div>)}
            </div>
          </CardContent>
        </Card>

        {/* Data Safety */}
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-800">Data Safety</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-green-700 text-sm">
              We do not sell your personal data. Your privacy is important to us. 
              All merchant and customer data is securely encrypted and stored with industry-standard security measures.
            </p>
          </CardContent>
        </Card>

        {/* Contact */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Email</span>
              <span className="font-medium text-booqit-primary">support@booqit.in</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Phone</span>
              <span className="font-medium">+91-9884339363</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Website</span>
              <span className="font-medium text-booqit-primary">https://booqit.in</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Address</span>
              <span className="font-medium">Hosur, Tamil Nadu, India</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>;
};
export default MerchantAboutPage;