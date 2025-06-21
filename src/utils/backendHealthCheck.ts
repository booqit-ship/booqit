
import { supabase } from '@/integrations/supabase/client';

export interface HealthCheckResult {
  isHealthy: boolean;
  error?: string;
  latency?: number;
  tokenValid: boolean;
}

export class BackendHealthCheck {
  private static lastHealthCheck: HealthCheckResult | null = null;
  private static lastCheckTime: number = 0;
  private static readonly CACHE_DURATION = 30000; // 30 seconds

  static async checkHealth(): Promise<HealthCheckResult> {
    const now = Date.now();
    
    // Return cached result if recent
    if (this.lastHealthCheck && (now - this.lastCheckTime) < this.CACHE_DURATION) {
      return this.lastHealthCheck;
    }

    console.log('🏥 HEALTH CHECK: Starting backend health check...');
    const startTime = Date.now();

    try {
      // Check if we can connect to Supabase
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .limit(1)
        .single();

      const latency = Date.now() - startTime;

      // Check if we have a valid session
      const { data: { session } } = await supabase.auth.getSession();
      const tokenValid = !!session?.access_token;

      if (error && error.code !== 'PGRST116') {
        console.error('❌ HEALTH CHECK: Backend connection failed:', error);
        this.lastHealthCheck = {
          isHealthy: false,
          error: error.message,
          latency,
          tokenValid
        };
      } else {
        console.log('✅ HEALTH CHECK: Backend is healthy');
        this.lastHealthCheck = {
          isHealthy: true,
          latency,
          tokenValid
        };
      }
    } catch (error) {
      console.error('❌ HEALTH CHECK: Connection error:', error);
      this.lastHealthCheck = {
        isHealthy: false,
        error: error instanceof Error ? error.message : 'Unknown connection error',
        tokenValid: false
      };
    }

    this.lastCheckTime = now;
    return this.lastHealthCheck;
  }

  static async validateToken(): Promise<boolean> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        console.log('⚠️ TOKEN CHECK: No valid session found');
        return false;
      }

      // Check if token is expired
      const now = Math.floor(Date.now() / 1000);
      if (session.expires_at && session.expires_at < now) {
        console.log('⚠️ TOKEN CHECK: Token is expired');
        return false;
      }

      console.log('✅ TOKEN CHECK: Token is valid');
      return true;
    } catch (error) {
      console.error('❌ TOKEN CHECK: Error validating token:', error);
      return false;
    }
  }
}
