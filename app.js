/**
 * EcoLoop - Carbon Footprint Tracker and Educational Sorter Game
 * Main Application Entry Point (ESM Module Orchestrator)
 *
 * Implements SOLID, Separation of Concerns, DRY, and KISS principles:
 * - calculations.js: Pure functional carbon calculators.
 * - settings.js: Integration configurations for third-party endpoints.
 * - globe.js: Particle-based WebGL rendering layer.
 * - game.js: gamified card sorter game state engine.
 * - js/dom.js: cached elements access and accessibility focus traps.
 * - js/state.js: application-level reactive state mutations.
 * - js/charts.js: dynamic Chart.js canvas rendering.
 * - js/navigation.js: tabs routing and accessibility arrow keys.
 * - js/calculator.js: forms inputs binding and sync listeners.
 * - js/actions.js: custom checklist commitments rendering.
 * - js/offsets.js: simulated offsets transactional systems.
 * - js/diagnostics.js: test assertions runner.
 */

import {
    CALC_FACTORS, ACTIONS_DB, GAME_ITEMS, BADGES_DB, ECO_TRIVIA,
    calculateBaselineEmissions
} from './calculations.js';

import { EcoGlobe } from './globe.js';
import { initSorterGame, renderLeaderboard } from './game.js';
import {
    initSettingsPanel, loadGoogleAnalytics, loadFirebaseSDK, callGeminiAPI, getServiceKey
} from './settings.js';

import { DOM, cacheDOMReferences, announceToScreenReader, setButtonWithIcon, manageModalA11y, clearElement } from './js/dom.js';
import { state, loadStateFromStorage, saveStateToStorage, addXP, unlockBadge, updateRankDisplay } from './js/state.js';
import { renderBreakdownChart, renderHistoryChart } from './js/charts.js';
import { initNavigation } from './js/navigation.js';
import { initCalculatorWizard } from './js/calculator.js';
import { initActionChecklist, updateActionSummary } from './js/actions.js';
import { initOffsetSimulator } from './js/offsets.js';
import { initDiagnosticsSuite } from './js/diagnostics.js';

// --- Performance Optimization: Debounce ---
let debounceTimeout;
function debounce(func, wait) {
    return function(...args) {
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => func.apply(this, args), wait);
    };
}

const debouncedUpdateCarbon = debounce(() => {
    updateCarbonCalculations();
}, 150);

// --- PWA Service Worker Registration ---
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then((reg) => console.log('SW registered:', reg.scope))
            .catch((err) => console.warn('SW registration failed:', err));
    }
}

// --- Main App Initialization ---
document.addEventListener("DOMContentLoaded", () => {
    loadStateFromStorage();
    cacheDOMReferences();
    
    // Wire routing with updates callbacks
    initNavigation((tabId) => {
        if (tabId === "dashboard") {
            updateCarbonCalculations();
        } else if (tabId === "actions") {
            updateActionSummary();
        }
    });

    // Initialize inputs and sync update callback
    initCalculatorWizard(() => debouncedUpdateCarbon());
    initQuickLogModal();
    initActionChecklist(() => {
        updateCarbonCalculations();
    });
    
    // Prevent default form submission (CSP Compliance)
    const calcForm = document.getElementById("calc-form");
    if (calcForm) {
        calcForm.addEventListener("submit", (e) => e.preventDefault());
    }
    
    // Initialize gamified sorter game with injected handlers
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
    
    // Initialize Google API settings configurations
    initSettingsPanel();
    loadGoogleAnalytics();
    loadFirebaseSDK();
    
    // Start WebGL rendering elements
    try { EcoGlobe.init(); } catch (err) { console.error("EcoGlobe init failed:", err); }

    // Setup offsets system Map bindings
    try {
        initOffsetSimulator(() => {
            updateCarbonCalculations();
        });
    } catch (err) {
        console.error("Offset simulator maps failed:", err);
    }
    
    // Setup Focus Traps & ESC Closures on Modals (WCAG 2.1 Compliance)
    try {
        manageModalA11y(document.getElementById("quick-action-modal"));
        manageModalA11y(document.getElementById("test-diagnostics-modal"));
        manageModalA11y(document.getElementById("settings-modal"));
    } catch (e) {
        console.warn("Modal accessibility setup failed:", e);
    }

    registerServiceWorker();
    
    // Render initial data updates
    updateCarbonCalculations();
    renderRecentLogs();
    updateRankDisplay();
});

// --- Carbon Emissions Calculator Core UI Updates ---
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

    // Heavy Chart rendering is deferred to screen visibility states
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
    } else if (tons < 16.0) {
        DOM.comparisonBadge.className = "status-indicator status-orange";
        DOM.comparisonBadge.textContent = "Eco Friendly";
        DOM.comparisonText.textContent = `Excellent. You are below the US average of 16.0 Tons/yr. Committing to a few actions can reduce it further.`;
    } else {
        DOM.comparisonBadge.className = "status-indicator status-red";
        DOM.comparisonBadge.textContent = "High Footprint";
        DOM.comparisonText.textContent = `Your footprint is higher than the national average. Try adjusting home energy or opting for public transit.`;
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
        clearElement(DOM.logList);
        const emptyLi = document.createElement("li");
        emptyLi.className = "empty-state-text";
        emptyLi.textContent = "No actions logged today yet.";
        DOM.logList.appendChild(emptyLi);
        return;
    }

    clearElement(DOM.logList);
    state.userProfile.recentLogs.forEach(log => {
        const d = new Date(log.date);
        const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        const li = document.createElement("li");
        
        const infoDiv = document.createElement("div");
        const strong = document.createElement("strong");
        strong.textContent = log.name;
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

// --- Smart Eco-Coach System with Gemini AI Integration ---
function initCoachSystem() {
    if (DOM.btnCoachAdvise) {
        DOM.btnCoachAdvise.addEventListener("click", async () => {
            const baseline = calculateBaselineEmissions(state.calculatorData);
            const geminiKey = getServiceKey('geminiKey');
            if (geminiKey) {
                DOM.btnCoachAdvise.disabled = true;
                setButtonWithIcon(DOM.btnCoachAdvise, "AI Thinking...", "fa-solid fa-spinner fa-spin text-emerald");
                
                const prompt = `You are EcoLoop Eco-Coach AI. The user's annual carbon footprint breakdown: Energy: ${baseline.energy}kg, Transport: ${baseline.transport}kg, Diet: ${baseline.diet}kg, Lifestyle: ${baseline.lifestyle}kg (Total: ${baseline.totalKg}kg CO₂e/year). The US average is 16,000 kg/year. Give one specific, actionable, encouraging tip in 2-3 sentences to help them reduce their biggest emission area. Be specific with numbers.`;
                const aiResponse = await callGeminiAPI(prompt);
                
                DOM.btnCoachAdvise.disabled = false;
                setButtonWithIcon(DOM.btnCoachAdvise, "Optimize My Plan", "fa-solid fa-wand-magic-sparkles text-emerald");
                
                if (aiResponse) {
                    if (DOM.coachMessage) DOM.coachMessage.textContent = `🤖 ${aiResponse}`;
                    announceToScreenReader(`AI Coach says: ${aiResponse}`);
                    return;
                }
            }
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

// --- Accessibility Panel ---
function initAccessibilitySystem() {
    if (DOM.btnToggleContrast) {
        DOM.btnToggleContrast.addEventListener("click", () => {
            document.body.classList.toggle("high-contrast");
            const isHigh = document.body.classList.contains("high-contrast");
            localStorage.setItem("ecoloop_contrast", isHigh ? "true" : "false");
            
            if (isHigh) {
                setButtonWithIcon(DOM.btnToggleContrast, "Standard Theme", "fa-solid fa-eye-slash");
            } else {
                setButtonWithIcon(DOM.btnToggleContrast, "High Contrast", "fa-solid fa-eye");
            }
            announceToScreenReader(`High contrast mode ${isHigh ? 'enabled' : 'disabled'}`);
        });
        
        const initialContrast = localStorage.getItem("ecoloop_contrast");
        if (initialContrast === "true") {
            document.body.classList.add("high-contrast");
            setButtonWithIcon(DOM.btnToggleContrast, "Standard Theme", "fa-solid fa-eye-slash");
        }
    }

    const resetBtn = document.getElementById("btn-reset-data");
    if (resetBtn) {
        resetBtn.addEventListener("click", () => {
            if (confirm("⚠️ Are you sure you want to reset all your carbon footprint calculations, logs, badges, level progress, and game high scores? This action cannot be undone.")) {
                localStorage.removeItem("ecoloop_state");
                alert("🔄 Application state has been reset to defaults.");
                location.reload();
            }
        });
    }
}

// --- Export/Import & Offset Systems ---
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

    const fileInput = document.getElementById("input-import-file");
    if (fileInput) {
        fileInput.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (evt) => {
                try {
                    const parsed = JSON.parse(evt.target.result);
                    if (Array.isArray(parsed) && parsed.length === 6 && parsed.every(val => typeof val === 'number' && val >= 0)) {
                        state.history = parsed.map(v => Math.max(0, Math.min(50, v)));
                        updateCarbonCalculations();
                        alert("✅ Historical carbon data imported successfully!");
                        announceToScreenReader("Historical carbon data imported successfully.");
                    } else {
                        alert("❌ Invalid data format. The JSON file must be a simple array of 6 positive numbers, e.g. [11.2, 10.4, 9.8, 9.1, 8.7, 8.2]");
                    }
                } catch (err) {
                    alert("❌ Failed to parse JSON file. Please check file formatting.");
                }
                fileInput.value = "";
            };
            reader.readAsText(file);
        });
    }
}
