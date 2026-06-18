/**
 * globe.js - Encapsulates the 3D WebGL Eco-Sphere particle globe rendering.
 * Uses Three.js loaded via CDN.
 */

export const EcoGlobe = {
    renderer: null,
    scene: null,
    camera: null,
    globeGroup: null,
    points: null,
    wireframe: null,
    innerSphere: null,
    animationFrameId: null,
    isInteracting: false,
    prevMouseX: 0,
    prevMouseY: 0,
    rotationSpeedX: 0.005,
    rotationSpeedY: 0.002,
    targetRotationX: 0,
    targetRotationY: 0,

    init() {
        const container = document.getElementById("globe-3d-container");
        const canvas = document.getElementById("canvas-3d-globe");
        const THREE = window.THREE;
        if (!container || !canvas || typeof THREE === 'undefined') {
            console.warn("3D Globe initialization skipped. Canvas or Three.js missing.");
            return;
        }

        try {
            // Check if user prefers reduced motion (WCAG 2.1 AAA accessibility)
            const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            if (prefersReducedMotion) {
                this.rotationSpeedX = 0;
                this.rotationSpeedY = 0;
            } else {
                this.rotationSpeedX = 0.005;
                this.rotationSpeedY = 0.002;
            }

            // Setup scene & camera
            this.scene = new THREE.Scene();
            this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
            this.camera.position.z = 5.5;

            // Setup renderer with alpha (transparent background)
            this.renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
            this.resize();

            // Create group to hold elements
            this.globeGroup = new THREE.Group();
            this.scene.add(this.globeGroup);

            // 1. Inner dark sphere for volume
            const innerGeom = new THREE.SphereGeometry(1.5, 24, 24);
            const innerMat = new THREE.MeshBasicMaterial({
                color: 0x090D11,
                transparent: true,
                opacity: 0.6
            });
            this.innerSphere = new THREE.Mesh(innerGeom, innerMat);
            this.globeGroup.add(this.innerSphere);

            // 2. Outer Wireframe Sphere
            const outerGeom = new THREE.SphereGeometry(1.51, 16, 16);
            const wireframeMat = new THREE.MeshBasicMaterial({
                color: 0x10B981, // Default color (will update dynamically)
                wireframe: true,
                transparent: true,
                opacity: 0.25
            });
            this.wireframe = new THREE.Mesh(outerGeom, wireframeMat);
            this.globeGroup.add(this.wireframe);

            // 3. Particle system (Globe Dots for premium look)
            const particlesCount = 200;
            const particlesGeom = new THREE.BufferGeometry();
            const positions = new Float32Array(particlesCount * 3);

            for (let i = 0; i < particlesCount; i++) {
                // Spherical coordinates mapping to a shell
                const u = Math.random();
                const v = Math.random();
                const theta = u * 2.0 * Math.PI;
                const phi = Math.acos(2.0 * v - 1.0);
                const r = 1.52;

                positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
                positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
                positions[i * 3 + 2] = r * Math.cos(phi);
            }

            particlesGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));

            const pointsMat = new THREE.PointsMaterial({
                color: 0x10B981,
                size: 0.08,
                transparent: true,
                opacity: 0.85
            });

            this.points = new THREE.Points(particlesGeom, pointsMat);
            this.globeGroup.add(this.points);

            // Lights
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
            this.scene.add(ambientLight);

            // Add events
            this.setupInteractions(container);

            // Listen to window resizes
            window.addEventListener('resize', () => this.resize());
            
            // Initial color update (will be overridden on calculation update)
            this.updateColor(0.0);

            // Hide fallback icon on successful WebGL initialization
            const fallback = document.querySelector(".fallback-icon");
            if (fallback) fallback.style.display = "none";

            // Start animation loop
            this.animate();
        } catch (err) {
            console.error("Error setting up 3D Globe WebGL:", err);
            // Fallback display
            container.innerHTML = `<div class="badge-icon-large text-emerald"><i class="fa-solid fa-seedling"></i></div>`;
        }
    },

    resize() {
        const container = document.getElementById("globe-3d-container");
        if (!this.renderer || !container) return;

        const rect = container.getBoundingClientRect();
        const width = rect.width || 120;
        const height = rect.height || 120;

        // Apply high-DPI rendering scaling (WOW / Premium code quality!)
        const pixelRatio = Math.min(window.devicePixelRatio, 2);
        this.renderer.setPixelRatio(pixelRatio);
        this.renderer.setSize(width, height, false);

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
    },

    updateColor(netTons) {
        if (!this.wireframe || !this.points) return;
        
        let activeColor = 0x10B981; // Green
        if (netTons >= 12.0) {
            activeColor = 0xEF4444; // Red/Coral
        } else if (netTons >= 5.0) {
            activeColor = 0xF59E0B; // Orange/Amber
        }

        this.wireframe.material.color.setHex(activeColor);
        this.points.material.color.setHex(activeColor);
    },

    setupInteractions(container) {
        const handleStart = (clientX, clientY) => {
            this.isInteracting = true;
            this.prevMouseX = clientX;
            this.prevMouseY = clientY;
        };

        const handleMove = (clientX, clientY) => {
            if (!this.isInteracting) return;
            const deltaX = clientX - this.prevMouseX;
            const deltaY = clientY - this.prevMouseY;

            this.targetRotationY += deltaX * 0.015;
            this.targetRotationX += deltaY * 0.015;

            this.prevMouseX = clientX;
            this.prevMouseY = clientY;
        };

        const handleEnd = () => {
            this.isInteracting = false;
        };

        // Mouse Events
        container.addEventListener("mousedown", (e) => handleStart(e.clientX, e.clientY));
        window.addEventListener("mousemove", (e) => handleMove(e.clientX, e.clientY));
        window.addEventListener("mouseup", handleEnd);

        // Touch Events
        container.addEventListener("touchstart", (e) => {
            if (e.touches.length > 0) handleStart(e.touches[0].clientX, e.touches[0].clientY);
        });
        window.addEventListener("touchmove", (e) => {
            if (e.touches.length > 0) handleMove(e.touches[0].clientX, e.touches[0].clientY);
        });
        window.addEventListener("touchend", handleEnd);

        // Keyboard Navigation (Arrow Keys) for Accessibility
        container.addEventListener("keydown", (e) => {
            if (e.key === "ArrowLeft") {
                this.targetRotationY -= 0.15;
                e.preventDefault();
            } else if (e.key === "ArrowRight") {
                this.targetRotationY += 0.15;
                e.preventDefault();
            } else if (e.key === "ArrowUp") {
                this.targetRotationX -= 0.15;
                e.preventDefault();
            } else if (e.key === "ArrowDown") {
                this.targetRotationX += 0.15;
                e.preventDefault();
            }
        });
    },

    start() {
        if (!this.animationFrameId && this.renderer) {
            this.animate();
        }
    },

    stop() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    },

    animate() {
        this.animationFrameId = requestAnimationFrame(() => this.animate());

        if (this.globeGroup) {
            // Automatic smooth rotation when idle
            if (!this.isInteracting) {
                this.targetRotationY += this.rotationSpeedY;
                this.targetRotationX *= 0.95; // Decay tilt
            }

            // Interpolation for smooth transitions
            this.globeGroup.rotation.y += (this.targetRotationY - this.globeGroup.rotation.y) * 0.08;
            this.globeGroup.rotation.x += (this.targetRotationX - this.globeGroup.rotation.x) * 0.08;
        }

        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }
};
