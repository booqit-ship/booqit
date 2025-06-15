
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const NotificationTestPanel: React.FC = () => {
  const { user } = useAuth();
  const [sending, setSending] = useState(false);

  const handleSendTestNotification = async () => {
    if (!user?.id) {
      toast.error("User not logged in!");
      return;
    }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-notification", {
        body: {
          userId: user.id,
          title: "Test Notification 🔔",
          body: "This is a test notification from BooqIt!",
        },
      });

      if (error) {
        console.error("❌ Error invoking notification:", error);
        toast.error("Failed to send test notification: " + (error.message || "Unknown error"));
        return;
      }

      if (data && data.success) {
        toast.success("Notification sent! Check your device.");
        console.log("✅ Notification sent:", data);
      } else {
        toast.error(data?.error || "Notification sending failed");
        console.error("❌ Notification function failed:", data);
      }
    } catch (err: any) {
      toast.error("Unexpected error: " + (err.message || ""));
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
          Click the button below to send a test push notification to yourself. Make sure notifications are enabled in your browser or app!
        </p>
        <Button onClick={handleSendTestNotification} disabled={sending} className="w-full">
          {sending ? "Sending..." : "Send Test Notification"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default NotificationTestPanel;
