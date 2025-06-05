
// Enhanced PWA Service Worker for BooqIt with App Capabilities
const CACHE_NAME = 'booqit-cache-v2';
const OFFLINE_URL = '/';

// Files to cache for offline functionality
const STATIC_CACHE_URLS = [
  '/',
  '/auth',
  '/customer',
  '/merchant/dashboard',
  '/manifest.json',
  '/lovable-uploads/ceaef400-e74a-4afa-87ec-96c4cfd7d3ea.png',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Install event - cache static resources
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching static resources');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => {
        console.log('Service Worker installation complete');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service Worker installation failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker activation complete');
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Handle navigation requests
  if (event.request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          // Try to get the page from the network first
          const networkResponse = await fetch(event.request);
          return networkResponse;
        } catch (error) {
          console.log('Network failed, serving from cache:', error);
          
          // If network fails, try to serve from cache
          const cache = await caches.open(CACHE_NAME);
          const cachedResponse = await cache.match(OFFLINE_URL);
          
          if (cachedResponse) {
            return cachedResponse;
          }
          
          // If nothing in cache, return a basic offline page
          return new Response(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>BooqIt - Offline</title>
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <style>
                  body { 
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    text-align: center; 
                    padding: 50px; 
                    background: linear-gradient(135deg, #7E57C2 0%, #9C27B0 100%);
                    color: white;
                    min-height: 100vh;
                    margin: 0;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                  }
                  h1 { font-size: 2.5rem; margin-bottom: 1rem; }
                  p { font-size: 1.1rem; opacity: 0.9; }
                  button {
                    background: rgba(255,255,255,0.2);
                    border: 2px solid white;
                    color: white;
                    padding: 12px 24px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 1rem;
                    margin-top: 20px;
                  }
                  .logo {
                    width: 120px;
                    height: 60px;
                    background: white;
                    border-radius: 12px;
                    margin-bottom: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #7E57C2;
                    font-weight: bold;
                    font-size: 1.5rem;
                  }
                </style>
              </head>
              <body>
                <div class="logo">BooqIt</div>
                <h1>You're Offline</h1>
                <p>Please check your internet connection and try again.</p>
                <button onclick="window.location.reload()">Retry</button>
              </body>
            </html>
          `, {
            headers: { 'Content-Type': 'text/html' }
          });
        }
      })()
    );
  }
  
  // Handle other requests with cache-first strategy
  if (event.request.destination === 'image' || 
      event.request.destination === 'script' || 
      event.request.destination === 'style') {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          
          return fetch(event.request).then((networkResponse) => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        });
      })
    );
  }
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag);
  
  if (event.tag === 'background-booking-sync') {
    event.waitUntil(
      syncOfflineBookings()
    );
  }
});

// Push notification handling with enhanced capabilities
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);
  
  const data = event.data ? event.data.json() : {};
  const options = {
    body: data.body || 'New notification from BooqIt',
    icon: '/lovable-uploads/ceaef400-e74a-4afa-87ec-96c4cfd7d3ea.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: data.primaryKey || '1',
      url: data.url || '/'
    },
    actions: [
      {
        action: 'explore',
        title: 'View Details',
        icon: '/lovable-uploads/ceaef400-e74a-4afa-87ec-96c4cfd7d3ea.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/lovable-uploads/ceaef400-e74a-4afa-87ec-96c4cfd7d3ea.png'
      }
    ],
    tag: data.tag || 'general',
    renotify: true,
    requireInteraction: data.urgent || false
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'BooqIt', options)
  );
});

// Enhanced notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/';
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          // Check if there's already a window/tab open with the target URL
          for (const client of clientList) {
            if (client.url === urlToOpen && 'focus' in client) {
              return client.focus();
            }
          }
          // If not, open a new window/tab
          if (clients.openWindow) {
            return clients.openWindow(urlToOpen);
          }
        })
    );
  } else if (event.action === 'close') {
    // Just close the notification (already handled above)
    return;
  } else {
    // Default action - open the app
    event.waitUntil(
      clients.openWindow(urlToOpen)
    );
  }
});

// Periodic background sync for appointment reminders
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'appointment-reminder') {
    event.waitUntil(checkAppointmentReminders());
  }
});

// Helper function for background sync
async function syncOfflineBookings() {
  try {
    console.log('Syncing offline bookings...');
    // This would sync any offline booking data when connection is restored
    // Implementation depends on your offline storage strategy
    
    // Example: Get offline data from IndexedDB and sync to server
    const offlineBookings = await getOfflineBookings();
    if (offlineBookings.length > 0) {
      for (const booking of offlineBookings) {
        await syncBookingToServer(booking);
      }
      await clearOfflineBookings();
    }
  } catch (error) {
    console.error('Failed to sync offline bookings:', error);
  }
}

// Helper function for appointment reminders
async function checkAppointmentReminders() {
  try {
    console.log('Checking appointment reminders...');
    // This would check for upcoming appointments and send reminders
    // Implementation would depend on your backend API
  } catch (error) {
    console.error('Failed to check appointment reminders:', error);
  }
}

// Placeholder functions for offline booking management
async function getOfflineBookings() {
  // Implementation would use IndexedDB to get offline bookings
  return [];
}

async function syncBookingToServer(booking) {
  // Implementation would sync booking to your Supabase backend
  console.log('Syncing booking:', booking);
}

async function clearOfflineBookings() {
  // Implementation would clear synced bookings from IndexedDB
  console.log('Clearing offline bookings');
}

// Handle app launch from different sources
self.addEventListener('appinstalled', (event) => {
  console.log('BooqIt PWA was installed');
  // Track app installation
});

// Handle share target (if implemented)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHARE_TARGET') {
    // Handle shared content
    console.log('Received shared content:', event.data);
  }
});
