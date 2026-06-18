/**
 * sw.js - Service Worker for EcoLoop PWA.
 * Implements a cache-first strategy for offline support.
 */

const CACHE_NAME = 'ecoloop-v6';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/styles.css',
    '/app.js',
    '/calculations.js',
    '/globe.js',
    '/game.js',
    '/settings.js',
    '/manifest.json',
    '/cache-buster.js',
    '/js/dom.js',
    '/js/state.js',
    '/js/charts.js',
    '/js/navigation.js',
    '/js/calculator.js',
    '/js/actions.js',
    '/js/offsets.js',
    '/js/diagnostics.js'
];

// Install event - cache core assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        }).then(() => self.skipWaiting())
    );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch event - cache-first with network fallback
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests and cross-origin API calls
    if (event.request.method !== 'GET') return;
    
    const url = new URL(event.request.url);
    
    // Always fetch index.html / root from network directly to break any cache deadlock
    if (url.pathname === '/' || url.pathname === '/index.html') {
        event.respondWith(fetch(event.request));
        return;
    }
    
    // Don't cache API calls (Gemini, Analytics, etc.)
    if (url.hostname !== location.hostname &&
        !url.hostname.includes('fonts.googleapis.com') &&
        !url.hostname.includes('fonts.gstatic.com') &&
        !url.hostname.includes('www.gstatic.com') &&
        !url.hostname.includes('cdnjs.cloudflare.com') &&
        !url.hostname.includes('cdn.jsdelivr.net')) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) return cachedResponse;

            return fetch(event.request).then((networkResponse) => {
                // Cache successful GET responses
                if (networkResponse && networkResponse.status === 200) {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return networkResponse;
            }).catch(() => {
                // Offline fallback for navigation requests
                if (event.request.mode === 'navigate') {
                    return caches.match('/index.html');
                }
            });
        })
    );
});
