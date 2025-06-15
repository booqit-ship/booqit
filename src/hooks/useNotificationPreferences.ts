
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUserNotificationPreferences, updateUserNotificationPreference } from '@/services/notificationService';
import { toast } from 'sonner';

export function useNotificationPreferences(userId: string | null) {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['notificationPrefs', userId],
    queryFn: () => userId ? getUserNotificationPreferences(userId) : [],
    enabled: !!userId
  });

  const mutation = useMutation({
    mutationFn: async ({ notificationType, enabled }: { notificationType: string, enabled: boolean }) => {
      if (!userId) throw new Error('No user');
      return await updateUserNotificationPreference(userId, notificationType, enabled);
    },
    onSuccess: (data, variables) => {
      console.log('Notification preference updated successfully:', { variables, data });
      const label = variables.notificationType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      toast.success(`'${label}' notifications ${variables.enabled ? 'enabled' : 'disabled'}.`);
      queryClient.invalidateQueries({ queryKey: ['notificationPrefs', userId] });
    },
    onError: (error, variables) => {
      console.error('Failed to update notification preference:', { error, variables });
      const label = variables.notificationType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      toast.error(`Failed to update '${label}' preference.`);
    }
  });

  return {
    preferences: data,
    isLoading,
    error,
    updatePreference: mutation.mutate
  };
}
