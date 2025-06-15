
import React, { useState } from "react";
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
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [token, setToken] = useState<string | null>(null);

  // Helper: check permission, refresh token, save to DB
  const refreshAndSaveToken = async () => {
    if (!user?.id) {
      toast.error("User not logged in!");
      return false;
    }
    try {
      const granted = await requestNotificationPermission();
      if (!granted) {
        toast("Enable browser notifications and retry.", {
          description: "Click the lock in your address bar, allow notifications, and refresh.",
          duration: 8000
        });
        return false;
      }
      const newToken = await getFCMToken();
      setToken(newToken);

      if (!newToken) {
        toast.error("Could not generate a push token.");
        return false;
      }

      const { error } = await supabase.from("profiles").update({
        fcm_token: newToken,
        notification_enabled: true,
        last_notification_sent: new Date().toISOString(),
      }).eq("id", user.id);

      if (error) {
        toast.error("Error updating push token in DB.");
        return false;
      }
      toast.success("Push token updated.");
      return true;
    } catch (err: any) {
      toast.error("Token error: " + (err.message || "unknown"));
      return false;
    }
  };

  const handleSendTest = async () => {
    setSuccessMsg("");
    setErrorMsg("");
    setSending(true);
    const refreshed = await refreshAndSaveToken();
    if (!refreshed) {
      setSending(false);
      setErrorMsg("Unable to refresh and save token");
      return;
    }
    try {
      const { data, error } = await supabase.functions.invoke('send-notification', {
        body: {
          userId: user?.id,
          title: "Merchant Test Notification",
          body: "This is a test notification to verify your merchant account setup.",
          data: { type: "test_merchant" }
        }
      });
      if (error) {
        setErrorMsg(error.message || "Function error");
        toast.error("Edge function reported: " + (error.message || "unknown"));
      } else if (data && data.success) {
        setSuccessMsg("Notification sent! Check your browser/device.");
        toast.success("Push sent 👍");
      } else {
        setErrorMsg("Edge function error: " + (data?.error || "unknown"));
        toast.error("Data error: " + (data?.error || "unknown"));
      }
    } catch (err: any) {
      setErrorMsg("Unexpected error: " + (err.message || ""));
      toast.error("Unexpected error: " + (err.message || ""));
    } finally {
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
            Use this tool to validate and debug push notification delivery.
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

export default MerchantNotificationTestPanel;
