/**
 * game.js - Eco-Sorter Mini-Game Engine & Synthesized Web Audio Effects.
 * Completely decoupled from global state via parameters and handlers.
 */

import { GAME_ITEMS } from './calculations.js';
import { saveScoreToFirebase, watchFirebaseLeaderboard } from './settings.js';

// --- Web Audio API Synth Sound Generator (Native browser audio - zero external loads) ---
export const SoundFX = {
    ctx: null,
    
    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
    },
    
    playCorrect() {
        this.init();
        if (!this.ctx) return;
        
        // High-pitched upward chime arpeggio
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.type = "sine";
        osc.frequency.setValueAtTime(523.25, this.ctx.currentTime); // C5
        osc.frequency.exponentialRampToValueAtTime(783.99, this.ctx.currentTime + 0.12); // G5
        
        gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.18);
        
        osc.start();
        osc.stop(this.ctx.currentTime + 0.18);
    },
    
    playIncorrect() {
        this.init();
        if (!this.ctx) return;
        
        // Low buzzy downward sweep sound
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(220, this.ctx.currentTime); // A3
        osc.frequency.linearRampToValueAtTime(110, this.ctx.currentTime + 0.22); // A2
        
        gain.gain.setValueAtTime(0.06, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.25);
        
        osc.start();
        osc.stop(this.ctx.currentTime + 0.25);
    },
    
    playLevelUp() {
        this.init();
        if (!this.ctx) return;
        
        const now = this.ctx.currentTime;
        const notes = [261.63, 329.63, 392.00, 523.25]; // Celebrate: C4, E4, G4, C5
        
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc.type = "triangle";
            osc.frequency.setValueAtTime(freq, now + idx * 0.08);
            
            gain.gain.setValueAtTime(0.12, now + idx * 0.08);
            gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.08 + 0.22);
            
            osc.start(now + idx * 0.08);
            osc.stop(now + idx * 0.08 + 0.22);
        });
    }
};

// --- Custom CSS/DOM Leaf Particle Trigger Helper ---
export function triggerGameParticles() {
    const symbols = ["🌱", "🌿", "🍃", "✨"];
    const container = document.querySelector(".game-arena-body");
    if (!container) return;

    for (let i = 0; i < 6; i++) {
        const p = document.createElement("div");
        p.className = "particle";
        p.textContent = symbols[Math.floor(Math.random() * symbols.length)];
        
        const offsetLeft = (Math.random() - 0.5) * 80;
        const offsetTop = (Math.random() - 0.5) * 40;
        const driftX = (Math.random() - 0.5) * 120;
        const rotation = 180 + Math.random() * 360;
        
        p.style.left = `calc(50% + ${offsetLeft}px)`;
        p.style.top = `calc(50% + ${offsetTop}px)`;
        p.style.setProperty("--dx", `${driftX}px`);
        p.style.setProperty("--rot", `${rotation}deg`);
        p.style.animationDelay = `${Math.random() * 0.15}s`;
        
        container.appendChild(p);
        
        setTimeout(() => p.remove(), 1000);
    }
}

let gameState = null;
let gameDOM = null;
let gameHandlers = null;

export function initSorterGame(state, DOM, handlers) {
    gameState = state;
    gameDOM = DOM;
    gameHandlers = handlers;

    if (DOM.btnStartGame) DOM.btnStartGame.addEventListener("click", startNewGame);
    if (DOM.btnRestartGame) DOM.btnRestartGame.addEventListener("click", startNewGame);

    DOM.binBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            if (!gameState.game.isPlaying) return;
            const chosenTier = btn.getAttribute("data-tier");
            handleGameChoice(chosenTier);
        });
    });

    // Listen to live cloud leaderboard updates
    window.addEventListener('ecoloop-firebase-ready', () => {
        watchFirebaseLeaderboard((list) => {
            renderLeaderboard(list);
        });
    });

    try {
        if (window.firebase) {
            watchFirebaseLeaderboard((list) => {
                renderLeaderboard(list);
            });
        }
    } catch (err) {}

    // Keyboard support with button active state feedback
    document.addEventListener("keydown", (e) => {
        const gameTab = document.getElementById("game");
        if (!gameTab || !gameTab.classList.contains("active") || !gameState.game.isPlaying) return;

        let targetBin = null;
        let chosenTier = null;

        if (e.key === "1" || e.key === "ArrowLeft") {
            targetBin = document.querySelector(".bin-low");
            chosenTier = "low";
        } else if (e.key === "2" || e.key === "ArrowDown") {
            targetBin = document.querySelector(".bin-medium");
            chosenTier = "medium";
        } else if (e.key === "3" || e.key === "ArrowRight") {
            targetBin = document.querySelector(".bin-high");
            chosenTier = "high";
        }

        if (targetBin && chosenTier) {
            targetBin.classList.add("active-keyboard");
            setTimeout(() => targetBin.classList.remove("active-keyboard"), 150);
            handleGameChoice(chosenTier);
        }
    });

    renderLeaderboard();
}

function startNewGame() {
    gameState.game.isPlaying = true;
    gameState.game.score = 0;
    gameState.game.streak = 0;
    gameState.game.maxStreak = 0;
    gameState.game.lives = 3;
    gameState.game.xpEarned = 0;
    
    gameState.game.remainingItems = [...GAME_ITEMS].sort(() => Math.random() - 0.5);

    document.getElementById("screen-start").classList.remove("active");
    document.getElementById("screen-gameover").classList.remove("active");
    document.getElementById("screen-play").classList.add("active");

    updateGameHUD();
    loadNextGameItem();
    gameHandlers.announceToScreenReader("Eco-Sorter Game Started. First card loaded. Use Arrow keys to sort.");
}

function updateGameHUD() {
    if (gameDOM.gameScore) gameDOM.gameScore.textContent = gameState.game.score;
    if (gameDOM.gameStreak) gameDOM.gameStreak.textContent = gameState.game.streak;
    if (gameDOM.gameLives) {
        gameDOM.gameLives.textContent = gameState.game.lives;
        if (gameState.game.lives === 1) gameDOM.gameLives.className = "text-coral font-bold";
        else gameDOM.gameLives.className = "";
    }
}

function loadNextGameItem() {
    if (gameState.game.remainingItems.length === 0 || gameState.game.lives <= 0) {
        endGame();
        return;
    }

    if (gameDOM.gameFeedback) {
        gameDOM.gameFeedback.textContent = "Select the carbon tier! Keyboard: [1]=Low, [2]=Med, [3]=High";
        gameDOM.gameFeedback.className = "game-hint";
    }

    gameState.game.currentItem = gameState.game.remainingItems.pop();
    
    if (gameDOM.itemName) gameDOM.itemName.textContent = gameState.game.currentItem.name;
    if (gameDOM.itemDesc) gameDOM.itemDesc.textContent = gameState.game.currentItem.desc;
    if (gameDOM.itemIcon) {
        gameDOM.itemIcon.className = `fa-solid ${gameState.game.currentItem.icon}`;
    }

    if (gameDOM.factContent) gameDOM.factContent.textContent = gameState.game.currentItem.fact;
    gameHandlers.announceToScreenReader(`New card: ${gameState.game.currentItem.name}. ${gameState.game.currentItem.desc}`);
}

function handleGameChoice(tier) {
    const card = document.getElementById("current-item-card");
    const feedback = gameDOM.gameFeedback;
    if (!card) return;
    
    const isCorrect = gameState.game.currentItem.tier === tier;

    if (isCorrect) {
        gameState.game.streak++;
        if (gameState.game.streak > gameState.game.maxStreak) {
            gameState.game.maxStreak = gameState.game.streak;
        }

        const pointsGained = Math.min(30, 10 + (gameState.game.streak - 1) * 5);
        gameState.game.score += pointsGained;

        card.classList.add("success-glow");
        if (feedback) {
            feedback.textContent = `Correct! +${pointsGained} Points. Streak: ${gameState.game.streak}`;
            feedback.className = "game-hint correct";
        }
        gameHandlers.announceToScreenReader(`Correct! Gained ${pointsGained} points. Current Streak is ${gameState.game.streak}.`);
        
        // Triggers audio cue and floating leaf particles
        try {
            SoundFX.playCorrect();
            triggerGameParticles();
        } catch (err) {}
    } else {
        gameState.game.lives--;
        gameState.game.streak = 0;

        card.classList.add("error-glow");
        if (feedback) {
            feedback.textContent = `Wrong! Correct answer was: ${gameState.game.currentItem.tier.toUpperCase()}`;
            feedback.className = "game-hint incorrect";
        }
        gameHandlers.announceToScreenReader(`Incorrect choice. Correct tier was ${gameState.game.currentItem.tier}. Lives remaining: ${gameState.game.lives}.`);
        
        // Triggers error audio chime
        try { SoundFX.playIncorrect(); } catch (err) {}
    }

    gameState.game.isPlaying = false;
    updateGameHUD();

    setTimeout(() => {
        card.classList.remove("success-glow");
        card.classList.remove("error-glow");
        gameState.game.isPlaying = true;
        loadNextGameItem();
    }, 1200);
}

function endGame() {
    gameState.game.isPlaying = false;
    
    document.getElementById("screen-play").classList.remove("active");
    document.getElementById("screen-gameover").classList.add("active");

    if (gameDOM.displayFinalScore) gameDOM.displayFinalScore.textContent = gameState.game.score;
    if (gameDOM.displayMaxStreak) gameDOM.displayMaxStreak.textContent = gameState.game.maxStreak;

    const gainedXp = Math.min(60, Math.round(gameState.game.score * 0.1));
    if (gameDOM.gameXpEarned) gameDOM.gameXpEarned.textContent = gainedXp;
    
    gameHandlers.addXP(gainedXp);

    if (gameState.game.score >= 500) {
        gameHandlers.unlockBadge('badge-game');
    }

    updateLeaderboard(gameState.game.score);
    gameHandlers.announceToScreenReader(`Game Over. Final Score: ${gameState.game.score} points. Maximum streak: ${gameState.game.maxStreak}. Earned ${gainedXp} XP.`);
}

function updateLeaderboard(score) {
    const lowScoreObj = gameState.userProfile.highScores[2];
    const profileName = gameState.userProfile.name || "You";
    
    // Save to Firebase database in real time
    saveScoreToFirebase(profileName, score);

    if (!lowScoreObj || score > lowScoreObj.score) {
        const newRecord = { name: `${profileName} (You)`, score: score };
        gameState.userProfile.highScores.push(newRecord);
        gameState.userProfile.highScores.sort((a,b) => b.score - a.score);
        gameState.userProfile.highScores = gameState.userProfile.highScores.slice(0,3);
        
        gameHandlers.saveState();
        
        if (!window.firebase) {
            renderLeaderboard();
        }
    }
}

export function renderLeaderboard(customList = null) {
    if (!gameDOM.leaderboardList) return;

    gameDOM.leaderboardList.innerHTML = "";
    
    const listToRender = customList || gameState.userProfile.highScores;

    listToRender.forEach((record, index) => {
        const li = document.createElement("li");
        
        const numSpan = document.createElement("span");
        numSpan.className = "leader-num";
        numSpan.textContent = index + 1;
        
        const nameSpan = document.createElement("span");
        nameSpan.className = "leader-name";
        
        const isUser = record.name.includes("You") || record.name === gameState.userProfile.name;
        if (isUser) {
            const strong = document.createElement("strong");
            strong.className = "text-emerald";
            strong.textContent = record.name;
            nameSpan.appendChild(strong);
        } else {
            nameSpan.textContent = record.name;
        }

        const scoreSpan = document.createElement("span");
        scoreSpan.className = "leader-score";
        scoreSpan.textContent = `${record.score.toLocaleString()} pts`;
        
        li.appendChild(numSpan);
        li.appendChild(nameSpan);
        li.appendChild(scoreSpan);
        gameDOM.leaderboardList.appendChild(li);
    });
}
