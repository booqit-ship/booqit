
declare global {
  interface Window {
    OneSignal: any;
    OneSignalDeferred: any[];
  }
}

class OneSignalService {
  private initialized = false;
  private appId = 'd5a0614a-d4fc-45a0-81d4-cff762b376dd';

  async waitForOneSignal(): Promise<void> {
    // Wait for OneSignal to be available (it's initialized in HTML)
    let attempts = 0;
    while (!window.OneSignal && attempts < 100) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }

    if (!window.OneSignal) {
      throw new Error('OneSignal SDK not loaded after 10 seconds');
    }
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('🔔 OneSignal service already initialized');
      return;
    }

    try {
      console.log('🔔 Waiting for OneSignal to be available...');
      await this.waitForOneSignal();
      
      console.log('✅ OneSignal SDK is available');
      this.initialized = true;
      
      // Set up event listeners
      this.setupEventListeners();

    } catch (error) {
      console.error('❌ OneSignal service initialization failed:', error);
      throw error;
    }
  }

  private setupEventListeners(): void {
    try {
      if (!window.OneSignal) return;

      window.OneSignal.User.PushSubscription.addEventListener('change', (event: any) => {
        console.log('🔔 Push subscription changed:', event);
      });

      window.OneSignal.Notifications.addEventListener('permissionChange', (event: any) => {
        console.log('🔔 Permission changed:', event);
      });

    } catch (error) {
      console.warn('⚠️ Could not set up OneSignal listeners:', error);
    }
  }

  async setUserId(userId: string): Promise<void> {
    await this.initialize();

    try {
      console.log('🔔 Setting OneSignal external user ID:', userId);
      
      // Use the login method to set external user ID
      await window.OneSignal.login(userId);
      
      // Wait a bit for the login to process
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('✅ OneSignal external user ID set successfully:', userId);
    } catch (error) {
      console.error('❌ Failed to set OneSignal user ID:', error);
      throw error;
    }
  }

  async getCurrentUserId(): Promise<string | null> {
    await this.initialize();

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
    await this.initialize();

    try {
      const permission = await window.OneSignal.Notifications.permission;
      const pushSubscription = await window.OneSignal.User.PushSubscription.optedIn;
      
      console.log('🔔 Subscription check - Permission:', permission, 'Opted In:', pushSubscription);
      
      const isSubscribed = permission === 'granted' && pushSubscription === true;
      console.log('🔔 Final subscription status:', isSubscribed);
      
      return isSubscribed;
    } catch (error) {
      console.error('❌ Error checking subscription status:', error);
      return false;
    }
  }

  async requestPermission(): Promise<boolean> {
    await this.initialize();

    try {
      console.log('🔔 Requesting notification permission...');
      
      // Check current permission status
      const currentPermission = await window.OneSignal.Notifications.permission;
      console.log('🔔 Current permission:', currentPermission);
      
      if (currentPermission === 'granted') {
        console.log('🔔 Permission already granted, ensuring opt-in...');
        await window.OneSignal.User.PushSubscription.optIn();
        await new Promise(resolve => setTimeout(resolve, 1500));
        return await this.isSubscribed();
      }
      
      // Request permission if not granted
      console.log('🔔 Requesting browser permission...');
      const permission = await window.OneSignal.Notifications.requestPermission();
      console.log('🔔 Permission request result:', permission);
      
      if (permission) {
        console.log('🔔 Permission granted, opting in...');
        await window.OneSignal.User.PushSubscription.optIn();
        await new Promise(resolve => setTimeout(resolve, 2000));
        return await this.isSubscribed();
      }
      
      return false;
    } catch (error) {
      console.error('❌ Error requesting permission:', error);
      return false;
    }
  }

  async forceSubscription(): Promise<boolean> {
    await this.initialize();

    try {
      console.log('🔔 Starting force subscription process...');
      
      // Step 1: Check if already subscribed
      let isCurrentlySubscribed = await this.isSubscribed();
      if (isCurrentlySubscribed) {
        console.log('✅ Already subscribed');
        return true;
      }
      
      // Step 2: Request permission and opt in
      const hasPermission = await this.requestPermission();
      if (!hasPermission) {
        console.log('❌ Could not get permission');
        return false;
      }
      
      // Step 3: Multiple verification attempts
      for (let attempt = 1; attempt <= 5; attempt++) {
        console.log(`🔔 Verification attempt ${attempt}/5`);
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        isCurrentlySubscribed = await this.isSubscribed();
        if (isCurrentlySubscribed) {
          console.log('✅ Successfully force subscribed');
          return true;
        }
        
        // Try to opt in again if not subscribed
        try {
          console.log(`🔔 Attempt ${attempt}: Trying opt-in again...`);
          await window.OneSignal.User.PushSubscription.optIn();
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.warn(`⚠️ Attempt ${attempt} opt-in failed:`, error);
        }
      }
      
      console.log('❌ Failed to establish subscription after multiple attempts');
      return false;
      
    } catch (error) {
      console.error('❌ Error in force subscription:', error);
      return false;
    }
  }

  async addTag(key: string, value: string): Promise<void> {
    await this.initialize();

    try {
      console.log('🔔 Adding tag:', key, '=', value);
      await window.OneSignal.User.addTag(key, value);
      console.log('✅ Tag added successfully');
    } catch (error) {
      console.error('❌ Error adding tag:', error);
    }
  }

  async removeTag(key: string): Promise<void> {
    await this.initialize();

    try {
      console.log('🔔 Removing tag:', key);
      await window.OneSignal.User.removeTag(key);
      console.log('✅ Tag removed successfully');
    } catch (error) {
      console.error('❌ Error removing tag:', error);
    }
  }

  async getSubscriptionDetails(): Promise<any> {
    await this.initialize();

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

  async showSlidedownPrompt(): Promise<void> {
    await this.initialize();

    try {
      console.log('🔔 Showing slidedown prompt...');
      await window.OneSignal.slidedown.promptPush();
    } catch (error) {
      console.error('❌ Error showing slidedown prompt:', error);
    }
  }

  async showNativePrompt(): Promise<void> {
    await this.initialize();

    try {
      console.log('🔔 Showing native prompt...');
      await window.OneSignal.showNativePrompt();
    } catch (error) {
      console.error('❌ Error showing native prompt:', error);
    }
  }

  async forcePermissionPrompt(): Promise<void> {
    await this.initialize();

    try {
      console.log('🔔 Starting comprehensive permission flow...');
      
      // Check current status
      const isCurrentlySubscribed = await this.isSubscribed();
      if (isCurrentlySubscribed) {
        console.log('✅ User already subscribed');
        return;
      }

      // Try direct permission request first
      console.log('🔔 Direct permission request...');
      const hasPermission = await this.requestPermission();
      if (hasPermission) {
        console.log('✅ Direct permission successful');
        return;
      }
      
      // Try slidedown prompt as fallback
      console.log('🔔 Trying slidedown prompt...');
      await this.showSlidedownPrompt();
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.error('❌ Error in comprehensive permission flow:', error);
    }
  }
}

export const oneSignalService = new OneSignalService();
