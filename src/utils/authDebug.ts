
export const logAuthState = (label: string, data: any) => {
  if (process.env.NODE_ENV === 'development') {
    console.group(`🔐 AUTH DEBUG: ${label}`);
    console.log('Timestamp:', new Date().toISOString());
    console.log('Data:', data);
    console.log('LocalStorage booqit_auth:', localStorage.getItem('booqit_auth'));
    console.groupEnd();
  }
};

export const validateAuthState = () => {
  if (process.env.NODE_ENV === 'development') {
    const stored = localStorage.getItem('booqit_auth');
    console.group('🔍 AUTH VALIDATION');
    console.log('LocalStorage auth data:', stored);
    
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        console.log('Parsed auth data:', parsed);
        console.log('Is valid structure:', !!(parsed.isAuthenticated && parsed.role && parsed.id));
      } catch (error) {
        console.error('Invalid JSON in localStorage:', error);
      }
    }
    console.groupEnd();
  }
};
