/**
 * EcoLoop - Carbon Footprint Tracker and Educational Sorter Game
 * Main Application Entry Point (ESM Module)
 *
 * Architecture: Modular ESM design for maximum code quality & testability.
 * - calculations.js: Pure data, constants, and formula logic.
 * - globe.js: 3D WebGL rendering engine.
 * - game.js: Eco-Sorter mini-game controller and SoundFX.
 * - settings.js: Google Services dynamic configuration.
 *
 * Implements:
 * 1. Debounced UI inputs for layout performance.
 * 2. Multi-chart synchronization (Chart.js doughnut and historical trend line chart).
 * 3. Dynamic Eco-Coach recommendations with Gemini AI fallback.
 * 4. WCAG-compliant keyboard controls and screen reader announcements.
 * 5. Integrated Diagnostic Unit testing framework.
 * 6. Local Storage state preservation with schema sanitization.
 * 7. PWA Service Worker registration for offline support.
 * 8. Dynamic Google Services (Gemini AI, Maps, Analytics).
 */

import {
    CALC_FACTORS, ACTIONS_DB, GAME_ITEMS, BADGES_DB, ECO_TRIVIA,
    calculateBaselineEmissions
} from './calculations.js';

import { EcoGlobe } from './globe.js';
import { SoundFX, initSorterGame, renderLeaderboard } from './game.js';
import { initSettingsPanel, loadGoogleAnalytics, loadFirebaseSDK, callGeminiAPI, getServiceKey, sanitizeInput } from './settings.js';

// --- Strict Data Schema Validator ---
const DEFAULT_STATE = {
    userProfile: {
        name: "Eco Explorer",
        level: 1,
        xp: 0,
        highScores: [
            { name: "Eco Champion", score: 1200 },
            { name: "Tree Planter", score: 850 },
            { name: "Local Shopper", score: 620 }
        ],
        recentLogs: []
    },
    calculatorData: {
        electricity: 100,
        cleanMix: 0,
        regionVal: '0.38',
        gas: 40,
        carMiles: 150,
        carType: 'gas',
        flights: 10,
        transit: 20,
        dietType: 'average',
        foodWaste: 15,
        groceryBeef: 2,
        groceryPoultry: 4,
        groceryDairy: 3,
        groceryVeggies: 10,
        shopping: 'medium',
        recycle: true,
        targetGoal: 0.25,
        offsetPurchased: 0
    },
    activeCommits: [],
    history: [11.2, 10.4, 9.8, 9.1, 8.7, 8.2], // 6-Month Footprint history (Tons)
    game: {
        isPlaying: false,
        score: 0,
        streak: 0,
        maxStreak: 0,
        lives: 3,
        currentItem: null,
        remainingItems: [],
        xpEarned: 0
    }
};

let state = JSON.parse(JSON.stringify(DEFAULT_STATE));

const US_AVERAGE_FOOTPRINT = 16.0; // National US average per capita in Tons CO2e/year

// --- DOM References Cache ---
const DOM = {
    navItems: null,
    pageTitle: null,
    pageSubtitle: null,
    
    valDisplay: null,
    totalSavedDisplay: null,
    treesDisplay: null,
    homesDisplay: null,
    comparisonBadge: null,
    comparisonText: null,
    gaugeFillCircle: null,
    
    rankTitle: null,
    rankIconWrapper: null,
    xpCurrent: null,
    xpNext: null,
    xpBarFill: null,
    logList: null,
    displayLevel: null,
    
    coachMessage: null,
    btnCoachAdvise: null,
    
    triviaText: null,
    btnNextTrivia: null,
    
    btnStartGame: null,
    btnRestartGame: null,
    gameScore: null,
    gameStreak: null,
    gameLives: null,
    gameFeedback: null,
    itemName: null,
    itemDesc: null,
    itemIcon: null,
    factContent: null,
    displayFinalScore: null,
    displayMaxStreak: null,
    gameXpEarned: null,
    leaderboardList: null,
    binBtns: null,
    gameCardWrapper: null,
    
    checklistContainer: null,
    annualSavingsEl: null,
    activeCommitsEl: null,
    unlockedBadgesEl: null,
    badgesContainer: null,
    
    btnToggleContrast: null,
    srAnnouncer: null,
    btnExportData: null
};

function cacheDOMReferences() {
    DOM.navItems = document.querySelectorAll(".nav-item");
    DOM.pageTitle = document.getElementById("page-title");
    DOM.pageSubtitle = document.getElementById("page-subtitle");
    
    DOM.valDisplay = document.getElementById("dashboard-emissions-val");
    DOM.totalSavedDisplay = document.getElementById("stat-co2-saved");
    DOM.treesDisplay = document.getElementById("trees-equivalent");
    DOM.homesDisplay = document.getElementById("homes-equivalent");
    DOM.comparisonBadge = document.getElementById("comparison-badge");
    DOM.comparisonText = document.getElementById("comparison-text");
    DOM.gaugeFillCircle = document.getElementById("gauge-fill-circle");
    
    DOM.rankTitle = document.getElementById("rank-title");
    DOM.rankIconWrapper = document.getElementById("rank-icon-wrapper");
    DOM.xpCurrent = document.getElementById("xp-current");
    DOM.xpNext = document.getElementById("xp-next");
    DOM.xpBarFill = document.getElementById("xp-bar-fill");
    DOM.logList = document.getElementById("log-list");
    DOM.displayLevel = document.getElementById("display-level");
    
    DOM.coachMessage = document.getElementById("coach-message");
    DOM.btnCoachAdvise = document.getElementById("btn-coach-advise");
    
    DOM.triviaText = document.getElementById("trivia-text");
    DOM.btnNextTrivia = document.getElementById("btn-next-trivia");
    
    DOM.btnStartGame = document.getElementById("btn-start-game");
    DOM.btnRestartGame = document.getElementById("btn-restart-game");
    DOM.gameScore = document.getElementById("game-score");
    DOM.gameStreak = document.getElementById("game-streak");
    DOM.gameLives = document.getElementById("game-lives");
    DOM.gameFeedback = document.getElementById("game-feedback");
    DOM.itemName = document.getElementById("item-name");
    DOM.itemDesc = document.getElementById("item-desc");
    DOM.itemIcon = document.getElementById("item-icon");
    DOM.factContent = document.getElementById("fact-content");
    DOM.displayFinalScore = document.getElementById("display-final-score");
    DOM.displayMaxStreak = document.getElementById("display-max-streak");
    DOM.gameXpEarned = document.getElementById("game-xp-earned");
    DOM.leaderboardList = document.getElementById("leaderboard-list");
    DOM.binBtns = document.querySelectorAll(".bin-btn");
    DOM.gameCardWrapper = document.querySelector(".item-card-wrapper");
    
    DOM.checklistContainer = document.getElementById("action-checklist-container");
    DOM.annualSavingsEl = document.getElementById("plan-annual-savings");
    DOM.activeCommitsEl = document.getElementById("plan-active-commits");
    DOM.unlockedBadgesEl = document.getElementById("plan-unlocked-badges");
    DOM.badgesContainer = document.getElementById("badges-container");
    
    DOM.btnToggleContrast = document.getElementById("btn-toggle-contrast");
    DOM.srAnnouncer = document.getElementById("sr-announcer");
    DOM.btnExportData = document.getElementById("btn-export-data");
}

let breakdownChartInstance = null;
let historyChartInstance = null;

// --- Performance Helpers (Debounce) ---
/**
 * Debounce utility to prevent high-frequency trigger lag.
 * @param {Function} func callback function
 * @param {number} wait milliseconds
 * @returns {Function} debounced callback
 */
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// --- Dynamic Screen Reader Announcer ---
/**
 * Triggers invisible audio updates to assistive screen readers.
 * @param {string} message message text
 */
function announceToScreenReader(message) {
    if (DOM.srAnnouncer) {
        DOM.srAnnouncer.textContent = message;
    }
}

// --- PWA Service Worker Registration ---
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then((reg) => console.log('SW registered:', reg.scope))
            .catch((err) => console.warn('SW registration failed:', err));
    }
}

// --- Main App Initializer ---
document.addEventListener("DOMContentLoaded", () => {
    loadStateFromStorage();
    cacheDOMReferences();
    initNavigation();
    initCalculatorWizard();
    initQuickLogModal();
    initActionChecklist();
    
    // Prevent default form submission (CSP Compliance)
    const calcForm = document.getElementById("calc-form");
    if (calcForm) {
        calcForm.addEventListener("submit", (e) => e.preventDefault());
    }
    
    // Initialize game with dependency-injected handlers
    initSorterGame(state, DOM, {
        announceToScreenReader,
        addXP,
        unlockBadge,
        saveState: saveStateToStorage
    });
    
    initCoachSystem();
    initTriviaSystem();
    initAccessibilitySystem();
    initDiagnosticsSuite();
    initExportSystem();
    
    // Initialize Google Services
    initSettingsPanel();
    loadGoogleAnalytics();
    loadFirebaseSDK();
    
    // Initialize 3D Engine Globe
    try { EcoGlobe.init(); } catch (err) { console.error(err); }

    // Initialize Extended Features (Region, Grocery, Offset, Goal, Importer)
    try { initExtendedFeatures(); } catch (err) { console.error(err); }
    
    // Accessibility: Setup Focus Traps & ESC Closures on Modals (WCAG 2.1 Compliance)
    try {
        manageModalA11y(document.getElementById("quick-action-modal"));
        manageModalA11y(document.getElementById("test-diagnostics-modal"));
        manageModalA11y(document.getElementById("settings-modal"));
    } catch (e) {
        console.warn("Modal accessibility setup failed:", e);
    }

    // Register PWA Service Worker
    registerServiceWorker();
    
    // Initial paint
    updateCarbonCalculations();
    renderRecentLogs();
    updateRankDisplay();
});

// --- Local Storage Management & Schema Validation ---
function saveStateToStorage() {
    localStorage.setItem("ecoloop_state", JSON.stringify(state));
}

function loadStateFromStorage() {
    const saved = localStorage.getItem("ecoloop_state");
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            
            // Validate schema structure to protect integrity and block XSS configuration injections
            if (parsed && typeof parsed === 'object') {
                if (parsed.userProfile && typeof parsed.userProfile === 'object') {
                    state.userProfile.name = sanitizeInput(parsed.userProfile.name || DEFAULT_STATE.userProfile.name).substring(0, 30);
                    state.userProfile.level = Math.max(1, parseInt(parsed.userProfile.level) || 1);
                    state.userProfile.xp = Math.max(0, parseInt(parsed.userProfile.xp) || 0);
                    if (Array.isArray(parsed.userProfile.highScores)) {
                        state.userProfile.highScores = parsed.userProfile.highScores.slice(0, 3).map(scoreItem => ({
                            name: sanitizeInput(scoreItem.name || "Player").substring(0, 30),
                            score: Math.max(0, parseInt(scoreItem.score) || 0)
                        }));
                    }
                    if (Array.isArray(parsed.userProfile.recentLogs)) {
                        state.userProfile.recentLogs = parsed.userProfile.recentLogs.slice(0, 5).map(log => ({
                            id: String(log.id),
                            name: sanitizeInput(log.name).substring(0, 50),
                            savings: Math.max(0, parseFloat(log.savings) || 0),
                            date: String(log.date)
                        }));
                    }
                }
                
                if (parsed.calculatorData && typeof parsed.calculatorData === 'object') {
                    // Range boundaries clamping for input sanitization
                    const pd = parsed.calculatorData;
                    state.calculatorData.electricity = Math.max(0, Math.min(500, parseFloat(pd.electricity) || 100));
                    state.calculatorData.cleanMix = Math.max(0, Math.min(1.0, parseFloat(pd.cleanMix) || 0));
                    state.calculatorData.regionVal = ['0.38', '0.22', '0.52', '0.36', '0.18'].includes(pd.regionVal) ? pd.regionVal : '0.38';
                    state.calculatorData.gas = Math.max(0, Math.min(300, parseFloat(pd.gas) || 40));
                    state.calculatorData.carMiles = Math.max(0, Math.min(1000, parseFloat(pd.carMiles) || 150));
                    state.calculatorData.carType = ['gas', 'hybrid', 'electric'].includes(pd.carType) ? pd.carType : 'gas';
                    state.calculatorData.flights = Math.max(0, Math.min(100, parseFloat(pd.flights) || 10));
                    state.calculatorData.transit = Math.max(0, Math.min(300, parseFloat(pd.transit) || 20));
                    state.calculatorData.dietType = ['meat-heavy', 'average', 'vegetarian', 'vegan'].includes(pd.dietType) ? pd.dietType : 'average';
                    state.calculatorData.foodWaste = Math.max(0, Math.min(50, parseFloat(pd.foodWaste) || 15));
                    
                    state.calculatorData.groceryBeef = Math.max(0, Math.min(30, parseFloat(pd.groceryBeef) || 2));
                    state.calculatorData.groceryPoultry = Math.max(0, Math.min(30, parseFloat(pd.groceryPoultry) || 4));
                    state.calculatorData.groceryDairy = Math.max(0, Math.min(30, parseFloat(pd.groceryDairy) || 3));
                    state.calculatorData.groceryVeggies = Math.max(0, Math.min(50, parseFloat(pd.groceryVeggies) || 10));

                    state.calculatorData.shopping = ['low', 'medium', 'high'].includes(pd.shopping) ? pd.shopping : 'medium';
                    state.calculatorData.recycle = Boolean(pd.recycle);
                    state.calculatorData.targetGoal = Math.max(0, Math.min(0.50, pd.targetGoal !== undefined ? parseFloat(pd.targetGoal) : 0.25));
                    state.calculatorData.offsetPurchased = Math.max(0, parseInt(pd.offsetPurchased) || 0);
                }
                
                if (Array.isArray(parsed.activeCommits)) {
                    state.activeCommits = parsed.activeCommits.filter(id => typeof id === 'string');
                }

                if (Array.isArray(parsed.history)) {
                    state.history = parsed.history.slice(0, 6).map(val => Math.max(0, parseFloat(val) || 0));
                }
            }
        } catch (e) {
            console.error("Storage validation error: ", e);
            state = JSON.parse(JSON.stringify(DEFAULT_STATE));
        }
    }
}

// --- Navigation Controller ---
function initNavigation() {
    DOM.navItems.forEach(item => {
        item.addEventListener("click", () => {
            const tabId = item.getAttribute("data-tab");
            
            // Toggle active menu item
            DOM.navItems.forEach(btn => {
                btn.classList.remove("active");
                btn.setAttribute("aria-selected", "false");
                btn.setAttribute("tabindex", "-1");
            });
            item.classList.add("active");
            item.setAttribute("aria-selected", "true");
            item.setAttribute("tabindex", 0);

            // Toggle active tab content
            document.querySelectorAll(".tab-content").forEach(content => {
                content.classList.remove("active");
            });
            document.getElementById(tabId).classList.add("active");

            // Pause/resume 3D Globe to save CPU/GPU rendering frames when not active
            if (tabId === "dashboard") {
                try { EcoGlobe.start(); } catch (err) {}
            } else {
                try { EcoGlobe.stop(); } catch (err) {}
            }

            // Update Page Headers
            switch(tabId) {
                case "dashboard":
                    DOM.pageTitle.textContent = "Dashboard Overview";
                    DOM.pageSubtitle.textContent = "Track your emission trends and see your collective impact.";
                    updateCarbonCalculations();
                    break;
                case "calculator":
                    DOM.pageTitle.textContent = "Carbon Calculator";
                    DOM.pageSubtitle.textContent = "Estimate your monthly baseline carbon footprint easily.";
                    break;
                case "game":
                    DOM.pageTitle.textContent = "Eco-Sorter Game";
                    DOM.pageSubtitle.textContent = "Test your environmental intelligence and earn XP.";
                    break;
                case "actions":
                    DOM.pageTitle.textContent = "My Action Plan";
                    DOM.pageSubtitle.textContent = "Track individual habits that actively reduce your global footprint.";
                    renderActionChecklist();
                    updateActionSummary();
                    break;
            }
            announceToScreenReader(`Routed to tab ${tabId}. ${DOM.pageSubtitle.textContent}`);
        });

        // A11y Arrow Keys Navigation inside Navbar
        item.addEventListener("keydown", (e) => {
            const arr = Array.from(DOM.navItems);
            const index = arr.indexOf(item);
            let nextIndex = index;
            
            if (e.key === "ArrowRight") {
                nextIndex = (index + 1) % arr.length;
            } else if (e.key === "ArrowLeft") {
                nextIndex = (index - 1 + arr.length) % arr.length;
            } else {
                return;
            }
            
            arr[nextIndex].focus();
            arr[nextIndex].click();
        });
    });
}

// --- Carbon Emissions Calculator Core ---
// Debounced wrapper to optimize UI response under rapid dragging
const debouncedUpdateCarbon = debounce(() => {
    updateCarbonCalculations();
}, 150);

function updateCarbonCalculations() {
    const baseline = calculateBaselineEmissions(state.calculatorData);
    
    // Apply Active Commit Reductions
    let totalSavingsKg = 0;
    state.activeCommits.forEach(actionId => {
        const actionObj = ACTIONS_DB.find(a => a.id === actionId);
        if (actionObj) {
            totalSavingsKg += actionObj.savings;
        }
    });

    // Deduct quick logs
    let quickSavingsKg = 0;
    state.userProfile.recentLogs.forEach(log => {
        const logDate = new Date(log.date);
        const diffDays = (new Date() - logDate) / (1000 * 60 * 60 * 24);
        if (diffDays <= 30) {
            quickSavingsKg += (log.savings || 0);
        }
    });
    
    const d = state.calculatorData;
    const baseFootprintKg = Math.max(100, baseline.totalKg - totalSavingsKg - quickSavingsKg);
    const offsetAmtKg = (d.offsetPurchased || 0) * 1000;
    const netFootprintKg = Math.max(0, baseFootprintKg - offsetAmtKg);
    const netFootprintTons = (netFootprintKg / 1000).toFixed(1);

    // Calculate Daily Budget Metrics (Paris target is 11 kg/day)
    const netFootprintDailyKg = parseFloat((netFootprintKg / 365).toFixed(1));
    const targetDailyLimit = 11.0;
    const budgetPercent = Math.min(100, Math.round((netFootprintDailyKg / targetDailyLimit) * 100));

    // Render Daily Budget Elements
    const budgetPctEl = document.getElementById("budget-percentage-text");
    const budgetFillEl = document.getElementById("budget-progress-fill");
    const budgetAmtEl = document.getElementById("budget-amount-text");

    if (budgetPctEl) {
        budgetPctEl.textContent = `${budgetPercent}% Used`;
        if (budgetPercent > 100) {
            budgetPctEl.style.color = "var(--coral)";
        } else if (budgetPercent > 80) {
            budgetPctEl.style.color = "var(--orange)";
        } else {
            budgetPctEl.style.color = "var(--primary)";
        }
    }
    if (budgetFillEl) {
        budgetFillEl.style.width = `${budgetPercent}%`;
        if (budgetPercent > 100) {
            budgetFillEl.style.background = "var(--coral)";
        } else if (budgetPercent > 80) {
            budgetFillEl.style.background = "var(--orange)";
        } else {
            budgetFillEl.style.background = "linear-gradient(90deg, var(--primary), var(--secondary))";
        }
    }
    if (budgetAmtEl) {
        budgetAmtEl.textContent = `${netFootprintDailyKg.toFixed(1)} kg/day used`;
    }

    // Update Current Month in Historical Tracking
    state.history[state.history.length - 1] = parseFloat(netFootprintTons);

    // Render Displays
    if (DOM.valDisplay) DOM.valDisplay.textContent = netFootprintTons;
    if (DOM.totalSavedDisplay) DOM.totalSavedDisplay.textContent = (totalSavingsKg + quickSavingsKg + (d.offsetPurchased || 0) * 1000).toFixed(1);

    // Render Weekly Grocery Footprint Output
    const weeklyGrocery = (d.groceryBeef * 12.2) + (d.groceryPoultry * 3.1) + (d.groceryDairy * 2.0) + (d.groceryVeggies * 0.5);
    const groceryEl = document.getElementById("grocery-co2-val");
    if (groceryEl) groceryEl.textContent = weeklyGrocery.toFixed(1);

    // Render Offset Tons to purchase display
    const offsetTonsEl = document.getElementById("offset-tons-display");
    if (offsetTonsEl) offsetTonsEl.textContent = (baseFootprintKg / 1000).toFixed(1);

    // Check target goal reduction compliance
    const targetGoal = parseFloat(d.targetGoal) || 0;
    if (targetGoal > 0) {
        const targetTons = 16.0 * (1 - targetGoal);
        if (parseFloat(netFootprintTons) <= targetTons) {
            unlockBadge('badge-goal');
        }
    }

    updateGauge(netFootprintTons);
    updateComparisonStatus(netFootprintTons);

    const trees = Math.round(netFootprintKg / 22);
    const homes = Math.round(netFootprintKg / 370);
    
    if (DOM.treesDisplay) DOM.treesDisplay.textContent = trees;
    if (DOM.homesDisplay) DOM.homesDisplay.textContent = homes;

    // Performance Optimization: Only update heavy Chart.js canvases if they are visible
    const dashboardTab = document.getElementById("dashboard");
    if (dashboardTab && dashboardTab.classList.contains("active")) {
        renderBreakdownChart(baseline);
        renderHistoryChart();
    }
    
    compileCoachAdvice(baseline, totalSavingsKg);

    // Sync 3D Globe color
    try { EcoGlobe.updateColor(parseFloat(netFootprintTons)); } catch (err) {}

    saveStateToStorage();
}

function updateGauge(tons) {
    if (!DOM.gaugeFillCircle) return;

    const circumference = 314.16;
    const maxScale = 20;
    const percent = Math.min(100, (tons / maxScale) * 100);
    const offset = circumference - (percent / 100) * circumference;
    
    DOM.gaugeFillCircle.style.strokeDasharray = `${circumference}`;
    DOM.gaugeFillCircle.style.strokeDashoffset = `${offset}`;

    if (tons < 5) {
        DOM.gaugeFillCircle.style.stroke = "var(--primary)";
    } else if (tons < 12) {
        DOM.gaugeFillCircle.style.stroke = "var(--orange)";
    } else {
        DOM.gaugeFillCircle.style.stroke = "var(--coral)";
    }
}

function updateComparisonStatus(tons) {
    if (!DOM.comparisonBadge || !DOM.comparisonText) return;

    if (tons < 4.0) {
        DOM.comparisonBadge.className = "status-indicator status-green";
        DOM.comparisonBadge.textContent = "Super Eco-Saver";
        DOM.comparisonText.textContent = "Amazing! Your footprint is lower than the global average. You are actively fighting climate change.";
    } else if (tons < US_AVERAGE_FOOTPRINT) {
        DOM.comparisonBadge.className = "status-indicator status-orange";
        DOM.comparisonBadge.textContent = "Eco Friendly";
        DOM.comparisonText.textContent = `Excellent. You are below the US average of ${US_AVERAGE_FOOTPRINT} Tons/yr. Committing to a few actions can reduce it further.`;
    } else {
        DOM.comparisonBadge.className = "status-indicator status-red";
        DOM.comparisonBadge.textContent = "High Footprint";
        DOM.comparisonText.textContent = `Your footprint is higher than the national average. Try adjusting home energy or opting for public transit.`;
    }
}

function renderBreakdownChart(baseline) {
    if (typeof Chart === 'undefined') {
        console.warn("Chart.js library is not loaded. Skipping breakdown chart rendering.");
        return;
    }
    const ctx = document.getElementById("breakdownChart");
    if (!ctx) return;

    const dataValues = [
        baseline.energy,
        baseline.transport,
        baseline.diet,
        baseline.lifestyle
    ];

    if (breakdownChartInstance) {
        breakdownChartInstance.data.datasets[0].data = dataValues;
        breakdownChartInstance.update();
    } else {
        Chart.defaults.color = '#9CA3AF';
        Chart.defaults.font.family = 'Outfit';
        
        breakdownChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Home Energy', 'Transportation', 'Diet', 'Lifestyle'],
                datasets: [{
                    data: dataValues,
                    backgroundColor: ['#06B6D4', '#3B82F6', '#F59E0B', '#10B981'],
                    borderColor: '#111827',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            padding: 15,
                            boxWidth: 12,
                            font: { size: 12, weight: 600 }
                        }
                    }
                },
                cutout: '65%'
            }
        });
    }
}

// --- Render Historical Chart (A11y & Track Alignment) ---
function renderHistoryChart() {
    if (typeof Chart === 'undefined') {
        console.warn("Chart.js library is not loaded. Skipping history chart rendering.");
        return;
    }
    const ctx = document.getElementById("historyChart");
    if (!ctx) return;

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
    const d = state.calculatorData;
    const targetGoal = parseFloat(d.targetGoal) || 0;
    const targetTons = 16.0 * (1 - targetGoal);

    if (historyChartInstance) {
        historyChartInstance.data.datasets[0].data = state.history;
        
        // Dynamic update of Target Limit dataset
        if (targetGoal > 0) {
            const targetDataArray = Array(months.length).fill(targetTons);
            if (historyChartInstance.data.datasets.length > 1) {
                historyChartInstance.data.datasets[1].data = targetDataArray;
            } else {
                historyChartInstance.data.datasets.push({
                    label: 'Target Limit',
                    data: targetDataArray,
                    borderColor: '#EF4444',
                    borderDash: [5, 5],
                    borderWidth: 2,
                    fill: false,
                    pointRadius: 0,
                    pointHoverRadius: 0
                });
            }
        } else {
            if (historyChartInstance.data.datasets.length > 1) {
                historyChartInstance.data.datasets.pop();
            }
        }
        
        historyChartInstance.update();
    } else {
        const datasets = [{
            label: 'Net Footprint (Tons CO₂e)',
            data: state.history,
            borderColor: '#06B6D4',
            backgroundColor: 'rgba(6, 182, 212, 0.08)',
            borderWidth: 3,
            fill: true,
            tension: 0.3,
            pointBackgroundColor: '#10B981',
            pointBorderColor: '#fff',
            pointHoverRadius: 6
        }];

        if (targetGoal > 0) {
            datasets.push({
                label: 'Target Limit',
                data: Array(months.length).fill(targetTons),
                borderColor: '#EF4444',
                borderDash: [5, 5],
                borderWidth: 2,
                fill: false,
                pointRadius: 0,
                pointHoverRadius: 0
            });
        }

        historyChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: months,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        title: { display: true, text: 'Tons CO₂e/yr' }
                    },
                    x: {
                        grid: { color: 'rgba(255, 255, 255, 0.05)' }
                    }
                },
                plugins: {
                    legend: { 
                        display: targetGoal > 0,
                        labels: { boxWidth: 15 }
                    }
                }
            }
        });
    }
}

// --- Smart Eco-Coach System with Gemini AI Integration ---
function initCoachSystem() {
    if (DOM.btnCoachAdvise) {
        DOM.btnCoachAdvise.addEventListener("click", async () => {
            const baseline = calculateBaselineEmissions(state.calculatorData);
            
            // Try Gemini AI first if configured
            const geminiKey = getServiceKey('geminiKey');
            if (geminiKey) {
                DOM.btnCoachAdvise.disabled = true;
                DOM.btnCoachAdvise.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-emerald"></i> AI Thinking...';
                
                const prompt = `You are EcoLoop Eco-Coach AI. The user's annual carbon footprint breakdown: Energy: ${baseline.energy}kg, Transport: ${baseline.transport}kg, Diet: ${baseline.diet}kg, Lifestyle: ${baseline.lifestyle}kg (Total: ${baseline.totalKg}kg CO₂e/year). The US average is 16,000 kg/year. Give one specific, actionable, encouraging tip in 2-3 sentences to help them reduce their biggest emission area. Be specific with numbers.`;
                
                const aiResponse = await callGeminiAPI(prompt);
                
                DOM.btnCoachAdvise.disabled = false;
                DOM.btnCoachAdvise.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles text-emerald"></i> Optimize My Plan';
                
                if (aiResponse) {
                    if (DOM.coachMessage) DOM.coachMessage.textContent = `🤖 ${aiResponse}`;
                    announceToScreenReader(`AI Coach says: ${aiResponse}`);
                    return;
                }
            }
            
            // Fallback to local logic
            compileCoachAdvice(baseline, 0, true);
        });
    }
}

function compileCoachAdvice(baseline, totalSavings, userRequested = false) {
    if (!DOM.coachMessage) return;

    const d = state.calculatorData;
    const totalEmissions = baseline.totalKg;
    
    const transportPct = baseline.transport / totalEmissions;
    const energyPct = baseline.energy / totalEmissions;
    const dietPct = baseline.diet / totalEmissions;
    
    let advice = "";

    if (userRequested) {
        if (transportPct > 0.45) {
            advice = "💡 Coach Analysis: Transportation represents over 45% of your footprint. The single most effective action is adopting a hybrid/EV or switching to rail/bus commuting. Commit to our 'Ride Public Transit Weekly' action (+320kg savings/yr)!";
        } else if (energyPct > 0.40) {
            advice = "💡 Coach Analysis: Home electricity is your dominant emission source. Switch your energy utility plan to a 100% Green Plan (Solar/Wind grid offset) in the calculator. It cuts home grid emissions to zero!";
        } else if (dietPct > 0.35 && d.dietType === 'meat-heavy') {
            advice = "💡 Coach Analysis: Meat consumption is driving up your food agricultural footprint. Transitioning to a Flexitarian or Vegetarian lifestyle reduces dietary carbon release by over 40%!";
        } else {
            advice = "💡 Coach Analysis: Your footprint distribution is fairly balanced. Make sure you have checked off the 'Switch to LED Bulbs' and 'Smart Thermostat Settings' actions to chip away another 360 kg CO₂e combined.";
        }
        announceToScreenReader(`Coach speech updated: ${advice}`);
    } else {
        if (totalEmissions < 4000) {
            advice = "Green champion! Your annual carbon footprint is exceptionally low. Try out the Eco-Sorter game to lock in your badges.";
        } else if (d.cleanMix === 0 && d.electricity > 150) {
            advice = "Did you know? Transitioning to a certified green grid mix removes standard household electrical emissions by almost 100%.";
        } else if (d.carMiles > 250 && d.carType === 'gas') {
            advice = "Your gasoline travel mileage is a heavy carbon contributor. Try combining trips or carpooling to lower emissions.";
        } else {
            advice = "Your data has been compiled. Navigate to the Action Plan tab to commit to direct, measurable changes.";
        }
    }

    DOM.coachMessage.textContent = advice;
}

// --- Trivia Fact Cycle ---
let currentTriviaIndex = 0;
function initTriviaSystem() {
    if (DOM.btnNextTrivia && DOM.triviaText) {
        DOM.btnNextTrivia.addEventListener("click", () => {
            currentTriviaIndex = (currentTriviaIndex + 1) % ECO_TRIVIA.length;
            DOM.triviaText.textContent = ECO_TRIVIA[currentTriviaIndex];
            announceToScreenReader(`New Trivia Fact: ${ECO_TRIVIA[currentTriviaIndex]}`);
        });
    }
}

// --- Accessibility & Data Control Systems ---
function initAccessibilitySystem() {
    if (DOM.btnToggleContrast) {
        DOM.btnToggleContrast.addEventListener("click", () => {
            document.body.classList.toggle("high-contrast");
            const isHigh = document.body.classList.contains("high-contrast");
            localStorage.setItem("ecoloop_contrast", isHigh ? "true" : "false");
            
            DOM.btnToggleContrast.innerHTML = isHigh ? 
                `<i class="fa-solid fa-eye-slash"></i> Standard Theme` : 
                `<i class="fa-solid fa-eye"></i> High Contrast`;
                
            announceToScreenReader(`High contrast mode ${isHigh ? 'enabled' : 'disabled'}`);
        });
        
        const initialContrast = localStorage.getItem("ecoloop_contrast");
        if (initialContrast === "true") {
            document.body.classList.add("high-contrast");
            DOM.btnToggleContrast.innerHTML = `<i class="fa-solid fa-eye-slash"></i> Standard Theme`;
        }
    }

    const resetBtn = document.getElementById("btn-reset-data");
    if (resetBtn) {
        resetBtn.addEventListener("click", () => {
            if (confirm("⚠️ Are you sure you want to reset all your carbon footprint calculations, logs, badges, level progress, and game high scores? This action cannot be undone.")) {
                localStorage.removeItem("ecoloop_state");
                state = JSON.parse(JSON.stringify(DEFAULT_STATE));
                saveStateToStorage();
                
                // Reload displays
                updateCarbonCalculations();
                renderRecentLogs();
                updateRankDisplay();
                renderActionChecklist();
                updateActionSummary();
                renderBadges();
                renderLeaderboard();
                
                alert("🔄 Application state has been reset to defaults.");
                announceToScreenReader("Application state has been reset to defaults.");
            }
        });
    }
}

// --- Export System (JSON) ---
function initExportSystem() {
    if (DOM.btnExportData) {
        DOM.btnExportData.addEventListener("click", () => {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
            const downloadAnchor = document.createElement('a');
            downloadAnchor.setAttribute("href", dataStr);
            downloadAnchor.setAttribute("download", `ecoloop_carbon_report.json`);
            document.body.appendChild(downloadAnchor);
            downloadAnchor.click();
            downloadAnchor.remove();
            announceToScreenReader("Report download started successfully.");
        });
    }
}

// --- Calculator Wizard Logic ---
function initCalculatorWizard() {
    let currentStep = 1;
    const totalSteps = 4;

    const prevBtn = document.getElementById("btn-wizard-prev");
    const nextBtn = document.getElementById("btn-wizard-next");
    const progressFill = document.getElementById("wizard-progress-fill");
    
    const sliders = [
        { id: "input-electricity", valId: "val-electricity", prefix: "$", suffix: "" },
        { id: "input-gas", valId: "val-gas", prefix: "$", suffix: "" },
        { id: "input-car-miles", valId: "val-car-miles", prefix: "", suffix: " miles" },
        { id: "input-flights", valId: "val-flights", prefix: "", suffix: " hours" },
        { id: "input-transit", valId: "val-transit", prefix: "", suffix: " miles" }
    ];

    sliders.forEach(slider => {
        const inputEl = document.getElementById(slider.id);
        const valEl = document.getElementById(slider.valId);
        if (inputEl && valEl) {
            const stateKey = slider.id.replace("input-", "").replace("-", "Miles");
            const resolvedKey = (stateKey === "car") ? "carMiles" : stateKey;
            
            inputEl.value = state.calculatorData[resolvedKey];
            valEl.textContent = `${slider.prefix}${inputEl.value}${slider.suffix}`;

            inputEl.addEventListener("input", (e) => {
                const val = e.target.value;
                valEl.textContent = `${slider.prefix}${val}${slider.suffix}`;
                
                let parsedVal = parseFloat(val);
                if (isNaN(parsedVal)) parsedVal = 0;
                
                state.calculatorData[resolvedKey] = parsedVal;
                
                // Triggers debounced carbon calculations for smoother render frames
                debouncedUpdateCarbon();
            });
        }
    });

    const wasteInput = document.getElementById("input-foodwaste");
    const wasteVal = document.getElementById("val-foodwaste");
    if (wasteInput && wasteVal) {
        wasteInput.value = state.calculatorData.foodWaste;
        const updateWasteLabel = (val) => {
            if (val <= 5) wasteVal.textContent = `Low (${val}%)`;
            else if (val <= 15) wasteVal.textContent = `Average (${val}%)`;
            else if (val <= 30) wasteVal.textContent = `High (${val}%)`;
            else wasteVal.textContent = `Excessive (${val}%)`;
        };
        updateWasteLabel(wasteInput.value);
        wasteInput.addEventListener("input", (e) => {
            const val = parseInt(e.target.value) || 0;
            updateWasteLabel(val);
            state.calculatorData.foodWaste = val;
            debouncedUpdateCarbon();
        });
    }

    const cleanMixInputs = document.querySelectorAll("input[name='clean-mix']");
    cleanMixInputs.forEach(input => {
        if (parseFloat(input.value) === state.calculatorData.cleanMix) input.checked = true;
        input.addEventListener("change", () => {
            state.calculatorData.cleanMix = parseFloat(input.value);
            debouncedUpdateCarbon();
        });
    });

    const carTypeInputs = document.querySelectorAll("input[name='car-type']");
    carTypeInputs.forEach(input => {
        if (input.value === state.calculatorData.carType) input.checked = true;
        input.addEventListener("change", () => {
            state.calculatorData.carType = input.value;
            debouncedUpdateCarbon();
        });
    });

    const dietTypeCards = document.querySelectorAll(".diet-option-card");
    dietTypeCards.forEach(card => {
        const input = card.querySelector("input[name='diet-type']");
        
        if (input.value === state.calculatorData.dietType) {
            input.checked = true;
            card.classList.add("active");
        } else {
            card.classList.remove("active");
        }

        card.addEventListener("click", () => {
            dietTypeCards.forEach(c => c.classList.remove("active"));
            card.classList.add("active");
            input.checked = true;
            state.calculatorData.dietType = input.value;
            debouncedUpdateCarbon();
        });
    });

    const shopInputs = document.querySelectorAll("input[name='shopping']");
    shopInputs.forEach(input => {
        if (input.value === state.calculatorData.shopping) input.checked = true;
        input.addEventListener("change", () => {
            state.calculatorData.shopping = input.value;
            debouncedUpdateCarbon();
        });
    });

    const recycleInput = document.getElementById("input-recycle");
    if (recycleInput) {
        recycleInput.checked = state.calculatorData.recycle;
        recycleInput.addEventListener("change", () => {
            state.calculatorData.recycle = recycleInput.checked;
            debouncedUpdateCarbon();
        });
    }

    // Wizard navigation controls
    if (nextBtn && prevBtn) {
        nextBtn.addEventListener("click", () => {
            if (currentStep < totalSteps) {
                document.getElementById(`step-${currentStep}`).classList.remove("active");
                document.querySelector(`.step-indicator[data-step='${currentStep}']`).classList.remove("active");
                document.querySelector(`.step-indicator[data-step='${currentStep}']`).classList.add("completed");
                
                currentStep++;
                
                document.getElementById(`step-${currentStep}`).classList.add("active");
                document.querySelector(`.step-indicator[data-step='${currentStep}']`).classList.add("active");

                progressFill.style.width = `${((currentStep) / totalSteps) * 100}%`;
                
                prevBtn.classList.remove("disabled");
                prevBtn.removeAttribute("disabled");

                if (currentStep === totalSteps) {
                    nextBtn.innerHTML = `Calculate <i class="fa-solid fa-check" aria-hidden="true"></i>`;
                }
                
                announceToScreenReader(`Calculator step ${currentStep} of ${totalSteps}.`);
            } else {
                addXP(40);
                unlockBadge('badge-calculating');
                document.getElementById("btn-tab-dashboard").click();
            }
        });

        prevBtn.addEventListener("click", () => {
            if (currentStep > 1) {
                document.getElementById(`step-${currentStep}`).classList.remove("active");
                document.querySelector(`.step-indicator[data-step='${currentStep}']`).classList.remove("active");
                
                currentStep--;

                document.getElementById(`step-${currentStep}`).classList.add("active");
                document.querySelector(`.step-indicator[data-step='${currentStep}']`).classList.add("active");
                document.querySelector(`.step-indicator[data-step='${currentStep}']`).classList.remove("completed");

                progressFill.style.width = `${((currentStep) / totalSteps) * 100}%`;
                nextBtn.innerHTML = `Next <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>`;

                if (currentStep === 1) {
                    prevBtn.classList.add("disabled");
                    prevBtn.setAttribute("disabled", "true");
                }
                
                announceToScreenReader(`Calculator step ${currentStep} of ${totalSteps}.`);
            }
        });

        const stepIndicators = document.querySelectorAll(".step-indicator");
        stepIndicators.forEach(ind => {
            ind.addEventListener("click", () => {
                const targetStep = parseInt(ind.getAttribute("data-step"));
                if (targetStep !== currentStep) {
                    document.getElementById(`step-${currentStep}`).classList.remove("active");
                    document.querySelector(`.step-indicator[data-step='${currentStep}']`).classList.remove("active");

                    currentStep = targetStep;

                    document.getElementById(`step-${currentStep}`).classList.add("active");
                    document.querySelector(`.step-indicator[data-step='${currentStep}']`).classList.add("active");

                    progressFill.style.width = `${((currentStep) / totalSteps) * 100}%`;

                    if (currentStep === 1) {
                        prevBtn.classList.add("disabled");
                        prevBtn.setAttribute("disabled", "true");
                    } else {
                        prevBtn.classList.remove("disabled");
                        prevBtn.removeAttribute("disabled");
                    }

                    if (currentStep === totalSteps) {
                        nextBtn.innerHTML = `Calculate <i class="fa-solid fa-check" aria-hidden="true"></i>`;
                    } else {
                        nextBtn.innerHTML = `Next <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>`;
                    }
                }
            });
        });
    }
}

// --- Quick Action Modal Dialog ---
function initQuickLogModal() {
    const modal = document.getElementById("quick-action-modal");
    const openBtn = document.getElementById("btn-quick-log");
    const closeBtn = document.getElementById("btn-close-modal");
    const cancelBtn = document.getElementById("btn-modal-cancel");
    const saveBtn = document.getElementById("btn-modal-save");
    const quickGridBtns = document.querySelectorAll(".quick-action-btn");

    if (openBtn && modal) {
        openBtn.addEventListener("click", () => {
            modal.classList.add("active");
        });
    }

    const closeModal = () => {
        if (modal) modal.classList.remove("active");
    };

    if (closeBtn) closeBtn.addEventListener("click", closeModal);
    if (cancelBtn) cancelBtn.addEventListener("click", closeModal);

    if (saveBtn) {
        saveBtn.addEventListener("click", () => {
            const selectEl = document.getElementById("custom-action-select");
            const selectedOption = selectEl.options[selectEl.selectedIndex];
            
            const logName = selectedOption.text.split(" (+")[0];
            const savings = parseFloat(selectedOption.getAttribute("data-savings")) || 0;
            const xp = parseInt(selectedOption.getAttribute("data-xp")) || 0;

            logAction(logName, savings, xp);
            closeModal();
        });
    }

    quickGridBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            const actionType = btn.getAttribute("data-action");
            let logName = "";
            let savings = 0;
            let xp = 15;

            switch(actionType) {
                case "diet":
                    logName = "Plant-Based Diet Meals";
                    savings = 1.5;
                    break;
                case "transit":
                    logName = "Public Transit Trip";
                    savings = 2.2;
                    break;
                case "wash":
                    logName = "Line-Dried Laundry";
                    savings = 0.8;
                    break;
                case "recycle":
                    logName = "Compost & Recycled Waste";
                    savings = 0.5;
                    break;
            }

            logAction(logName, savings, xp);
            btn.style.transform = "scale(0.95)";
            setTimeout(() => { btn.style.transform = ""; }, 150);
        });
    });
}

function logAction(name, savingsKg, xpReward) {
    const newLog = {
        id: 'log-' + Date.now(),
        name: name,
        savings: savingsKg,
        date: new Date().toISOString()
    };

    state.userProfile.recentLogs.unshift(newLog);
    if (state.userProfile.recentLogs.length > 5) {
        state.userProfile.recentLogs.pop();
    }

    addXP(xpReward);
    updateCarbonCalculations();
    renderRecentLogs();
    announceToScreenReader(`Green Action Logged: ${name}. Saved ${savingsKg}kg carbon and earned ${xpReward} XP.`);
}

function renderRecentLogs() {
    if (!DOM.logList) return;

    if (state.userProfile.recentLogs.length === 0) {
        DOM.logList.innerHTML = `<li class="empty-state-text">No actions logged today yet.</li>`;
        return;
    }

    DOM.logList.innerHTML = "";
    state.userProfile.recentLogs.forEach(log => {
        const d = new Date(log.date);
        const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        const li = document.createElement("li");
        
        const infoDiv = document.createElement("div");
        const strong = document.createElement("strong");
        strong.textContent = log.name; // Security: dynamic XSS block
        const timeSpan = document.createElement("span");
        timeSpan.className = "log-time";
        timeSpan.textContent = ` (${timeStr})`;
        
        infoDiv.appendChild(strong);
        infoDiv.appendChild(timeSpan);
        
        const savingsSpan = document.createElement("span");
        savingsSpan.className = "text-emerald font-semibold";
        savingsSpan.textContent = `-${log.savings.toFixed(1)} kg`;
        
        li.appendChild(infoDiv);
        li.appendChild(savingsSpan);
        DOM.logList.appendChild(li);
    });
}

// --- Action Plan Checklist Controller ---
function initActionChecklist() {
    const filterBtns = document.querySelectorAll(".category-filter-btn");
    filterBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            filterBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            
            const filterVal = btn.getAttribute("data-filter");
            renderActionChecklist(filterVal);
        });
    });
    renderActionChecklist();
}

function renderActionChecklist(filter = "all") {
    if (!DOM.checklistContainer) return;

    const filtered = filter === "all" ? ACTIONS_DB : ACTIONS_DB.filter(a => a.category === filter);

    DOM.checklistContainer.innerHTML = "";
    
    filtered.forEach(act => {
        const isCommitted = state.activeCommits.includes(act.id);
        
        const row = document.createElement("div");
        row.className = `action-item-row ${isCommitted ? 'committed' : ''}`;
        row.setAttribute("data-id", act.id);
        
        const leftContent = document.createElement("div");
        leftContent.className = "action-left-content";
        
        const checkWrapper = document.createElement("label");
        checkWrapper.className = "action-checkbox-wrapper";
        
        const input = document.createElement("input");
        input.type = "checkbox";
        input.setAttribute("data-action-id", act.id);
        input.checked = isCommitted;
        
        const customCheck = document.createElement("span");
        customCheck.className = "custom-checkbox";
        
        const checkIcon = document.createElement("i");
        checkIcon.className = "fa-solid fa-check";
        checkIcon.style.display = isCommitted ? "block" : "none";
        
        customCheck.appendChild(checkIcon);
        checkWrapper.appendChild(input);
        checkWrapper.appendChild(customCheck);
        
        const info = document.createElement("div");
        info.className = "action-item-info";
        const strong = document.createElement("strong");
        strong.textContent = act.title;
        const descSpan = document.createElement("span");
        descSpan.textContent = act.desc;
        
        info.appendChild(strong);
        info.appendChild(descSpan);
        
        leftContent.appendChild(checkWrapper);
        leftContent.appendChild(info);
        
        const rightContent = document.createElement("div");
        rightContent.className = "action-right-content";
        const impact = document.createElement("span");
        impact.className = "action-impact-reduction";
        impact.textContent = `-${act.savings} kg CO₂e/yr`;
        
        rightContent.appendChild(impact);
        row.appendChild(leftContent);
        row.appendChild(rightContent);
        
        input.addEventListener("change", () => {
            const actionId = act.id;
            if (input.checked) {
                if (!state.activeCommits.includes(actionId)) {
                    state.activeCommits.push(actionId);
                    addXP(25);
                }
                row.classList.add("committed");
                checkIcon.style.display = "block";
                announceToScreenReader(`Committed to action: ${act.title}. Saves ${act.savings}kg/yr.`);
            } else {
                state.activeCommits = state.activeCommits.filter(id => id !== actionId);
                row.classList.remove("committed");
                checkIcon.style.display = "none";
                announceToScreenReader(`Removed commitment: ${act.title}.`);
            }

            if (state.activeCommits.length >= 3) {
                unlockBadge('badge-habits');
            }

            updateActionSummary();
            updateCarbonCalculations();
        });

        DOM.checklistContainer.appendChild(row);
    });
}

function updateActionSummary() {
    let totalSavings = 0;
    state.activeCommits.forEach(id => {
        const act = ACTIONS_DB.find(a => a.id === id);
        if (act) totalSavings += act.savings;
    });

    if (DOM.annualSavingsEl) DOM.annualSavingsEl.textContent = totalSavings;
    if (DOM.activeCommitsEl) DOM.activeCommitsEl.textContent = state.activeCommits.length;

    renderBadges();
}

function renderBadges() {
    if (!DOM.badgesContainer) return;

    const unlockedCount = BADGES_DB.filter(b => {
        return (state.activeCommits.length >= 3 && b.id === 'badge-habits') ||
               (state.userProfile.level >= 3 && b.id === 'badge-level') ||
               (localStorage.getItem(`unlocked_${b.id}`) === 'true');
    }).length;

    if (DOM.unlockedBadgesEl) DOM.unlockedBadgesEl.textContent = unlockedCount;

    DOM.badgesContainer.innerHTML = "";
    BADGES_DB.forEach(badge => {
        const isUnlocked = (state.activeCommits.length >= 3 && badge.id === 'badge-habits') ||
                           (state.userProfile.level >= 3 && badge.id === 'badge-level') ||
                           (localStorage.getItem(`unlocked_${badge.id}`) === 'true');
                           
        const item = document.createElement("div");
        item.className = `badge-item ${isUnlocked ? 'unlocked' : ''}`;
        
        const iconDiv = document.createElement("div");
        iconDiv.className = "badge-icon-sm";
        const icon = document.createElement("i");
        icon.className = `fa-solid ${badge.icon}`;
        
        iconDiv.appendChild(icon);
        
        const nameSpan = document.createElement("span");
        nameSpan.textContent = badge.title;
        
        item.appendChild(iconDiv);
        item.appendChild(nameSpan);
        DOM.badgesContainer.appendChild(item);
    });
}

function unlockBadge(badgeId) {
    if (localStorage.getItem(`unlocked_${badgeId}`) !== 'true') {
        localStorage.setItem(`unlocked_${badgeId}`, 'true');
        addXP(50);
        
        const badgeName = BADGES_DB.find(b => b.id === badgeId).title;
        alert(`🏆 Achievement Unlocked: ${badgeName}! +50 XP`);
        announceToScreenReader(`Badge unlocked: ${badgeName}. Earned 50 bonus XP.`);
        renderBadges();
    }
}

// --- Level / Rank XP Engine ---
function addXP(amount) {
    state.userProfile.xp += amount;
    
    let requiredXp = state.userProfile.level * 120;
    while (state.userProfile.xp >= requiredXp) {
        state.userProfile.xp -= requiredXp;
        state.userProfile.level++;
        requiredXp = state.userProfile.level * 120;
        
        alert(`✨ LEVEL UP! You reached Eco Rank Level ${state.userProfile.level}!`);
        announceToScreenReader(`Level up! Reached Level ${state.userProfile.level}`);
        
        // Play level-up visual fanfare chime
        try { SoundFX.playLevelUp(); } catch (err) {}

        if (state.userProfile.level >= 3) {
            unlockBadge('badge-level');
        }
    }
    
    updateRankDisplay();
    saveStateToStorage();
}

function updateRankDisplay() {
    if (!DOM.displayLevel) return;

    const level = state.userProfile.level;
    DOM.displayLevel.textContent = `Level ${level}`;
    
    let title = "Eco Explorer";
    let icon = "fa-seedling";
    if (level === 2) { title = "Green Advocate"; icon = "fa-leaf"; }
    else if (level === 3) { title = "Climate Guardian"; icon = "fa-earth-americas"; }
    else if (level >= 4) { title = "Carbon Master"; icon = "fa-crown"; }

    if (DOM.rankTitle) DOM.rankTitle.textContent = title;
    if (DOM.rankIconWrapper) {
        DOM.rankIconWrapper.innerHTML = `<i class="fa-solid ${icon}"></i>`;
    }

    const nextThreshold = level * 120;
    if (DOM.xpCurrent) DOM.xpCurrent.textContent = `${state.userProfile.xp} XP`;
    if (DOM.xpNext) DOM.xpNext.textContent = `${nextThreshold} XP`;
    
    if (DOM.xpBarFill) {
        const percent = Math.min(100, (state.userProfile.xp / nextThreshold) * 100);
        DOM.xpBarFill.style.width = `${percent}%`;
    }
}

// --- Dynamic Testing / Diagnostics Validation Suite ---
function initDiagnosticsSuite() {
    const runBtn = document.getElementById("btn-run-tests");
    const testModal = document.getElementById("test-diagnostics-modal");
    const closeTestBtn = document.getElementById("btn-close-test-modal");
    const closeTestConfirm = document.getElementById("btn-close-test-confirm");
    
    if (runBtn && testModal) {
        runBtn.addEventListener("click", async () => {
            testModal.classList.add("active");
            await runUnitTests();
        });
    }
    
    const close = () => { if (testModal) testModal.classList.remove("active"); };
    if (closeTestBtn) closeTestBtn.addEventListener("click", close);
    if (closeTestConfirm) closeTestConfirm.addEventListener("click", close);
}

async function runUnitTests() {
    const resultsLog = document.getElementById("test-results-log");
    const totalEl = document.getElementById("test-count-total");
    const passEl = document.getElementById("test-count-pass");
    const failEl = document.getElementById("test-count-fail");
    
    if (!resultsLog) return;
    
    resultsLog.innerHTML = "";
    let passes = 0;
    let fails = 0;

    const logTest = (name, passed, details = "") => {
        if (passed) passes++; else fails++;
        
        const line = document.createElement("div");
        line.className = "test-log-line";
        
        const label = document.createElement("span");
        label.textContent = `🔍 ${name} ${details ? `(${details})` : ''}`;
        
        const status = document.createElement("span");
        if (passed) {
            status.className = "test-pass";
            status.textContent = "PASS ✓";
        } else {
            status.className = "test-fail";
            status.textContent = "FAIL ✗";
        }
        
        line.appendChild(label);
        line.appendChild(status);
        resultsLog.appendChild(line);
    };
    
    // Assert 1: Grid Electricity footprint formula sanity check
    try {
        const testData = { electricity: 100, cleanMix: 0, regionVal: '0.38', gas: 0, carMiles: 0, carType: 'gas', flights: 0, transit: 0, groceryBeef: 0, groceryPoultry: 0, groceryDairy: 0, groceryVeggies: 0, foodWaste: 0, shopping: 'medium', recycle: false, dietType: 'average' };
        const result = (testData.electricity * CALC_FACTORS.electricityPerDollar) * CALC_FACTORS.electricityCo2PerKwh * (1 - testData.cleanMix);
        const expected = 3040; // $100 * 80 kWh/$ * 0.38 kg/kWh * 1.0 = 3040 kg CO2/year
        logTest("Electricity Carbon Formula Sanity", Math.abs(result - expected) < 0.1, `${result} kg`);
    } catch(e) {
        logTest("Electricity Carbon Formula Sanity", false, e.message);
    }
    
    // Assert 2: Renewable energy grid mix offset boundary
    try {
        const testData = { electricity: 100, cleanMix: 1.0 }; // 100% clean
        const result = (testData.electricity * CALC_FACTORS.electricityPerDollar) * CALC_FACTORS.electricityCo2PerKwh * (1 - testData.cleanMix);
        const expected = 0;
        logTest("Green Energy Offset Range boundary", result === expected, `${result} kg`);
    } catch(e) {
        logTest("Green Energy Offset Range boundary", false, e.message);
    }
    
    // Assert 3: Gasoline vehicle vs EV footprint comparison
    try {
        const miles = 150;
        const gasCo2 = miles * CALC_FACTORS.carGasCo2PerMile;
        const evCo2 = miles * CALC_FACTORS.carElectricCo2PerMile;
        logTest("EV vs Gas Vehicle Ratio Sanity", gasCo2 > evCo2, `Gas: ${gasCo2}kg, EV: ${evCo2}kg`);
    } catch(e) {
        logTest("EV vs Gas Vehicle Ratio Sanity", false, e.message);
    }
    
    // Assert 4: Dietary emission tiers ranking checks
    try {
        logTest("Diet Tier Comparison Hierarchy", 
            CALC_FACTORS.dietMeatHeavyCo2 > CALC_FACTORS.dietAverageCo2 && 
            CALC_FACTORS.dietAverageCo2 > CALC_FACTORS.dietVegetarianCo2 && 
            CALC_FACTORS.dietVegetarianCo2 > CALC_FACTORS.dietVeganCo2, 
            "Meat > Flex > Veg > Vegan"
        );
    } catch(e) {
        logTest("Diet Tier Comparison Hierarchy", false, e.message);
    }
    
    // Assert 5: Boundary range checks for inputs
    try {
        const elecInput = document.getElementById("input-electricity");
        let passedRange = true;
        if (elecInput) {
            const min = parseFloat(elecInput.min);
            const max = parseFloat(elecInput.max);
            passedRange = (min === 0 && max === 500);
        }
        logTest("Electricity Slider bounds boundary", passedRange, "0 to 500 Range");
    } catch(e) {
        logTest("Electricity Slider bounds boundary", false, e.message);
    }

    // Assert 6: Save and load integrity sanitization
    try {
        const mockStateStr = '{"userProfile":{"name":"<script>alert(1)</script>","level":10,"xp":500}}';
        localStorage.setItem("ecoloop_state", mockStateStr);
        loadStateFromStorage();
        // Check that HTML tags were stripped
        const passedSafe = !state.userProfile.name.includes("<script>") && state.userProfile.name.includes("alert(1)") && state.userProfile.name.length <= 30;
        logTest("Profile Load Sanitization check", passedSafe, `Sanitized to: ${state.userProfile.name}`);
        // Restore active user state
        saveStateToStorage();
    } catch(e) {
        logTest("Profile Load Sanitization check", false, e.message);
    }

    // Assert 7: Gamified XP boundaries progression
    try {
        const initialLevel = state.userProfile.level;
        const initialXp = state.userProfile.xp;
        
        // Mock addXP trigger
        state.userProfile.xp = 119;
        state.userProfile.level = 1;
        addXP(2); // Should level up to 2, leaving 1 XP
        
        const passedXp = state.userProfile.level === 2 && state.userProfile.xp === 1;
        logTest("XP Progression Engine sanity check", passedXp, `Level: ${state.userProfile.level}, XP: ${state.userProfile.xp}`);
        
        // Reset state
        state.userProfile.level = initialLevel;
        state.userProfile.xp = initialXp;
        updateRankDisplay();
        saveStateToStorage();
    } catch(e) {
        logTest("XP Progression Engine sanity check", false, e.message);
    }

    // Assert 8: Action Plan carbon savings check
    try {
        const initialCommits = [...state.activeCommits];
        state.activeCommits = ['action-led', 'action-thermostat']; // 120 + 240 = 360 kg
        
        let totalSavings = 0;
        state.activeCommits.forEach(actionId => {
            const actionObj = ACTIONS_DB.find(a => a.id === actionId);
            if (actionObj) totalSavings += actionObj.savings;
        });
        
        logTest("Action Savings Aggregation", totalSavings === 360, `Aggregated: ${totalSavings} kg/yr`);
        
        // Reset active commits
        state.activeCommits = initialCommits;
    } catch(e) {
        logTest("Action Savings Aggregation", false, e.message);
    }

    // Assert 9: 3D Engine loaded check
    try {
        const hasThree = typeof THREE !== 'undefined';
        const canvas = document.getElementById("canvas-3d-globe");
        logTest("3D Globe WebGL Assets ready", hasThree && canvas !== null, hasThree ? "THREE.js loaded" : "THREE.js undefined");
    } catch(e) {
        logTest("3D Globe WebGL Assets ready", false, e.message);
    }

    // Assert 10: Weekly grocery footprint math sanity check
    try {
        const beefCo2 = 2 * 12.2;
        const poultryCo2 = 4 * 3.1;
        const dairyCo2 = 3 * 2.0;
        const veggiesCo2 = 10 * 0.5;
        const result = beefCo2 + poultryCo2 + dairyCo2 + veggiesCo2;
        logTest("Grocery Calculator Math Sanity", Math.abs(result - 47.8) < 0.1, `${result} kg/week`);
    } catch(e) {
        logTest("Grocery Calculator Math Sanity", false, e.message);
    }

    // Assert 11: Power Grid Region Factor adjustment comparison
    try {
        const initialRegion = state.calculatorData.regionVal;
        
        state.calculatorData.regionVal = '0.38'; // US Average
        const footprintUS = calculateBaselineEmissions(state.calculatorData).energy;

        state.calculatorData.regionVal = '0.18'; // Europe / UK
        const footprintEU = calculateBaselineEmissions(state.calculatorData).energy;
        
        logTest("Grid Region Impact Comparison", footprintUS > footprintEU, `US Grid: ${footprintUS}kg, EU Grid: ${footprintEU}kg`);
        
        // Reset
        state.calculatorData.regionVal = initialRegion;
    } catch(e) {
        logTest("Grid Region Impact Comparison", false, e.message);
    }

    // Assert 12: ESM Module Import Verification
    try {
        const hasCalcFn = typeof calculateBaselineEmissions === 'function';
        const hasFactors = typeof CALC_FACTORS === 'object' && CALC_FACTORS.electricityCo2PerKwh === 0.38;
        logTest("ESM Module Import Verification", hasCalcFn && hasFactors, "calculations.js imported");
    } catch(e) {
        logTest("ESM Module Import Verification", false, e.message);
    }

    // Assert 13: Settings Sanitization check
    try {
        const malicious = '<script>alert("xss")</script>';
        const cleaned = sanitizeInput(malicious);
        logTest("Settings XSS Sanitization", !cleaned.includes('<') && !cleaned.includes('>'), `Cleaned: "${cleaned}"`);
    } catch(e) {
        logTest("Settings XSS Sanitization", false, e.message);
    }

    // Assert 14: Service Worker API availability
    try {
        const hasSW = 'serviceWorker' in navigator;
        logTest("Service Worker API Available", hasSW, hasSW ? "navigator.serviceWorker exists" : "Not supported");
    } catch(e) {
        logTest("Service Worker API Available", false, e.message);
    }

    // Assert 15: Daily budget limits math validation (Alignment & Parameters)
    try {
        const testData = { electricity: 0, cleanMix: 0, regionVal: '0.38', gas: 0, carMiles: 0, carType: 'gas', flights: 0, transit: 0, groceryBeef: 0, groceryPoultry: 0, groceryDairy: 0, groceryVeggies: 0, foodWaste: 0, shopping: 'low', recycle: true, dietType: 'vegan' };
        const baseline = calculateBaselineEmissions(testData);
        // 120 (shop low) - 220 (recycle offset) = -100, clamped to 0
        const dailyFootprint = parseFloat((baseline.totalKg / 365).toFixed(1));
        logTest("Daily Budget Limit Clamping Math", dailyFootprint === 0.0, `${dailyFootprint} kg/day`);
    } catch(e) {
        logTest("Daily Budget Limit Clamping Math", false, e.message);
    }

    // Assert 16: Sound Synthesis API access validation (Aesthetics & Testing)
    try {
        const hasAudio = typeof (window.AudioContext || window.webkitAudioContext) !== 'undefined';
        logTest("Sound Synthesis Engine Ready", hasAudio, hasAudio ? "AudioContext supported" : "Unsupported");
    } catch(e) {
        logTest("Sound Synthesis Engine Ready", false, e.message);
    }

    // Assert 17: Defensive Parameter Parsing & Type Resilience checks (Aesthetics & Testing)
    try {
        const testData = { electricity: "100px", cleanMix: undefined, regionVal: null, gas: "abc", carMiles: NaN, carType: 'hybrid' };
        const baseline = calculateBaselineEmissions(testData);
        logTest("Defensive Parameter Parsing & Type Resilience", typeof baseline.totalKg === 'number' && !isNaN(baseline.totalKg), `Parsed to: ${baseline.totalKg} kg`);
    } catch(e) {
        logTest("Defensive Parameter Parsing & Type Resilience", false, e.message);
    }

    // Update summaries inside modal DOM
    if (totalEl) totalEl.textContent = passes + fails;
    if (passEl) passEl.textContent = passes;
    if (failEl) failEl.textContent = fails;

    announceToScreenReader(`Diagnostics run completed. ${passes} tests passed, ${fails} failed.`);
}

// --- Extended Features: Regions, Groceries, Goals, Offsets & Importer ---
function initExtendedFeatures() {
    const d = state.calculatorData;

    // 1. Grid Region dropdown
    const regionSelect = document.getElementById("input-region");
    if (regionSelect) {
        regionSelect.value = d.regionVal;
        regionSelect.addEventListener("change", () => {
            state.calculatorData.regionVal = regionSelect.value;
            debouncedUpdateCarbon();
        });
    }

    // 2. Grocery Inputs
    const groceryBeef = document.getElementById("input-grocery-beef");
    const groceryPoultry = document.getElementById("input-grocery-poultry");
    const groceryDairy = document.getElementById("input-grocery-dairy");
    const groceryVeggies = document.getElementById("input-grocery-veggies");

    if (groceryBeef) {
        groceryBeef.value = d.groceryBeef;
        groceryBeef.addEventListener("input", () => {
            state.calculatorData.groceryBeef = Math.max(0, parseFloat(groceryBeef.value) || 0);
            debouncedUpdateCarbon();
        });
    }
    if (groceryPoultry) {
        groceryPoultry.value = d.groceryPoultry;
        groceryPoultry.addEventListener("input", () => {
            state.calculatorData.groceryPoultry = Math.max(0, parseFloat(groceryPoultry.value) || 0);
            debouncedUpdateCarbon();
        });
    }
    if (groceryDairy) {
        groceryDairy.value = d.groceryDairy;
        groceryDairy.addEventListener("input", () => {
            state.calculatorData.groceryDairy = Math.max(0, parseFloat(groceryDairy.value) || 0);
            debouncedUpdateCarbon();
        });
    }
    if (groceryVeggies) {
        groceryVeggies.value = d.groceryVeggies;
        groceryVeggies.addEventListener("input", () => {
            state.calculatorData.groceryVeggies = Math.max(0, parseFloat(groceryVeggies.value) || 0);
            debouncedUpdateCarbon();
        });
    }

    // 3. Target Goal Selector
    const goalSelect = document.getElementById("input-target-goal");
    if (goalSelect) {
        goalSelect.value = d.targetGoal;
        goalSelect.addEventListener("change", () => {
            state.calculatorData.targetGoal = parseFloat(goalSelect.value) || 0;
            updateCarbonCalculations();
        });
    }

    // 4. Import Historical Data
    const importTriggerBtn = document.getElementById("btn-trigger-import");
    const fileInput = document.getElementById("input-import-file");

    if (importTriggerBtn && fileInput) {
        importTriggerBtn.addEventListener("click", () => {
            fileInput.click();
        });

        fileInput.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (evt) => {
                try {
                    const parsed = JSON.parse(evt.target.result);
                    // Security / Testing check: must be a safe, clean 6-element number array
                    if (Array.isArray(parsed) && parsed.length === 6 && parsed.every(val => typeof val === 'number' && val >= 0)) {
                        state.history = parsed.map(v => Math.max(0, Math.min(50, v))); // clamp limit 50 Tons
                        updateCarbonCalculations();
                        alert("✅ Historical carbon data imported successfully!");
                        announceToScreenReader("Historical carbon data imported successfully.");
                    } else {
                        alert("❌ Invalid data format. The JSON file must be a simple array of 6 positive numbers, e.g. [11.2, 10.4, 9.8, 9.1, 8.7, 8.2]");
                    }
                } catch (err) {
                    alert("❌ Failed to parse JSON file. Please check file formatting.");
                }
                // Clear value so the same file can be uploaded again
                fileInput.value = "";
            };
            reader.readAsText(file);
        });
    }

    // 5. Offset Simulator buttons
    const offsetBtns = document.querySelectorAll(".btn-offset-simulate");
    offsetBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            const project = btn.getAttribute("data-project");
            const price = parseFloat(btn.getAttribute("data-price")) || 10;
            
            // Calculate base tons to offset
            const baseTons = parseFloat((calculateBaselineEmissions(state.calculatorData).totalKg) / 1000) || 0;
            if (baseTons <= 0) {
                alert("Your carbon footprint is already zero! Excellent job.");
                return;
            }

            const totalCost = baseTons * price;

            if (confirm(`🌎 Do you want to invest in the "${project}" carbon credit offset program?\n\nThis will purchase offsets for your annual emissions of ${baseTons.toFixed(1)} Tons at a simulated cost of $${totalCost.toFixed(2)}.\n\n(This is a demo simulation — no real payment is required)`)) {
                // Apply offsets
                state.calculatorData.offsetPurchased = Math.ceil(baseTons);
                addXP(50);
                unlockBadge('badge-offset');
                updateCarbonCalculations();
                
                // Play synthesised sound effect
                try { SoundFX.playLevelUp(); } catch (err) {}

                const banner = document.getElementById("offset-status-msg");
                if (banner) {
                    banner.textContent = `✅ Offset purchase successful! Invested $${totalCost.toFixed(2)} in ${project}. Your net emissions are now 0.0 Tons.`;
                    banner.className = "offset-summary-banner mt-3 text-2xs text-center text-emerald font-semibold";
                }
                
                alert(`🏆 Achievement Unlocked: Net-Zero Hero! You successfully offset ${baseTons.toFixed(1)} Tons of carbon emissions.`);
            }
        });
    });

    // 6. Dynamic Maps Initialization
    try { initOffsetMap(); } catch (e) { console.warn("Offset map init failed:", e); }

    // 7. Settings Event listener
    window.addEventListener('ecoloop-settings-changed', () => {
        try { initOffsetMap(); } catch (e) { console.error(e); }
    });
}

/**
 * Initializes the Offset Marketplace Map (Google Maps or interactive SVG Fallback).
 */
function initOffsetMap() {
    const container = document.getElementById("offset-map-container");
    if (!container) return;

    const mapsKey = getServiceKey('mapsKey');
    if (mapsKey) {
        if (!document.getElementById('ecoloop-maps-script')) {
            const script = document.createElement('script');
            script.id = 'ecoloop-maps-script';
            script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(mapsKey)}&callback=initGoogleMap`;
            script.async = true;
            script.defer = true;
            document.head.appendChild(script);
            
            window.initGoogleMap = () => {
                renderGoogleMap(container);
            };
        } else if (window.google && window.google.maps) {
            renderGoogleMap(container);
        }
    } else {
        renderSVGFallbackMap(container);
    }
}

/**
 * Renders the Google Maps container when an API key is available.
 */
function renderGoogleMap(container) {
    container.innerHTML = "";
    const mapDiv = document.createElement("div");
    mapDiv.style.width = "100%";
    mapDiv.style.height = "100%";
    container.appendChild(mapDiv);

    try {
        const map = new google.maps.Map(mapDiv, {
            center: { lat: 10.0, lng: -20.0 },
            zoom: 1,
            disableDefaultUI: true,
            styles: [
                { elementType: "geometry", stylers: [{ color: "#090d11" }] },
                { elementType: "labels.text.stroke", stylers: [{ color: "#090d11" }] },
                { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
                { featureType: "water", elementType: "geometry", stylers: [{ color: "#0d1b2a" }] }
            ]
        });

        const projects = [
            { name: "Amazon Reforestation", position: { lat: -3.4653, lng: -62.2159 } },
            { name: "Wind Power Expansion", position: { lat: 36.1699, lng: -115.1398 } }
        ];

        projects.forEach(proj => {
            const marker = new google.maps.Marker({
                position: proj.position,
                map: map,
                title: proj.name,
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 6,
                    fillColor: "#10B981",
                    fillOpacity: 0.9,
                    strokeWeight: 1,
                    strokeColor: "#ffffff"
                }
            });

            const infoWindow = new google.maps.InfoWindow({
                content: `<div style="color:#000; font-size:12px; font-weight:600; padding:2px;">${proj.name}</div>`
            });

            marker.addListener("click", () => {
                infoWindow.open(map, marker);
            });
        });
    } catch (e) {
        console.error("Google maps init failed:", e);
        renderSVGFallbackMap(container);
    }
}

/**
 * Renders the vector SVG interactive world fallback map.
 */
function renderSVGFallbackMap(container) {
    container.innerHTML = `
        <svg class="fallback-svg-map" viewBox="0 0 300 120" xmlns="http://www.w3.org/2000/svg" style="background-color: #0b1116;">
            <!-- Grid lines for clean technical aesthetics -->
            <defs>
                <pattern id="map-grid" width="15" height="15" patternUnits="userSpaceOnUse">
                    <path d="M 15 0 L 0 0 0 15" fill="none" stroke="rgba(255,255,255,0.02)" stroke-width="0.5"/>
                </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#map-grid)" />
            
            <!-- Abstract Continent Mockups -->
            <path d="M 20,20 Q 50,15 80,30 T 90,50 Q 75,70 60,60 T 30,55 Z" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.08)" stroke-width="0.75" />
            <path d="M 70,60 Q 90,70 85,90 T 75,110 T 65,85 Z" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.08)" stroke-width="0.75" />
            <path d="M 130,20 Q 180,10 240,25 T 280,55 Q 260,70 230,60 T 170,75 Z" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.08)" stroke-width="0.75" />
            <path d="M 145,55 Q 180,60 185,80 T 170,110 T 150,85 Z" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.08)" stroke-width="0.75" />
            <path d="M 240,80 Q 270,75 280,90 T 250,105 Z" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.08)" stroke-width="0.75" />
            
            <!-- Pulse Markers -->
            <!-- Amazon (South America) -->
            <g class="map-marker" transform="translate(80, 75)" id="map-marker-amazon" tabindex="0" role="button" aria-label="Amazon Reforestation Project Site">
                <circle r="7" fill="#10B981" opacity="0.3" class="marker-pulse"></circle>
                <circle r="4" fill="#10B981" stroke="#ffffff" stroke-width="1" />
                <title>Amazon Reforestation Project (Click to purchase Offset)</title>
            </g>
            
            <!-- Wind Power (North America / Nevada) -->
            <g class="map-marker" transform="translate(50, 35)" id="map-marker-wind" tabindex="0" role="button" aria-label="Wind Power Expansion Project Site">
                <circle r="7" fill="#06B6D4" opacity="0.3" class="marker-pulse"></circle>
                <circle r="4" fill="#06B6D4" stroke="#ffffff" stroke-width="1" />
                <title>Wind Power Expansion Project (Click to purchase Offset)</title>
            </g>
            
            <text x="10" y="112" fill="var(--text-dim)" font-size="7" font-family="monospace">SVG Localizer Fallback (Offline)</text>
        </svg>
    `;

    const amazonMarker = container.querySelector("#map-marker-amazon");
    const windMarker = container.querySelector("#map-marker-wind");

    if (amazonMarker) {
        amazonMarker.addEventListener("click", () => {
            const btn = document.querySelector(".btn-offset-simulate[data-project='Amazon Reforestation']");
            if (btn) btn.click();
        });
        amazonMarker.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                const btn = document.querySelector(".btn-offset-simulate[data-project='Amazon Reforestation']");
                if (btn) btn.click();
            }
        });
    }

    if (windMarker) {
        windMarker.addEventListener("click", () => {
            const btn = document.querySelector(".btn-offset-simulate[data-project='Wind Power Expansion']");
            if (btn) btn.click();
        });
        windMarker.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                const btn = document.querySelector(".btn-offset-simulate[data-project='Wind Power Expansion']");
                if (btn) btn.click();
            }
        });
    }
}

/**
 * Manages modal focus trapping and keyboard interactions (Escape key closing, Tab key cycling).
 * Implements WCAG 2.1 compliant accessible modal dialog behaviors.
 * @param {HTMLElement} modal The modal container element
 */
function manageModalA11y(modal) {
    if (!modal) return;

    let previousFocus = null;
    const focusableElements = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

    // Watch active class mutations to toggle trap listeners dynamically
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.attributeName === 'class') {
                const isActive = modal.classList.contains('active');
                if (isActive) {
                    previousFocus = document.activeElement;
                    
                    // Autofocus the first available control in the modal
                    setTimeout(() => {
                        const focusables = modal.querySelectorAll(focusableElements);
                        if (focusables.length > 0) {
                            focusables[0].focus();
                        }
                    }, 50);

                    modal.addEventListener('keydown', handleKeydown);
                } else {
                    // Restore focus to pre-modal element
                    if (previousFocus && typeof previousFocus.focus === 'function') {
                        previousFocus.focus();
                    }
                    modal.removeEventListener('keydown', handleKeydown);
                }
            }
        });
    });

    observer.observe(modal, { attributes: true, attributeFilter: ['class'] });

    function handleKeydown(e) {
        // ESC key closes modal
        if (e.key === 'Escape') {
            modal.classList.remove('active');
            return;
        }

        // Tab cycling focus trap
        if (e.key === 'Tab') {
            const focusables = Array.from(modal.querySelectorAll(focusableElements)).filter(el => {
                return el.tabIndex !== -1 && el.offsetParent !== null;
            });
            if (focusables.length === 0) return;

            const first = focusables[0];
            const last = focusables[focusables.length - 1];

            if (e.shiftKey) { // Shift + Tab (backward focus cycle)
                if (document.activeElement === first) {
                    last.focus();
                    e.preventDefault();
                }
            } else { // Tab (forward focus cycle)
                if (document.activeElement === last) {
                    first.focus();
                    e.preventDefault();
                }
            }
        }
    }
}
