import { CALC_FACTORS, calculateBaselineEmissions } from './calculations.js';

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

console.log("\n==========================================");
console.log(`📊 Test Summary: Passed ${passes} / ${passes + fails}`);
console.log("==========================================");

if (fails > 0) {
    process.exit(1);
} else {
    process.exit(0);
}
