
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getFCMToken, requestNotificationPermission } from "@/firebase";

/** 
 * Panel for merchants to validate push token + receive a test notification
 */
const MerchantNotificationTestPanel: React.FC = () => {
  const { user } = useAuth();
  const [sending, setSending] = useState(false);
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const [token, setToken] = useState<string | null>(null);

  const log = (message: string) => {
    console.log(message);
    setDebugLog(prev => [...prev, message]);
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'granted') {
            log("✅ Notification permission is already granted.");
        } else {
            log(`ℹ️ Current notification permission: ${Notification.permission}`);
        }
    } else {
        log("❌ Notifications not supported in this environment.");
    }
  }, []);

  // Helper: check permission, refresh token, save to DB
  const refreshAndSaveToken = async (): Promise<boolean> => {
    if (!user?.id) {
      log("❌ Error: User not logged in!");
      toast.error("User not logged in!");
      return false;
    }
    log(`ℹ️ User found: ${user.id}`);

    try {
      log("1. Requesting notification permission...");
      const granted = await requestNotificationPermission();
      if (!granted) {
        log("❌ Permission not granted. Aborting.");
        toast("Enable browser notifications and retry.", {
          description: "Click the lock in your address bar, allow notifications, and refresh.",
          duration: 8000
        });
        return false;
      }
      log("✅ Permission granted.");

      log("2. Generating new FCM push token...");
      const newToken = await getFCMToken();
      setToken(newToken);

      if (!newToken) {
        log("❌ Could not generate a push token. Check console for FCM errors.");
        toast.error("Could not generate a push token.");
        return false;
      }
      log(`✅ New push token generated: ${newToken.substring(0,20)}...`);

      log("3. Saving token to database...");
      const { error } = await supabase.from("profiles").update({
        fcm_token: newToken,
        notification_enabled: true,
      }).eq("id", user.id);

      if (error) {
        log(`❌ DB Error: ${error.message}`);
        toast.error("Error updating push token in DB.");
        return false;
      }
      log("✅ Push token saved successfully.");
      toast.success("Push token updated.");
      return true;
    } catch (err: any) {
      log(`❌ Critical Error: ${err.message || "unknown"}`);
      toast.error("Token error: " + (err.message || "unknown"));
      return false;
    }
  };

  const handleSendTest = async () => {
    setDebugLog(prev => prev.slice(0, 1)); // Keep initial status, clear the rest
    setSending(true);
    
    log("🚀 Starting test notification process...");
    
    const refreshed = await refreshAndSaveToken();
    if (!refreshed) {
      log("❌ Process halted: Token refresh/save failed.");
      setSending(false);
      return;
    }

    try {
      log("4. Invoking 'send-notification' edge function...");
      const { data, error } = await supabase.functions.invoke('send-notification', {
        body: {
          userId: user?.id,
          title: "Merchant Test Notification",
          body: "This is a test notification to verify your merchant account setup.",
          data: { type: "test_merchant" }
        }
      });
      if (error) {
        log(`❌ Edge function error: ${error.message}`);
        toast.error("Edge function reported: " + (error.message || "unknown"));
      } else if (data && data.success) {
        log("✅ Success! Notification sent! Check your browser/device.");
        toast.success("Push sent 👍");
      } else {
        const dataError = data?.error || "unknown";
        log(`❌ Edge function returned failure: ${dataError}`);
        toast.error("Data error: " + dataError);
      }
    } catch (err: any) {
      log(`❌ Unexpected error during send: ${err.message || ""}`);
      toast.error("Unexpected error: " + (err.message || ""));
    } finally {
      log("🏁 Process finished.");
      setSending(false);
    }
  };

  return (
    <Card className="max-w-md mx-auto mt-6">
      <CardHeader>
        <CardTitle>Merchant Notification Test</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 text-sm">
          <p>
            Use this tool to validate and debug push notification delivery. Follow the steps in the log below.
          </p>
        </div>
        <Button onClick={handleSendTest} disabled={sending} className="w-full">
          {sending ? "Sending..." : "Send Test Notification"}
        </Button>
        {token && (
          <div className="mt-1 break-all text-xs text-muted-foreground">
            Push Token: <code>{token}</code>
          </div>
        )}
        {debugLog.length > 0 && (
          <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-800 rounded-md text-sm font-mono max-h-60 overflow-y-auto">
            <h4 className="font-semibold mb-2 text-base text-gray-800 dark:text-gray-200">Debug Log:</h4>
            {debugLog.map((msg, index) => (
                <div key={index} className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">{msg}</div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MerchantNotificationTestPanel;
