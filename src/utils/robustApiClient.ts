
import { supabase } from '@/integrations/supabase/client';
import { BackendHealthCheck } from './backendHealthCheck';

interface RetryOptions {
  maxRetries: number;
  delay: number;
  backoffFactor: number;
}

export class RobustApiClient {
  private static readonly DEFAULT_RETRY_OPTIONS: RetryOptions = {
    maxRetries: 3,
    delay: 1000,
    backoffFactor: 2
  };

  static async withRetry<T>(
    operation: () => Promise<T>,
    options: Partial<RetryOptions> = {}
  ): Promise<T> {
    const config = { ...this.DEFAULT_RETRY_OPTIONS, ...options };
    let lastError: Error;

    for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
      try {
        // Check health before attempting operation
        if (attempt > 1) {
          const health = await BackendHealthCheck.checkHealth();
          if (!health.isHealthy) {
            throw new Error(`Backend unhealthy: ${health.error}`);
          }
        }

        const result = await operation();
        
        if (attempt > 1) {
          console.log(`✅ RETRY SUCCESS: Operation succeeded on attempt ${attempt}`);
        }
        
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        console.warn(`⚠️ RETRY ATTEMPT ${attempt}/${config.maxRetries} failed:`, lastError.message);
        
        if (attempt === config.maxRetries) {
          break;
        }

        // Wait before retry with exponential backoff
        const delay = config.delay * Math.pow(config.backoffFactor, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    console.error('❌ RETRY FAILED: All attempts exhausted');
    throw lastError!;
  }

  static async safeQuery<T>(queryFn: () => Promise<{ data: T; error: any }>) {
    return this.withRetry(async () => {
      const { data, error } = await queryFn();
      
      if (error) {
        throw new Error(`Query failed: ${error.message}`);
      }
      
      return data;
    });
  }
}
