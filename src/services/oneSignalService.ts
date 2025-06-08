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
        // Native platform (Capacitor)
        await this.initializeNative();
      } else {
        // Web platform
        await this.initializeWeb();
      }
      
      this.isInitialized = true;
      console.log('✅ OneSignal initialized successfully');
    } catch (error) {
      console.error('❌ OneSignal initialization failed:', error);
    }
  }

  private async initializeNative(): Promise<void> {
    // For native platforms, OneSignal is initialized through the plugin
    // The initialization happens automatically when the app starts
    console.log('🔔 OneSignal native initialization (handled by plugin)');
  }

  private async initializeWeb(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined') {
        reject(new Error('Window is undefined'));
        return;
      }

      // Check if OneSignal is already loaded
      if (window.OneSignal) {
        window.OneSignal.init({
          appId: this.appId,
          serviceWorkerPath: '/OneSignalSDKWorker.js',
          serviceWorkerUpdaterPath: '/OneSignalSDKUpdaterWorker.js',
        }).then(() => {
          resolve();
        }).catch(reject);
      } else if (window.OneSignalDeferred) {
        // Use deferred initialization if OneSignal is not yet loaded
        window.OneSignalDeferred.push(async (OneSignal: any) => {
          try {
            await OneSignal.init({
              appId: this.appId,
              serviceWorkerPath: '/OneSignalSDKWorker.js',
              serviceWorkerUpdaterPath: '/OneSignalSDKUpdaterWorker.js',
            });
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      } else {
        reject(new Error('OneSignal SDK not found'));
      }
    });
  }

  async requestPermission(): Promise<boolean> {
    try {
      if (Capacitor.isNativePlatform()) {
        // For native platforms, permissions are handled automatically
        console.log('🔔 Native push notification permissions handled by plugin');
        return true;
      } else if (window.OneSignal) {
        // For web platforms
        const permission = await window.OneSignal.Notifications.requestPermission();
        console.log('🔔 Web push notification permission:', permission);
        return permission;
      }
      return false;
    } catch (error) {
      console.error('❌ Error requesting notification permission:', error);
      return false;
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
        // Set external user ID for targeted notifications
        await window.OneSignal.login(userId);
        
        // Add user role tag
        await window.OneSignal.User.addTag('user_type', userRole);
        
        // Add merchant-specific tags for merchants
        if (userRole === 'merchant' && merchantId) {
          await window.OneSignal.User.addTag('merchant_id', merchantId);
        }
        
        // Add customer-specific tags for customers
        if (userRole === 'customer') {
          await window.OneSignal.User.addTag('customer_id', userId);
        }
        
        console.log('✅ OneSignal user segmentation set:', { userId, userRole, merchantId });
      }
    } catch (error) {
      console.error('❌ Error setting OneSignal user segmentation:', error);
    }
  }

  async sendNewBookingNotification(merchantUserId: string, customerName: string, serviceName: string, dateTime: string): Promise<void> {
    try {
      // This would typically be called from a server-side function
      console.log('📧 New booking notification should be sent to merchant:', {
        merchantUserId,
        customerName,
        serviceName,
        dateTime
      });
    } catch (error) {
      console.error('❌ Error sending new booking notification:', error);
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
