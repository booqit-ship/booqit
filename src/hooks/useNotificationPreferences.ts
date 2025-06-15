
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUserNotificationPreferences, updateUserNotificationPreference } from '@/services/notificationService';

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
    onSuccess: () => {
      queryClient.invalidateQueries(['notificationPrefs', userId]);
    }
  });

  return {
    preferences: data,
    isLoading,
    error,
    updatePreference: mutation.mutate
  };
}
