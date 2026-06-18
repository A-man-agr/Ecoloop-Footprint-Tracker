/**
 * js/dom.js - DOM references cache and safe rendering utility helpers.
 * Separation of Concerns: Handles DOM access and screen reader announcements.
 */

export const DOM = {
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

/**
 * Populates the DOM references cache with document query elements.
 */
export function cacheDOMReferences() {
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

/**
 * Safely clears all child nodes of a given element.
 * @param {HTMLElement} element Target element
 */
export function clearElement(element) {
    if (!element) return;
    while (element.firstChild) {
        element.removeChild(element.firstChild);
    }
}

/**
 * Safely sets the content of a button using DOM APIs to avoid dynamic HTML parsing warnings.
 * @param {HTMLElement} btn Target button element
 * @param {string} text Button text
 * @param {string} iconClass FontAwesome class list (e.g. "fa-solid fa-check")
 * @param {boolean} iconAfter If true, place the icon after the text
 */
export function setButtonWithIcon(btn, text, iconClass, iconAfter = false) {
    if (!btn) return;
    clearElement(btn);
    const icon = document.createElement("i");
    icon.className = iconClass;
    icon.setAttribute("aria-hidden", "true");
    
    if (iconAfter) {
        btn.appendChild(document.createTextNode(text + " "));
        btn.appendChild(icon);
    } else {
        btn.appendChild(icon);
        btn.appendChild(document.createTextNode(" " + text));
    }
}

/**
 * Triggers invisible audio updates to assistive screen readers.
 * @param {string} message message text
 */
export function announceToScreenReader(message) {
    if (DOM.srAnnouncer) {
        DOM.srAnnouncer.textContent = message;
    }
}

/**
 * Manages modal focus trapping and keyboard interactions (Escape key closing, Tab key cycling).
 * Implements WCAG 2.1 compliant accessible modal dialog behaviors.
 * @param {HTMLElement} modal The modal container element
 */
export function manageModalA11y(modal) {
    if (!modal) return;

    let previousFocus = null;
    const focusableElements = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.attributeName === 'class') {
                const isActive = modal.classList.contains('active');
                if (isActive) {
                    previousFocus = document.activeElement;
                    
                    setTimeout(() => {
                        const focusables = modal.querySelectorAll(focusableElements);
                        if (focusables.length > 0) {
                            focusables[0].focus();
                        }
                    }, 50);

                    modal.addEventListener('keydown', handleKeydown);
                } else {
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
        if (e.key === 'Escape') {
            modal.classList.remove('active');
            return;
        }

        if (e.key === 'Tab') {
            const focusables = Array.from(modal.querySelectorAll(focusableElements)).filter(el => {
                return el.tabIndex !== -1 && el.offsetParent !== null;
            });
            if (focusables.length === 0) return;

            const first = focusables[0];
            const last = focusables[focusables.length - 1];

            if (e.shiftKey) {
                if (document.activeElement === first) {
                    last.focus();
                    e.preventDefault();
                }
            } else {
                if (document.activeElement === last) {
                    first.focus();
                    e.preventDefault();
                }
            }
        }
    }
}
