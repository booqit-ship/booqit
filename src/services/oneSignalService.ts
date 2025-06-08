
import { Capacitor } from '@capacitor/core';

declare global {
  interface Window {
    OneSignal?: any;
    OneSignalDeferred?: any[];
  }
}

export class OneSignalService {
  private static instance: OneSignalService;
  private isInitialized = false;
  private appId = 'd5a0614a-d4fc-45a0-81d4-cff762b376dd';

  private constructor() {}

  static getInstance(): OneSignalService {
    if (!OneSignalService.instance) {
      OneSignalService.instance = new OneSignalService();
    }
    return OneSignalService.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('🔔 OneSignal already initialized');
      return;
    }

    try {
      if (Capacitor.isNativePlatform()) {
        await this.initializeNative();
      } else {
        await this.initializeWeb();
      }
      
      this.isInitialized = true;
      console.log('✅ OneSignal initialized successfully');
    } catch (error) {
      console.error('❌ OneSignal initialization failed:', error);
    }
  }

  private async initializeNative(): Promise<void> {
    console.log('🔔 OneSignal native initialization (handled by plugin)');
  }

  private async initializeWeb(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined') {
        reject(new Error('Window is undefined'));
        return;
      }

      const initOneSignal = async (OneSignal: any) => {
        try {
          await OneSignal.init({
            appId: this.appId,
            serviceWorkerPath: '/OneSignalSDKWorker.js',
            serviceWorkerUpdaterPath: '/OneSignalSDKUpdaterWorker.js',
            allowLocalhostAsSecureOrigin: true,
          });
          
          console.log('✅ OneSignal web initialization complete');
          resolve();
        } catch (error) {
          reject(error);
        }
      };

      if (window.OneSignal) {
        initOneSignal(window.OneSignal);
      } else if (window.OneSignalDeferred) {
        window.OneSignalDeferred.push(initOneSignal);
      } else {
        // Create the deferred array if it doesn't exist
        window.OneSignalDeferred = [];
        window.OneSignalDeferred.push(initOneSignal);
        
        // Load OneSignal if not already loaded
        if (!document.querySelector('script[src*="OneSignalSDK"]')) {
          const script = document.createElement('script');
          script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
          script.defer = true;
          document.head.appendChild(script);
        }
        
        setTimeout(() => reject(new Error('OneSignal SDK failed to load')), 10000);
      }
    });
  }

  async requestPermission(): Promise<boolean> {
    try {
      if (Capacitor.isNativePlatform()) {
        console.log('🔔 Native push notification permissions handled by plugin');
        return true;
      } else if (window.OneSignal && this.isInitialized) {
        console.log('🔔 Requesting web push notification permission...');
        
        // First check current permission status
        const currentPermission = await window.OneSignal.Notifications.permission;
        console.log('Current permission status:', currentPermission);
        
        if (currentPermission === 'granted') {
          console.log('✅ Push notifications already granted');
          return true;
        }
        
        // Request permission using the new OneSignal v16 API
        const permission = await window.OneSignal.Notifications.requestPermission();
        console.log('🔔 Permission request result:', permission);
        
        if (permission) {
          console.log('✅ Push notification permission granted');
          return true;
        } else {
          console.log('❌ Push notification permission denied');
          // Show slidedown as fallback
          await this.showSlidedownPrompt();
          return false;
        }
      }
      return false;
    } catch (error) {
      console.error('❌ Error requesting notification permission:', error);
      return false;
    }
  }

  async showSlidedownPrompt(): Promise<void> {
    try {
      if (window.OneSignal && !Capacitor.isNativePlatform() && this.isInitialized) {
        console.log('🔔 Showing OneSignal slidedown prompt');
        await window.OneSignal.Slidedown.promptPush();
      }
    } catch (error) {
      console.error('❌ Error showing slidedown prompt:', error);
    }
  }

  async showNativePrompt(): Promise<void> {
    try {
      if (window.OneSignal && !Capacitor.isNativePlatform() && this.isInitialized) {
        console.log('🔔 Showing OneSignal native prompt');
        await window.OneSignal.showNativePrompt();
      }
    } catch (error) {
      console.error('❌ Error showing native prompt:', error);
    }
  }

  async setUserId(userId: string): Promise<void> {
    try {
      if (window.OneSignal && this.isInitialized) {
        await window.OneSignal.login(userId);
        console.log('✅ OneSignal user ID set:', userId);
      }
    } catch (error) {
      console.error('❌ Error setting OneSignal user ID:', error);
    }
  }

  async setUserSegmentation(userId: string, userRole: string, merchantId?: string): Promise<void> {
    try {
      if (window.OneSignal && this.isInitialized) {
        await window.OneSignal.login(userId);
        await window.OneSignal.User.addTag('user_type', userRole);
        
        if (userRole === 'merchant' && merchantId) {
          await window.OneSignal.User.addTag('merchant_id', merchantId);
        }
        
        if (userRole === 'customer') {
          await window.OneSignal.User.addTag('customer_id', userId);
        }
        
        console.log('✅ OneSignal user segmentation set:', { userId, userRole, merchantId });
      }
    } catch (error) {
      console.error('❌ Error setting OneSignal user segmentation:', error);
    }
  }

  async addTag(key: string, value: string): Promise<void> {
    try {
      if (window.OneSignal && this.isInitialized) {
        await window.OneSignal.User.addTag(key, value);
        console.log('✅ OneSignal tag added:', { key, value });
      }
    } catch (error) {
      console.error('❌ Error adding OneSignal tag:', error);
    }
  }

  async removeTag(key: string): Promise<void> {
    try {
      if (window.OneSignal && this.isInitialized) {
        await window.OneSignal.User.removeTag(key);
        console.log('✅ OneSignal tag removed:', key);
      }
    } catch (error) {
      console.error('❌ Error removing OneSignal tag:', error);
    }
  }

  async logout(): Promise<void> {
    try {
      if (window.OneSignal && this.isInitialized) {
        await window.OneSignal.logout();
        console.log('✅ OneSignal user logged out');
      }
    } catch (error) {
      console.error('❌ Error logging out OneSignal user:', error);
    }
  }
}

export const oneSignalService = OneSignalService.getInstance();
