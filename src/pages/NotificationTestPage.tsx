
import React from 'react';
import NotificationTestPanel from '@/components/NotificationTestPanel';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const NotificationTestPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-booqit-primary/5 to-white p-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate(-1)}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Firebase Notifications Test
          </h1>
          <p className="text-gray-600">
            Test Firebase Cloud Messaging integration for web and mobile
          </p>
        </div>

        <NotificationTestPanel />

        <div className="mt-8 p-6 bg-white rounded-lg shadow-sm border">
          <h2 className="text-xl font-semibold mb-4">🔔 Notification Flow</h2>
          <div className="space-y-3 text-sm text-gray-700">
            <div className="flex items-start gap-3">
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">LOGIN</span>
              <span>Welcome notification sent automatically on user login</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">BOOKING</span>
              <span>Merchant receives notification when customer books a service</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs font-medium">COMPLETE</span>
              <span>Customer receives review request when merchant marks booking complete</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs font-medium">WEEKLY</span>
              <span>Customers receive weekly reminder to book again</span>
            </div>
          </div>
        </div>

        <div className="mt-6 p-6 bg-yellow-50 rounded-lg border border-yellow-200">
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">📋 Setup Checklist</h3>
          <ul className="space-y-2 text-sm text-yellow-700">
            <li>✅ Firebase project configured (booqit09-f4cfc)</li>
            <li>✅ Service worker registered (/firebase-messaging-sw.js)</li>
            <li>✅ VAPID key configured</li>
            <li>✅ Supabase Edge Function created for sending notifications</li>
            <li>⚠️ Add FIREBASE_SERVER_KEY to Supabase Secrets</li>
            <li>⚠️ Replace placeholder icon with actual app icon</li>
            <li>⚠️ Update domain in notification click_action</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default NotificationTestPage;
