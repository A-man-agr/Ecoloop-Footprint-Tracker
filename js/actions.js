/**
 * js/actions.js - Action Checklist plan and badges panel.
 * Separation of Concerns: Handles commitment plan interactions and achievements rendering.
 */

import { ACTIONS_DB, BADGES_DB } from '../calculations.js';
import { state, addXP, unlockBadge } from './state.js';
import { DOM, clearElement, announceToScreenReader } from './dom.js';

/**
 * Sets up action checklist items, filters, and unlocks badge handlers.
 * @param {Function} onActionChange Callback triggered when a checklist commitment is added/removed
 */
export function initActionChecklist(onActionChange) {
    const filterBtns = document.querySelectorAll(".category-filter-btn");
    filterBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            filterBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            
            const filterVal = btn.getAttribute("data-filter");
            renderActionChecklist(filterVal, onActionChange);
        });
    });
    
    window.addEventListener('ecoloop-badge-unlocked', () => {
        renderBadges();
    });

    renderActionChecklist("all", onActionChange);
}

/**
 * Renders the filtered action plan checkboxes.
 * @param {string} filter Category filter type
 * @param {Function} onActionChange Callback to report modifications
 */
export function renderActionChecklist(filter = "all", onActionChange) {
    if (!DOM.checklistContainer) return;

    const filtered = filter === "all" ? ACTIONS_DB : ACTIONS_DB.filter(a => a.category === filter);

    clearElement(DOM.checklistContainer);
    
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
            onActionChange();
        });

        DOM.checklistContainer.appendChild(row);
    });
}

/**
 * Recalculates metrics and updates textual active counters in the dashboard summary card.
 */
export function updateActionSummary() {
    let totalSavings = 0;
    state.activeCommits.forEach(id => {
        const act = ACTIONS_DB.find(a => a.id === id);
        if (act) totalSavings += act.savings;
    });

    if (DOM.annualSavingsEl) DOM.annualSavingsEl.textContent = totalSavings;
    if (DOM.activeCommitsEl) DOM.activeCommitsEl.textContent = state.activeCommits.length;

    renderBadges();
}

/**
 * Re-draws the user badges UI depending on XP achievements and commitments loaded.
 */
export function renderBadges() {
    if (!DOM.badgesContainer) return;

    const unlockedCount = BADGES_DB.filter(b => {
        return (state.activeCommits.length >= 3 && b.id === 'badge-habits') ||
               (state.userProfile.level >= 3 && b.id === 'badge-level') ||
               (localStorage.getItem(`unlocked_${b.id}`) === 'true');
    }).length;

    if (DOM.unlockedBadgesEl) DOM.unlockedBadgesEl.textContent = unlockedCount;

    clearElement(DOM.badgesContainer);
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
