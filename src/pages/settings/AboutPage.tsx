
import React from 'react';
import { ArrowLeft, Smartphone, Calendar, MapPin, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const AboutPage: React.FC = () => (
  <div className="min-h-screen bg-gray-50">
    <div className="bg-white border-b sticky top-0 z-10">
      <div className="flex items-center gap-3 p-4">
        <Link to="/settings">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-semibold">About BooqIt</h1>
          <p className="text-sm text-gray-600">Learn about our app and mission</p>
        </div>
      </div>
    </div>
    
    <div className="p-4 space-y-6 pb-24">
      {/* App Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            BooqIt App
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Version</span>
              <span className="font-medium">1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Developer</span>
              <span className="font-medium">16xstudios</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Location</span>
              <span className="font-medium">Hosur, India</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Release Date</span>
              <span className="font-medium">June 2025</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mission */}
      <Card>
        <CardHeader>
          <CardTitle>Our Mission</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 leading-relaxed">
            BooqIt is designed to simplify the process of booking appointments at salons and beauty services. 
            We connect customers with their favorite service providers, making it easy to discover, book, and 
            manage appointments all in one place.
          </p>
        </CardContent>
      </Card>

      {/* Features */}
      <Card>
        <CardHeader>
          <CardTitle>Key Features</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Calendar className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <h3 className="font-medium">Easy Booking</h3>
              <p className="text-sm text-gray-600">Book appointments with just a few taps</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <MapPin className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <h3 className="font-medium">Location-based Search</h3>
              <p className="text-sm text-gray-600">Find salons and services near you</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Star className="h-4 w-4 text-purple-600" />
            </div>
            <div>
              <h3 className="font-medium">Reviews & Ratings</h3>
              <p className="text-sm text-gray-600">Read reviews and rate your experiences</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Smartphone className="h-4 w-4 text-orange-600" />
            </div>
            <div>
              <h3 className="font-medium">Real-time Updates</h3>
              <p className="text-sm text-gray-600">Get notifications for booking confirmations and reminders</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Technology */}
      <Card>
        <CardHeader>
          <CardTitle>Technology</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 leading-relaxed mb-3">
            BooqIt is built using modern web technologies to ensure a fast, reliable, and secure experience:
          </p>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• React & TypeScript for robust frontend development</li>
            <li>• Supabase for secure data management and authentication</li>
            <li>• Real-time notifications via Firebase</li>
            <li>• Responsive design for all devices</li>
          </ul>
        </CardContent>
      </Card>

      {/* Contact */}
      <Card className="bg-booqit-primary/5 border-booqit-primary/20">
        <CardContent className="p-4 text-center">
          <h3 className="font-medium mb-2">Questions or Feedback?</h3>
          <p className="text-sm text-gray-600 mb-3">
            We'd love to hear from you! Contact our support team.
          </p>
          <Link to="/settings/contact">
            <Button className="bg-booqit-primary hover:bg-booqit-primary/90">
              Contact Support
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  </div>
);

export default AboutPage;
