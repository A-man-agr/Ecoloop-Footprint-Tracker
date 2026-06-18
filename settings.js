/**
 * settings.js - Google Services Dynamic Configuration Manager.
 * Manages API keys for Gemini AI, Google Maps, Google Analytics, and Firebase.
 * Keys are stored in localStorage with XSS sanitization.
 */

const STORAGE_KEYS = {
    geminiKey: 'ecoloop_gemini_key',
    mapsKey: 'ecoloop_maps_key',
    gaId: 'ecoloop_ga_id',
    firebaseApiKey: 'ecoloop_firebase_api_key',
    firebaseProjectId: 'ecoloop_firebase_project_id',
    firebaseDatabaseUrl: 'ecoloop_firebase_db_url'
};

/**
 * Sanitizes a string to prevent XSS injection.
 * @param {string} input raw user input
 * @returns {string} sanitized string
 */
export function sanitizeInput(input) {
    if (typeof input !== 'string') return '';
    return input
        .replace(/[<>"'&]/g, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+=/gi, '')
        .trim()
        .substring(0, 120);
}

/**
 * Retrieves a stored API key.
 * @param {'geminiKey'|'mapsKey'|'gaId'|'firebaseApiKey'|'firebaseProjectId'|'firebaseDatabaseUrl'} keyName
 * @returns {string} stored value or empty string
 */
export function getServiceKey(keyName) {
    try {
        return localStorage.getItem(STORAGE_KEYS[keyName]) || '';
    } catch {
        return '';
    }
}

/**
 * Saves an API key after sanitization.
 * @param {'geminiKey'|'mapsKey'|'gaId'|'firebaseApiKey'|'firebaseProjectId'|'firebaseDatabaseUrl'} keyName
 * @param {string} value
 */
export function setServiceKey(keyName, value) {
    try {
        const sanitized = sanitizeInput(value);
        if (sanitized) {
            localStorage.setItem(STORAGE_KEYS[keyName], sanitized);
        } else {
            localStorage.removeItem(STORAGE_KEYS[keyName]);
        }
    } catch (e) {
        console.error('Settings storage error:', e);
    }
}

/**
 * Dynamically injects Google Analytics gtag.js if a valid Measurement ID is present.
 */
export function loadGoogleAnalytics() {
    const gaId = getServiceKey('gaId');
    if (!gaId || !gaId.startsWith('G-')) return;

    // Prevent duplicate injection
    if (document.getElementById('ecoloop-ga-script')) return;

    const script = document.createElement('script');
    script.id = 'ecoloop-ga-script';
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`;
    document.head.appendChild(script);

    // Configure Google Analytics globals directly in JS module to satisfy CSP rules
    window.dataLayer = window.dataLayer || [];
    window.gtag = function() {
        window.dataLayer.push(arguments);
    };
    window.gtag('js', new Date());
    window.gtag('config', gaId);
}

/**
 * Dynamically loads and initializes Firebase SDK compat layers for real-world cloud syncing.
 */
export function loadFirebaseSDK() {
    const apiKey = getServiceKey('firebaseApiKey');
    const projectId = getServiceKey('firebaseProjectId');
    const dbUrl = getServiceKey('firebaseDatabaseUrl');

    if (!apiKey || !projectId || !dbUrl) return;

    // Avoid duplicate initialization
    if (document.getElementById('ecoloop-firebase-app')) return;

    const scriptApp = document.createElement('script');
    scriptApp.id = 'ecoloop-firebase-app';
    scriptApp.src = 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js';
    scriptApp.async = true;

    scriptApp.onload = () => {
        const scriptDb = document.createElement('script');
        scriptDb.id = 'ecoloop-firebase-db';
        scriptDb.src = 'https://www.gstatic.com/firebasejs/9.22.0/firebase-database-compat.js';
        scriptDb.async = true;

        scriptDb.onload = () => {
            try {
                if (window.firebase) {
                    window.firebase.initializeApp({
                        apiKey: apiKey,
                        projectId: projectId,
                        databaseURL: dbUrl
                    });
                    console.log("Firebase App & Database Compat SDK loaded successfully.");
                    window.dispatchEvent(new CustomEvent('ecoloop-firebase-ready'));
                }
            } catch (err) {
                console.warn("Firebase App initialization failed:", err.message);
            }
        };
        document.head.appendChild(scriptDb);
    };
    document.head.appendChild(scriptApp);
}

/**
 * Saves a player high score to the global Firebase leaderboard database.
 */
export function saveScoreToFirebase(name, score) {
    if (!window.firebase) return;
    try {
        const db = window.firebase.database();
        db.ref('leaderboard/' + encodeURIComponent(name)).set({
            name: name,
            score: score,
            timestamp: Date.now()
        });
        console.log(`Synced score of ${score} for ${name} to Firebase.`);
    } catch (err) {
        console.warn("Firebase Database write failed:", err.message);
    }
}

/**
 * Subscribes to real-time updates of the top 5 high scores from the Firebase database.
 */
export function watchFirebaseLeaderboard(callback) {
    if (!window.firebase) return;
    try {
        const db = window.firebase.database();
        const leadRef = db.ref('leaderboard').orderByChild('score').limitToLast(5);
        leadRef.on('value', (snapshot) => {
            const val = snapshot.val();
            const list = [];
            if (val) {
                Object.keys(val).forEach(key => {
                    list.push(val[key]);
                });
            }
            list.sort((a, b) => b.score - a.score);
            callback(list);
        });
    } catch (err) {
        console.warn("Firebase Database subscribe failed:", err.message);
    }
}

/**
 * Calls the Gemini API to generate personalized eco-coaching advice.
 * @param {string} prompt The user-specific prompt
 * @returns {Promise<string>} AI-generated advice text
 */
export async function callGeminiAPI(prompt) {
    const apiKey = getServiceKey('geminiKey');
    if (!apiKey) return null;

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: prompt }]
                    }],
                    generationConfig: {
                        maxOutputTokens: 200,
                        temperature: 0.7
                    }
                })
            }
        );

        if (!response.ok) throw new Error(`Gemini API error: ${response.status}`);

        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        return text || null;
    } catch (err) {
        console.warn('Gemini API call failed:', err.message);
        return null;
    }
}

/**
 * Initializes the Settings Configuration Panel UI.
 */
export function initSettingsPanel() {
    const openBtn = document.getElementById('btn-open-settings');
    const modal = document.getElementById('settings-modal');
    const closeBtn = document.getElementById('btn-close-settings');
    const saveBtn = document.getElementById('btn-save-settings');

    if (!openBtn || !modal) return;

    // Populate current values
    const geminiInput = document.getElementById('input-gemini-key');
    const mapsInput = document.getElementById('input-maps-key');
    const gaInput = document.getElementById('input-ga-id');
    const firebaseKeyInput = document.getElementById('input-firebase-key');
    const firebaseProjInput = document.getElementById('input-firebase-project');
    const firebaseDbInput = document.getElementById('input-firebase-db');

    openBtn.addEventListener('click', () => {
        if (geminiInput) geminiInput.value = getServiceKey('geminiKey');
        if (mapsInput) mapsInput.value = getServiceKey('mapsKey');
        if (gaInput) gaInput.value = getServiceKey('gaId');
        if (firebaseKeyInput) firebaseKeyInput.value = getServiceKey('firebaseApiKey');
        if (firebaseProjInput) firebaseProjInput.value = getServiceKey('firebaseProjectId');
        if (firebaseDbInput) firebaseDbInput.value = getServiceKey('firebaseDatabaseUrl');
        modal.classList.add('active');
    });

    const closeModal = () => modal.classList.remove('active');
    if (closeBtn) closeBtn.addEventListener('click', closeModal);

    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            if (geminiInput) setServiceKey('geminiKey', geminiInput.value);
            if (mapsInput) setServiceKey('mapsKey', mapsInput.value);
            if (gaInput) setServiceKey('gaId', gaInput.value);
            if (firebaseKeyInput) setServiceKey('firebaseApiKey', firebaseKeyInput.value);
            if (firebaseProjInput) setServiceKey('firebaseProjectId', firebaseProjInput.value);
            if (firebaseDbInput) setServiceKey('firebaseDatabaseUrl', firebaseDbInput.value);

            // Dynamically load scripts if just configured
            loadGoogleAnalytics();
            loadFirebaseSDK();

            // Dispatch event for other modules (e.g. maps or AI assistants) to reload
            window.dispatchEvent(new CustomEvent('ecoloop-settings-changed'));

            closeModal();

            const announcer = document.getElementById('sr-announcer');
            if (announcer) announcer.textContent = 'Google Services settings saved successfully.';
        });
    }
}
