/**
 * js/offsets.js - Offset simulator controls and mapping engines.
 * Separation of Concerns: Handles simulated offsets marketplace and interactive map rendering.
 */

import { state } from './state.js';
import { getServiceKey } from '../settings.js';
import { clearElement } from './dom.js';
import { addXP, unlockBadge } from './state.js';
import { SoundFX } from '../game.js';
import { calculateBaselineEmissions } from '../calculations.js';

/**
 * Binds purchase buttons and triggers Map renders.
 * @param {Function} onOffsetPurchase Callback triggered upon successful purchase simulation
 */
export function initOffsetSimulator(onOffsetPurchase) {
    const offsetBtns = document.querySelectorAll(".btn-offset-simulate");
    offsetBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            const project = btn.getAttribute("data-project");
            const price = parseFloat(btn.getAttribute("data-price")) || 10;
            
            const baseTons = parseFloat((calculateBaselineEmissions(state.calculatorData).totalKg) / 1000) || 0;
            if (baseTons <= 0) {
                alert("Your carbon footprint is already zero! Excellent job.");
                return;
            }

            const totalCost = baseTons * price;

            if (confirm(`🌎 Do you want to invest in the "${project}" carbon credit offset program?\n\nThis will purchase offsets for your annual emissions of ${baseTons.toFixed(1)} Tons at a simulated cost of $${totalCost.toFixed(2)}.\n\n(This is a demo simulation — no real payment is required)`)) {
                state.calculatorData.offsetPurchased = Math.ceil(baseTons);
                addXP(50);
                unlockBadge('badge-offset');
                onOffsetPurchase();
                
                try { SoundFX.playLevelUp(); } catch (err) {}

                const banner = document.getElementById("offset-status-msg");
                if (banner) {
                    banner.textContent = `✅ Offset purchase successful! Invested $${totalCost.toFixed(2)} in ${project}. Your net emissions are now 0.0 Tons.`;
                    banner.className = "offset-summary-banner mt-3 text-2xs text-center text-emerald font-semibold";
                }
                
                alert(`🏆 Achievement Unlocked: Net-Zero Hero! You successfully offset ${baseTons.toFixed(1)} Tons of carbon emissions.`);
            }
        });
    });

    try { initOffsetMap(); } catch (e) { console.warn("Offset map init failed:", e); }

    window.addEventListener('ecoloop-settings-changed', () => {
        try { initOffsetMap(); } catch (e) { console.error(e); }
    });
}

function initOffsetMap() {
    const container = document.getElementById("offset-map-container");
    if (!container) return;

    const mapsKey = getServiceKey('mapsKey');
    if (mapsKey) {
        if (!document.getElementById('ecoloop-maps-script')) {
            const script = document.createElement('script');
            script.id = 'ecoloop-maps-script';
            script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(mapsKey)}&callback=initGoogleMap`;
            script.async = true;
            script.defer = true;
            document.head.appendChild(script);
            
            window.initGoogleMap = () => {
                renderGoogleMap(container);
            };
        } else if (window.google && window.google.maps) {
            renderGoogleMap(container);
        }
    } else {
        renderSVGFallbackMap(container);
    }
}

function renderGoogleMap(container) {
    clearElement(container);
    const mapDiv = document.createElement("div");
    mapDiv.style.width = "100%";
    mapDiv.style.height = "100%";
    container.appendChild(mapDiv);

    try {
        const map = new google.maps.Map(mapDiv, {
            center: { lat: 10.0, lng: -20.0 },
            zoom: 1,
            disableDefaultUI: true,
            styles: [
                { elementType: "geometry", stylers: [{ color: "#090d11" }] },
                { elementType: "labels.text.stroke", stylers: [{ color: "#090d11" }] },
                { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
                { featureType: "water", elementType: "geometry", stylers: [{ color: "#0d1b2a" }] }
            ]
        });

        const projects = [
            { name: "Amazon Reforestation", position: { lat: -3.4653, lng: -62.2159 } },
            { name: "Wind Power Expansion", position: { lat: 36.1699, lng: -115.1398 } }
        ];

        projects.forEach(proj => {
            const marker = new google.maps.Marker({
                position: proj.position,
                map: map,
                title: proj.name,
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 6,
                    fillColor: "#10B981",
                    fillOpacity: 0.9,
                    strokeWeight: 1,
                    strokeColor: "#ffffff"
                }
            });

            const contentDiv = document.createElement("div");
            contentDiv.style.color = "#000";
            contentDiv.style.fontSize = "12px";
            contentDiv.style.fontWeight = "600";
            contentDiv.style.padding = "2px";
            contentDiv.textContent = proj.name;

            const infoWindow = new google.maps.InfoWindow({
                content: contentDiv
            });

            marker.addListener("click", () => {
                infoWindow.open(map, marker);
            });
        });
    } catch (e) {
        console.error("Google maps init failed:", e);
        renderSVGFallbackMap(container);
    }
}

function renderSVGFallbackMap(container) {
    clearElement(container);
    const svgString = `
        <svg class="fallback-svg-map" viewBox="0 0 300 120" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <pattern id="map-grid" width="15" height="15" patternUnits="userSpaceOnUse">
                    <path d="M 15 0 L 0 0 0 15" fill="none" stroke="rgba(255,255,255,0.02)" stroke-width="0.5"/>
                </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#map-grid)" />
            
            <path d="M 20,20 Q 50,15 80,30 T 90,50 Q 75,70 60,60 T 30,55 Z" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.08)" stroke-width="0.75" />
            <path d="M 70,60 Q 90,70 85,90 T 75,110 T 65,85 Z" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.08)" stroke-width="0.75" />
            <path d="M 130,20 Q 180,10 240,25 T 280,55 Q 260,70 230,60 T 170,75 Z" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.08)" stroke-width="0.75" />
            <path d="M 145,55 Q 180,60 185,80 T 170,110 T 150,85 Z" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.08)" stroke-width="0.75" />
            <path d="M 240,80 Q 270,75 280,90 T 250,105 Z" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.08)" stroke-width="0.75" />
            
            <g class="map-marker" transform="translate(80, 75)" id="map-marker-amazon" tabindex="0" role="button" aria-label="Amazon Reforestation Project Site">
                <circle r="7" fill="#10B981" opacity="0.3" class="marker-pulse"></circle>
                <circle r="4" fill="#10B981" stroke="#ffffff" stroke-width="1" />
                <title>Amazon Reforestation Project (Click to purchase Offset)</title>
            </g>
            
            <g class="map-marker" transform="translate(50, 35)" id="map-marker-wind" tabindex="0" role="button" aria-label="Wind Power Expansion Project Site">
                <circle r="7" fill="#06B6D4" opacity="0.3" class="marker-pulse"></circle>
                <circle r="4" fill="#06B6D4" stroke="#ffffff" stroke-width="1" />
                <title>Wind Power Expansion Project (Click to purchase Offset)</title>
            </g>
            
            <text x="10" y="112" fill="var(--text-dim)" font-size="7" font-family="monospace">SVG Localizer Fallback (Offline)</text>
        </svg>
    `;
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, "image/svg+xml");
    const svgEl = doc.documentElement;
    container.appendChild(svgEl);

    const amazonMarker = container.querySelector("#map-marker-amazon");
    const windMarker = container.querySelector("#map-marker-wind");

    if (amazonMarker) {
        amazonMarker.addEventListener("click", () => {
            const btn = document.querySelector(".btn-offset-simulate[data-project='Amazon Reforestation']");
            if (btn) btn.click();
        });
        amazonMarker.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                const btn = document.querySelector(".btn-offset-simulate[data-project='Amazon Reforestation']");
                if (btn) btn.click();
            }
        });
    }

    if (windMarker) {
        windMarker.addEventListener("click", () => {
            const btn = document.querySelector(".btn-offset-simulate[data-project='Wind Power Expansion']");
            if (btn) btn.click();
        });
        windMarker.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                const btn = document.querySelector(".btn-offset-simulate[data-project='Wind Power Expansion']");
                if (btn) btn.click();
            }
        });
    }
}
