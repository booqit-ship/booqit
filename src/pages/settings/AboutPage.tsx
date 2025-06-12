
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Smartphone, Code, Heart, Shield, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const AboutPage: React.FC = () => {
  const appInfo = [
    { label: 'Version', value: '1.0.0' },
    { label: 'Platform', value: 'Android' },
    { label: 'App ID', value: 'com.booqit.app' },
    { label: 'Last Updated', value: new Date().toLocaleDateString('en-IN') },
    { label: 'Developer', value: '16xstudios' }
  ];

  const technologies = [
    'React', 'Tailwind CSS', 'Capacitor', 'Firebase', 'Google Maps'
  ];

  const permissions = [
    {
      name: 'Location',
      reason: 'To find nearby salons and beauty services'
    },
    {
      name: 'Push Notifications',
      reason: 'To remind about bookings and special offers'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="flex items-center gap-3 p-4">
          <Link to="/settings">
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
        {/* App Logo & Description */}
        <Card className="bg-gradient-to-br from-booqit-primary to-booqit-primary/80 text-white">
          <CardHeader className="text-center">
            <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Smartphone className="h-10 w-10 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold">BooqIt</CardTitle>
            <p className="text-booqit-primary/20">Booking Made Simple</p>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-white/90 leading-relaxed">
              BooqIt is a modern beauty and salon appointment booking platform tailored for Indian cities. 
              We help customers discover nearby salons and parlours, book slots in real-time, and avoid waiting queues.
            </p>
          </CardContent>
        </Card>

        {/* Mission */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-red-500" />
              Our Mission
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 leading-relaxed">
              For merchants, BooqIt offers a streamlined booking system, customer tracking, and sales insights – all in one app.
              We're revolutionizing the beauty and wellness industry in India, one booking at a time.
            </p>
            <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
              <Heart className="h-4 w-4 text-red-500" />
              <span>Built with ❤️ in India</span>
            </div>
          </CardContent>
        </Card>

        {/* App Information */}
        <Card>
          <CardHeader>
            <CardTitle>App Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {appInfo.map((info, index) => (
              <div key={index} className="flex justify-between items-center py-1">
                <span className="text-gray-600">{info.label}</span>
                <span className="font-medium">{info.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Technologies */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              Technologies Used
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {technologies.map((tech, index) => (
                <span 
                  key={index}
                  className="px-3 py-1 bg-booqit-primary/10 text-booqit-primary rounded-full text-sm font-medium"
                >
                  {tech}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Permissions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Permissions Used
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {permissions.map((permission, index) => (
              <div key={index} className="space-y-1">
                <h4 className="font-medium">{permission.name}</h4>
                <p className="text-sm text-gray-600">{permission.reason}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Data Safety */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-600" />
              Data Safety
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 leading-relaxed">
              We do not sell your personal data. Your privacy is important to us. 
              All data is encrypted and stored securely following industry best practices.
            </p>
            <div className="mt-4">
              <Link to="/settings/privacy-policy">
                <Button variant="outline" size="sm">
                  Read Privacy Policy
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Company Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Company Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Developer</span>
              <span className="font-medium">16xstudios</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Location</span>
              <span className="font-medium">Hosur, Tamil Nadu, India</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Website</span>
              <Button 
                variant="link" 
                className="h-auto p-0 text-booqit-primary"
                onClick={() => window.open('https://booqit.in', '_blank')}
              >
                booqit.in
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AboutPage;
