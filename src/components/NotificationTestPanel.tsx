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

  // Helper to request notification permission and block on denied
  const ensurePermissionGranted = async () => {
    if (!("Notification" in window)) {
      toast.error("Notifications are not supported in this browser.");
      return false;
    }

    // If already granted, shortcut
    if (Notification.permission === "granted") {
      return true;
    }

    // Prompt user for permission
    const permissionResult = await requestNotificationPermission();

    // requestNotificationPermission returns only boolean
    if (permissionResult) {
      toast.success("Notifications permission granted! Proceeding...");
      return true;
    } else {
      toast("To enable test notifications, please allow notifications in your browser settings.", {
        description:
          'Click the lock icon in your address bar and set "Notifications" to "Allow", then try again.',
        duration: 9000,
        action: {
          label: "Learn How",
          onClick: () =>
            window.open(
              "https://support.google.com/chrome/answer/3220216",
              "_blank"
            ),
        },
      });
      // Add debug info so it can be investigated if this fires incorrectly
      console.warn(
        "Notification permission not granted. permissionResult:",
        permissionResult,
        "Notification.permission:",
        Notification.permission
      );
      return false;
    }
  };

  // Helper to update user's FCM token before sending test notification
  const refreshAndSaveToken = async () => {
    if (!user?.id) {
      toast.error("User not logged in!");
      return false;
    }
    // Ensure permission
    const granted = await ensurePermissionGranted();
    if (!granted) return false;

    try {
      toast("Refreshing your push token...");
      const token = await getFCMToken();
      if (!token) {
        toast.error(
          "Could not get a push token—for best results, allow notifications."
        );
        return false;
      }
      // Save token to DB (customer/merchant both supported)
      const { error } = await supabase
        .from("profiles")
        .update({
          fcm_token: token,
          notification_enabled: true,
          last_notification_sent: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) {
        toast.error("Could not update your push token. Try logging out/in.");
        return false;
      }
      toast.success("Push token refreshed—attempting to send...");
      return true;
    } catch (err: any) {
      toast.error(
        "Error refreshing/saving push token: " +
          (err.message || "unknown error")
      );
      return false;
    }
  };

  const handleSendTestNotification = async () => {
    setSuccessMsg(""); setErrorMsg("");
    if (!user?.id) {
      toast.error("User not logged in!");
      setErrorMsg("User not logged in!");
      return;
    }
    setSending(true);
    const tokenSaved = await refreshAndSaveToken();
    if (!tokenSaved) {
      setSending(false);
      setErrorMsg("Push token not saved or permission not granted.");
      return;
    }
    try {
      const { data, error } = await supabase.functions.invoke(
        "send-notification",
        {
          body: {
            userId: user.id,
            title: "Test Notification 🔔",
            body: "This is a test notification from BooqIt!",
          },
        }
      );

      if (error) {
        console.error("❌ Error invoking notification:", error);
        toast.error(
          "Failed to send test notification: " +
            (error.message || "Unknown error")
        );
        setErrorMsg(error.message || "Unknown error from edge function");
        return;
      }

      if (data && data.success) {
        toast.success("Notification sent! Check your device.");
        setSuccessMsg("Notification sent successfully!");
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
        <CardTitle>Push Notification Test</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm">
          Click the button below to refresh and save your push token and send a
          test push notification to yourself.
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
