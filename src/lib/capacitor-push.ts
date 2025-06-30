
import { PushNotifications } from '@capacitor/push-notifications';

export const initPush = () => {
  PushNotifications.requestPermissions().then(result => {
    if (result.receive === 'granted') {
      PushNotifications.register();
    }
  });

  PushNotifications.addListener('registration', token => {
    console.log('Push token:', token.value);
  });

  PushNotifications.addListener('pushNotificationReceived', notification => {
    console.log('Push received:', notification);
  });

  PushNotifications.addListener('pushNotificationActionPerformed', action => {
    console.log('Push action:', action);
  });
};
