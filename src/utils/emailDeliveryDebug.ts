import { supabase } from '@/integrations/supabase/client';

// Email delivery debugging utilities
export class EmailDeliveryDebug {
  
  // Test email delivery with comprehensive logging
  static async testEmailDelivery(email: string, type: 'signup' | 'reset' = 'signup') {
    console.log(`🧪 Testing email delivery for ${type}:`, email);
    console.log('📊 Supabase client configuration:', {
      url: supabase.supabaseUrl,
      key: supabase.supabaseKey ? 'Present' : 'Missing',
      authSettings: supabase.auth
    });
    
    try {
      if (type === 'signup') {
        // Test signup email
        const { data, error } = await supabase.auth.signUp({
          email: email,
          password: 'TestPassword123!',
          options: {
            emailRedirectTo: 'https://app.booqit.in/verify',
            data: { test: true }
          }
        });
        
        console.log('📧 Signup email test result:', { 
          success: !error, 
          error: error?.message,
          user: data.user ? 'Created' : 'Not created',
          session: data.session ? 'Active' : 'None'
        });
        
        return { success: !error, error: error?.message, data };
        
      } else if (type === 'reset') {
        // Test password reset email
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: 'https://app.booqit.in/reset-password'
        });
        
        console.log('🔐 Password reset email test result:', { 
          success: !error, 
          error: error?.message 
        });
        
        return { success: !error, error: error?.message };
      }
      
    } catch (error: any) {
      console.error('❌ Email delivery test failed:', error);
      return { success: false, error: error.message };
    }
  }
  
  // Check Supabase configuration
  static async checkSupabaseConfig() {
    console.log('🔍 Checking Supabase configuration...');
    
    try {
      // Test basic connectivity
      const { data, error } = await supabase.auth.getSession();
      
      console.log('🔗 Supabase connectivity test:', {
        connected: !error,
        error: error?.message,
        hasSession: !!data.session
      });
      
      // Check auth settings (these would be visible in admin panel)
      console.log('⚙️ Auth configuration to verify in Supabase dashboard:');
      console.log('- Site URL should be: https://app.booqit.in');
      console.log('- Redirect URLs should include:');
      console.log('  - https://app.booqit.in/verify');
      console.log('  - https://app.booqit.in/reset-password');
      console.log('- Email templates should be enabled');
      console.log('- Email confirmation should be enabled');
      
      return { connected: !error, error: error?.message };
      
    } catch (error: any) {
      console.error('❌ Supabase configuration check failed:', error);
      return { connected: false, error: error.message };
    }
  }
  
  // Enhanced email validation
  static validateEmail(email: string): { valid: boolean; reason?: string } {
    if (!email || email.trim() === '') {
      return { valid: false, reason: 'Email is required' };
    }
    
    const trimmedEmail = email.trim().toLowerCase();
    
    // Basic format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return { valid: false, reason: 'Invalid email format' };
    }
    
    // Length validation
    if (trimmedEmail.length > 254) {
      return { valid: false, reason: 'Email too long' };
    }
    
    // Common provider checks
    const commonProviders = [
      'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 
      'icloud.com', 'protonmail.com', 'aol.com'
    ];
    
    const domain = trimmedEmail.split('@')[1];
    const isCommonProvider = commonProviders.includes(domain);
    
    console.log('📧 Email validation result:', {
      email: trimmedEmail,
      valid: true,
      domain,
      isCommonProvider,
      recommendation: isCommonProvider ? 'Reliable delivery expected' : 'May need verification'
    });
    
    return { valid: true };
  }
  
  // Log email attempt with context
  static logEmailAttempt(type: string, email: string, context: any = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      type,
      email: email.toLowerCase().trim(),
      context,
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    
    console.log('📝 Email attempt logged:', logEntry);
    
    // Store in localStorage for debugging
    try {
      const existingLogs = JSON.parse(localStorage.getItem('emailDeliveryLogs') || '[]');
      existingLogs.push(logEntry);
      // Keep only last 10 logs
      const recentLogs = existingLogs.slice(-10);
      localStorage.setItem('emailDeliveryLogs', JSON.stringify(recentLogs));
    } catch (error) {
      console.warn('Failed to store email log:', error);
    }
  }
  
  // Get email delivery logs
  static getEmailLogs() {
    try {
      const logs = JSON.parse(localStorage.getItem('emailDeliveryLogs') || '[]');
      console.log('📋 Email delivery logs:', logs);
      return logs;
    } catch (error) {
      console.warn('Failed to retrieve email logs:', error);
      return [];
    }
  }
  
  // Clear email logs
  static clearEmailLogs() {
    localStorage.removeItem('emailDeliveryLogs');
    console.log('🗑️ Email delivery logs cleared');
  }
}

// Export for global use
(window as any).EmailDeliveryDebug = EmailDeliveryDebug;
