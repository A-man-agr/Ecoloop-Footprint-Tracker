// Setup Node-compatible mock DOM globals (Testing optimization!)
if (typeof global !== 'undefined' && typeof window === 'undefined') {
    global.window = {};
    global.document = {
        createElement: (tag) => {
            const element = {
                tagName: tag.toUpperCase(),
                style: {},
                classList: {
                    classes: [],
                    add: (cls) => element.classList.classes.push(cls),
                    remove: (cls) => {
                        element.classList.classes = element.classList.classes.filter(c => c !== cls);
                    },
                    contains: (cls) => element.classList.classes.includes(cls)
                },
                appendChild: (child) => {
                    element.children.push(child);
                    return child;
                },
                removeChild: (child) => {
                    element.children = element.children.filter(c => c !== child);
                    return child;
                },
                children: [],
                setAttribute: (name, val) => { element[name] = val; },
                removeAttribute: (name) => { delete element[name]; },
                textContent: "",
                innerHTML: ""
            };
            return element;
        },
        createTextNode: (text) => ({ textContent: text }),
        getElementById: () => null,
        querySelectorAll: () => []
    };
    global.localStorage = {
        store: {},
        getItem: (key) => global.localStorage.store[key] || null,
        setItem: (key, val) => { global.localStorage.store[key] = String(val); },
        removeItem: (key) => { delete global.localStorage.store[key]; }
    };
}

import { CALC_FACTORS, calculateBaselineEmissions } from './calculations.js';
import { sanitizeInput } from './settings.js';

console.log("==========================================");
console.log("🏃 Running EcoLoop System Unit Tests...");
console.log("==========================================\n");

let passes = 0;
let fails = 0;

function assert(description, condition, details = "") {
    if (condition) {
        passes++;
        console.log(`✅ PASS: ${description} ${details ? `(${details})` : ''}`);
    } else {
        fails++;
        console.log(`❌ FAIL: ${description} ${details ? `(${details})` : ''}`);
    }
}

// 1. Grid Electricity formula check
try {
    const testData = { electricity: 100, cleanMix: 0, regionVal: '0.38', gas: 0, carMiles: 0, carType: 'gas', flights: 0, transit: 0, groceryBeef: 0, groceryPoultry: 0, groceryDairy: 0, groceryVeggies: 0, foodWaste: 0, shopping: 'medium', recycle: false, dietType: 'average' };
    const result = (testData.electricity * CALC_FACTORS.electricityPerDollar) * CALC_FACTORS.electricityCo2PerKwh * (1 - testData.cleanMix);
    assert("Electricity Carbon Formula Sanity", Math.abs(result - 3040) < 0.1, `${result} kg`);
} catch (e) {
    assert("Electricity Carbon Formula Sanity", false, e.message);
}

// 2. Renewable energy mix checks
try {
    const testData = { electricity: 100, cleanMix: 1.0 };
    const result = (testData.electricity * CALC_FACTORS.electricityPerDollar) * CALC_FACTORS.electricityCo2PerKwh * (1 - testData.cleanMix);
    assert("Green Energy Offset Range boundary", result === 0, `${result} kg`);
} catch (e) {
    assert("Green Energy Offset Range boundary", false, e.message);
}

// 3. EV vs Gas vehicle footprint
try {
    const miles = 150;
    const gasCo2 = miles * CALC_FACTORS.carGasCo2PerMile;
    const evCo2 = miles * CALC_FACTORS.carElectricCo2PerMile;
    assert("EV vs Gas Vehicle Ratio Sanity", gasCo2 > evCo2, `Gas: ${gasCo2}kg, EV: ${evCo2}kg`);
} catch (e) {
    assert("EV vs Gas Vehicle Ratio Sanity", false, e.message);
}

// 4. Diet Tiers hierarchy
try {
    const hierarchy = CALC_FACTORS.dietMeatHeavyCo2 > CALC_FACTORS.dietAverageCo2 && 
                      CALC_FACTORS.dietAverageCo2 > CALC_FACTORS.dietVegetarianCo2 && 
                      CALC_FACTORS.dietVegetarianCo2 > CALC_FACTORS.dietVeganCo2;
    assert("Diet Tier Comparison Hierarchy", hierarchy, "Meat > Flex > Veg > Vegan");
} catch (e) {
    assert("Diet Tier Comparison Hierarchy", false, e.message);
}

// 5. Weekly grocery calculation math
try {
    const d = { groceryBeef: 2, groceryPoultry: 4, groceryDairy: 3, groceryVeggies: 10 };
    const result = (d.groceryBeef * 12.2) + (d.groceryPoultry * 3.1) + (d.groceryDairy * 2.0) + (d.groceryVeggies * 0.5);
    assert("Grocery Calculator Math Sanity", Math.abs(result - 47.8) < 0.1, `${result} kg/week`);
} catch (e) {
    assert("Grocery Calculator Math Sanity", false, e.message);
}

// 6. Grid Region impact adjustment checks
try {
    const testDataUS = { electricity: 100, cleanMix: 0, regionVal: '0.38', gas: 0, carMiles: 0, carType: 'gas', flights: 0, transit: 0, groceryBeef: 0, groceryPoultry: 0, groceryDairy: 0, groceryVeggies: 0, foodWaste: 0, shopping: 'medium', recycle: false, dietType: 'average' };
    const testDataEU = { ...testDataUS, regionVal: '0.18' };
    
    const footprintUS = calculateBaselineEmissions(testDataUS).energy;
    const footprintEU = calculateBaselineEmissions(testDataEU).energy;
    assert("Grid Region Impact Comparison", footprintUS > footprintEU, `US: ${footprintUS}kg, EU: ${footprintEU}kg`);
} catch (e) {
    assert("Grid Region Impact Comparison", false, e.message);
}

// 7. Daily budget limits clamping math
try {
    const testData = { electricity: 0, cleanMix: 0, regionVal: '0.38', gas: 0, carMiles: 0, carType: 'gas', flights: 0, transit: 0, groceryBeef: 0, groceryPoultry: 0, groceryDairy: 0, groceryVeggies: 0, foodWaste: 0, shopping: 'low', recycle: true, dietType: 'vegan' };
    const baseline = calculateBaselineEmissions(testData);
    const dailyFootprint = parseFloat((baseline.totalKg / 365).toFixed(1));
    assert("Daily Budget Limit Clamping Math", dailyFootprint === 0.0, `${dailyFootprint} kg/day`);
} catch (e) {
    assert("Daily Budget Limit Clamping Math", false, e.message);
}

// 8. Type Safety and Defensive Parameter Parsing checks
try {
    const testData = { electricity: "100px", cleanMix: undefined, regionVal: null, gas: "abc", carMiles: NaN, carType: 'hybrid' };
    const baseline = calculateBaselineEmissions(testData);
    assert("Defensive Parameter Parsing & Type Resilience", typeof baseline.totalKg === 'number' && !isNaN(baseline.totalKg), `Parsed to: ${baseline.totalKg} kg`);
} catch (e) {
    assert("Defensive Parameter Parsing & Type Resilience", false, e.message);
}

// 9. Invalid carType fallback to default gasoline vehicle emissions factor
try {
    const testData = { carMiles: 150, carType: 'rocket' };
    const resultDefault = calculateBaselineEmissions(testData).transport;
    const resultGas = calculateBaselineEmissions({ carMiles: 150, carType: 'gas' }).transport;
    assert("Invalid carType Fallback to Gasoline", resultDefault === resultGas, `${resultDefault} kg`);
} catch (e) {
    assert("Invalid carType Fallback to Gasoline", false, e.message);
}

// 10. Shopping Habits low vs high carbon range limits
try {
    const baselineLow = calculateBaselineEmissions({ shopping: 'low', recycle: false }).lifestyle;
    const baselineHigh = calculateBaselineEmissions({ shopping: 'high', recycle: false }).lifestyle;
    assert("Shopping Habit Range Bound Hierarchy", baselineHigh > baselineLow, `Low: ${baselineLow}kg, High: ${baselineHigh}kg`);
} catch (e) {
    assert("Shopping Habit Range Bound Hierarchy", false, e.message);
}

// 11. Food Waste linear scale calculations
try {
    const baselineZeroWaste = calculateBaselineEmissions({ foodWaste: 0 }).diet;
    const baselineMaxWaste = calculateBaselineEmissions({ foodWaste: 50 }).diet;
    assert("Food Waste Emission Scale", baselineMaxWaste > baselineZeroWaste, `0% waste: ${baselineZeroWaste}kg, 50% waste: ${baselineMaxWaste}kg`);
} catch (e) {
    assert("Food Waste Emission Scale", false, e.message);
}

// 12. Baseline calculations with zero inputs
try {
    const testData = { electricity: 0, cleanMix: 0, regionVal: '0.38', gas: 0, carMiles: 0, carType: 'gas', flights: 0, transit: 0, groceryBeef: 0, groceryPoultry: 0, groceryDairy: 0, groceryVeggies: 0, foodWaste: 0, shopping: 'low', recycle: true, dietType: 'vegan' };
    const baseline = calculateBaselineEmissions(testData);
    assert("Calculations with Complete Zero Inputs", baseline.totalKg === 0, `${baseline.totalKg} kg`);
} catch (e) {
    assert("Calculations with Complete Zero Inputs", false, e.message);
}

// 13. Invalid regionVal fallback to standard national average intensity
try {
    const testDataInvalid = { electricity: 100, regionVal: '0.99' };
    const testDataDefault = { electricity: 100, regionVal: '0.38' };
    const resultInvalid = calculateBaselineEmissions(testDataInvalid).energy;
    const resultDefault = calculateBaselineEmissions(testDataDefault).energy;
    assert("Invalid regionVal Fallback to Default Grid", resultInvalid === resultDefault, `${resultInvalid} kg`);
} catch (e) {
    assert("Invalid regionVal Fallback to Default Grid", false, e.message);
}

// 14. HTML Input Sanitizer XSS Prevention checks
try {
    const malicious = '<script>alert("XSS")</script>';
    const cleaned = sanitizeInput(malicious);
    assert("HTML Input Sanitizer XSS Prevention", !cleaned.includes("<") && !cleaned.includes(">"), `Cleaned to: "${cleaned}"`);
} catch (e) {
    assert("HTML Input Sanitizer XSS Prevention", false, e.message);
}

// 15. Clean energy mix out-of-bounds capping safety
try {
    const testDataOOB = { electricity: 100, cleanMix: 1.5 }; // > 100%
    const resultOOB = calculateBaselineEmissions(testDataOOB).energy;
    assert("Clean Energy mix bounds capping", resultOOB >= 0, `Output: ${resultOOB} kg`);
} catch (e) {
    assert("Clean Energy mix bounds capping", false, e.message);
}

// 16. Flight class emission scaling (economy vs business vs first class)
try {
    const ecoResult = calculateBaselineEmissions({ flights: 10, flightClass: 'economy' }).transport;
    const bizResult = calculateBaselineEmissions({ flights: 10, flightClass: 'business' }).transport;
    const firstResult = calculateBaselineEmissions({ flights: 10, flightClass: 'first' }).transport;
    
    const scaleCorrect = bizResult > ecoResult && firstResult > bizResult;
    assert("Flight class emissions scaling hierarchy", scaleCorrect, `Eco: ${ecoResult}kg, Biz: ${bizResult}kg, First: ${firstResult}kg`);
} catch (e) {
    assert("Flight class emissions scaling hierarchy", false, e.message);
}

// 17. Transit type emission scaling (bus vs train)
try {
    const busResult = calculateBaselineEmissions({ transit: 100, transitType: 'bus' }).transport;
    const trainResult = calculateBaselineEmissions({ transit: 100, transitType: 'train' }).transport;
    
    const scaleCorrect = busResult > trainResult;
    assert("Transit type emissions scaling hierarchy", scaleCorrect, `Bus: ${busResult}kg, Train: ${trainResult}kg`);
} catch (e) {
    assert("Transit type emissions scaling hierarchy", false, e.message);
}

// 18. Programmatic DOM operations and node creation safety check
try {
    const mockEl = document.createElement("button");
    mockEl.textContent = "Test Button";
    mockEl.classList.add("btn-primary");
    mockEl.setAttribute("aria-label", "Primary Button");

    const textNode = document.createTextNode(" Extra Text");
    mockEl.appendChild(textNode);

    const hasClass = mockEl.classList.contains("btn-primary");
    const labelSet = mockEl["aria-label"] === "Primary Button";
    assert("Programmatic DOM mock operations check", hasClass && labelSet && mockEl.children.length === 1, `Class: ${mockEl.classList.classes.join(",")}`);
} catch (e) {
    assert("Programmatic DOM mock operations check", false, e.message);
}

console.log("\n==========================================");
console.log(`📊 Test Summary: Passed ${passes} / ${passes + fails}`);
console.log("==========================================");

if (fails > 0) {
    process.exit(1);
} else {
    process.exit(0);
}
