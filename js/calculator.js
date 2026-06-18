/**
 * js/calculator.js - Calculator wizard and input handlers.
 * Separation of Concerns: Handles calculator wizard forms interactions.
 */

import { state } from './state.js';
import { DOM, announceToScreenReader, setButtonWithIcon } from './dom.js';
import { addXP, unlockBadge } from './state.js';

/**
 * Attaches wizard step transitions, slider updates, and diet changes to calculation logic.
 * @param {Function} onCalculationUpdate Callback triggered on input events to refresh output
 */
export function initCalculatorWizard(onCalculationUpdate) {
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
                onCalculationUpdate();
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
            onCalculationUpdate();
        });
    }

    const cleanMixInputs = document.querySelectorAll("input[name='clean-mix']");
    cleanMixInputs.forEach(input => {
        if (parseFloat(input.value) === state.calculatorData.cleanMix) input.checked = true;
        input.addEventListener("change", () => {
            state.calculatorData.cleanMix = parseFloat(input.value);
            onCalculationUpdate();
        });
    });

    const carTypeInputs = document.querySelectorAll("input[name='car-type']");
    carTypeInputs.forEach(input => {
        if (input.value === state.calculatorData.carType) input.checked = true;
        input.addEventListener("change", () => {
            state.calculatorData.carType = input.value;
            onCalculationUpdate();
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
            
            // Auto-populate weekly grocery inputs based on selected diet type (UX synchronization!)
            const beefInput = document.getElementById("input-grocery-beef");
            const poultryInput = document.getElementById("input-grocery-poultry");
            const dairyInput = document.getElementById("input-grocery-dairy");
            const veggiesInput = document.getElementById("input-grocery-veggies");
            
            let beef = 2, poultry = 4, dairy = 3, veggies = 10; // defaults for 'average'
            
            if (input.value === 'meat-heavy') {
                beef = 4; poultry = 6; dairy = 4; veggies = 8;
            } else if (input.value === 'vegetarian') {
                beef = 0; poultry = 0; dairy = 5; veggies = 15;
            } else if (input.value === 'vegan') {
                beef = 0; poultry = 0; dairy = 0; veggies = 20;
            }
            
            state.calculatorData.groceryBeef = beef;
            state.calculatorData.groceryPoultry = poultry;
            state.calculatorData.groceryDairy = dairy;
            state.calculatorData.groceryVeggies = veggies;
            
            if (beefInput) beefInput.value = beef;
            if (poultryInput) poultryInput.value = poultry;
            if (dairyInput) dairyInput.value = dairy;
            if (veggiesInput) veggiesInput.value = veggies;
            
            onCalculationUpdate();
        });
    });

    const shopInputs = document.querySelectorAll("input[name='shopping']");
    shopInputs.forEach(input => {
        if (input.value === state.calculatorData.shopping) input.checked = true;
        input.addEventListener("change", () => {
            state.calculatorData.shopping = input.value;
            onCalculationUpdate();
        });
    });

    const recycleInput = document.getElementById("input-recycle");
    if (recycleInput) {
        recycleInput.checked = state.calculatorData.recycle;
        recycleInput.addEventListener("change", () => {
            state.calculatorData.recycle = recycleInput.checked;
            onCalculationUpdate();
        });
    }

    const flightClassSelect = document.getElementById("input-flight-class");
    if (flightClassSelect) {
        flightClassSelect.value = state.calculatorData.flightClass || "economy";
        flightClassSelect.addEventListener("change", () => {
            state.calculatorData.flightClass = flightClassSelect.value;
            onCalculationUpdate();
        });
    }

    const transitTypeSelect = document.getElementById("input-transit-type");
    if (transitTypeSelect) {
        transitTypeSelect.value = state.calculatorData.transitType || "bus";
        transitTypeSelect.addEventListener("change", () => {
            state.calculatorData.transitType = transitTypeSelect.value;
            onCalculationUpdate();
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
                    setButtonWithIcon(nextBtn, "Calculate", "fa-solid fa-check", true);
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
                setButtonWithIcon(nextBtn, "Next", "fa-solid fa-arrow-right", true);

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
                        setButtonWithIcon(nextBtn, "Calculate", "fa-solid fa-check", true);
                    } else {
                        setButtonWithIcon(nextBtn, "Next", "fa-solid fa-arrow-right", true);
                    }
                }
            });
        });
    }
}
