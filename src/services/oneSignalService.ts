
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
      throw error;
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
          console.log('🔔 Initializing OneSignal Web SDK...');
          
          await OneSignal.init({
            appId: this.appId,
            serviceWorkerPath: '/OneSignalSDKWorker.js',
            serviceWorkerUpdaterPath: '/OneSignalSDKUpdaterWorker.js',
            allowLocalhostAsSecureOrigin: true,
            notifyButton: {
              enable: false, // We'll handle permission prompts ourselves
            },
            welcomeNotification: {
              disable: true, // Disable welcome notification
            },
            autoRegister: false, // We'll handle registration manually
            autoResubscribe: true,
            persistNotification: false,
          });
          
          console.log('✅ OneSignal web initialization complete');
          resolve();
        } catch (error) {
          console.error('❌ OneSignal initialization error:', error);
          reject(error);
        }
      };

      if (window.OneSignal) {
        initOneSignal(window.OneSignal);
      } else if (window.OneSignalDeferred) {
        window.OneSignalDeferred.push(initOneSignal);
      } else {
        window.OneSignalDeferred = [];
        window.OneSignalDeferred.push(initOneSignal);
        
        if (!document.querySelector('script[src*="OneSignalSDK"]')) {
          const script = document.createElement('script');
          script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
          script.defer = true;
          script.onload = () => console.log('🔔 OneSignal SDK loaded');
          script.onerror = () => reject(new Error('Failed to load OneSignal SDK'));
          document.head.appendChild(script);
        }
        
        setTimeout(() => reject(new Error('OneSignal SDK failed to load within 15 seconds')), 15000);
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
        
        // Check current permission status first
        const currentPermission = await window.OneSignal.Notifications.permission;
        console.log('Current permission status:', currentPermission);
        
        if (currentPermission === 'granted') {
          console.log('✅ Push notifications already granted');
          return true;
        }
        
        // For denied permissions, we can still try showing prompts
        if (currentPermission === 'denied') {
          console.log('🔔 Permission was denied, showing slidedown prompt');
          await this.showSlidedownPrompt();
          return false;
        }
        
        // Request permission using the new API
        const permission = await window.OneSignal.Notifications.requestPermission();
        console.log('🔔 Permission request result:', permission);
        
        if (permission) {
          console.log('✅ Push notification permission granted');
          return true;
        } else {
          console.log('❌ Push notification permission denied, showing fallback prompts');
          // Try alternative prompts
          setTimeout(async () => {
            await this.showSlidedownPrompt();
          }, 1000);
          return false;
        }
      } else {
        console.warn('⚠️ OneSignal not initialized or not available');
        return false;
      }
    } catch (error) {
      console.error('❌ Error requesting notification permission:', error);
      // Show slidedown as fallback
      try {
        await this.showSlidedownPrompt();
      } catch (fallbackError) {
        console.error('❌ Even fallback prompt failed:', fallbackError);
      }
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
      // Try native prompt as backup
      try {
        await this.showNativePrompt();
      } catch (nativeError) {
        console.error('❌ Native prompt also failed:', nativeError);
      }
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
        console.log('🔔 Setting OneSignal user ID:', userId);
        await window.OneSignal.login(userId);
        console.log('✅ OneSignal user ID set successfully');
      } else {
        console.warn('⚠️ OneSignal not available for setting user ID');
      }
    } catch (error) {
      console.error('❌ Error setting OneSignal user ID:', error);
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

  // Enhanced permission prompt for testing and onboarding
  async forcePermissionPrompt(): Promise<void> {
    try {
      if (!Capacitor.isNativePlatform() && window.OneSignal && this.isInitialized) {
        console.log('🔔 Forcing permission prompt sequence...');
        
        // Try multiple approaches in sequence
        try {
          await window.OneSignal.showNativePrompt();
          console.log('✅ Native prompt shown');
        } catch (nativeError) {
          console.log('❌ Native prompt failed, trying slidedown...');
          try {
            await window.OneSignal.Slidedown.promptPush();
            console.log('✅ Slidedown prompt shown');
          } catch (slidedownError) {
            console.log('❌ Slidedown also failed, trying direct permission request...');
            await this.requestPermission();
          }
        }
      }
    } catch (error) {
      console.error('❌ Error forcing permission prompt:', error);
    }
  }

  // Check if user is subscribed
  async isSubscribed(): Promise<boolean> {
    try {
      if (window.OneSignal && this.isInitialized) {
        const permission = await window.OneSignal.Notifications.permission;
        return permission === 'granted';
      }
      return false;
    } catch (error) {
      console.error('❌ Error checking subscription status:', error);
      return false;
    }
  }

  // Get current user's OneSignal ID
  async getCurrentUserId(): Promise<string | null> {
    try {
      if (window.OneSignal && this.isInitialized) {
        const userId = await window.OneSignal.User.onesignalId;
        return userId;
      }
      return null;
    } catch (error) {
      console.error('❌ Error getting current user ID:', error);
      return null;
    }
  }
}

export const oneSignalService = OneSignalService.getInstance();
