import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotificationRequest {
  userId: string
  title: string
  body: string
  data?: Record<string, string>
  fcm_token?: string // For direct token specification (single device)
}

serve(async (req) => {
  console.log('📨 Notification request received:', req.method, req.url);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let requestBody: NotificationRequest;

    try {
      requestBody = await req.json();
      console.log('📋 Request body received:', JSON.stringify(requestBody, null, 2));
    } catch (error) {
      console.error('❌ Invalid JSON in request body:', error);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const { userId, title, body, data, fcm_token } = requestBody;

    if (!userId || !title || !body) {
      console.error('❌ Missing required fields:', { userId, title, body });
      return new Response(
        JSON.stringify({ error: 'Missing required fields: userId, title, body' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Skip validation notifications - don't send them
    if (data?.type === 'validation' || data?.silent === 'true' || title === 'Token Validation') {
      console.log('🔕 Skipping validation notification');
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Validation notification skipped'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    let deviceTokens: any[] = [];
    let userSettings = null;

    // Priority 1: If direct FCM token is provided, use it (for single device notifications)
    if (fcm_token) {
      console.log('🎯 Using direct FCM token for notification:', fcm_token.substring(0, 20) + '...');
      deviceTokens = [{ fcm_token, device_type: 'direct', device_name: 'Direct Token', is_active: true }];
    } else {
      console.log('🔍 Looking up ALL notification devices for user:', userId);

      // Priority 2: Get ALL device tokens (removed limit(1) for multi-device support)
      const { data: allDeviceTokens, error: deviceError } = await supabaseClient
        .from('device_tokens')
        .select('fcm_token, device_type, device_name, is_active')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('last_used_at', { ascending: false });

      if (!deviceError && allDeviceTokens && allDeviceTokens.length > 0) {
        deviceTokens = allDeviceTokens;
        userSettings = {
          notification_enabled: true
        };
        console.log(`✅ Found ${deviceTokens.length} device tokens from device_tokens table:`, {
          user_id: userId,
          devices: deviceTokens.map(d => ({ type: d.device_type, name: d.device_name }))
        });
      } else {
        // Priority 3: Fallback to notification_settings table
        console.log('⚠️ No device tokens found, checking notification_settings table...');
        
        const { data: notificationSettings, error: notificationError } = await supabaseClient
          .from('notification_settings')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        if (notificationError) {
          console.error('❌ Error fetching notification settings:', notificationError);
        } else if (notificationSettings) {
          userSettings = {
            fcm_token: notificationSettings.fcm_token,
            notification_enabled: notificationSettings.notification_enabled
          };
          if (notificationSettings.fcm_token) {
            deviceTokens = [{ 
              fcm_token: notificationSettings.fcm_token, 
              device_type: 'legacy', 
              device_name: 'Legacy Token',
              is_active: true 
            }];
          }
          console.log('✅ Found notification settings:', {
            user_id: userId,
            has_fcm_token: !!userSettings.fcm_token,
            notification_enabled: userSettings.notification_enabled
          });
        }

        // Priority 4: Final fallback to profiles table
        if (deviceTokens.length === 0) {
          console.log('⚠️ No notification settings found, checking profiles table...');
          
          const { data: profile, error: profileError } = await supabaseClient
            .from('profiles')
            .select('fcm_token, notification_enabled')
            .eq('id', userId)
            .maybeSingle();

          if (profileError) {
            console.error('❌ Profile lookup error:', profileError);
            
            // Log this attempt for visibility
            await supabaseClient.from('notification_logs')
              .insert({
                user_id: userId,
                title,
                body,
                type: data?.type || 'general',
                status: 'failed',
                error_message: `Profile lookup error: ${profileError.message}`
              });
            
            return new Response(
              JSON.stringify({ 
                error: 'Profile lookup failed', 
                details: profileError.message
              }),
              {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              }
            );
          }

          if (!profile) {
            console.warn('⚠️ No profile found for user:', userId);
            
            // Log this attempt for visibility
            await supabaseClient.from('notification_logs')
              .insert({
                user_id: userId,
                title,
                body,
                type: data?.type || 'general',
                status: 'failed',
                error_message: 'No profile found - user needs to enable notifications in the app'
              });
            
            return new Response(
              JSON.stringify({ 
                error: 'No profile found for user',
                message: 'User needs to enable notifications in the app first'
              }),
              {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              }
            );
          }

          userSettings = {
            fcm_token: profile.fcm_token,
            notification_enabled: profile.notification_enabled
          };
          if (profile.fcm_token) {
            deviceTokens = [{ 
              fcm_token: profile.fcm_token, 
              device_type: 'profile', 
              device_name: 'Profile Token',
              is_active: true 
            }];
          }
        }
      }

      // Check if notifications are enabled (only if we have user settings)
      if (userSettings && userSettings.notification_enabled === false) {
        console.log('🔕 Notifications disabled for user:', userId);
        
        await supabaseClient.from('notification_logs')
          .insert({
            user_id: userId,
            title,
            body,
            type: data?.type || 'general',
            status: 'failed',
            error_message: 'Notifications are disabled in user profile'
          });
        
        return new Response(
          JSON.stringify({ message: 'Notifications disabled for user' }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
    }

    if (deviceTokens.length === 0) {
      console.warn('⚠️ User has no FCM tokens - user must enable push notifications in their app');
      
      // Log this attempt for better visibility
      await supabaseClient.from('notification_logs')
        .insert({
          user_id: userId,
          title,
          body,
          type: data?.type || 'general',
          status: 'failed',
          error_message: 'No FCM tokens found - user needs to enable notifications in browser'
        });
      
      return new Response(
        JSON.stringify({ 
          error: 'No FCM tokens found for user',
          message: 'User needs to enable push notifications in their browser'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`🚀 Attempting to send notification to ${deviceTokens.length} devices for user:`, userId);

    // Send notifications to ALL devices in parallel
    const notificationPromises = deviceTokens.map(async (device, index) => {
      try {
        console.log(`📤 [${index + 1}/${deviceTokens.length}] Sending to ${device.device_type} device:`, device.device_name || 'Unknown');
        
        const result = await sendNotificationToToken(
          device.fcm_token,
          title,
          body,
          { ...data, debug_id: `${userId}:${Date.now()}:${index}` }
        );
        
        console.log(`✅ [${index + 1}/${deviceTokens.length}] Notification sent successfully to ${device.device_type}:`, result);
        
        return {
          success: true,
          device: device.device_type,
          token: device.fcm_token.substring(0, 20) + '...',
          result
        };
        
      } catch (fcmError) {
        let errorMsg = fcmError?.message || String(fcmError);
        console.error(`❌ [${index + 1}/${deviceTokens.length}] FCM send error for ${device.device_type}:`, errorMsg);
        
        // Check if token is invalid and should be cleaned up
        const isInvalidToken = errorMsg.includes('UNREGISTERED') || 
                              errorMsg.includes('invalid') ||
                              errorMsg.includes('NotRegistered');
        
        if (isInvalidToken) {
          console.log(`🧹 [${index + 1}/${deviceTokens.length}] Cleaning up invalid token for ${device.device_type}`);
          try {
            await supabaseClient
              .from('device_tokens')
              .update({ is_active: false })
              .eq('fcm_token', device.fcm_token);
            console.log(`✅ [${index + 1}/${deviceTokens.length}] Invalid token cleaned up`);
          } catch (cleanupError) {
            console.error(`❌ [${index + 1}/${deviceTokens.length}] Token cleanup failed:`, cleanupError);
          }
        }
        
        return {
          success: false,
          device: device.device_type,
          token: device.fcm_token.substring(0, 20) + '...',
          error: errorMsg,
          invalidToken: isInvalidToken
        };
      }
    });

    // Wait for all notifications to complete
    const results = await Promise.allSettled(notificationPromises);
    
    // Process results
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)).length;
    const invalidTokens = results
      .filter(r => r.status === 'fulfilled' && r.value.invalidToken)
      .map(r => r.value.token);

    console.log(`📊 Multi-device notification results: ${successful} successful, ${failed} failed, ${invalidTokens.length} invalid tokens cleaned up`);

    // Log the overall result
    const logStatus = successful > 0 ? 'sent' : 'failed';
    const logMessage = successful > 0 
      ? `Sent to ${successful}/${deviceTokens.length} devices` 
      : 'Failed to send to any device';

    await supabaseClient.from('notification_logs')
      .insert({
        user_id: userId,
        title,
        body,
        type: data?.type || 'general',
        status: logStatus,
        fcm_response: JSON.stringify({
          total_devices: deviceTokens.length,
          successful,
          failed,
          invalid_tokens_cleaned: invalidTokens.length
        }).slice(0, 499)
      });

    return new Response(
      JSON.stringify({
        success: successful > 0,
        message: logMessage,
        details: {
          total_devices: deviceTokens.length,
          successful,
          failed,
          invalid_tokens_cleaned: invalidTokens.length
        },
        results: results.map(r => r.status === 'fulfilled' ? r.value : { success: false, error: 'Promise rejected' })
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    let errMsg = error?.message || String(error);
    console.error('❌ Unexpected error in send-notification function:', errMsg);
    
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: errMsg
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function getAccessToken() {
  const FIREBASE_SERVICE_ACCOUNT = Deno.env.get('FIREBASE_SERVICE_ACCOUNT')
  
  if (!FIREBASE_SERVICE_ACCOUNT) {
    throw new Error('Firebase service account not configured')
  }

  let serviceAccount;
  try {
    serviceAccount = JSON.parse(FIREBASE_SERVICE_ACCOUNT);
    console.log('🔑 Service account loaded:', {
      projectId: serviceAccount.project_id,
      clientEmail: serviceAccount.client_email,
      hasPrivateKey: !!serviceAccount.private_key
    });
  } catch (error) {
    console.error('❌ Invalid Firebase service account JSON:', error);
    throw new Error('Invalid Firebase service account JSON');
  }

  try {
    console.log('🔐 Creating JWT for Google OAuth...');
    
    const { private_key, client_email } = serviceAccount;
    
    // Create JWT for Google OAuth
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: client_email,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    };

    const jwt = await createJWT(payload, private_key);
    
    console.log('🎫 Requesting access token from Google...');
    
    // Exchange JWT for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('❌ Token request failed:', tokenResponse.status, errorText);
      throw new Error(`Failed to get access token: ${tokenResponse.status} - ${errorText}`);
    }

    const tokenData = await tokenResponse.json();
    console.log('✅ Access token obtained successfully');
    return tokenData.access_token;
  } catch (error) {
    console.error('❌ Access token error:', error);
    throw new Error(`Failed to get access token: ${error.message}`);
  }
}

async function createJWT(payload: any, privateKey: string): Promise<string> {
  const header = { alg: 'RS256', typ: 'JWT' };
  
  // Encode header and payload
  const encodedHeader = btoa(JSON.stringify(header))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
    
  const encodedPayload = btoa(JSON.stringify(payload))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  
  // Clean up the private key
  const cleanPrivateKey = privateKey
    .replace(/\\n/g, '\n')
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '');
  
  // Decode the base64 private key
  const binaryKey = Uint8Array.from(atob(cleanPrivateKey), c => c.charCodeAt(0));
  
  // Import the private key
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['sign']
  );
  
  // Sign the data
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signingInput)
  );
  
  // Encode the signature
  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  
  return `${signingInput}.${encodedSignature}`;
}

async function sendNotificationToToken(token: string, title: string, body: string, data: Record<string, string> = {}) {
  const PROJECT_ID = 'booqit09-f4cfc'; // Your Firebase project ID
  
  console.log('📤 Getting access token for FCM v1 API...');
  
  try {
    const accessToken = await getAccessToken();
    console.log('✅ Access token obtained');

    const fcmUrl = `https://fcm.googleapis.com/v1/projects/${PROJECT_ID}/messages:send`;
    
    // Use app.booqit.in domain consistently
    const baseUrl = 'https://app.booqit.in';
    
    const message = {
      message: {
        token: token,
        notification: {
          title,
          body,
        },
        data: {
          ...data,
          click_action: baseUrl,
          app_name: 'BooqIt'
        },
        webpush: {
          notification: {
            title,
            body,
            icon: `${baseUrl}/icons/icon-192.png`,
            badge: `${baseUrl}/icons/icon-192.png`,
            click_action: baseUrl,
            tag: 'booqit-notification',
            requireInteraction: true,
            data: {
              ...data,
              app_name: 'BooqIt'
            }
          },
          fcm_options: {
            link: baseUrl
          }
        },
        android: {
          notification: {
            icon: 'icon_192',
            color: '#7E57C2',
            click_action: baseUrl,
            tag: 'booqit-notification'
          }
        },
        apns: {
          payload: {
            aps: {
              badge: 1,
              sound: 'default',
              'content-available': 1
            }
          },
          fcm_options: {
            image: `${baseUrl}/icons/icon-192.png`
          }
        }
      }
    };

    console.log('📤 Sending FCM v1 request to token:', token.substring(0, 20) + '...');

    const response = await fetch(fcmUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    console.log('📨 FCM v1 response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ FCM v1 API error response:', response.status, errorText);
      
      // Handle specific FCM errors
      if (response.status === 404 && errorText.includes('UNREGISTERED')) {
        throw new Error('FCM token is invalid or expired - user needs to refresh token');
      }
      
      throw new Error(`FCM v1 API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('📨 FCM v1 response data:', result);
    
    return result;
  } catch (error) {
    console.error('❌ FCM v1 API error:', error);
    throw error;
  }
}
