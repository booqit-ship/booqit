
import React from 'react';
import { ArrowLeft, Mail, Phone, MapPin, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const ContactPage: React.FC = () => (
  <div className="min-h-screen bg-gray-50">
    <div className="bg-white border-b sticky top-0 z-10">
      <div className="flex items-center gap-3 p-4">
        <Link to="/settings">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-semibold">Contact Us</h1>
          <p className="text-sm text-gray-600">Get in touch with our support team</p>
        </div>
      </div>
    </div>
    
    <div className="p-4 space-y-6 pb-24">
      {/* Contact Methods */}
      <Card>
        <CardHeader>
          <CardTitle>Get Support</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Mail className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium">Email Support</h3>
              <p className="text-sm text-gray-600">support@booqit.in</p>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.open('mailto:support@booqit.in', '_blank')}
            >
              Send Email
            </Button>
          </div>
          
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Phone className="h-5 w-5 text-green-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium">Phone Support</h3>
              <p className="text-sm text-gray-600">Available during business hours</p>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.open('tel:+919876543210', '_blank')}
            >
              Call Now
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Company Information */}
      <Card>
        <CardHeader>
          <CardTitle>Company Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-gray-500 mt-1" />
            <div>
              <h3 className="font-medium">Address</h3>
              <p className="text-sm text-gray-600">
                16xstudios<br />
                Hosur, Tamil Nadu<br />
                India
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-gray-500 mt-1" />
            <div>
              <h3 className="font-medium">Support Hours</h3>
              <p className="text-sm text-gray-600">
                Monday - Friday: 9:00 AM - 6:00 PM IST<br />
                Saturday: 10:00 AM - 4:00 PM IST<br />
                Sunday: Closed
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* FAQ Section */}
      <Card>
        <CardHeader>
          <CardTitle>Frequently Asked Questions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-l-4 border-booqit-primary pl-4">
            <h3 className="font-medium mb-1">How do I cancel a booking?</h3>
            <p className="text-sm text-gray-600">You can cancel your booking from the Calendar page or by contacting the salon directly.</p>
          </div>
          
          <div className="border-l-4 border-booqit-primary pl-4">
            <h3 className="font-medium mb-1">How do I change my account information?</h3>
            <p className="text-sm text-gray-600">Go to Settings > Account Information to update your profile details.</p>
          </div>
          
          <div className="border-l-4 border-booqit-primary pl-4">
            <h3 className="font-medium mb-1">Is my payment information secure?</h3>
            <p className="text-sm text-gray-600">All payments are made directly at the salon. We do not store any payment information.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
);

export default ContactPage;
