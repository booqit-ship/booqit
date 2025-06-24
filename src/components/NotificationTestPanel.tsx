
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getFCMToken, requestNotificationPermission } from "@/firebase";

const NotificationTestPanel: React.FC = () => {
  const { user } = useAuth();
  const [sending, setSending] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [debugInfo, setDebugInfo] = useState<any>(null);

  // Enhanced permission handling for Android Chrome
  const ensurePermissionGranted = async () => {
    if (!("Notification" in window)) {
      toast.error("Notifications are not supported in this browser.");
      return false;
    }

    if (Notification.permission === "granted") {
      return true;
    }

    const permissionResult = await requestNotificationPermission();

    if (permissionResult) {
      toast.success("Notifications permission granted! Proceeding...");
      return true;
    } else {
      toast("To enable test notifications, please allow notifications in your browser settings.", {
        description: 'Click the lock icon in your address bar and set "Notifications" to "Allow", then try again.',
        duration: 9000,
        action: {
          label: "Learn How",
          onClick: () => window.open("https://support.google.com/chrome/answer/3220216", "_blank"),
        },
      });
      console.warn("Notification permission not granted. permissionResult:", permissionResult, "Notification.permission:", Notification.permission);
      return false;
    }
  };

  const refreshAndSaveToken = async () => {
    if (!user?.id) {
      toast.error("User not logged in!");
      return false;
    }
    
    const granted = await ensurePermissionGranted();
    if (!granted) return false;

    try {
      toast("Refreshing your push token with enhanced configuration...");
      
      // Add debug information
      const debugData = {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        notificationPermission: Notification.permission,
        serviceWorkerSupported: 'serviceWorker' in navigator,
        timestamp: new Date().toISOString()
      };
      
      setDebugInfo(debugData);
      console.log('🔧 DEBUG INFO:', debugData);
      
      const token = await getFCMToken();
      
      if (!token) {
        toast.error("Could not get a push token—check Firebase configuration.");
        setErrorMsg("Failed to get FCM token - check console for details");
        return false;
      }
      
      // Use the multi-device registration function
      const { data, error } = await supabase.rpc('register_device_token', {
        p_user_id: user.id,
        p_fcm_token: token,
        p_device_type: /Android/i.test(navigator.userAgent) ? 'android' : /iPhone|iPad|iPod/i.test(navigator.userAgent) ? 'ios' : 'web',
        p_device_name: navigator.userAgent.includes('Chrome') ? 'Chrome Browser' : 'Browser',
        p_user_agent: navigator.userAgent
      });

      if (error) {
        toast.error("Could not register device token. Try logging out/in.");
        console.error('Device token registration error:', error);
        setErrorMsg(`Database error: ${error.message}`);
        return false;
      }
      
      toast.success("Push token refreshed with Android config—attempting to send...");
      return true;
    } catch (err: any) {
      toast.error("Error refreshing/saving push token: " + (err.message || "unknown error"));
      setErrorMsg(`Token error: ${err.message || "unknown error"}`);
      console.error('Token refresh error:', err);
      return false;
    }
  };

  const handleSendTestNotification = async () => {
    setSuccessMsg(""); 
    setErrorMsg("");
    setDebugInfo(null);
    
    if (!user?.id) {
      toast.error("User not logged in!");
      setErrorMsg("User not logged in!");
      return;
    }
    
    setSending(true);
    
    const tokenSaved = await refreshAndSaveToken();
    if (!tokenSaved) {
      setSending(false);
      return;
    }
    
    try {
      console.log('🔔 Sending test notification to user:', user.id);
      
      const { data, error } = await supabase.functions.invoke("send-notification", {
        body: {
          userId: user.id,
          title: "Test Notification 🔔",
          body: "This is a test notification from BooqIt with Android config!",
          data: {
            type: 'test',
            timestamp: Date.now(),
            config: 'android'
          }
        },
      });

      if (error) {
        console.error("❌ Error invoking notification:", error);
        toast.error("Failed to send test notification: " + (error.message || "Unknown error"));
        setErrorMsg(error.message || "Unknown error from edge function");
        return;
      }

      if (data && data.success) {
        toast.success("Notification sent! Check your device.");
        setSuccessMsg("Notification sent successfully with Android configuration!");
        console.log("✅ Notification sent:", data);
      } else {
        toast.error(data?.error || "Notification sending failed");
        setErrorMsg(data?.error || "Notification sending failed");
        console.error("❌ Notification function failed:", data);
      }
    } catch (err: any) {
      toast.error("Unexpected error: " + (err.message || ""));
      setErrorMsg(err.message || "Unexpected error");
      console.error("❌ Unexpected error:", err);
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className="max-w-md mx-auto mt-10">
      <CardHeader>
        <CardTitle>Push Notification Test (Enhanced)</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm">
          Test notifications with Android Firebase configuration and enhanced error handling.
          <br />
          Make sure notifications are enabled in your browser or app!
        </p>
        <Button
          onClick={handleSendTestNotification}
          disabled={sending}
          className="w-full"
        >
          {sending ? "Sending..." : "Send Test Notification"}
        </Button>
        
        {debugInfo && (
          <div className="mt-4 p-3 bg-gray-100 rounded text-xs">
            <h4 className="font-semibold mb-2">Debug Info:</h4>
            <pre className="whitespace-pre-wrap">{JSON.stringify(debugInfo, null, 2)}</pre>
          </div>
        )}
        
        {successMsg && (
          <div className="text-green-600 font-medium mt-2">{successMsg}</div>
        )}
        {errorMsg && (
          <div className="text-red-600 font-medium mt-2">{errorMsg}</div>
        )}
      </CardContent>
    </Card>
  );
};

export default NotificationTestPanel;
