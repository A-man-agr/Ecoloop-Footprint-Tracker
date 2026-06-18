/**
 * cache-buster.js
 * Automatically unregisters old Service Workers and forces a page reload once
 * to break the old index.html cache. Runs as a standard script.
 */
(function() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(function(registrations) {
            if (registrations.length > 0) {
                // Check if we already reloaded in this session to prevent loops
                if (!sessionStorage.getItem('ecoloop_cache_cleared')) {
                    sessionStorage.setItem('ecoloop_cache_cleared', 'true');
                    
                    // Unregister all workers
                    for (var i = 0; i < registrations.length; i++) {
                        registrations[i].unregister();
                    }
                    
                    console.log("Old Service Worker cleared. Reloading page to apply module scripts...");
                    window.location.reload(true);
                }
            }
        });
    }
})();
