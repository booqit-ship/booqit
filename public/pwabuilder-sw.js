
// Enhanced PWA Service Worker for BooqIt
const CACHE_NAME = 'booqit-cache-v1';
const OFFLINE_URL = '/';

// Files to cache for offline functionality
const STATIC_CACHE_URLS = [
  '/',
  '/auth',
  '/manifest.json',
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
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
                </style>
              </head>
              <body>
                <h1>BooqIt</h1>
                <p>You're offline. Please check your internet connection.</p>
                <button onclick="window.location.reload()">Try Again</button>
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
      // Handle offline booking sync when connection is restored
      syncOfflineBookings()
    );
  }
});

// Push notification handling
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);
  
  const options = {
    body: event.data ? event.data.text() : 'New notification from BooqIt',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '1'
    },
    actions: [
      {
        action: 'explore',
        title: 'View Details',
        icon: '/icons/icon-192x192.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icons/icon-192x192.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('BooqIt', options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Helper function for background sync
async function syncOfflineBookings() {
  try {
    console.log('Syncing offline bookings...');
    // Implementation would depend on your offline storage strategy
    // This is where you'd sync any offline booking data
  } catch (error) {
    console.error('Failed to sync offline bookings:', error);
  }
}
