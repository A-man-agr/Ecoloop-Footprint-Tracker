/**
 * js/navigation.js - Sidebar navigation controller.
 * Separation of Concerns: Handles application tab routing and visual focus states.
 */

import { DOM, announceToScreenReader } from './dom.js';
import { EcoGlobe } from '../globe.js';

/**
 * Attaches navigation click and keyboard arrow key listeners to sidebar buttons.
 * @param {Function} onTabChanged Callback function triggered when navigation finishes
 */
export function initNavigation(onTabChanged) {
    if (!DOM.navItems) return;

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
                    break;
            }
            
            announceToScreenReader(`Routed to tab ${tabId}. ${DOM.pageSubtitle.textContent}`);
            
            if (typeof onTabChanged === 'function') {
                onTabChanged(tabId);
            }
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
