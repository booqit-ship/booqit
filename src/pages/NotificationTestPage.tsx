
import React from 'react';
import NotificationTestPanel from '@/components/NotificationTestPanel';
import { ArrowLeft, CheckCircle } from 'lucide-react';
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

        <div className="mt-8 p-6 bg-green-50 rounded-lg border border-green-200">
          <h2 className="text-xl font-semibold mb-4 text-green-800 flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            ✅ Database Migration Complete
          </h2>
          <div className="space-y-3 text-sm text-green-700">
            <p className="font-medium">FCM support has been successfully enabled:</p>
            <div className="bg-green-100 p-3 rounded text-xs space-y-1">
              <p>✅ Added fcm_token column to profiles table</p>
              <p>✅ Added notification_enabled and last_notification_sent columns</p>
              <p>✅ Created notification_logs table with RLS policies</p>
              <p>✅ All notification functionality is now active</p>
            </div>
          </div>
        </div>

        <div className="mt-6 p-6 bg-white rounded-lg shadow-sm border">
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

        <div className="mt-6 p-6 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="text-lg font-semibold text-blue-800 mb-2">🎯 Next Steps</h3>
          <ul className="space-y-2 text-sm text-blue-700">
            <li>✅ Database migration completed</li>
            <li>✅ FCM token storage enabled</li>
            <li>⚠️ Add FIREBASE_SERVER_KEY to Supabase Secrets</li>
            <li>⚠️ Test notifications on actual devices</li>
            <li>⚠️ Update app icon in notification settings</li>
            <li>⚠️ Configure notification click actions for app navigation</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default NotificationTestPage;
