
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { getNotificationLogs } from "@/services/notificationService";

export default function NotificationHistoryPanel() {
  const { user } = useAuth();
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['notificationLogs', user?.id],
    queryFn: () => user?.id ? getNotificationLogs(user.id) : [],
    enabled: !!user?.id
  });

  if (!user) return null;
  return (
    <Card className="max-w-lg mx-auto mt-10">
      <CardHeader>
        <CardTitle>Notification History</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div>Loading notification history...</div>
        ) : logs.length === 0 ? (
          <div className="text-sm text-gray-500">No notifications sent yet.</div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {logs.map((n: any) => (
              <li key={n.id} className="py-3">
                <div className="font-medium">{n.title}</div>
                <div className="text-sm text-gray-600">{n.body}</div>
                <div className="text-xs text-gray-400">{n.type} • {n.sent_at ? new Date(n.sent_at).toLocaleString() : ''}</div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
