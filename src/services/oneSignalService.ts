
declare global {
  interface Window {
    OneSignal: any;
  }
}

class OneSignalService {
  private initialized = false;
  private appId = 'd5a0614a-d4fc-45a0-81d4-cff762b376dd';

  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('🔔 OneSignal already initialized');
      return;
    }

    try {
      console.log('🔔 Initializing OneSignal...');
      
      // Wait for OneSignal to be available
      while (!window.OneSignal) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      await window.OneSignal.init({
        appId: this.appId,
        safari_web_id: "web.onesignal.auto.0a199198-d5df-41c5-963c-72a0258657aa",
        notifyButton: {
          enable: false,
        },
        allowLocalhostAsSecureOrigin: true,
        autoRegister: false, // We'll handle registration manually
        autoResubscribe: true,
        showCredit: false,
        persistNotification: true,
        welcomeNotification: {
          disable: true // Disable to avoid confusion
        }
      });

      this.initialized = true;
      console.log('✅ OneSignal initialized successfully');

      // Set up debug listeners
      this.setupDebugListeners();

    } catch (error) {
      console.error('❌ OneSignal initialization failed:', error);
      throw error;
    }
  }

  private setupDebugListeners(): void {
    if (!window.OneSignal) return;

    window.OneSignal.User.PushSubscription.addEventListener('change', (event: any) => {
      console.log('🔔 Push subscription changed:', event);
    });

    window.OneSignal.Notifications.addEventListener('permissionChange', (event: any) => {
      console.log('🔔 Permission changed:', event);
    });

    window.OneSignal.Notifications.addEventListener('click', (event: any) => {
      console.log('🔔 Notification clicked:', event);
    });
  }

  async setUserId(userId: string): Promise<void> {
    if (!this.initialized) {
      console.warn('⚠️ OneSignal not initialized, cannot set user ID');
      return;
    }

    try {
      console.log('🔔 Setting OneSignal user ID:', userId);
      
      await window.OneSignal.login(userId);
      
      console.log('✅ OneSignal user ID set successfully:', userId);
      
      // Verify the user ID was set
      const currentUserId = await this.getCurrentUserId();
      console.log('🔔 Current OneSignal user ID after setting:', currentUserId);
      
    } catch (error) {
      console.error('❌ Failed to set OneSignal user ID:', error);
      throw error;
    }
  }

  async getCurrentUserId(): Promise<string | null> {
    if (!this.initialized || !window.OneSignal) return null;

    try {
      const onesignalId = await window.OneSignal.User.onesignalId;
      const externalId = await window.OneSignal.User.externalId;
      
      console.log('🔔 OneSignal IDs - OneSignal ID:', onesignalId, 'External ID:', externalId);
      return externalId || onesignalId;
    } catch (error) {
      console.error('❌ Error getting current user ID:', error);
      return null;
    }
  }

  async isSubscribed(): Promise<boolean> {
    if (!this.initialized || !window.OneSignal) return false;

    try {
      const permission = await window.OneSignal.Notifications.permission;
      const pushSubscription = await window.OneSignal.User.PushSubscription.optedIn;
      
      console.log('🔔 Subscription status - Permission:', permission, 'Opted In:', pushSubscription);
      return permission === 'granted' && pushSubscription;
    } catch (error) {
      console.error('❌ Error checking subscription status:', error);
      return false;
    }
  }

  async requestPermission(): Promise<boolean> {
    if (!this.initialized || !window.OneSignal) {
      console.error('❌ OneSignal not initialized');
      return false;
    }

    try {
      console.log('🔔 Requesting notification permission...');
      
      // First check current permission status
      const currentPermission = await window.OneSignal.Notifications.permission;
      console.log('🔔 Current permission before request:', currentPermission);
      
      if (currentPermission === 'granted') {
        console.log('🔔 Permission already granted, checking subscription...');
        const isOptedIn = await window.OneSignal.User.PushSubscription.optedIn;
        
        if (!isOptedIn) {
          console.log('🔔 Permission granted but not opted in, opting in...');
          await window.OneSignal.User.PushSubscription.optIn();
        }
        
        return true;
      }
      
      // Request permission
      const permission = await window.OneSignal.Notifications.requestPermission();
      console.log('🔔 Permission result:', permission);
      
      if (permission) {
        // Ensure we're opted in
        await window.OneSignal.User.PushSubscription.optIn();
        console.log('🔔 Opted in to push notifications');
        
        // Wait a moment for the subscription to be established
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const finalStatus = await this.isSubscribed();
        console.log('🔔 Final subscription status:', finalStatus);
        
        return finalStatus;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Error requesting permission:', error);
      return false;
    }
  }

  async showSlidedownPrompt(): Promise<void> {
    if (!this.initialized || !window.OneSignal) return;

    try {
      console.log('🔔 Showing slidedown prompt...');
      await window.OneSignal.slidedown.promptPush();
    } catch (error) {
      console.error('❌ Error showing slidedown prompt:', error);
    }
  }

  async showNativePrompt(): Promise<void> {
    if (!this.initialized || !window.OneSignal) return;

    try {
      console.log('🔔 Showing native prompt...');
      await window.OneSignal.showNativePrompt();
    } catch (error) {
      console.error('❌ Error showing native prompt:', error);
    }
  }

  async forcePermissionPrompt(): Promise<void> {
    if (!this.initialized || !window.OneSignal) return;

    try {
      console.log('🔔 Starting aggressive permission flow...');
      
      // Check current status
      const isCurrentlySubscribed = await this.isSubscribed();
      if (isCurrentlySubscribed) {
        console.log('✅ User already subscribed');
        return;
      }

      // Step 1: Try to opt in if permission exists
      const currentPermission = await window.OneSignal.Notifications.permission;
      console.log('🔔 Current permission:', currentPermission);
      
      if (currentPermission === 'granted') {
        console.log('🔔 Permission exists, attempting to opt in...');
        await window.OneSignal.User.PushSubscription.optIn();
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const subscribed = await this.isSubscribed();
        if (subscribed) {
          console.log('✅ Successfully subscribed with existing permission');
          return;
        }
      }
      
      // Step 2: Request permission directly
      console.log('🔔 Requesting permission...');
      const hasPermission = await this.requestPermission();
      console.log('🔔 Permission granted:', hasPermission);

      if (!hasPermission) {
        // Step 3: Try slidedown prompt
        console.log('🔔 Trying slidedown prompt...');
        await this.showSlidedownPrompt();
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

    } catch (error) {
      console.error('❌ Error in permission flow:', error);
    }
  }

  async addTag(key: string, value: string): Promise<void> => {
    if (!this.initialized || !window.OneSignal) return;

    try {
      console.log('🔔 Adding tag:', key, '=', value);
      await window.OneSignal.User.addTag(key, value);
      console.log('✅ Tag added successfully');
    } catch (error) {
      console.error('❌ Error adding tag:', error);
    }
  }

  async removeTag(key: string): Promise<void> {
    if (!this.initialized || !window.OneSignal) return;

    try {
      console.log('🔔 Removing tag:', key);
      await window.OneSignal.User.removeTag(key);
      console.log('✅ Tag removed successfully');
    } catch (error) {
      console.error('❌ Error removing tag:', error);
    }
  }

  async getSubscriptionDetails(): Promise<any> {
    if (!this.initialized || !window.OneSignal) return null;

    try {
      const details = {
        permission: await window.OneSignal.Notifications.permission,
        optedIn: await window.OneSignal.User.PushSubscription.optedIn,
        id: await window.OneSignal.User.PushSubscription.id,
        token: await window.OneSignal.User.PushSubscription.token,
        onesignalId: await window.OneSignal.User.onesignalId,
        externalId: await window.OneSignal.User.externalId,
      };
      
      console.log('🔔 Full subscription details:', details);
      return details;
    } catch (error) {
      console.error('❌ Error getting subscription details:', error);
      return null;
    }
  }

  async forceSubscription(): Promise<boolean> {
    if (!this.initialized || !window.OneSignal) {
      console.error('❌ OneSignal not initialized');
      return false;
    }

    try {
      console.log('🔔 Force subscribing user...');
      
      // Step 1: Request permission
      const hasPermission = await this.requestPermission();
      if (!hasPermission) {
        console.log('❌ Permission denied, cannot subscribe');
        return false;
      }
      
      // Step 2: Ensure we're opted in
      await window.OneSignal.User.PushSubscription.optIn();
      
      // Step 3: Wait for subscription to be established
      let attempts = 0;
      while (attempts < 10) {
        await new Promise(resolve => setTimeout(resolve, 500));
        const subscribed = await this.isSubscribed();
        if (subscribed) {
          console.log('✅ Successfully force subscribed');
          return true;
        }
        attempts++;
      }
      
      console.log('❌ Failed to establish subscription after multiple attempts');
      return false;
      
    } catch (error) {
      console.error('❌ Error force subscribing:', error);
      return false;
    }
  }
}

export const oneSignalService = new OneSignalService();
