
import { Capacitor } from '@capacitor/core';

export const setupNativeCapacitorFeatures = () => {
  // Only apply native modifications when running in a native environment
  if (!Capacitor.isNativePlatform()) {
    console.log('🌐 Running on web - skipping native setup');
    return;
  }

  console.log('📱 Setting up native Capacitor features...');

  try {
    // 1. Disable zoom and make viewport native-like
    const viewportMeta = document.querySelector('meta[name=viewport]') || document.createElement('meta');
    viewportMeta.setAttribute('name', 'viewport');
    viewportMeta.setAttribute('content', 
      'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'
    );
    
    if (!document.querySelector('meta[name=viewport]')) {
      document.head.appendChild(viewportMeta);
    }

    // 2. Add native-specific CSS class to body
    document.body.classList.add('capacitor-native');

    // 3. Prevent text selection globally (native app behavior)
    document.addEventListener('selectstart', (e) => {
      e.preventDefault();
      return false;
    }, { passive: false });

    // 4. Prevent context menu (right-click/long-press menu)
    document.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      return false;
    }, { passive: false });

    // 5. Prevent drag and drop (native apps don't have this)
    document.addEventListener('dragstart', (e) => {
      e.preventDefault();
      return false;
    }, { passive: false });

    // 6. Prevent default touch behaviors that feel web-like
    document.addEventListener('touchstart', (e) => {
      // Allow single touch for normal interactions
      if (e.touches.length > 1) {
        // Prevent multi-touch gestures (pinch, etc.)
        e.preventDefault();
      }
    }, { passive: false });

    // 7. Handle double-tap zoom prevention
    let lastTouchEnd = 0;
    document.addEventListener('touchend', (e) => {
      const now = (new Date()).getTime();
      if (now - lastTouchEnd <= 300) {
        // This is a double-tap, prevent it
        e.preventDefault();
      }
      lastTouchEnd = now;
    }, { passive: false });

    // 8. Add CSS to ensure native feel
    const nativeStyles = document.createElement('style');
    nativeStyles.textContent = `
      .capacitor-native {
        /* Disable text selection */
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
        
        /* Disable highlighting */
        -webkit-touch-callout: none;
        -webkit-tap-highlight-color: transparent;
        
        /* Prevent scrolling bounce effect */
        overscroll-behavior: contain;
        
        /* Make interactions feel more native */
        touch-action: manipulation;
      }
      
      .capacitor-native * {
        /* Apply to all child elements */
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
        
        -webkit-touch-callout: none;
        -webkit-tap-highlight-color: transparent;
      }
      
      /* Allow text selection only in input fields */
      .capacitor-native input,
      .capacitor-native textarea,
      .capacitor-native [contenteditable] {
        -webkit-user-select: text;
        -moz-user-select: text;
        -ms-user-select: text;
        user-select: text;
        
        -webkit-touch-callout: default;
      }
      
      /* Prevent zoom on input focus (iOS behavior) */
      .capacitor-native input,
      .capacitor-native textarea,
      .capacitor-native select {
        font-size: 16px !important;
      }
      
      /* Hide scrollbars to feel more native */
      .capacitor-native ::-webkit-scrollbar {
        display: none;
      }
      
      .capacitor-native {
        -ms-overflow-style: none;
        scrollbar-width: none;
      }
    `;
    
    document.head.appendChild(nativeStyles);

    console.log('✅ Native Capacitor features setup complete');
    
  } catch (error) {
    console.error('❌ Error setting up native Capacitor features:', error);
  }
};

// Clean up function for when switching back to web
export const cleanupNativeCapacitorFeatures = () => {
  if (!Capacitor.isNativePlatform()) {
    return;
  }
  
  console.log('🧹 Cleaning up native Capacitor features...');
  
  // Remove the native class
  document.body.classList.remove('capacitor-native');
  
  // Note: Event listeners will be cleaned up when the page unloads
  // CSS styles will also be removed when the page unloads
};
