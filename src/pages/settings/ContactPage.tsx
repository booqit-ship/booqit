import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, Globe, MapPin, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
const ContactPage: React.FC = () => {
  const contactMethods = [{
    icon: Mail,
    title: 'Email Support',
    value: 'support@booqit.in',
    description: 'Get help via email',
    action: () => window.open('mailto:support@booqit.in', '_blank')
  }, {
    icon: Phone,
    title: 'Phone Support',
    value: '+91-9884339363',
    description: 'Call us for immediate assistance',
    action: () => window.open('tel:+919884339363', '_blank')
  }, {
    icon: Globe,
    title: 'Website',
    value: 'https://booqit.in',
    description: 'Visit our official website',
    action: () => window.open('https://booqit.in', '_blank')
  }, {
    icon: MapPin,
    title: 'Address',
    value: 'BooqIt, Hosur, Tamil Nadu, India',
    description: 'Our office location',
    action: null
  }];
  return <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="flex items-center gap-3 p-4">
          <Link to="/settings">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-thin">Contact Us</h1>
            <p className="text-2xl text-gray-50 font-medium">Get in touch with our support team</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6 pb-24">
        {/* Header Card */}
        <Card className="bg-gradient-to-br from-booqit-primary to-booqit-primary/80 text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-6 w-6" />
              We're Here to Help
            </CardTitle>
            <p className="text-booqit-primary/20">
              Have questions or need assistance? Our support team is ready to help you with any issues or inquiries.
            </p>
          </CardHeader>
        </Card>

        {/* Contact Methods */}
        <div className="space-y-3">
          <h2 className="px-1 font-thin text-xl">Contact Information</h2>
          {contactMethods.map((method, index) => <Card key={index} className={method.action ? "hover:bg-gray-50 cursor-pointer transition-colors" : ""}>
              <CardContent className="p-4" onClick={method.action || undefined}>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-booqit-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <method.icon className="h-6 w-6 text-booqit-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900">{method.title}</h3>
                    <p className="text-sm text-gray-600 mb-1">{method.description}</p>
                    <p className="text-booqit-primary font-medium break-all">{method.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>)}
        </div>

        {/* Support Hours */}
        <Card>
          <CardHeader>
            <CardTitle className="font-thin">Support Hours</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Monday - Friday</span>
              <span className="font-medium">9:00 AM - 6:00 PM IST</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Saturday</span>
              <span className="font-medium">10:00 AM - 4:00 PM IST</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Sunday</span>
              <span className="font-medium">Closed</span>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="font-normal">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-start" variant="outline" onClick={() => window.open('mailto:support@booqit.in?subject=App Support Request', '_blank')}>
              <Mail className="h-4 w-4 mr-2" />
              Send Support Email
            </Button>
            <Button className="w-full justify-start" variant="outline" onClick={() => window.open('mailto:support@booqit.in?subject=Bug Report', '_blank')}>
              <MessageCircle className="h-4 w-4 mr-2" />
              Report a Bug
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>;
};
export default ContactPage;