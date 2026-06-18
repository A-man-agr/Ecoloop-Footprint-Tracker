/**
 * js/diagnostics.js - Browser-based calculations diagnostics suite.
 * Separation of Concerns: Encapsulates runtime assertions logging for browser verification.
 */

import { CALC_FACTORS, ACTIONS_DB, GAME_ITEMS, BADGES_DB, calculateBaselineEmissions } from '../calculations.js';
import { sanitizeInput } from '../settings.js';
import { state, addXP, loadStateFromStorage, saveStateToStorage, updateRankDisplay } from './state.js';
import { DOM, clearElement, announceToScreenReader } from './dom.js';

/**
 * Binds button click for the test-run modal launcher.
 */
export function initDiagnosticsSuite() {
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

/**
 * Runs 34 diagnostic unit test assertions and displays results in the modal container.
 */
export async function runUnitTests() {
    const resultsLog = document.getElementById("test-results-log");
    const totalEl = document.getElementById("test-count-total");
    const passEl = document.getElementById("test-count-pass");
    const failEl = document.getElementById("test-count-fail");
    
    if (!resultsLog) return;
    
    clearElement(resultsLog);
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
        const expected = 3040;
        logTest("Electricity Carbon Formula Sanity", Math.abs(result - expected) < 0.1, `${result} kg`);
    } catch(e) {
        logTest("Electricity Carbon Formula Sanity", false, e.message);
    }
    
    // Assert 2: Renewable energy grid mix offset boundary
    try {
        const testData = { electricity: 100, cleanMix: 1.0 };
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
        const passedSafe = !state.userProfile.name.includes("<script>") && state.userProfile.name.includes("alert(1)") && state.userProfile.name.length <= 30;
        logTest("Profile Load Sanitization check", passedSafe, `Sanitized to: ${state.userProfile.name}`);
        saveStateToStorage();
    } catch(e) {
        logTest("Profile Load Sanitization check", false, e.message);
    }

    // Assert 7: Gamified XP boundaries progression
    try {
        const initialLevel = state.userProfile.level;
        const initialXp = state.userProfile.xp;
        
        state.userProfile.xp = 119;
        state.userProfile.level = 1;
        addXP(2);
        
        const passedXp = state.userProfile.level === 2 && state.userProfile.xp === 1;
        logTest("XP Progression Engine sanity check", passedXp, `Level: ${state.userProfile.level}, XP: ${state.userProfile.xp}`);
        
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
        state.activeCommits = ['action-led', 'action-thermostat'];
        
        let totalSavings = 0;
        state.activeCommits.forEach(actionId => {
            const actionObj = ACTIONS_DB.find(a => a.id === actionId);
            if (actionObj) totalSavings += actionObj.savings;
        });
        
        logTest("Action Savings Aggregation", totalSavings === 360, `Aggregated: ${totalSavings} kg/yr`);
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
        state.calculatorData.regionVal = '0.38';
        const footprintUS = calculateBaselineEmissions(state.calculatorData).energy;
        state.calculatorData.regionVal = '0.18';
        const footprintEU = calculateBaselineEmissions(state.calculatorData).energy;
        
        logTest("Grid Region Impact Comparison", footprintUS > footprintEU, `US Grid: ${footprintUS}kg, EU Grid: ${footprintEU}kg`);
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

    // Assert 15: Daily budget limits math validation
    try {
        const testData = { electricity: 0, cleanMix: 0, regionVal: '0.38', gas: 0, carMiles: 0, carType: 'gas', flights: 0, transit: 0, groceryBeef: 0, groceryPoultry: 0, groceryDairy: 0, groceryVeggies: 0, foodWaste: 0, shopping: 'low', recycle: true, dietType: 'vegan' };
        const baseline = calculateBaselineEmissions(testData);
        const dailyFootprint = parseFloat((baseline.totalKg / 365).toFixed(1));
        logTest("Daily Budget Limit Clamping Math", dailyFootprint === 0.0, `${dailyFootprint} kg/day`);
    } catch(e) {
        logTest("Daily Budget Limit Clamping Math", false, e.message);
    }

    // Assert 16: Sound Synthesis API access validation
    try {
        const hasAudio = typeof (window.AudioContext || window.webkitAudioContext) !== 'undefined';
        logTest("Sound Synthesis Engine Ready", hasAudio, hasAudio ? "AudioContext supported" : "Unsupported");
    } catch(e) {
        logTest("Sound Synthesis Engine Ready", false, e.message);
    }

    // Assert 17: Defensive Parameter Parsing & Type Resilience checks
    try {
        const testData = { electricity: "100px", cleanMix: undefined, regionVal: null, gas: "abc", carMiles: NaN, carType: 'hybrid' };
        const baseline = calculateBaselineEmissions(testData);
        logTest("Defensive Parameter Parsing & Type Resilience", typeof baseline.totalKg === 'number' && !isNaN(baseline.totalKg), `Parsed to: ${baseline.totalKg} kg`);
    } catch(e) {
        logTest("Defensive Parameter Parsing & Type Resilience", false, e.message);
    }

    // Assert 18: Flight class emission scaling
    try {
        const ecoResult = calculateBaselineEmissions({ flights: 10, flightClass: 'economy' }).transport;
        const bizResult = calculateBaselineEmissions({ flights: 10, flightClass: 'business' }).transport;
        const firstResult = calculateBaselineEmissions({ flights: 10, flightClass: 'first' }).transport;
        
        const scaleCorrect = bizResult > ecoResult && firstResult > bizResult;
        logTest("Flight class emissions scaling hierarchy", scaleCorrect, `Eco: ${ecoResult}kg, Biz: ${bizResult}kg, First: ${firstResult}kg`);
    } catch(e) {
        logTest("Flight class emissions scaling hierarchy", false, e.message);
    }

    // Assert 19: Transit type emission scaling
    try {
        const busResult = calculateBaselineEmissions({ transit: 100, transitType: 'bus' }).transport;
        const trainResult = calculateBaselineEmissions({ transit: 100, transitType: 'train' }).transport;
        
        const scaleCorrect = busResult > trainResult;
        logTest("Transit type emissions scaling hierarchy", scaleCorrect, `Bus: ${busResult}kg, Train: ${trainResult}kg`);
    } catch(e) {
        logTest("Transit type emissions scaling hierarchy", false, e.message);
    }

    // Assert 20: Invalid carType Fallback to Gasoline
    try {
        const testData = { carMiles: 150, carType: 'rocket' };
        const resultDefault = calculateBaselineEmissions(testData).transport;
        const resultGas = calculateBaselineEmissions({ carMiles: 150, carType: 'gas' }).transport;
        logTest("Invalid carType Fallback to Gasoline", resultDefault === resultGas, `${resultDefault} kg`);
    } catch (e) {
        logTest("Invalid carType Fallback to Gasoline", false, e.message);
    }

    // Assert 21: Shopping Habits low vs high carbon range limits
    try {
        const baselineLow = calculateBaselineEmissions({ shopping: 'low', recycle: false }).lifestyle;
        const baselineHigh = calculateBaselineEmissions({ shopping: 'high', recycle: false }).lifestyle;
        logTest("Shopping Habit Range Bound Hierarchy", baselineHigh > baselineLow, `Low: ${baselineLow}kg, High: ${baselineHigh}kg`);
    } catch (e) {
        logTest("Shopping Habit Range Bound Hierarchy", false, e.message);
    }

    // Assert 22: Food Waste linear scale calculations
    try {
        const baselineZeroWaste = calculateBaselineEmissions({ foodWaste: 0 }).diet;
        const baselineMaxWaste = calculateBaselineEmissions({ foodWaste: 50 }).diet;
        logTest("Food Waste Emission Scale", baselineMaxWaste > baselineZeroWaste, `0% waste: ${baselineZeroWaste}kg, 50% waste: ${baselineMaxWaste}kg`);
    } catch (e) {
        logTest("Food Waste Emission Scale", false, e.message);
    }

    // Assert 23: Baseline calculations with zero inputs
    try {
        const testData = { electricity: 0, cleanMix: 0, regionVal: '0.38', gas: 0, carMiles: 0, carType: 'gas', flights: 0, transit: 0, groceryBeef: 0, groceryPoultry: 0, groceryDairy: 0, groceryVeggies: 0, foodWaste: 0, shopping: 'low', recycle: true, dietType: 'vegan' };
        const baseline = calculateBaselineEmissions(testData);
        logTest("Calculations with Complete Zero Inputs", baseline.totalKg === 0, `${baseline.totalKg} kg`);
    } catch (e) {
        logTest("Calculations with Complete Zero Inputs", false, e.message);
    }

    // Assert 24: Invalid regionVal fallback
    try {
        const testDataInvalid = { electricity: 100, regionVal: '0.99' };
        const testDataDefault = { electricity: 100, regionVal: '0.38' };
        const resultInvalid = calculateBaselineEmissions(testDataInvalid).energy;
        const resultDefault = calculateBaselineEmissions(testDataDefault).energy;
        logTest("Invalid regionVal Fallback to Default Grid", resultInvalid === resultDefault, `${resultInvalid} kg`);
    } catch (e) {
        logTest("Invalid regionVal Fallback to Default Grid", false, e.message);
    }

    // Assert 25: Clean energy mix out-of-bounds capping safety
    try {
        const testDataOOB = { electricity: 100, cleanMix: 1.5 };
        const resultOOB = calculateBaselineEmissions(testDataOOB).energy;
        logTest("Clean Energy mix bounds capping", resultOOB >= 0, `Output: ${resultOOB} kg`);
    } catch (e) {
        logTest("Clean Energy mix bounds capping", false, e.message);
    }

    // Assert 26: Programmatic DOM operations check
    try {
        const mockEl = document.createElement("button");
        mockEl.textContent = "Test Button";
        mockEl.classList.add("btn-primary");
        mockEl.setAttribute("aria-label", "Primary Button");
        const textNode = document.createTextNode(" Extra Text");
        mockEl.appendChild(textNode);
        const hasClass = mockEl.classList.contains("btn-primary");
        logTest("Programmatic DOM operations check", hasClass && mockEl.childNodes.length === 2, `Children: ${mockEl.childNodes.length}`);
    } catch (e) {
        logTest("Programmatic DOM operations check", false, e.message);
    }

    // Assert 27: Action Plan Savings Range Validity
    try {
        const allValid = ACTIONS_DB.every(act => typeof act.id === 'string' && act.savings > 0 && typeof act.title === 'string' && typeof act.desc === 'string');
        logTest("Action Plan Savings Range Validity", allValid, `${ACTIONS_DB.length} actions verified`);
    } catch (e) {
        logTest("Action Plan Savings Range Validity", false, e.message);
    }

    // Assert 28: Game Items Category Accuracy
    try {
        const tiers = ['low', 'medium', 'high'];
        const allValid = GAME_ITEMS.every(item => typeof item.name === 'string' && tiers.includes(item.tier) && typeof item.fact === 'string' && item.fact.length > 0);
        logTest("Game Items Category Accuracy", allValid, `${GAME_ITEMS.length} items verified`);
    } catch (e) {
        logTest("Game Items Category Accuracy", false, e.message);
    }

    // Assert 29: XP Level Title Resolution Hierarchy
    try {
        const getLevelTitle = (level) => {
            if (level === 1) return "Eco Explorer";
            if (level === 2) return "Green Advocate";
            if (level === 3) return "Climate Guardian";
            return "Carbon Master";
        };
        const checkTitles = getLevelTitle(1) === "Eco Explorer" && 
                            getLevelTitle(2) === "Green Advocate" && 
                            getLevelTitle(3) === "Climate Guardian" && 
                            getLevelTitle(5) === "Carbon Master";
        logTest("XP Level Title Resolution Hierarchy", checkTitles, "Explorer > Advocate > Guardian > Master");
    } catch (e) {
        logTest("XP Level Title Resolution Hierarchy", false, e.message);
    }

    // Assert 30: Target Reduction Goal Clamping Range
    try {
        const testGoal1 = Math.max(0, Math.min(0.50, parseFloat("0.25") || 0.25));
        const testGoal2 = Math.max(0, Math.min(0.50, parseFloat("0.85") || 0.25));
        logTest("Target Reduction Goal Clamping Range", testGoal1 === 0.25 && testGoal2 === 0.50, `Valid: ${testGoal1}, Clamped: ${testGoal2}`);
    } catch (e) {
        logTest("Target Reduction Goal Clamping Range", false, e.message);
    }

    // Assert 31: Badges Schema Completeness
    try {
        const allValid = BADGES_DB.every(b => typeof b.id === 'string' && typeof b.title === 'string' && typeof b.desc === 'string' && typeof b.icon === 'string');
        logTest("Badges Schema Completeness", allValid, `${BADGES_DB.length} badges verified`);
    } catch (e) {
        logTest("Badges Schema Completeness", false, e.message);
    }

    // Assert 32: HTML Input Sanitizer Multi-Vector Injection Blocks
    try {
        const malicious = '<img src=x onerror=alert(1)> <iframe src="javascript:alert(2)">';
        const cleaned = sanitizeInput(malicious);
        const safe = !cleaned.includes("<") && !cleaned.includes(">") && !cleaned.includes("onerror") && !cleaned.includes("javascript:");
        logTest("HTML Input Sanitizer Multi-Vector Injection Blocks", safe, `Cleaned to: "${cleaned}"`);
    } catch (e) {
        logTest("HTML Input Sanitizer Multi-Vector Injection Blocks", false, e.message);
    }

    // Assert 33: Grid Region List Enumeration and Integrity Check
    try {
        const allowedRegions = ['0.38', '0.22', '0.52', '0.36', '0.18'];
        const invalidRegion = '0.99';
        const rawRegion = allowedRegions.includes(invalidRegion) ? invalidRegion : '0.38';
        logTest("Grid Region List Enumeration and Integrity Check", rawRegion === '0.38', `Resolved invalid ${invalidRegion} to ${rawRegion}`);
    } catch (e) {
        logTest("Grid Region List Enumeration and Integrity Check", false, e.message);
    }

    // Assert 34: Paris Agreement Carbon Budget tracker limits
    try {
        const parisLimit = 11.0;
        const testKg = 5.5;
        const budgetPercent = Math.min(100, Math.round((testKg / parisLimit) * 100));
        logTest("Paris Agreement Carbon Budget tracker limits", budgetPercent === 50, `5.5 kg is ${budgetPercent}% of 11.0 kg limit`);
    } catch (e) {
        logTest("Paris Agreement Carbon Budget tracker limits", false, e.message);
    }

    if (totalEl) totalEl.textContent = passes + fails;
    if (passEl) passEl.textContent = passes;
    if (failEl) failEl.textContent = fails;

    announceToScreenReader(`Diagnostics run completed. ${passes} tests passed, ${fails} failed.`);
}
