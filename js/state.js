/**
 * js/state.js - State management, localStorage sync, and XP Rank progression.
 * Separation of Concerns: Handles application state mutations and synchronization.
 */

import { sanitizeInput } from '../settings.js';
import { BADGES_DB } from '../calculations.js';
import { DOM, announceToScreenReader, clearElement } from './dom.js';
import { SoundFX } from '../game.js';

export const DEFAULT_STATE = {
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
        flightClass: 'economy',
        transit: 20,
        transitType: 'bus',
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
    history: [11.2, 10.4, 9.8, 9.1, 8.7, 8.2],
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

export let state = JSON.parse(JSON.stringify(DEFAULT_STATE));

/**
 * Saves application state to localStorage as a JSON string.
 */
export function saveStateToStorage() {
    localStorage.setItem("ecoloop_state", JSON.stringify(state));
}

/**
 * Loads state from localStorage and validates the object schema to block XSS payloads.
 */
export function loadStateFromStorage() {
    const saved = localStorage.getItem("ecoloop_state");
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            
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
                    const pd = parsed.calculatorData;
                    state.calculatorData.electricity = Math.max(0, Math.min(500, parseFloat(pd.electricity) || 100));
                    state.calculatorData.cleanMix = Math.max(0, Math.min(1.0, parseFloat(pd.cleanMix) || 0));
                    state.calculatorData.regionVal = ['0.38', '0.22', '0.52', '0.36', '0.18'].includes(pd.regionVal) ? pd.regionVal : '0.38';
                    state.calculatorData.gas = Math.max(0, Math.min(300, parseFloat(pd.gas) || 40));
                    state.calculatorData.carMiles = Math.max(0, Math.min(1000, parseFloat(pd.carMiles) || 150));
                    state.calculatorData.carType = ['gas', 'hybrid', 'electric'].includes(pd.carType) ? pd.carType : 'gas';
                    state.calculatorData.flights = Math.max(0, Math.min(100, parseFloat(pd.flights) || 10));
                    state.calculatorData.flightClass = ['economy', 'business', 'first'].includes(pd.flightClass) ? pd.flightClass : 'economy';
                    state.calculatorData.transit = Math.max(0, Math.min(300, parseFloat(pd.transit) || 20));
                    state.calculatorData.transitType = ['bus', 'train'].includes(pd.transitType) ? pd.transitType : 'bus';
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

/**
 * Resets application state to default values and removes key records from localStorage.
 */
export function resetState() {
    localStorage.removeItem("ecoloop_state");
    BADGES_DB.forEach(badge => {
        localStorage.removeItem(`unlocked_${badge.id}`);
    });
    state = JSON.parse(JSON.stringify(DEFAULT_STATE));
    saveStateToStorage();
}

/**
 * Increments XP values and handles leveling up progressions.
 * @param {number} amount XP points to add
 */
export function addXP(amount) {
    state.userProfile.xp += amount;
    
    let requiredXp = state.userProfile.level * 120;
    while (state.userProfile.xp >= requiredXp) {
        state.userProfile.xp -= requiredXp;
        state.userProfile.level++;
        requiredXp = state.userProfile.level * 120;
        
        alert(`✨ LEVEL UP! You reached Eco Rank Level ${state.userProfile.level}!`);
        announceToScreenReader(`Level up! Reached Level ${state.userProfile.level}`);
        
        try { SoundFX.playLevelUp(); } catch (err) {}

        if (state.userProfile.level >= 3) {
            unlockBadge('badge-level');
        }
    }
    
    updateRankDisplay();
    saveStateToStorage();
}

/**
 * Updates UI textual rank levels and status displays in the DOM.
 */
export function updateRankDisplay() {
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
        clearElement(DOM.rankIconWrapper);
        const iconEl = document.createElement("i");
        iconEl.className = `fa-solid ${icon}`;
        DOM.rankIconWrapper.appendChild(iconEl);
    }

    const nextThreshold = level * 120;
    if (DOM.xpCurrent) DOM.xpCurrent.textContent = `${state.userProfile.xp} XP`;
    if (DOM.xpNext) DOM.xpNext.textContent = `${nextThreshold} XP`;
    
    if (DOM.xpBarFill) {
        const percent = Math.min(100, (state.userProfile.xp / nextThreshold) * 100);
        DOM.xpBarFill.style.width = `${percent}%`;
    }
}

/**
 * Unlocks a badge achievement and grants XP bonuses.
 * @param {string} badgeId ID of the badge
 */
export function unlockBadge(badgeId) {
    if (localStorage.getItem(`unlocked_${badgeId}`) !== 'true') {
        localStorage.setItem(`unlocked_${badgeId}`, 'true');
        addXP(50);
        
        const badgeName = BADGES_DB.find(b => b.id === badgeId).title;
        alert(`🏆 Achievement Unlocked: ${badgeName}! +50 XP`);
        announceToScreenReader(`Badge unlocked: ${badgeName}. Earned 50 bonus XP.`);
        
        window.dispatchEvent(new CustomEvent('ecoloop-badge-unlocked'));
    }
}
