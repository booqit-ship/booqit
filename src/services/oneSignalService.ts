
declare global {
  interface Window {
    OneSignal: any;
    OneSignalDeferred: any[];
  }
}

class OneSignalService {
  private initialized = false;
  private appId = 'd5a0614a-d4fc-45a0-81d4-cff762b376dd';
  private initPromise: Promise<void> | null = null;

  async initialize(): Promise<void> {
    if (this.initPromise) {
      console.log('🔔 OneSignal initialization already in progress, waiting...');
      return this.initPromise;
    }

    if (this.initialized) {
      console.log('🔔 OneSignal already initialized');
      return;
    }

    this.initPromise = this._doInitialize();
    return this.initPromise;
  }

  private async _doInitialize(): Promise<void> {
    try {
      console.log('🔔 Starting OneSignal initialization...');
      
      // Wait for OneSignal to be available
      let attempts = 0;
      while (!window.OneSignal && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }

      if (!window.OneSignal) {
        throw new Error('OneSignal SDK not loaded after 5 seconds');
      }

      console.log('🔔 OneSignal SDK detected, initializing...');

      // Check if already initialized
      if (window.OneSignal._isInitialized) {
        console.log('🔔 OneSignal already initialized by external script');
        this.initialized = true;
        this.setupDebugListeners();
        return;
      }

      // Initialize OneSignal
      await window.OneSignal.init({
        appId: this.appId,
        safari_web_id: "web.onesignal.auto.0a199198-d5df-41c5-963c-72a0258657aa",
        allowLocalhostAsSecureOrigin: true,
        autoRegister: false,
        autoResubscribe: true,
        showCredit: false,
        persistNotification: false,
        notifyButton: {
          enable: false,
        },
        welcomeNotification: {
          disable: true
        },
        promptOptions: {
          slidedown: {
            enabled: true,
            actionMessage: "We'd like to show you notifications for new bookings!",
            acceptButtonText: "Allow",
            cancelButtonText: "No Thanks"
          }
        }
      });

      this.initialized = true;
      console.log('✅ OneSignal initialized successfully');
      
      // Set up debug listeners
      this.setupDebugListeners();

      // Wait a moment for OneSignal to fully initialize
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      console.error('❌ OneSignal initialization failed:', error);
      this.initialized = false;
      this.initPromise = null;
      throw error;
    }
  }

  private setupDebugListeners(): void {
    if (!window.OneSignal || !this.initialized) return;

    try {
      window.OneSignal.User.PushSubscription.addEventListener('change', (event: any) => {
        console.log('🔔 Push subscription changed:', event);
      });

      window.OneSignal.Notifications.addEventListener('permissionChange', (event: any) => {
        console.log('🔔 Permission changed:', event);
      });

      window.OneSignal.Notifications.addEventListener('click', (event: any) => {
        console.log('🔔 Notification clicked:', event);
      });
    } catch (error) {
      console.warn('⚠️ Could not set up OneSignal listeners:', error);
    }
  }

  async setUserId(userId: string): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
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
      return permission === 'granted' && pushSubscription === true;
    } catch (error) {
      console.error('❌ Error checking subscription status:', error);
      return false;
    }
  }

  async requestPermission(): Promise<boolean> {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!window.OneSignal) {
      console.error('❌ OneSignal not available');
      return false;
    }

    try {
      console.log('🔔 Requesting notification permission...');
      
      // First check current permission status
      const currentPermission = await window.OneSignal.Notifications.permission;
      console.log('🔔 Current permission before request:', currentPermission);
      
      if (currentPermission === 'granted') {
        console.log('🔔 Permission already granted, ensuring subscription...');
        
        // Check if we're opted in
        const isOptedIn = await window.OneSignal.User.PushSubscription.optedIn;
        console.log('🔔 Current opt-in status:', isOptedIn);
        
        if (!isOptedIn) {
          console.log('🔔 Permission granted but not opted in, opting in...');
          await window.OneSignal.User.PushSubscription.optIn();
          
          // Wait for subscription to be established
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        return await this.isSubscribed();
      }
      
      // Request permission if not granted
      console.log('🔔 Requesting browser permission...');
      const permission = await window.OneSignal.Notifications.requestPermission();
      console.log('🔔 Permission request result:', permission);
      
      if (permission) {
        console.log('🔔 Permission granted, opting in to push notifications...');
        
        // Ensure we're opted in
        await window.OneSignal.User.PushSubscription.optIn();
        
        // Wait for subscription to be fully established
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Verify final status
        const finalStatus = await this.isSubscribed();
        console.log('🔔 Final subscription status:', finalStatus);
        
        return finalStatus;
      }
      
      console.log('❌ Permission denied by user');
      return false;
    } catch (error) {
      console.error('❌ Error requesting permission:', error);
      return false;
    }
  }

  async forceSubscription(): Promise<boolean> {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!window.OneSignal) {
      console.error('❌ OneSignal not available');
      return false;
    }

    try {
      console.log('🔔 Starting force subscription process...');
      
      // Step 1: Check current status
      let isCurrentlySubscribed = await this.isSubscribed();
      if (isCurrentlySubscribed) {
        console.log('✅ Already subscribed');
        return true;
      }
      
      // Step 2: Request permission aggressively
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
          await window.OneSignal.User.PushSubscription.optIn();
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
    if (!this.initialized) {
      await this.initialize();
    }

    if (!window.OneSignal) return;

    try {
      console.log('🔔 Starting comprehensive permission flow...');
      
      // Check current status
      const isCurrentlySubscribed = await this.isSubscribed();
      if (isCurrentlySubscribed) {
        console.log('✅ User already subscribed');
        return;
      }

      // Step 1: Try direct permission request
      console.log('🔔 Step 1: Direct permission request...');
      const hasPermission = await this.requestPermission();
      if (hasPermission) {
        console.log('✅ Direct permission successful');
        return;
      }
      
      // Step 2: Try slidedown prompt
      console.log('🔔 Step 2: Slidedown prompt...');
      await this.showSlidedownPrompt();
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Check if slidedown worked
      const afterSlidedown = await this.isSubscribed();
      if (afterSlidedown) {
        console.log('✅ Slidedown prompt successful');
        return;
      }
      
      // Step 3: Try native prompt
      console.log('🔔 Step 3: Native prompt...');
      await this.showNativePrompt();
      await new Promise(resolve => setTimeout(resolve, 3000));

    } catch (error) {
      console.error('❌ Error in comprehensive permission flow:', error);
    }
  }

  async addTag(key: string, value: string): Promise<void> {
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
}

export const oneSignalService = new OneSignalService();
