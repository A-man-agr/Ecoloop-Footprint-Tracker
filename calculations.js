/**
 * calculations.js - Core Carbon Footprint Calculation Formulas and Databases.
 * Pure functional design for extreme testability and separation of concerns.
 */

// --- Carbon Emission Factors (EPA & DEFRA metrics) ---
export const CALC_FACTORS = Object.freeze({
    electricityPerDollar: 12 / 0.15, // Approx 80 kWh per dollar ($0.15/kWh, 12 months)
    electricityCo2PerKwh: 0.38,      // 0.38 kg CO2/kWh global grid mix
    gasPerDollar: 12 / 1.0,         // Approx 12 therms per dollar ($1.00/therm, 12 months)
    gasCo2PerTherm: 5.3,            // 5.3 kg CO2/therm Natural Gas
    
    carGasCo2PerMile: 0.35 * 52,     // 0.35 kg/mile, 52 weeks
    carHybridCo2PerMile: 0.18 * 52,  // 0.18 kg/mile, 52 weeks
    carElectricCo2PerMile: 0.08 * 52,// 0.08 kg/mile, 52 weeks
    flightCo2PerHour: 120,           // 120 kg/hour average
    transitCo2PerMile: 0.10 * 52,    // 0.10 kg/mile public transit, 52 weeks
    
    dietMeatHeavyCo2: 7.2 * 365,     // 7.2 kg/day
    dietAverageCo2: 5.2 * 365,       // 5.2 kg/day
    dietVegetarianCo2: 3.8 * 365,    // 3.8 kg/day
    dietVeganCo2: 2.9 * 365,         // 2.9 kg/day
    foodWasteBaseCo2: 150,           // Base yearly food waste footprint for 10% waste
    
    shopLowCo2: 120,
    shopMediumCo2: 350,
    shopHighCo2: 800,
    recycleOffset: -220              // Subtract 220 kg/yr if recycling
});

export const ACTIONS_DB = Object.freeze([
    { id: 'action-led', category: 'energy', title: 'Switch to LED Bulbs', desc: 'Replace incandescent bulbs with energy-efficient LEDs.', savings: 120 },
    { id: 'action-thermostat', category: 'energy', title: 'Smart Thermostat Settings', desc: 'Adjust thermostat 2°F lower in winter & higher in summer.', savings: 240 },
    { id: 'action-wash', category: 'energy', title: 'Wash Laundry in Cold Water', desc: 'Saves the intensive energy needed to heat laundry water.', savings: 90 },
    { id: 'action-bike', category: 'transport', title: 'Bike or Walk Short Trips', desc: 'Replace 10 miles of driving per week with walking/cycling.', savings: 190 },
    { id: 'action-transit', category: 'transport', title: 'Ride Public Transit Weekly', desc: 'Swap one day of driving commute with train or bus.', savings: 320 },
    { id: 'action-meatless', category: 'lifestyle', title: 'Meat-Free Mondays', desc: 'Eat plant-based foods for at least one full day a week.', savings: 250 },
    { id: 'action-compost', category: 'lifestyle', title: 'Start Composting Food scraps', desc: 'Keeps organic waste out of landfill to stop methane emissions.', savings: 110 },
    { id: 'action-thrift', category: 'lifestyle', title: 'Thrift Shop & Repair Clothes', desc: 'Avoid fast-fashion by purchasing vintage or fixing old apparel.', savings: 180 }
]);

export const GAME_ITEMS = Object.freeze([
    { name: "Long-haul Flight (10 hrs)", tier: "high", icon: "fa-plane-departure", desc: "Transatlantic flight", fact: "A single long flight emits more CO₂ than a year of train travel!" },
    { name: "Eating a Beef Steak", tier: "high", icon: "fa-hamburger", desc: "Daily meat meal", fact: "Beef farming requires massive land and releases heavy methane." },
    { name: "Bicycle Ride (5 miles)", tier: "low", icon: "fa-bicycle", desc: "Zero-emission commuting", fact: "Biking is entirely green and improves cardiovascular health!" },
    { name: "Charging a Smartphone", tier: "low", icon: "fa-mobile-screen-button", desc: "Charging daily for a year", fact: "Phone chargers use very little energy, but standby plugs leak power." },
    { name: "Buying New Fast-Fashion Jeans", tier: "medium", icon: "fa-shirt", desc: "Denim manufacturing", fact: "Jeans take 7,500 liters of water and substantial energy to manufacture." },
    { name: "Running a Dishwasher (Full)", tier: "low", icon: "fa-soap", desc: "Eco-mode dishwasher cycle", fact: "A full dishwasher uses less water and heating than manual hand washing!" },
    { name: "Taking a 5-minute Shower", tier: "low", icon: "fa-shower", desc: "Short shower run", fact: "Keeping showers short saves both water and gas/electric heating bills." },
    { name: "Using a Tumble Dryer", tier: "medium", icon: "fa-wind", desc: "Drying one load of laundry", fact: "Dryers are heat-heavy appliances. Line-drying has zero footprint!" },
    { name: "Driving Gas SUV (30 miles)", tier: "high", icon: "fa-car-side", desc: "Utility vehicle travel", fact: "Large combustion emissions release heavy particulate and carbon gas." },
    { name: "Buying a New Laptop", tier: "medium", icon: "fa-laptop", desc: "Electronics production", fact: "Mining rare earth materials makes up 75% of a computer's total lifetime footprint." },
    { name: "Eating Locally Grown Apples", tier: "low", icon: "fa-apple-whole", desc: "Local organic farming", fact: "Local produce bypasses flight or maritime container shipping lines." },
    { name: "Leaving Room Lights On All Day", tier: "low", icon: "fa-lightbulb", desc: "Incandescent bulb run", fact: "Standard bulbs radiate 90% of electricity as heat, wasting grid energy." },
    { name: "Coal Grid Power Generation", tier: "high", icon: "fa-industry", desc: "Non-renewable electricity grid", fact: "Coal emits over 2x the carbon of natural gas per megawatt hour." },
    { name: "Buying a Used Coat from Thrift Shop", tier: "low", icon: "fa-socks", desc: "Circular economy product", fact: "Buying second-hand avoids 100% of production footprint!" }
]);

export const BADGES_DB = Object.freeze([
    { id: 'badge-calculating', title: 'Carbon Wizard', desc: 'Completed the baseline calculator.', icon: 'fa-clipboard-check' },
    { id: 'badge-game', title: 'Sorter Master', desc: 'Scored over 500 points in Sorter.', icon: 'fa-trophy' },
    { id: 'badge-habits', title: 'Green Pioneer', desc: 'Adopted 3 or more Eco Commits.', icon: 'fa-leaf' },
    { id: 'badge-level', title: 'Climate Hero', desc: 'Reached Eco Rank Level 3.', icon: 'fa-crown' },
    { id: 'badge-offset', title: 'Net-Zero Hero', desc: 'Invested in certified offset projects.', icon: 'fa-earth-americas' },
    { id: 'badge-goal', title: 'Carbon Clipper', desc: 'Met your carbon reduction goals.', icon: 'fa-bullseye' }
]);

export const ECO_TRIVIA = Object.freeze([
    "Food production accounts for over a quarter of global greenhouse emissions. Eating vegetarian/vegan is the fastest route to reducing agricultural footprint.",
    "A single mature tree absorbs roughly 22 kg of carbon dioxide from the atmosphere every year.",
    "Washing clothes on cold cycles uses up to 90% less energy than hot washes. It also keeps clothes looking new longer!",
    "Phantom energy is real. Electronics left plugged in on standby mode consume up to 10% of standard household electric bills.",
    "Taking public transport instead of driving a personal vehicle reduces carbon emissions by roughly 75% per mile.",
    "Approximately 80% of a smartphone's total lifetime emissions occur during manufacturing, before you even open the box."
]);

/**
 * Calculates baseline carbon emissions in kg CO2/year.
 * Defensive design with type coercion and safe defaults to prevent NaN errors.
 * @param {Object} d calculatorData state branch
 * @returns {Object} breakdown object with energy, transport, diet, lifestyle, and totalKg
 */
export function calculateBaselineEmissions(d) {
    if (!d || typeof d !== 'object') {
        d = {};
    }
    
    // Safely parse and fallback numeric parameters
    const safeFloat = (val, fallback = 0) => {
        const parsed = parseFloat(val);
        return isNaN(parsed) ? fallback : parsed;
    };

    // 1. Home Grid Region & Clean Mix offset
    const regionIntensity = safeFloat(d.regionVal, CALC_FACTORS.electricityCo2PerKwh);
    const electricity = safeFloat(d.electricity, 0);
    const cleanMix = safeFloat(d.cleanMix, 0);
    const gas = safeFloat(d.gas, 0);

    const electricCo2 = electricity * CALC_FACTORS.electricityPerDollar * regionIntensity * (1 - cleanMix);
    const gasCo2 = gas * CALC_FACTORS.gasPerDollar * CALC_FACTORS.gasCo2PerTherm;
    const energyTotal = electricCo2 + gasCo2;

    // 2. Transport (kg CO2 / year)
    let carFactor = CALC_FACTORS.carGasCo2PerMile;
    if (d.carType === 'hybrid') carFactor = CALC_FACTORS.carHybridCo2PerMile;
    else if (d.carType === 'electric') carFactor = CALC_FACTORS.carElectricCo2PerMile;

    const carMiles = safeFloat(d.carMiles, 0);
    const flights = safeFloat(d.flights, 0);
    const transit = safeFloat(d.transit, 0);

    const carCo2 = carMiles * carFactor;
    const flightCo2 = flights * CALC_FACTORS.flightCo2PerHour;
    const transitCo2 = transit * CALC_FACTORS.transitCo2PerMile;
    const transportTotal = carCo2 + flightCo2 + transitCo2;

    // 3. Diet & Grocery Planner (kg CO2 / year)
    const beefCo2PerLb = 12.2;
    const poultryCo2PerLb = 3.1;
    const dairyCo2PerLb = 2.0;
    const veggiesCo2PerLb = 0.5;

    const groceryBeef = safeFloat(d.groceryBeef, 0);
    const groceryPoultry = safeFloat(d.groceryPoultry, 0);
    const groceryDairy = safeFloat(d.groceryDairy, 0);
    const groceryVeggies = safeFloat(d.groceryVeggies, 0);

    const weeklyGroceryCo2 = (groceryBeef * beefCo2PerLb) + 
                            (groceryPoultry * poultryCo2PerLb) + 
                            (groceryDairy * dairyCo2PerLb) + 
                            (groceryVeggies * veggiesCo2PerLb);
    
    const dietBase = weeklyGroceryCo2 * 52;
    const foodWaste = safeFloat(d.foodWaste, 0);
    const wasteCo2 = foodWaste * (CALC_FACTORS.foodWasteBaseCo2 / 10);
    const dietTotal = dietBase + wasteCo2;

    // 4. Lifestyle (kg CO2 / year)
    let shopBase = CALC_FACTORS.shopMediumCo2;
    if (d.shopping === 'low') shopBase = CALC_FACTORS.shopLowCo2;
    else if (d.shopping === 'high') shopBase = CALC_FACTORS.shopHighCo2;

    const recycleOffset = d.recycle ? CALC_FACTORS.recycleOffset : 0;
    const lifestyleTotal = Math.max(0, shopBase + recycleOffset);

    return {
        energy: Math.round(energyTotal),
        transport: Math.round(transportTotal),
        diet: Math.round(dietTotal),
        lifestyle: Math.round(lifestyleTotal),
        totalKg: Math.round(energyTotal + transportTotal + dietTotal + lifestyleTotal)
    };
}
