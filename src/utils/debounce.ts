
/**
 * Debounce utility to prevent overlapping function calls
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

/**
 * Async debounce for promises - prevents overlapping async calls
 */
export const debounceAsync = <T extends (...args: any[]) => Promise<any>>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => Promise<ReturnType<T>>) => {
  let timeoutId: NodeJS.Timeout;
  let pendingPromise: Promise<ReturnType<T>> | null = null;
  
  return (...args: Parameters<T>): Promise<ReturnType<T>> => {
    if (pendingPromise) {
      return pendingPromise;
    }
    
    clearTimeout(timeoutId);
    
    return new Promise((resolve, reject) => {
      timeoutId = setTimeout(async () => {
        try {
          pendingPromise = func(...args);
          const result = await pendingPromise;
          pendingPromise = null;
          resolve(result);
        } catch (error) {
          pendingPromise = null;
          reject(error);
        }
      }, delay);
    });
  };
};
