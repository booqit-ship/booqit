
import React from 'react';
import NotificationTestPanel from '@/components/NotificationTestPanel';
import NotificationDebugPanel from '@/components/NotificationDebugPanel';
import { ArrowLeft, CheckCircle, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const NotificationTestPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-booqit-primary/5 to-white p-4">
      <div className="max-w-4xl mx-auto">
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
            Firebase Notifications Test & Debug
          </h1>
          <p className="text-gray-600">
            Test Firebase Cloud Messaging integration and debug real-world notification issues
          </p>
        </div>

        <Tabs defaultValue="test" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="test">Test Panel</TabsTrigger>
            <TabsTrigger value="debug">Real-World Debug</TabsTrigger>
          </TabsList>
          
          <TabsContent value="test">
            <NotificationTestPanel />
          </TabsContent>
          
          <TabsContent value="debug">
            <NotificationDebugPanel />
          </TabsContent>
        </Tabs>

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
              <p>✅ Real-world notification triggers integrated</p>
            </div>
          </div>
        </div>

        <div className="mt-6 p-6 bg-orange-50 rounded-lg border border-orange-200">
          <h2 className="text-xl font-semibold mb-4 text-orange-800 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            🔧 Real-World Notification Fixes Applied
          </h2>
          <div className="space-y-3 text-sm text-orange-700">
            <p className="font-medium">Issues Fixed:</p>
            <div className="bg-orange-100 p-3 rounded text-xs space-y-1">
              <p>✅ Fixed database schema issues (removed fcm_response column dependency)</p>
              <p>✅ Added proper error handling and logging</p>
              <p>✅ Integrated real-world notification triggers on booking events</p>
              <p>✅ Added welcome notifications on user login</p>
              <p>✅ Set up booking status listeners for automatic notifications</p>
              <p>✅ Added comprehensive debug panel for troubleshooting</p>
            </div>
          </div>
        </div>

        <div className="mt-6 p-6 bg-white rounded-lg shadow-sm border">
          <h2 className="text-xl font-semibold mb-4">🔔 Real-World Notification Flow</h2>
          <div className="space-y-3 text-sm text-gray-700">
            <div className="flex items-start gap-3">
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">LOGIN</span>
              <span>Welcome notification sent automatically when user logs in (with 2-second delay for FCM token readiness)</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">BOOKING</span>
              <span>Merchant receives notification instantly when customer creates a booking (real-time database listener)</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs font-medium">COMPLETE</span>
              <span>Customer receives review request when merchant marks booking complete (status change listener)</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs font-medium">DAILY</span>
              <span>Edge function sends daily reminders to customers and merchants (scheduled function)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationTestPage;
