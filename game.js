// Alien Jump Game - Main JavaScript File
// Initial game setup and basic structure

// Game configuration constants
const GAME_CONFIG = {
    CANVAS_WIDTH: 800,
    CANVAS_HEIGHT: 400,
    GROUND_LEVEL: 350,
    GRAVITY: 0.8,
    JUMP_FORCE: -15,
    MOVE_SPEED: 5,
    TARGET_FPS: 60
};

// Game state constants
const GAME_STATES = {
    MENU: 'menu',
    PLAYING: 'playing',
    PAUSED: 'paused',
    GAME_OVER: 'game_over',
    VICTORY: 'victory',
    LOADING: 'loading'
};

// Character configuration constants
const CHARACTER_CONFIG = {
    WIDTH: 30,
    HEIGHT: 40,
    START_X: 100,
    START_Y: GAME_CONFIG.GROUND_LEVEL - 40,
    MAX_SPEED: GAME_CONFIG.MOVE_SPEED,
    JUMP_FORCE: GAME_CONFIG.JUMP_FORCE,
    GRAVITY: GAME_CONFIG.GRAVITY,
    FRICTION: 0.8,
    COYOTE_TIME: 0.1, // Time after leaving ground where jump is still allowed
    ANIMATION_SPEED: 0.15,
    AUTO_RUN_SPEED: 3, // Constant forward movement speed
    CAMERA_FOLLOW_SPEED: 1.0 // How smoothly camera follows (1.0 = instant)
};

// Global game variables
let canvas;
let ctx;
let gameEngine;

// Renderer class - Manages all rendering operations and visual effects
class Renderer {
    constructor(canvas, context) {
        this.canvas = canvas;
        this.ctx = context;
        
        // Rendering settings
        this.pixelPerfect = true;
        this.smoothing = false;
        
        // Camera/viewport settings
        this.camera = {
            x: 0,
            y: 0,
            zoom: 1,
            shake: { x: 0, y: 0 },
            targetX: 0,
            followSpeed: CHARACTER_CONFIG.CAMERA_FOLLOW_SPEED
        };
        
        // Visual effects
        this.particles = [];
        this.screenEffects = [];
        
        // Performance tracking
        this.drawCalls = 0;
        this.lastFrameDrawCalls = 0;
        
        this.initializeCanvas();
        console.log('Renderer initialized');
    }
    
    // Initialize canvas settings
    initializeCanvas() {
        this.ctx.imageSmoothingEnabled = !this.pixelPerfect;
        this.ctx.textBaseline = 'top';
    }
    
    // Clear the canvas
    clear(color = '#001122') {
        this.drawCalls = 0;
        
        this.ctx.fillStyle = color;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawCalls++;
    }
    
    // Apply camera transformations
    applyCameraTransform() {
        this.ctx.save();
        
        // Apply camera shake
        this.ctx.translate(this.camera.shake.x, this.camera.shake.y);
        
        // Apply camera position and zoom (for world objects)
        this.ctx.scale(this.camera.zoom, this.camera.zoom);
        this.ctx.translate(-this.camera.x, -this.camera.y);
    }
    
    // Reset camera transformations
    resetCameraTransform() {
        this.ctx.restore();
    }
    
    // Set camera shake
    setCameraShake(intensity, duration = 0.5) {
        this.screenEffects.push({
            type: 'shake',
            intensity: intensity,
            duration: duration,
            timer: 0
        });
    }
    
    // Update camera to follow target (alien character)
    followTarget(targetX, targetY = 0) {
        // Keep alien character centered horizontally, but offset a bit to show what's ahead
        this.camera.targetX = targetX - this.canvas.width * 0.3; // Show more of what's ahead
        
        // Smooth camera following (increased speed for better responsiveness)
        const deltaX = this.camera.targetX - this.camera.x;
        this.camera.x += deltaX * Math.max(this.camera.followSpeed, 0.3); // Minimum 30% follow speed
        
        // Prevent camera from going too far left (don't show negative world space)
        this.camera.x = Math.max(0, this.camera.x);
    }
    
    // Get world position from screen position
    screenToWorld(screenX, screenY) {
        return {
            x: screenX + this.camera.x,
            y: screenY + this.camera.y
        };
    }
    
    // Get screen position from world position
    worldToScreen(worldX, worldY) {
        return {
            x: worldX - this.camera.x,
            y: worldY - this.camera.y
        };
    }
    
    // Update visual effects
    updateEffects(deltaTime) {
        // Update screen effects
        this.screenEffects = this.screenEffects.filter(effect => {
            effect.timer += deltaTime;
            
            switch (effect.type) {
                case 'shake':
                    const progress = effect.timer / effect.duration;
                    if (progress >= 1) return false;
                    
                    const shakeAmount = effect.intensity * (1 - progress);
                    this.camera.shake.x = (Math.random() - 0.5) * shakeAmount;
                    this.camera.shake.y = (Math.random() - 0.5) * shakeAmount;
                    return true;
                    
                default:
                    return false;
            }
        });
        
        // Reset shake if no shake effects
        if (!this.screenEffects.some(e => e.type === 'shake')) {
            this.camera.shake.x = 0;
            this.camera.shake.y = 0;
        }
        
        // Update particles
        this.particles = this.particles.filter(particle => {
            particle.update(deltaTime);
            return particle.life > 0;
        });
    }
    
    // Render scrolling ground
    renderGround(groundLevel) {
        // Calculate visible world area
        const worldStartX = this.camera.x;
        const worldEndX = this.camera.x + this.canvas.width;
        
        // Render ground for visible area plus some buffer
        const bufferSize = 100;
        const renderStartX = worldStartX - bufferSize;
        const renderEndX = worldEndX + bufferSize;
        const renderWidth = renderEndX - renderStartX;
        
        this.ctx.fillStyle = '#228B22';
        this.ctx.fillRect(renderStartX, groundLevel, renderWidth, this.canvas.height - groundLevel);
        this.drawCalls++;
        
        // Add ground texture with world-based positioning
        this.ctx.fillStyle = '#1a6b1a';
        const textureSpacing = 20;
        const startTextureX = Math.floor(renderStartX / textureSpacing) * textureSpacing;
        
        for (let x = startTextureX; x < renderEndX; x += textureSpacing) {
            this.ctx.fillRect(x, groundLevel, 2, this.canvas.height - groundLevel);
        }
        this.drawCalls++;
    }
    
    // Render scrolling background
    renderBackground() {
        // Gradient background (fixed to screen, not world)
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#001122');
        gradient.addColorStop(0.7, '#002244');
        gradient.addColorStop(1, '#003366');
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawCalls++;
        
        // Add planets with different parallax speeds
        this.renderPlanets();
        
        // Add parallax stars that move slower than camera
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        const parallaxOffset = this.camera.x * 0.2; // Stars move slower for depth effect
        
        for (let i = 0; i < 80; i++) { // More stars for space atmosphere
            const baseX = (i * 73) % (this.canvas.width * 4); // Even wider star field
            const x = (baseX - parallaxOffset) % (this.canvas.width + 100);
            const y = (i * 23) % (this.canvas.height * 0.7);
            
            if (x >= -10 && x <= this.canvas.width + 10) {
                // Different star sizes for depth
                const starSize = (i % 3 === 0) ? 2 : 1;
                const alpha = (i % 4 === 0) ? 0.9 : 0.6;
                this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
                this.ctx.fillRect(x, y, starSize, starSize);
            }
        }
        this.drawCalls++;
    }
    
    // Render planets in the background
    renderPlanets() {
        const planets = [
            // Large distant planet
            { 
                x: 150, y: 80, radius: 40, 
                color: '#4a5568', ringColor: '#718096', 
                parallax: 0.05, hasRings: true 
            },
            // Medium planet
            { 
                x: 600, y: 50, radius: 25, 
                color: '#e53e3e', ringColor: null, 
                parallax: 0.08, hasRings: false 
            },
            // Small planet
            { 
                x: 400, y: 120, radius: 15, 
                color: '#38a169', ringColor: null, 
                parallax: 0.12, hasRings: false 
            },
            // Tiny moon
            { 
                x: 700, y: 100, radius: 8, 
                color: '#a0aec0', ringColor: null, 
                parallax: 0.15, hasRings: false 
            },
            // Large blue planet (far)
            { 
                x: 200, y: 200, radius: 35, 
                color: '#3182ce', ringColor: '#4299e1', 
                parallax: 0.03, hasRings: true 
            }
        ];
        
        planets.forEach(planet => {
            const parallaxOffset = this.camera.x * planet.parallax;
            const planetX = (planet.x - parallaxOffset) % (this.canvas.width + planet.radius * 4);
            
            // Only render if planet is visible
            if (planetX >= -planet.radius * 2 && planetX <= this.canvas.width + planet.radius * 2) {
                this.renderSinglePlanet(planetX, planet.y, planet.radius, planet.color, planet.ringColor, planet.hasRings);
            }
        });
    }
    
    // Render a single planet
    renderSinglePlanet(x, y, radius, color, ringColor, hasRings) {
        this.ctx.save();
        
        // Draw rings behind planet if it has them
        if (hasRings && ringColor) {
            this.ctx.strokeStyle = ringColor;
            this.ctx.lineWidth = 2;
            this.ctx.globalAlpha = 0.6;
            
            // Draw multiple ring ellipses
            for (let i = 1; i <= 3; i++) {
                this.ctx.beginPath();
                this.ctx.ellipse(x, y, radius + (i * 8), (radius + (i * 8)) * 0.2, 0, 0, Math.PI * 2);
                this.ctx.stroke();
            }
            this.ctx.globalAlpha = 1;
        }
        
        // Draw planet shadow/gradient
        const gradient = this.ctx.createRadialGradient(
            x - radius * 0.3, y - radius * 0.3, 0,
            x, y, radius
        );
        gradient.addColorStop(0, this.lightenColor(color, 0.3));
        gradient.addColorStop(0.7, color);
        gradient.addColorStop(1, this.darkenColor(color, 0.4));
        
        // Draw planet
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Add atmosphere glow
        this.ctx.globalAlpha = 0.3;
        this.ctx.fillStyle = this.lightenColor(color, 0.5);
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius + 3, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.restore();
    }
    
    // Helper function to lighten a color
    lightenColor(color, amount) {
        // Simple color lightening - convert hex to rgb and lighten
        const hex = color.replace('#', '');
        const r = Math.min(255, parseInt(hex.substr(0, 2), 16) + Math.floor(255 * amount));
        const g = Math.min(255, parseInt(hex.substr(2, 2), 16) + Math.floor(255 * amount));
        const b = Math.min(255, parseInt(hex.substr(4, 2), 16) + Math.floor(255 * amount));
        return `rgb(${r}, ${g}, ${b})`;
    }
    
    // Helper function to darken a color
    darkenColor(color, amount) {
        const hex = color.replace('#', '');
        const r = Math.max(0, parseInt(hex.substr(0, 2), 16) - Math.floor(255 * amount));
        const g = Math.max(0, parseInt(hex.substr(2, 2), 16) - Math.floor(255 * amount));
        const b = Math.max(0, parseInt(hex.substr(4, 2), 16) - Math.floor(255 * amount));
        return `rgb(${r}, ${g}, ${b})`;
    }
    
    // Render text with outline
    renderTextWithOutline(text, x, y, fillColor = '#ffffff', outlineColor = '#000000', font = '16px Arial') {
        this.ctx.font = font;
        this.ctx.textAlign = 'left';
        
        // Draw outline
        this.ctx.strokeStyle = outlineColor;
        this.ctx.lineWidth = 2;
        this.ctx.strokeText(text, x, y);
        
        // Draw fill
        this.ctx.fillStyle = fillColor;
        this.ctx.fillText(text, x, y);
        
        this.drawCalls += 2;
    }
    
    // Render UI elements
    renderUI(gameState, fps, alienCharacter = null, levelConfig = null) {
        // FPS counter
        this.renderTextWithOutline(`FPS: ${fps}`, 10, 10, '#ffffff', '#000000', '12px Arial');
        
        // Game state info
        this.renderTextWithOutline(`Status: ${gameState.currentState}`, 10, 25, '#ffffff', '#000000', '12px Arial');
        
        // Level and score info
        this.ctx.font = '14px Arial';
        this.ctx.textAlign = 'right';
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillText(`Level: ${gameState.level}`, this.canvas.width - 10, 10);
        this.ctx.fillText(`Punkte: ${gameState.score}`, this.canvas.width - 10, 25);
        
        // Lives display with hearts
        const livesText = 'Leben: ';
        this.ctx.fillText(livesText, this.canvas.width - 10, 40);
        
        const heartsStartX = this.canvas.width - 10 - this.ctx.measureText(livesText).width;
        for (let i = 0; i < gameState.lives; i++) {
            this.renderHeart(heartsStartX - (i * 12) - 8, 33);
        }
        
        // Distance traveled indicator
        if (alienCharacter) {
            this.ctx.font = '12px Arial';
            this.ctx.textAlign = 'left';
            this.ctx.fillStyle = '#ffff00';
            this.ctx.fillText(`Entfernung: ${Math.round(alienCharacter.position.x)}px`, 10, 60);
            
            // Next level indicator
            const nextLevelDistance = Math.ceil(alienCharacter.position.x / 1000) * 1000;
            const distanceToNextLevel = nextLevelDistance - alienCharacter.position.x;
            this.ctx.fillStyle = '#00ffaa';
            this.ctx.fillText(`Nächstes Level: ${Math.round(distanceToNextLevel)}px`, 10, 75);
        }
        
        // Difficulty indicator
        if (gameState.levelManager) {
            this.ctx.fillStyle = '#ff8800';
            this.ctx.fillText(`Schwierigkeit: ${(gameState.levelManager.difficultyMultiplier || 1).toFixed(1)}x`, 10, 90);
        }
        
        // Touch control hint for mobile
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        this.ctx.font = '10px Arial';
        this.ctx.textAlign = 'right';
        this.ctx.fillText('📱 Tippen/Klicken zum Springen', this.canvas.width - 10, this.canvas.height - 10);
        
        this.drawCalls += 7;
    }
    
    // Render heart icon
    renderHeart(x, y) {
        this.ctx.fillStyle = '#ff4444';
        this.ctx.fillRect(x, y + 2, 8, 6);
        this.ctx.fillRect(x + 1, y, 2, 2);
        this.ctx.fillRect(x + 5, y, 2, 2);
        this.drawCalls++;
    }
    
    // Add particle effect
    addParticle(x, y, type = 'dust') {
        const particle = new Particle(x, y, type);
        this.particles.push(particle);
    }
    
    // Render all particles
    renderParticles() {
        this.particles.forEach(particle => {
            particle.render(this.ctx);
        });
        this.drawCalls += this.particles.length;
    }
    
    // Get rendering statistics
    getRenderStats() {
        this.lastFrameDrawCalls = this.drawCalls;
        return {
            drawCalls: this.drawCalls,
            particles: this.particles.length,
            effects: this.screenEffects.length
        };
    }
}

// Simple Particle class for visual effects
class Particle {
    constructor(x, y, type = 'dust') {
        this.x = x;
        this.y = y;
        this.type = type;
        this.life = 1.0;
        this.maxLife = 1.0;
        
        switch (type) {
            case 'dust':
                this.vx = (Math.random() - 0.5) * 2;
                this.vy = -Math.random() * 2;
                this.size = 1 + Math.random() * 2;
                this.color = '#cccccc';
                break;
                
            case 'spark':
                this.vx = (Math.random() - 0.5) * 4;
                this.vy = -Math.random() * 4;
                this.size = 1;
                this.color = '#ffff00';
                break;
                
            case 'blood':
                this.vx = (Math.random() - 0.5) * 3;
                this.vy = -Math.random() * 3;
                this.size = 2;
                this.color = '#ff4444';
                break;
        }
    }
    
    update(deltaTime) {
        this.x += this.vx * deltaTime * 60;
        this.y += this.vy * deltaTime * 60;
        this.vy += 0.2; // Gravity
        
        this.life -= deltaTime;
    }
    
    render(ctx) {
        const alpha = this.life / this.maxLife;
        ctx.fillStyle = this.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
        ctx.fillRect(this.x, this.y, this.size, this.size);
    }
}

// PhysicsEngine class - Handles all physics calculations and simulations
class PhysicsEngine {
    constructor() {
        // Physics constants
        this.gravity = GAME_CONFIG.GRAVITY;
        this.friction = 0.8;
        this.airResistance = 0.99;
        this.terminalVelocity = 20;
        
        // Collision detection settings
        this.collisionPrecision = 1; // Pixels per collision check step
        
        console.log('PhysicsEngine initialized');
    }
    
    // Apply gravity to an entity
    applyGravity(entity, deltaTime) {
        if (!entity.isGrounded) {
            const gravityForce = this.gravity * deltaTime * 60; // Scale for 60 FPS
            entity.velocity.y += gravityForce;
            
            // Apply terminal velocity limit
            if (entity.velocity.y > this.terminalVelocity) {
                entity.velocity.y = this.terminalVelocity;
            }
        }
    }
    
    // Apply friction to horizontal movement
    applyFriction(entity, deltaTime) {
        if (entity.isGrounded) {
            entity.velocity.x *= this.friction;
            
            // Stop very small movements to prevent jitter
            if (Math.abs(entity.velocity.x) < 0.1) {
                entity.velocity.x = 0;
            }
        } else {
            // Apply air resistance
            entity.velocity.x *= this.airResistance;
        }
    }
    
    // Update entity position based on velocity
    updatePosition(entity, deltaTime) {
        const timeScale = deltaTime * 60; // Scale for 60 FPS
        
        entity.position.x += entity.velocity.x * timeScale;
        entity.position.y += entity.velocity.y * timeScale;
    }
    
    // Check collision between two rectangular entities
    checkCollision(entityA, entityB) {
        const boundsA = entityA.getCollisionBounds ? entityA.getCollisionBounds() : {
            x: entityA.position.x,
            y: entityA.position.y,
            width: entityA.width,
            height: entityA.height
        };
        
        const boundsB = entityB.getCollisionBounds ? entityB.getCollisionBounds() : {
            x: entityB.position.x,
            y: entityB.position.y,
            width: entityB.width,
            height: entityB.height
        };
        
        return boundsA.x < boundsB.x + boundsB.width &&
               boundsA.x + boundsA.width > boundsB.x &&
               boundsA.y < boundsB.y + boundsB.height &&
               boundsA.y + boundsA.height > boundsB.y;
    }
    
    // Resolve collision between entity and obstacle
    resolveCollision(entity, obstacle, collisionType = 'spike') {
        const entityBounds = entity.getCollisionBounds();
        const obstacleBounds = obstacle.getCollisionBounds();
        
        // Calculate overlap amounts
        const overlapX = Math.min(
            entityBounds.x + entityBounds.width - obstacleBounds.x,
            obstacleBounds.x + obstacleBounds.width - entityBounds.x
        );
        
        const overlapY = Math.min(
            entityBounds.y + entityBounds.height - obstacleBounds.y,
            obstacleBounds.y + obstacleBounds.height - entityBounds.y
        );
        
        // Resolve based on collision type
        switch (collisionType) {
            case 'spike':
                // Spikes cause damage and knockback
                return this.resolveSpikeCollision(entity, obstacle, overlapX, overlapY);
                
            case 'platform':
                // Platforms provide solid collision
                return this.resolvePlatformCollision(entity, obstacle, overlapX, overlapY);
                
            case 'ground':
                // Ground collision
                return this.resolveGroundCollision(entity, obstacle, overlapX, overlapY);
                
            default:
                return false;
        }
    }
    
    // Resolve spike collision with knockback
    resolveSpikeCollision(entity, spike, overlapX, overlapY) {
        // Calculate knockback direction
        const entityCenterX = entity.position.x + entity.width / 2;
        const spikeCenterX = spike.position.x + spike.width / 2;
        
        const knockbackForce = 8;
        const knockbackDirection = entityCenterX < spikeCenterX ? -1 : 1;
        
        // Apply knockback
        entity.velocity.x = knockbackDirection * knockbackForce;
        entity.velocity.y = -5; // Small upward bounce
        
        return true; // Collision resolved
    }
    
    // Resolve platform collision (solid surfaces)
    resolvePlatformCollision(entity, platform, overlapX, overlapY) {
        // Determine collision side based on smallest overlap
        if (overlapX < overlapY) {
            // Horizontal collision
            if (entity.position.x < platform.position.x) {
                // Hit from left
                entity.position.x = platform.position.x - entity.width;
                entity.velocity.x = 0;
            } else {
                // Hit from right
                entity.position.x = platform.position.x + platform.width;
                entity.velocity.x = 0;
            }
        } else {
            // Vertical collision
            if (entity.position.y < platform.position.y) {
                // Hit from above (landing on platform)
                entity.position.y = platform.position.y - entity.height;
                entity.velocity.y = 0;
                entity.isGrounded = true;
            } else {
                // Hit from below (hitting ceiling)
                entity.position.y = platform.position.y + platform.height;
                entity.velocity.y = 0;
            }
        }
        
        return true;
    }
    
    // Resolve ground collision
    resolveGroundCollision(entity, ground, overlapX, overlapY) {
        // Simple ground collision - entity lands on top
        entity.position.y = ground.position.y - entity.height;
        entity.velocity.y = 0;
        entity.isGrounded = true;
        
        return true;
    }
    
    // Check if entity is within world bounds
    checkWorldBounds(entity, worldWidth, worldHeight) {
        let corrected = false;
        
        // Left boundary
        if (entity.position.x < 0) {
            entity.position.x = 0;
            entity.velocity.x = 0;
            corrected = true;
        }
        
        // Right boundary
        if (entity.position.x + entity.width > worldWidth) {
            entity.position.x = worldWidth - entity.width;
            entity.velocity.x = 0;
            corrected = true;
        }
        
        // Top boundary (usually not needed for platformers)
        if (entity.position.y < 0) {
            entity.position.y = 0;
            entity.velocity.y = 0;
            corrected = true;
        }
        
        // Bottom boundary (death zone)
        if (entity.position.y > worldHeight) {
            return 'death'; // Entity fell off the world
        }
        
        return corrected ? 'corrected' : 'ok';
    }
    
    // Simulate projectile motion (for jump prediction)
    simulateProjectileMotion(startPos, initialVelocity, timeStep = 0.016, maxTime = 3.0) {
        const trajectory = [];
        let pos = { ...startPos };
        let vel = { ...initialVelocity };
        let time = 0;
        
        while (time < maxTime && pos.y <= GAME_CONFIG.GROUND_LEVEL) {
            trajectory.push({ x: pos.x, y: pos.y, time: time });
            
            // Update velocity (gravity)
            vel.y += this.gravity * timeStep * 60;
            
            // Update position
            pos.x += vel.x * timeStep * 60;
            pos.y += vel.y * timeStep * 60;
            
            time += timeStep;
        }
        
        return trajectory;
    }
    
    // Calculate optimal jump velocity to reach target
    calculateJumpToTarget(startPos, targetPos, jumpForce) {
        const dx = targetPos.x - startPos.x;
        const dy = targetPos.y - startPos.y;
        
        // Calculate required horizontal velocity
        const horizontalVel = dx / (Math.abs(jumpForce) / this.gravity);
        
        // Check if jump is possible
        const maxHorizontalVel = CHARACTER_CONFIG.MAX_SPEED;
        if (Math.abs(horizontalVel) > maxHorizontalVel) {
            return null; // Jump not possible
        }
        
        return {
            x: horizontalVel,
            y: -Math.abs(jumpForce)
        };
    }
    
    // Get physics debug info
    getDebugInfo(entity) {
        return {
            position: { ...entity.position },
            velocity: { ...entity.velocity },
            isGrounded: entity.isGrounded,
            speed: Math.sqrt(entity.velocity.x * entity.velocity.x + entity.velocity.y * entity.velocity.y),
            kineticEnergy: 0.5 * (entity.velocity.x * entity.velocity.x + entity.velocity.y * entity.velocity.y)
        };
    }
}

// LevelManager class - Manages level generation and obstacle placement
class LevelManager {
    constructor() {
        // Level configuration
        this.currentLevel = 1;
        this.levelHeight = GAME_CONFIG.CANVAS_HEIGHT;
        this.groundLevel = GAME_CONFIG.GROUND_LEVEL;
        
        // Endless runner settings
        this.isEndlessMode = true;
        this.nextSpikeX = 300; // X position for next spike
        this.spikeGenerationDistance = 800; // Generate spikes this far ahead
        this.lastGeneratedX = 0; // Track how far we've generated
        
        // Obstacle generation settings
        this.minSpikeDistance = 150; // Minimum distance between spikes (increased)
        this.maxSpikeDistance = 250; // Maximum distance between spikes (increased)
        this.spikeHeightVariation = 10; // Height variation for spikes
        
        // Candy generation settings
        this.spikeCounter = 0; // Count spikes generated
        this.spikesUntilNextCandy = this.getRandomSpikesForNextCandy(); // Countdown to next candy
        this.minCandyDistance = 150; // Minimum distance between candies
        this.lastCandyX = 0; // Track last candy position
        
        // Level progression settings
        this.difficultyMultiplier = 1.0;
        this.difficultyIncreaseRate = 0.1; // How much difficulty increases over time
        this.distanceTraveled = 0;
        
        // Jump validation settings (simplified for reliability)
        this.alienMaxJumpHeight = 50; // Fixed safe value
        this.alienMaxJumpDistance = 300; // Increased to match larger spike distances
        this.safetyMargin = 5; // Extra pixels for safety
        
        console.log('LevelManager initialized in endless mode');
    }
    
    // Get random number of spikes until next candy (10-20 spikes)
    getRandomSpikesForNextCandy() {
        return 10 + Math.floor(Math.random() * 11); // 10-20 spikes
    }
    
    // Generate initial level configuration
    generateLevel(levelNumber = this.currentLevel) {
        console.log(`LevelManager: Generating initial level ${levelNumber}`);
        
        const levelConfig = {
            levelNumber: levelNumber,
            width: 999999, // Infinite width for endless runner
            height: this.levelHeight,
            groundLevel: this.groundLevel,
            spikePositions: [],
            alienStartPosition: { x: CHARACTER_CONFIG.START_X, y: CHARACTER_CONFIG.START_Y },
            goalPosition: null // No fixed goal in endless mode
        };
        
        // Generate initial spikes
        levelConfig.spikePositions = this.generateInitialSpikes();
        
        return levelConfig;
    }
    
    // Generate initial spikes for the start of the level
    generateInitialSpikes() {
        const spikes = [];
        const startX = 300; // Start generating spikes after alien start position
        const endX = startX + this.spikeGenerationDistance;
        
        let currentX = startX;
        while (currentX < endX) {
            const spike = this.generateSingleSpike(currentX);
            spikes.push(spike);
            
            // Increment spike counter and decrement candy countdown for initial spikes too
            this.spikeCounter++;
            this.spikesUntilNextCandy--;
            
            // Calculate next spike position
            const spacing = this.minSpikeDistance + Math.random() * (this.maxSpikeDistance - this.minSpikeDistance);
            currentX += spacing;
        }
        
        this.nextSpikeX = currentX;
        this.lastGeneratedX = endX;
        
        console.log(`Generated ${spikes.length} initial spikes (total spike count: ${this.spikeCounter}, candy countdown: ${this.spikesUntilNextCandy})`);
        return spikes;
    }
    
    // Generate a single spike at given X position
    generateSingleSpike(x) {
        // Validate input
        if (isNaN(x)) {
            console.error('Invalid x position for spike:', x);
            x = 0;
        }
        
        // Calculate spike height with difficulty scaling (reduced size)
        const baseHeight = 18; // Reduced from 25 to 18
        const difficultyHeight = Math.floor((this.difficultyMultiplier || 1) * 3); // Reduced from 5 to 3
        const randomHeight = Math.random() * (this.spikeHeightVariation || 8); // Reduced from 10 to 8
        const maxHeight = (this.alienMaxJumpHeight || 50) - (this.safetyMargin || 5);
        const height = Math.min(maxHeight, baseHeight + difficultyHeight + randomHeight);
        
        // Validate calculated values
        const groundLevel = this.groundLevel || GAME_CONFIG.GROUND_LEVEL;
        const finalHeight = Math.max(8, Math.round(height)); // Reduced minimum from 10 to 8
        const finalY = groundLevel - finalHeight;
        
        return {
            x: Math.round(x),
            y: finalY,
            width: 15, // Reduced from 20 to 15
            height: finalHeight
        };
    }
    
    // Update endless level generation based on alien position
    updateEndlessLevel(alienX, spikeObstacles) {
        // Debug: Log every 100 pixels
        if (Math.floor(alienX / 100) !== Math.floor(this.distanceTraveled / 100)) {
            console.log(`Endless level update: alienX=${Math.round(alienX)}, lastGenerated=${Math.round(this.lastGeneratedX)}`);
        }
        
        // Update distance traveled and difficulty
        this.distanceTraveled = Math.max(this.distanceTraveled, alienX);
        this.difficultyMultiplier = 1.0 + (this.distanceTraveled / 1000) * this.difficultyIncreaseRate;
        
        // Check if we need to generate more spikes ahead
        const generationThreshold = alienX + this.spikeGenerationDistance;
        
        if (this.lastGeneratedX < generationThreshold) {
            const oldLastGenerated = this.lastGeneratedX;
            const newSpikes = this.generateMoreSpikes(this.lastGeneratedX, generationThreshold);
            
            // Generate candies using the full range, not the updated lastGeneratedX
            const newCandies = this.generateCandies(oldLastGenerated, generationThreshold);
            
            // Add new spikes to the game
            newSpikes.forEach(spikeData => {
                const spike = new SpikeObstacle(spikeData.x, spikeData.y, spikeData.width, spikeData.height);
                spikeObstacles.push(spike);
            });
            
            this.lastGeneratedX = generationThreshold;
            console.log(`Generated ${newSpikes.length} new spikes and ${newCandies.length} candies ahead (total spikes: ${this.spikeCounter})`);
            
            return newCandies; // Return candies to be added by GameEngine
        }
        
        return []; // No new candies
        
        // Remove spikes that are far behind the alien (cleanup)
        const cleanupThreshold = alienX - 500;
        const initialCount = spikeObstacles.length;
        
        for (let i = spikeObstacles.length - 1; i >= 0; i--) {
            if (spikeObstacles[i].position.x < cleanupThreshold) {
                spikeObstacles.splice(i, 1);
            }
        }
        
        if (spikeObstacles.length < initialCount) {
            console.log(`Cleaned up ${initialCount - spikeObstacles.length} old spikes`);
        }
    }
    
    // Generate more spikes in a given range
    generateMoreSpikes(startX, endX) {
        const spikes = [];
        let currentX = Math.max(startX, this.nextSpikeX);
        
        while (currentX < endX) {
            const spike = this.generateSingleSpike(currentX);
            spikes.push(spike);
            
            // Increment spike counter and decrement candy countdown
            this.spikeCounter++;
            this.spikesUntilNextCandy--;
            
            // Calculate next spike position with some randomness
            const baseSpacing = this.minSpikeDistance + Math.random() * (this.maxSpikeDistance - this.minSpikeDistance);
            const difficultySpacing = Math.max(0, baseSpacing - this.difficultyMultiplier * 10); // Closer spikes as difficulty increases
            currentX += Math.max(this.minSpikeDistance, difficultySpacing);
        }
        
        this.nextSpikeX = currentX;
        return spikes;
    }
    
    // Generate candies in a given range
    generateCandies(startX, endX) {
        const candies = [];
        
        console.log(`🍬 Candy check: spikes=${this.spikeCounter}, countdown=${this.spikesUntilNextCandy}, range=${Math.round(startX)}-${Math.round(endX)} (${Math.round(endX - startX)}px)`);
        
        // Check if it's time to spawn a candy (countdown reached 0 or below)
        if (this.spikesUntilNextCandy <= 0) {
            // Calculate candy position - place it ahead of current generation area
            let candyX = Math.max(endX + 50, this.lastCandyX + this.minCandyDistance);
            
            // If that's too close to last candy, place it further ahead
            if (candyX < this.lastCandyX + this.minCandyDistance) {
                candyX = this.lastCandyX + this.minCandyDistance;
            }
            
            // Random height - can be on ground or floating
            const heightOptions = [
                this.groundLevel - 30,  // On ground
                this.groundLevel - 80,  // Low floating
                this.groundLevel - 120, // Medium floating
                this.groundLevel - 160  // High floating
            ];
            
            const candyY = heightOptions[Math.floor(Math.random() * heightOptions.length)];
            
            candies.push({
                x: candyX,
                y: candyY,
                isFloating: candyY < this.groundLevel - 40 // Mark as floating if above ground level
            });
            
            this.lastCandyX = candyX;
            
            // Reset countdown to new random interval
            this.spikesUntilNextCandy = this.getRandomSpikesForNextCandy();
            
            console.log(`🍬 Candy spawned at ${Math.round(candyX)} after ${this.spikeCounter} spikes! Next candy in ${this.spikesUntilNextCandy} spikes (placed ahead of generation area)`);
        }
        
        return candies;
    }
    
    // Generate spike positions with proper spacing
    generateSpikePositions(count, levelNumber) {
        const positions = [];
        const startX = 150; // Start placing spikes after alien start position
        const endX = this.levelWidth - 150; // End before goal
        const availableWidth = endX - startX;
        
        // Calculate base spacing
        const baseSpacing = availableWidth / (count + 1);
        
        for (let i = 0; i < count; i++) {
            // Calculate position with some randomization
            const baseX = startX + (i + 1) * baseSpacing;
            const randomOffset = (Math.random() - 0.5) * 40; // ±20 pixels variation
            const x = Math.max(startX, Math.min(endX, baseX + randomOffset));
            
            // Calculate spike height with variation
            const baseHeight = 25 + (levelNumber - 1) * 2; // Slightly taller spikes in later levels
            const heightVariation = (Math.random() - 0.5) * this.spikeHeightVariation;
            const height = Math.max(20, Math.min(40, baseHeight + heightVariation));
            
            const y = this.groundLevel - height;
            
            positions.push({
                x: Math.round(x),
                y: Math.round(y),
                width: 20,
                height: Math.round(height)
            });
        }
        
        // Sort by x position
        positions.sort((a, b) => a.x - b.x);
        
        return positions;
    }
    
    // Validate that all spikes can be jumped over (uses advanced validation)
    validateJumpability(spikePositions) {
        console.log('Starting jumpability validation...');
        
        // Use advanced validation system
        const validatedPositions = this.validateJumpabilityAdvanced(spikePositions);
        
        // Additional safety check: ensure minimum viable path exists
        if (validatedPositions.length > 0) {
            const pathExists = this.verifyMinimumViablePath(validatedPositions);
            if (!pathExists) {
                console.warn('No viable path found, applying emergency fixes...');
                return this.applyEmergencyFixes(validatedPositions);
            }
        }
        
        return validatedPositions;
    }
    
    // Verify that a minimum viable path exists through all obstacles
    verifyMinimumViablePath(spikePositions) {
        let currentX = CHARACTER_CONFIG.START_X;
        
        for (const spike of spikePositions) {
            const gapDistance = spike.x - currentX;
            
            // Check if gap is jumpable
            if (gapDistance > this.alienMaxJumpDistance) {
                console.error(`Unjumpable gap detected: ${gapDistance}px at spike ${spike.x}`);
                return false;
            }
            
            // Check if spike is too tall
            if (spike.height > this.alienMaxJumpHeight) {
                console.error(`Unjumpable spike detected: ${spike.height}px tall at ${spike.x}`);
                return false;
            }
            
            currentX = spike.x + spike.width;
        }
        
        return true;
    }
    
    // Apply emergency fixes to ensure level is completable
    applyEmergencyFixes(spikePositions) {
        console.log('Applying emergency fixes to ensure completability...');
        
        const fixedPositions = [];
        let currentX = CHARACTER_CONFIG.START_X + 50;
        
        for (let i = 0; i < spikePositions.length; i++) {
            const spike = { ...spikePositions[i] };
            
            // Ensure safe spacing
            spike.x = Math.max(spike.x, currentX + this.minSpikeDistance);
            
            // Ensure safe height
            spike.height = Math.min(spike.height, this.alienMaxJumpHeight - this.safetyMargin);
            spike.y = this.groundLevel - spike.height;
            
            // Ensure next spike is reachable
            if (i < spikePositions.length - 1) {
                const nextSpike = spikePositions[i + 1];
                const maxAllowedDistance = this.alienMaxJumpDistance - this.safetyMargin;
                
                if (nextSpike.x - (spike.x + spike.width) > maxAllowedDistance) {
                    // Move next spike closer or add intermediate spike
                    console.warn(`Emergency fix: Adjusting spike spacing at position ${i}`);
                }
            }
            
            fixedPositions.push(spike);
            currentX = spike.x + spike.width;
        }
        
        console.log('Emergency fixes applied');
        return fixedPositions;
    }
    
    // Check if level is completed (in endless mode, level up based on distance)
    checkLevelCompletion(alienPosition) {
        if (this.isEndlessMode) {
            // Level up every 1000 pixels traveled
            const newLevel = Math.floor(alienPosition.x / 1000) + 1;
            if (newLevel > this.currentLevel) {
                this.currentLevel = newLevel;
                console.log(`Level up! Now at level ${this.currentLevel}`);
                return true; // Trigger level completion for score bonus
            }
            return false;
        } else {
            // Original fixed level completion
            const goalX = this.levelWidth - 100;
            return alienPosition.x >= goalX;
        }
    }
    
    // Get obstacles in a specific range (for optimization)
    getObstaclesInRange(centerX, range, obstacles) {
        return obstacles.filter(obstacle => {
            const distance = Math.abs(obstacle.position.x - centerX);
            return distance <= range;
        });
    }
    
    // Advance to next level
    nextLevel() {
        this.currentLevel++;
        this.difficultyMultiplier += 0.1;
        console.log(`Advanced to level ${this.currentLevel}`);
        return this.generateLevel(this.currentLevel);
    }
    
    // Reset to level 1
    resetToLevel1() {
        this.currentLevel = 1;
        this.difficultyMultiplier = 1.0;
        this.spikeCounter = 0; // Reset spike counter
        this.spikesUntilNextCandy = this.getRandomSpikesForNextCandy(); // Reset candy countdown
        this.lastCandyX = 0; // Reset candy position
        console.log('Reset to level 1');
        return this.generateLevel(1);
    }
    
    // Calculate maximum jump height based on physics
    calculateMaxJumpHeight() {
        const jumpForce = Math.abs(CHARACTER_CONFIG.JUMP_FORCE);
        const gravity = CHARACTER_CONFIG.GRAVITY;
        
        // Using physics: v² = u² + 2as, where final velocity = 0 at peak
        // 0 = jumpForce² - 2 * gravity * height
        // height = jumpForce² / (2 * gravity)
        const maxHeight = (jumpForce * jumpForce) / (2 * gravity);
        
        console.log(`Calculated max jump height: ${maxHeight} pixels`);
        return maxHeight - this.safetyMargin;
    }
    
    // Calculate maximum horizontal jump distance
    calculateMaxJumpDistance() {
        const jumpForce = Math.abs(CHARACTER_CONFIG.JUMP_FORCE);
        const gravity = CHARACTER_CONFIG.GRAVITY;
        const maxSpeed = CHARACTER_CONFIG.MAX_SPEED;
        
        // Time to reach peak and fall back down: t = 2 * jumpForce / gravity
        const airTime = (2 * jumpForce) / gravity;
        
        // Distance = speed * time
        const maxDistance = maxSpeed * airTime;
        
        console.log(`Calculated max jump distance: ${maxDistance} pixels`);
        return maxDistance - this.safetyMargin;
    }
    
    // Advanced jumpability validation with physics simulation
    validateJumpabilityAdvanced(spikePositions) {
        const validatedPositions = [];
        let regenerationAttempts = 0;
        const maxRegenerationAttempts = 3;
        
        for (let i = 0; i < spikePositions.length; i++) {
            let spike = { ...spikePositions[i] };
            let isValid = false;
            let attempts = 0;
            const maxAttempts = 5;
            
            while (!isValid && attempts < maxAttempts) {
                isValid = true;
                
                // Test 1: Height validation
                if (spike.height > this.alienMaxJumpHeight) {
                    console.warn(`Spike ${i} too tall: ${spike.height}px > ${this.alienMaxJumpHeight}px`);
                    spike.height = this.alienMaxJumpHeight - this.safetyMargin;
                    spike.y = this.groundLevel - spike.height;
                    isValid = false;
                }
                
                // Test 2: Spacing validation with previous spike
                if (i > 0) {
                    const prevSpike = validatedPositions[i - 1];
                    const horizontalGap = spike.x - (prevSpike.x + prevSpike.width);
                    
                    if (horizontalGap < this.minSpikeDistance) {
                        console.warn(`Spikes ${i-1} and ${i} too close: ${horizontalGap}px < ${this.minSpikeDistance}px`);
                        spike.x = prevSpike.x + prevSpike.width + this.minSpikeDistance;
                        isValid = false;
                    }
                    
                    // Test 3: Jump trajectory simulation
                    if (!this.simulateJumpTrajectory(prevSpike, spike)) {
                        console.warn(`Jump from spike ${i-1} to ${i} not possible`);
                        // Try adjusting spike height first
                        if (spike.height > 20) {
                            spike.height -= 5;
                            spike.y = this.groundLevel - spike.height;
                        } else {
                            // Move spike closer
                            spike.x = prevSpike.x + prevSpike.width + this.minSpikeDistance;
                        }
                        isValid = false;
                    }
                }
                
                // Test 4: Jump from ground to first spike
                if (i === 0) {
                    const startPos = { x: CHARACTER_CONFIG.START_X, y: CHARACTER_CONFIG.START_Y, width: 0, height: 0 };
                    if (!this.simulateJumpTrajectory(startPos, spike)) {
                        console.warn(`Jump from start to first spike not possible`);
                        if (spike.height > 20) {
                            spike.height -= 5;
                            spike.y = this.groundLevel - spike.height;
                        } else {
                            spike.x = Math.max(spike.x - 10, CHARACTER_CONFIG.START_X + 50);
                        }
                        isValid = false;
                    }
                }
                
                attempts++;
            }
            
            if (!isValid && regenerationAttempts < maxRegenerationAttempts) {
                console.warn(`Could not validate spike ${i}, regenerating...`);
                regenerationAttempts++;
                // Regenerate this spike with different parameters
                spike = this.regenerateSpike(i, spikePositions.length);
                i--; // Retry this spike
                continue;
            }
            
            validatedPositions.push(spike);
        }
        
        console.log(`Jumpability validation complete. ${validatedPositions.length}/${spikePositions.length} spikes validated`);
        return validatedPositions;
    }
    
    // Simulate jump trajectory between two points
    simulateJumpTrajectory(fromSpike, toSpike) {
        const startX = fromSpike.x + fromSpike.width;
        const startY = fromSpike.y;
        const endX = toSpike.x;
        const endY = toSpike.y;
        
        const horizontalDistance = endX - startX;
        const verticalDistance = endY - startY;
        
        // Check if horizontal distance is within jump range
        if (horizontalDistance > this.alienMaxJumpDistance) {
            return false;
        }
        
        // Check if we need to jump higher than maximum
        if (verticalDistance < -this.alienMaxJumpHeight) {
            return false;
        }
        
        // Simulate parabolic trajectory
        const jumpForce = Math.abs(CHARACTER_CONFIG.JUMP_FORCE);
        const gravity = CHARACTER_CONFIG.GRAVITY;
        const speed = CHARACTER_CONFIG.MAX_SPEED;
        
        // Calculate required initial velocity
        const timeToReach = horizontalDistance / speed;
        const requiredJumpForce = (verticalDistance + 0.5 * gravity * timeToReach * timeToReach) / timeToReach;
        
        // Check if required jump force is achievable
        return Math.abs(requiredJumpForce) <= jumpForce;
    }
    
    // Regenerate a spike with safer parameters
    regenerateSpike(index, totalSpikes) {
        const safeX = CHARACTER_CONFIG.START_X + 100 + (index * 120);
        const safeHeight = 20 + Math.random() * 10; // Smaller, safer spikes
        
        return {
            x: safeX,
            y: this.groundLevel - safeHeight,
            width: 20,
            height: safeHeight
        };
    }
    
    // Test entire level for completability
    testLevelCompletability(levelConfig) {
        console.log('Testing level completability...');
        
        // Simulate alien traversing the entire level
        let currentX = levelConfig.alienStartPosition.x;
        let success = true;
        
        for (let i = 0; i < levelConfig.spikePositions.length; i++) {
            const spike = levelConfig.spikePositions[i];
            const distance = spike.x - currentX;
            
            if (distance > this.alienMaxJumpDistance) {
                console.error(`Gap too large at spike ${i}: ${distance}px`);
                success = false;
            }
            
            if (spike.height > this.alienMaxJumpHeight) {
                console.error(`Spike ${i} too tall: ${spike.height}px`);
                success = false;
            }
            
            currentX = spike.x + spike.width;
        }
        
        // Check final jump to goal
        const finalDistance = levelConfig.goalPosition.x - currentX;
        if (finalDistance > this.alienMaxJumpDistance) {
            console.error(`Final gap to goal too large: ${finalDistance}px`);
            success = false;
        }
        
        console.log(`Level completability test: ${success ? 'PASSED' : 'FAILED'}`);
        return success;
    }
    
    // Get current level info
    getCurrentLevelInfo() {
        return {
            levelNumber: this.currentLevel,
            difficultyMultiplier: this.difficultyMultiplier,
            expectedObstacles: this.baseObstacleCount + (this.currentLevel - 1) * this.obstacleCountIncrease,
            maxJumpHeight: this.alienMaxJumpHeight,
            maxJumpDistance: this.alienMaxJumpDistance
        };
    }
}

// Candy class - Power-up that gives extra life
class Candy {
    constructor(x, y, isFloating = false) {
        // Position and dimensions
        this.position = { x: Number(x), y: Number(y) };
        this.width = 20;
        this.height = 25;
        this.baseY = Number(y); // Store original Y position
        
        // Floating properties
        this.isFloating = isFloating;
        this.floatAmplitude = isFloating ? 8 : 2; // Larger movement if floating
        this.floatSpeed = isFloating ? 1.5 : 2; // Different speeds
        
        // Visual properties - random emoji candy types
        const candyEmojis = ['🍓', '🍡', '🍬', '🍭'];
        this.emoji = candyEmojis[Math.floor(Math.random() * candyEmojis.length)];
        
        // Animation properties
        this.animationTimer = 0;
        this.bobOffset = 0; // For gentle bobbing animation
        this.glowIntensity = 0;
        this.rotationAngle = 0; // For spinning animation
        
        // Power-up properties
        this.isCollected = false;
        this.lifeBonus = 1;
        this.scoreBonus = isFloating ? 75 : 50; // More points for floating candies
        
        console.log(`${isFloating ? 'Floating' : 'Ground'} candy created at (${x}, ${y})`);
    }
    
    // Get collision boundaries
    getCollisionBounds() {
        return {
            x: this.position.x + 2,
            y: this.position.y + 2,
            width: this.width - 4,
            height: this.height - 4
        };
    }
    
    // Get visual boundaries
    getVisualBounds() {
        return {
            x: this.position.x,
            y: this.position.y + this.bobOffset,
            width: this.width,
            height: this.height
        };
    }
    
    // Check collision with another object
    checkCollision(otherBounds) {
        if (this.isCollected) return false;
        
        const myBounds = this.getCollisionBounds();
        
        return myBounds.x < otherBounds.x + otherBounds.width &&
               myBounds.x + myBounds.width > otherBounds.x &&
               myBounds.y < otherBounds.y + otherBounds.height &&
               myBounds.y + myBounds.height > otherBounds.y;
    }
    
    // Update candy animation
    update(deltaTime) {
        if (this.isCollected) return;
        
        // Update animation timer
        this.animationTimer += deltaTime;
        
        // Floating/bobbing animation
        this.bobOffset = Math.sin(this.animationTimer * this.floatSpeed) * this.floatAmplitude;
        
        // Update actual position for floating candies
        this.position.y = this.baseY + this.bobOffset;
        
        // Spinning animation
        this.rotationAngle += deltaTime * 2; // Rotate 2 radians per second
        
        // Pulsing glow effect (stronger for floating candies)
        const glowSpeed = this.isFloating ? 6 : 4;
        this.glowIntensity = (Math.sin(this.animationTimer * glowSpeed) + 1) / 2;
    }
    
    // Collect the candy
    collect() {
        if (this.isCollected) return false;
        
        this.isCollected = true;
        console.log('Candy collected! +1 Life');
        return true;
    }
    
    // Render the candy as emoji
    render(ctx) {
        if (this.isCollected) return;
        
        const bounds = this.getVisualBounds();
        
        // Validate bounds
        if (!bounds || isNaN(bounds.x) || isNaN(bounds.y)) {
            console.warn('Invalid candy bounds:', bounds);
            return;
        }
        
        ctx.save();
        
        // Apply rotation for spinning effect
        const centerX = bounds.x + bounds.width / 2;
        const centerY = bounds.y + bounds.height / 2;
        ctx.translate(centerX, centerY);
        ctx.rotate(this.rotationAngle);
        ctx.translate(-centerX, -centerY);
        
        // Draw glow effect (stronger for floating candies)
        if (this.glowIntensity > 0.5 && this.isFloating) {
            const glowRadius = 15;
            const glowGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, glowRadius);
            glowGradient.addColorStop(0, `rgba(255, 255, 0, ${(this.glowIntensity - 0.5) * 0.4})`);
            glowGradient.addColorStop(1, 'rgba(255, 255, 0, 0)');
            ctx.fillStyle = glowGradient;
            ctx.beginPath();
            ctx.arc(centerX, centerY, glowRadius, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Draw floating sparkles for floating candies
        if (this.isFloating) {
            ctx.fillStyle = `rgba(255, 255, 255, ${this.glowIntensity * 0.8})`;
            for (let i = 0; i < 4; i++) {
                const angle = (i / 4) * Math.PI * 2 + this.rotationAngle;
                const sparkleX = centerX + Math.cos(angle) * 20;
                const sparkleY = centerY + Math.sin(angle) * 20;
                ctx.fillText('✨', sparkleX - 6, sparkleY + 3);
            }
        }
        
        // Draw the emoji candy
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.emoji, centerX, centerY);
        
        ctx.restore();
    }
    
    // Get candy info for debugging
    getInfo() {
        return {
            position: { ...this.position },
            dimensions: { width: this.width, height: this.height },
            isCollected: this.isCollected,
            lifeBonus: this.lifeBonus,
            scoreBonus: this.scoreBonus,
            candyType: this.candyType
        };
    }
}

// SpikeObstacle class - Hazardous obstacles that the alien must avoid
class SpikeObstacle {
    constructor(x, y, width = 15, height = 25) {
        // Validate input parameters
        if (isNaN(x) || isNaN(y) || isNaN(width) || isNaN(height)) {
            console.error('Invalid SpikeObstacle parameters:', { x, y, width, height });
            // Use default values
            x = x || 0;
            y = y || 0;
            width = width || 20;
            height = height || 30;
        }
        
        // Position and dimensions
        this.position = { x: Number(x), y: Number(y) };
        this.width = Number(width);
        this.height = Number(height);
        
        // Visual properties - random emoji spike types
        const spikeEmojis = ['🌵', '🔥', '🔱', '⛰'];
        this.emoji = spikeEmojis[Math.floor(Math.random() * spikeEmojis.length)];
        
        // Collision properties
        this.collisionBox = {
            offsetX: 2,
            offsetY: 2,
            width: this.width - 4,
            height: this.height - 4
        };
        
        // Animation properties
        this.animationTimer = 0;
        this.animationFrame = 0;
        this.glowIntensity = 0;
        
        // Danger properties
        this.isDangerous = true;
        this.damageAmount = 1;
        
        console.log(`SpikeObstacle created at (${x}, ${y})`);
    }
    
    // Get collision boundaries
    getCollisionBounds() {
        return {
            x: this.position.x + this.collisionBox.offsetX,
            y: this.position.y + this.collisionBox.offsetY,
            width: this.collisionBox.width,
            height: this.collisionBox.height
        };
    }
    
    // Get visual boundaries
    getVisualBounds() {
        return {
            x: this.position.x,
            y: this.position.y,
            width: this.width,
            height: this.height
        };
    }
    
    // Check collision with another object (like alien character)
    checkCollision(otherBounds) {
        const myBounds = this.getCollisionBounds();
        
        return myBounds.x < otherBounds.x + otherBounds.width &&
               myBounds.x + myBounds.width > otherBounds.x &&
               myBounds.y < otherBounds.y + otherBounds.height &&
               myBounds.y + myBounds.height > otherBounds.y;
    }
    
    // Update spike animation and effects
    update(deltaTime) {
        // Update animation timer
        this.animationTimer += deltaTime;
        
        // Pulsing glow effect
        this.glowIntensity = (Math.sin(this.animationTimer * 3) + 1) / 2;
        
        // Animation frame for spike tip movement
        if (this.animationTimer >= 0.5) {
            this.animationTimer = 0;
            this.animationFrame = (this.animationFrame + 1) % 4;
        }
    }
    
    // Render the spike obstacle as emoji
    render(ctx) {
        const bounds = this.getVisualBounds();
        
        // Validate bounds to prevent NaN errors
        if (!bounds || isNaN(bounds.x) || isNaN(bounds.y) || isNaN(bounds.width) || isNaN(bounds.height)) {
            console.warn('Invalid spike bounds:', bounds);
            return;
        }
        
        ctx.save();
        
        // Draw danger glow effect
        if (this.glowIntensity > 0.5) {
            const glowRadius = 20;
            const centerX = bounds.x + bounds.width / 2;
            const centerY = bounds.y + bounds.height / 2;
            const glowGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, glowRadius);
            glowGradient.addColorStop(0, `rgba(255, 0, 0, ${(this.glowIntensity - 0.5) * 0.4})`);
            glowGradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
            ctx.fillStyle = glowGradient;
            ctx.beginPath();
            ctx.arc(centerX, centerY, glowRadius, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Draw the emoji spike
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        const centerX = bounds.x + bounds.width / 2;
        const bottomY = bounds.y + bounds.height;
        ctx.fillText(this.emoji, centerX, bottomY);
        
        ctx.restore();
        
        // Draw collision box for debugging (optional)
        if (false) { // Set to true for debugging
            const collisionBounds = this.getCollisionBounds();
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 1;
            ctx.strokeRect(collisionBounds.x, collisionBounds.y, collisionBounds.width, collisionBounds.height);
        }
    }
    
    // Get spike info for debugging
    getInfo() {
        return {
            position: { ...this.position },
            dimensions: { width: this.width, height: this.height },
            isDangerous: this.isDangerous,
            damageAmount: this.damageAmount
        };
    }
}

// InputHandler class - Manages keyboard input
class InputHandler {
    constructor() {
        this.keys = {};
        this.keyPressed = {};
        
        // Touch/click support
        this.touchPressed = false;
        this.clickPressed = false;
        this.lastTouchTime = 0;
        this.touchFeedbackDuration = 0.2; // Show touch feedback for 200ms
        
        // Bind event listeners
        this.bindEvents();
        
        console.log('InputHandler initialized with touch support');
    }
    
    bindEvents() {
        document.addEventListener('keydown', (event) => {
            this.keys[event.code] = true;
            
            // Track key press events (for single-press actions)
            if (!this.keyPressed[event.code]) {
                this.keyPressed[event.code] = true;
            }
            
            // Prevent default for game control keys
            if (['Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'KeyW', 'KeyA', 'KeyD'].includes(event.code)) {
                event.preventDefault();
            }
        });
        
        document.addEventListener('keyup', (event) => {
            this.keys[event.code] = false;
            this.keyPressed[event.code] = false;
        });
        
        // Add touch event listeners for mobile support
        document.addEventListener('touchstart', (event) => {
            this.touchPressed = true;
            this.lastTouchTime = performance.now();
            event.preventDefault(); // Prevent scrolling and other touch behaviors
        });
        
        document.addEventListener('touchend', (event) => {
            this.touchPressed = false;
            event.preventDefault();
        });
        
        // Add mouse click listeners for desktop/tablet
        document.addEventListener('mousedown', (event) => {
            this.clickPressed = true;
            this.lastTouchTime = performance.now();
            event.preventDefault(); // Prevent text selection and other mouse behaviors
        });
        
        document.addEventListener('mouseup', (event) => {
            this.clickPressed = false;
            event.preventDefault();
        });
        
        // Prevent context menu on long press
        document.addEventListener('contextmenu', (event) => {
            event.preventDefault();
        });
    }
    
    // Check if key is currently held down
    isKeyDown(keyCode) {
        return !!this.keys[keyCode];
    }
    
    // Check if key was just pressed (single press)
    isKeyPressed(keyCode) {
        if (this.keyPressed[keyCode]) {
            this.keyPressed[keyCode] = false; // Reset after checking
            return true;
        }
        return false;
    }
    
    // Get movement input (including touch/click)
    getMovementInput() {
        // Check for touch/click jump
        const touchJump = this.isTouchPressed() || this.isClickPressed();
        
        return {
            left: this.isKeyDown('ArrowLeft') || this.isKeyDown('KeyA'),
            right: this.isKeyDown('ArrowRight') || this.isKeyDown('KeyD'),
            jump: this.isKeyPressed('Space') || this.isKeyPressed('ArrowUp') || this.isKeyPressed('KeyW') || touchJump
        };
    }
    
    // Check if touch was just pressed (single press)
    isTouchPressed() {
        if (this.touchPressed) {
            this.touchPressed = false; // Reset after checking
            return true;
        }
        return false;
    }
    
    // Check if click was just pressed (single press)
    isClickPressed() {
        if (this.clickPressed) {
            this.clickPressed = false; // Reset after checking
            return true;
        }
        return false;
    }
    
    // Get game control input
    getGameControlInput() {
        return {
            pause: this.isKeyPressed('KeyP'),
            reset: this.isKeyPressed('KeyR'),
            menu: this.isKeyPressed('Escape')
        };
    }
}

// AlienCharacter class - Player-controlled alien character
class AlienCharacter {
    constructor(x = CHARACTER_CONFIG.START_X, y = CHARACTER_CONFIG.START_Y) {
        // Position and movement
        this.position = { x: x, y: y };
        this.velocity = { x: 0, y: 0 };
        this.startPosition = { x: x, y: y };
        
        // Physical properties
        this.width = CHARACTER_CONFIG.WIDTH;
        this.height = CHARACTER_CONFIG.HEIGHT;
        this.maxSpeed = CHARACTER_CONFIG.MAX_SPEED;
        this.jumpForce = CHARACTER_CONFIG.JUMP_FORCE;
        this.gravity = CHARACTER_CONFIG.GRAVITY;
        this.friction = CHARACTER_CONFIG.FRICTION;
        
        // State tracking
        this.isGrounded = false;
        this.isJumping = false;
        this.isFalling = false;
        this.facingDirection = 'right'; // 'left' or 'right'
        this.isMoving = false;
        this.autoRunSpeed = CHARACTER_CONFIG.AUTO_RUN_SPEED;
        
        // Jump mechanics
        this.coyoteTime = CHARACTER_CONFIG.COYOTE_TIME;
        this.coyoteTimer = 0;
        this.jumpBufferTime = 0.1; // Time to buffer jump input
        this.jumpBuffer = 0;
        this.canJump = true;
        
        // Animation properties
        this.animationFrame = 0;
        this.animationTimer = 0;
        this.animationSpeed = CHARACTER_CONFIG.ANIMATION_SPEED;
        this.currentAnimation = 'idle';
        
        // Collision and damage properties
        this.isInvulnerable = false;
        this.invulnerabilityTimer = 0;
        this.invulnerabilityDuration = 1.0; // 1 second of invulnerability after hit
        this.hitFlashTimer = 0;
        this.isHit = false;
        
        // Collision boundaries (for more precise collision detection)
        this.collisionBox = {
            offsetX: 2,
            offsetY: 2,
            width: this.width - 4,
            height: this.height - 4
        };
        
        console.log('AlienCharacter created at position:', this.position);
    }
    
    // Get the collision boundaries for this character
    getCollisionBounds() {
        return {
            x: this.position.x + this.collisionBox.offsetX,
            y: this.position.y + this.collisionBox.offsetY,
            width: this.collisionBox.width,
            height: this.collisionBox.height
        };
    }
    
    // Get the visual bounds (for rendering)
    getVisualBounds() {
        return {
            x: this.position.x,
            y: this.position.y,
            width: this.width,
            height: this.height
        };
    }
    
    // Check if character is on the ground
    checkGrounded(groundLevel = GAME_CONFIG.GROUND_LEVEL) {
        const wasGrounded = this.isGrounded;
        this.isGrounded = (this.position.y + this.height) >= groundLevel;
        
        // Reset jump state when landing
        if (!wasGrounded && this.isGrounded) {
            this.velocity.y = 0;
            this.position.y = groundLevel - this.height;
            this.isJumping = false;
            this.isFalling = false;
            this.canJump = true;
            this.coyoteTimer = 0;
        }
        
        return this.isGrounded;
    }
    
    // Update character state and animation
    updateState() {
        // Update movement state
        this.isMoving = Math.abs(this.velocity.x) > 0.1;
        
        // Update vertical state
        if (this.velocity.y < 0) {
            this.isJumping = true;
            this.isFalling = false;
        } else if (this.velocity.y > 0) {
            this.isJumping = false;
            this.isFalling = true;
        } else if (this.isGrounded) {
            this.isJumping = false;
            this.isFalling = false;
        }
        
        // Determine current animation
        if (!this.isGrounded) {
            this.currentAnimation = this.isJumping ? 'jumping' : 'falling';
        } else if (this.isMoving) {
            this.currentAnimation = 'running';
        } else {
            this.currentAnimation = 'idle';
        }
        
        // Update facing direction based on movement
        if (this.velocity.x > 0.1) {
            this.facingDirection = 'right';
        } else if (this.velocity.x < -0.1) {
            this.facingDirection = 'left';
        }
    }
    
    // Update animation frame with variable speeds
    updateAnimation(deltaTime) {
        this.animationTimer += deltaTime;
        
        // Different animation speeds for different states
        let animSpeed = this.animationSpeed;
        let maxFrames;
        
        switch (this.currentAnimation) {
            case 'idle':
                maxFrames = 20; // Slow idle animation
                animSpeed = 0.3;
                break;
            case 'running':
                maxFrames = 8;
                animSpeed = Math.max(0.05, 0.15 - Math.abs(this.velocity.x) * 0.01); // Faster when moving faster
                break;
            case 'jumping':
                maxFrames = 4;
                animSpeed = 0.1;
                break;
            case 'falling':
                maxFrames = 6;
                animSpeed = 0.08;
                break;
            default:
                maxFrames = 1;
        }
        
        if (this.animationTimer >= animSpeed) {
            this.animationTimer = 0;
            this.animationFrame = (this.animationFrame + 1) % maxFrames;
        }
    }
    
    // Reset character to starting position and state
    reset() {
        console.log('AlienCharacter: Resetting to start position');
        
        this.position.x = this.startPosition.x;
        this.position.y = this.startPosition.y;
        this.velocity.x = 0;
        this.velocity.y = 0;
        
        this.isGrounded = true;
        this.isJumping = false;
        this.isFalling = false;
        this.isMoving = false;
        this.facingDirection = 'right';
        
        this.coyoteTimer = 0;
        this.jumpBuffer = 0;
        this.canJump = true;
        
        this.animationFrame = 0;
        this.animationTimer = 0;
        this.currentAnimation = 'idle';
        
        // Reset hit effects
        this.isInvulnerable = false;
        this.invulnerabilityTimer = 0;
        this.hitFlashTimer = 0;
        this.isHit = false;
    }
    
    // Movement control methods
    moveLeft() {
        this.velocity.x = Math.max(this.velocity.x - 1, -this.maxSpeed);
    }
    
    moveRight() {
        this.velocity.x = Math.min(this.velocity.x + 1, this.maxSpeed);
    }
    
    // Jump method with coyote time and jump buffering
    jump() {
        // Check if jump is possible (grounded or within coyote time)
        const canCoyoteJump = this.coyoteTimer < this.coyoteTime;
        
        if ((this.isGrounded || canCoyoteJump) && this.canJump) {
            this.velocity.y = this.jumpForce;
            this.isJumping = true;
            this.isGrounded = false;
            this.canJump = false;
            this.coyoteTimer = this.coyoteTime; // Disable coyote time after jump
            
            console.log('AlienCharacter: Jump executed');
            return true;
        } else {
            // Buffer the jump input for a short time
            this.jumpBuffer = this.jumpBufferTime;
            return false;
        }
    }
    
    // Handle collision with spike obstacle
    handleSpikeCollision(spike) {
        if (this.isInvulnerable) {
            return false; // No damage during invulnerability
        }
        
        console.log('AlienCharacter: Hit by spike!');
        
        // Apply knockback effect
        const knockbackForce = 8;
        const spikeCenter = spike.position.x + spike.width / 2;
        const alienCenter = this.position.x + this.width / 2;
        
        if (alienCenter < spikeCenter) {
            this.velocity.x = -knockbackForce; // Knockback left
        } else {
            this.velocity.x = knockbackForce; // Knockback right
        }
        
        // Small upward bounce
        this.velocity.y = -5;
        
        // Set hit state
        this.isHit = true;
        this.hitFlashTimer = 0.3; // Flash for 0.3 seconds
        this.isInvulnerable = true;
        this.invulnerabilityTimer = this.invulnerabilityDuration;
        
        return true; // Collision handled
    }
    
    // Update invulnerability and hit effects
    updateHitEffects(deltaTime) {
        // Update invulnerability timer
        if (this.isInvulnerable) {
            this.invulnerabilityTimer -= deltaTime;
            if (this.invulnerabilityTimer <= 0) {
                this.isInvulnerable = false;
                this.invulnerabilityTimer = 0;
            }
        }
        
        // Update hit flash effect
        if (this.hitFlashTimer > 0) {
            this.hitFlashTimer -= deltaTime;
            if (this.hitFlashTimer <= 0) {
                this.isHit = false;
            }
        }
    }
    
    // Apply physics updates (now uses PhysicsEngine)
    update(deltaTime, physicsEngine = null) {
        // Update timers
        if (!this.isGrounded) {
            this.coyoteTimer += deltaTime;
        }
        
        if (this.jumpBuffer > 0) {
            this.jumpBuffer -= deltaTime;
            // Try to execute buffered jump
            if (this.isGrounded && this.canJump) {
                this.jump();
            }
        }
        
        // Apply constant forward movement (auto-run)
        this.velocity.x = this.autoRunSpeed;
        this.isMoving = true;
        this.facingDirection = 'right';
        
        // Debug: Log position every 100 pixels
        if (Math.floor(this.position.x / 100) !== Math.floor((this.position.x - this.velocity.x * deltaTime * 60) / 100)) {
            console.log(`Alien position: ${Math.round(this.position.x)}px, velocity: ${this.velocity.x}`);
        }
        
        // Use PhysicsEngine if available, otherwise use built-in physics
        if (physicsEngine) {
            // Apply physics through engine
            physicsEngine.applyGravity(this, deltaTime);
            // Don't apply friction to horizontal movement since we want constant speed
            if (!this.isGrounded) {
                this.velocity.x *= physicsEngine.airResistance;
            }
            physicsEngine.updatePosition(this, deltaTime);
            
            // No horizontal world bounds check - character can move infinitely right
            // Only check vertical bounds
            if (this.position.y > GAME_CONFIG.CANVAS_HEIGHT + 100) {
                console.log('AlienCharacter: Fell off the world!');
                // Could trigger death here
            }
        } else {
            // Fallback to built-in physics
            if (!this.isGrounded) {
                this.velocity.y += this.gravity * deltaTime * 60;
            }
            
            // Don't apply friction to horizontal movement for auto-run
            this.position.x += this.velocity.x * deltaTime * 60;
            this.position.y += this.velocity.y * deltaTime * 60;
            // Remove horizontal bounds constraint
        }
        
        // Update hit effects and invulnerability
        this.updateHitEffects(deltaTime);
        
        // Update character state and animation
        this.updateState();
        this.updateAnimation(deltaTime);
        
        // Check ground collision
        this.checkGrounded();
    }
    
    // Get current character state for debugging/UI
    getState() {
        return {
            position: { ...this.position },
            velocity: { ...this.velocity },
            isGrounded: this.isGrounded,
            isJumping: this.isJumping,
            isFalling: this.isFalling,
            isMoving: this.isMoving,
            facingDirection: this.facingDirection,
            currentAnimation: this.currentAnimation,
            animationFrame: this.animationFrame,
            canJump: this.canJump,
            coyoteTimer: this.coyoteTimer
        };
    }
}

// GameEngine class - Core game loop and system management
class GameEngine {
    constructor(canvas, context) {
        this.canvas = canvas;
        this.ctx = context;
        this.isRunning = false;
        this.isPaused = false;
        this.lastFrameTime = 0;
        this.deltaTime = 0;
        this.frameCount = 0;
        this.fps = 0;
        this.fpsUpdateTime = 0;
        
        // Game state management
        this.gameState = {
            currentState: GAME_STATES.LOADING,
            previousState: null,
            score: 0,
            level: 1,
            lives: 3,
            gameTime: 0,
            isGameOver: false,
            isVictory: false,
            canRestart: false
        };
        
        // Game statistics
        this.stats = {
            totalJumps: 0,
            totalDistance: 0,
            obstaclesCleared: 0,
            bestScore: this.loadBestScore(),
            playTime: 0
        };
        
        // Create game systems
        this.renderer = new Renderer(canvas, context);
        this.physicsEngine = new PhysicsEngine();
        this.levelManager = new LevelManager();
        
        // Create input handler and alien character
        this.inputHandler = new InputHandler();
        this.alienCharacter = new AlienCharacter();
        
        // Initialize camera to follow alien from start
        if (this.renderer && this.alienCharacter) {
            this.renderer.camera.x = this.alienCharacter.position.x - this.renderer.canvas.width * 0.3;
            this.renderer.camera.x = Math.max(0, this.renderer.camera.x);
        }
        
        // Create spike obstacles and candies arrays
        this.spikeObstacles = [];
        this.candies = [];
        this.currentLevelConfig = null;
        this.generateCurrentLevel();
        
        // Visual effects
        this.screenShake = 0;
        this.screenShakeIntensity = 5;
        
        // Collision debugging
        this.showCollisionBoxes = false; // Set to true for debugging
        this.collisionHistory = [];
        
        console.log('GameEngine initialized');
    }
    
    // Initialize all game systems
    init() {
        console.log('GameEngine: Initializing game systems...');
        
        // Set up canvas properties
        this.canvas.width = GAME_CONFIG.CANVAS_WIDTH;
        this.canvas.height = GAME_CONFIG.CANVAS_HEIGHT;
        
        // Initialize basic rendering
        this.ctx.imageSmoothingEnabled = false; // Pixel-perfect rendering
        
        console.log('GameEngine: Systems initialized');
        return true;
    }
    
    // Start the game loop
    start() {
        if (this.isRunning) {
            console.log('GameEngine: Already running');
            return;
        }
        
        console.log('GameEngine: Starting game loop...');
        this.isRunning = true;
        this.isPaused = false;
        this.lastFrameTime = performance.now();
        
        // Initialize game state
        this.changeGameState(GAME_STATES.PLAYING);
        
        // Start the main game loop
        this.gameLoop();
    }
    
    // Main game loop using requestAnimationFrame
    gameLoop() {
        if (!this.isRunning) {
            return;
        }
        
        const currentTime = performance.now();
        this.deltaTime = (currentTime - this.lastFrameTime) / 1000; // Convert to seconds
        this.lastFrameTime = currentTime;
        
        // Cap delta time to prevent large jumps
        this.deltaTime = Math.min(this.deltaTime, 1/30); // Max 30 FPS minimum
        
        // Update FPS counter
        this.updateFPS(currentTime);
        
        if (!this.isPaused) {
            // Update game logic
            this.update(this.deltaTime);
            
            // Render current frame
            this.render();
        }
        
        // Continue the loop
        requestAnimationFrame(() => this.gameLoop());
    }
    
    // Update all game logic
    update(deltaTime) {
        // Update game systems (will be implemented as we build them)
        // For now, just increment frame count
        this.frameCount++;
        
        // Update game statistics and time
        if (this.isPlayable()) {
            this.updateStats(deltaTime);
        }
        
        // Handle input and update alien character
        if (this.alienCharacter && this.inputHandler) {
            // Handle game control input
            const gameControls = this.inputHandler.getGameControlInput();
            if (gameControls.pause) {
                this.pause();
            }
            if (gameControls.reset) {
                if (this.gameState.canRestart || this.gameState.currentState === GAME_STATES.PLAYING) {
                    this.reset();
                }
            }
            if (gameControls.menu) {
                this.stop();
            }
            
            // Handle character input (only jumping during gameplay)
            if (this.isPlayable()) {
                const movement = this.inputHandler.getMovementInput();
                
                // Only handle jumping - character runs automatically
                if (movement.jump) {
                    this.alienCharacter.jump();
                }
                
                // Update character physics and animation using PhysicsEngine
                this.alienCharacter.update(deltaTime, this.physicsEngine);
                
                // Update endless level generation
                if (this.levelManager && this.levelManager.isEndlessMode) {
                    const newCandies = this.levelManager.updateEndlessLevel(this.alienCharacter.position.x, this.spikeObstacles);
                    
                    // Add new candies to the game
                    newCandies.forEach(candyData => {
                        const candy = new Candy(candyData.x, candyData.y, candyData.isFloating);
                        this.candies.push(candy);
                    });
                }
                
                // Update camera to follow alien character
                if (this.renderer && this.alienCharacter) {
                    this.renderer.followTarget(this.alienCharacter.position.x, this.alienCharacter.position.y);
                }
                
                // Comprehensive collision checking
                this.checkGroundCollision();
                this.checkLevelBoundaries();
                
                // Check spike collisions
                const collisionResult = this.checkSpikeCollisions();
                if (collisionResult && collisionResult.gameOver) {
                    this.triggerGameOver();
                }
                
                // Check candy collisions
                this.checkCandyCollisions();
                
                // Check level completion
                if (this.levelManager.checkLevelCompletion(this.alienCharacter.position)) {
                    this.completeLevel();
                }
            }
            
            // Update spike obstacles and candies
            this.updateSpikes(deltaTime);
            this.updateCandies(deltaTime);
            
            // Update visual effects
            if (this.screenShake > 0) {
                this.screenShake -= deltaTime * 2; // Decay screen shake
                if (this.screenShake < 0) this.screenShake = 0;
            }
        }
        
        // TODO: Update physics engine
        // TODO: Update level manager
        
        // State-specific updates
        switch (this.gameState.currentState) {
            case GAME_STATES.PLAYING:
                // Game is running normally
                break;
                
            case GAME_STATES.GAME_OVER:
            case GAME_STATES.VICTORY:
                // Game ended, waiting for restart
                break;
                
            case GAME_STATES.PAUSED:
                // Game is paused, no updates needed
                break;
        }
    }
    
    // Render current frame using Renderer
    render() {
        // Update renderer effects
        this.renderer.updateEffects(this.deltaTime);
        
        // Clear and render background (without camera transform)
        this.renderer.clear();
        this.renderer.renderBackground();
        
        // Apply camera transformations for world objects
        this.renderer.applyCameraTransform();
        
        // Render ground
        this.renderer.renderGround(GAME_CONFIG.GROUND_LEVEL);
        
        // State-specific rendering
        switch (this.gameState.currentState) {
            case GAME_STATES.MENU:
                this.renderMenuState();
                break;
                
            case GAME_STATES.PLAYING:
            case GAME_STATES.PAUSED:
                this.renderGameplayState();
                break;
                
            case GAME_STATES.GAME_OVER:
            case GAME_STATES.VICTORY:
                this.renderGameplayState();
                this.renderEndGameState();
                break;
                
            case GAME_STATES.LOADING:
                this.renderLoadingState();
                break;
        }
        
        // Render level elements
        if (this.gameState.currentState === GAME_STATES.PLAYING || 
            this.gameState.currentState === GAME_STATES.PAUSED ||
            this.gameState.currentState === GAME_STATES.GAME_OVER ||
            this.gameState.currentState === GAME_STATES.VICTORY) {
            // Debug: Log spike and candy count
            if (this.frameCount % 60 === 0) { // Log every second
                console.log(`Rendering ${this.spikeObstacles.length} spikes and ${this.candies.length} candies`);
            }
            this.renderSpikes();
            this.renderCandies();
            // No fixed goal in endless mode
        }
        
        // Render alien character
        if (this.alienCharacter && (this.gameState.currentState === GAME_STATES.PLAYING || 
                                   this.gameState.currentState === GAME_STATES.PAUSED ||
                                   this.gameState.currentState === GAME_STATES.GAME_OVER ||
                                   this.gameState.currentState === GAME_STATES.VICTORY)) {
            // Debug: Log alien position and camera position
            if (this.frameCount % 60 === 0) { // Log every second
                console.log(`Alien at (${Math.round(this.alienCharacter.position.x)}, ${Math.round(this.alienCharacter.position.y)}), Camera at ${Math.round(this.renderer.camera.x)}`);
            }
            this.renderAlienCharacter();
        }
        
        // Render particles and effects
        this.renderer.renderParticles();
        
        // Reset camera transformations
        this.renderer.resetCameraTransform();
        
        // Render UI elements
        const gameStateWithLevelManager = { ...this.gameState, levelManager: this.levelManager };
        this.renderer.renderUI(gameStateWithLevelManager, this.fps, this.alienCharacter, this.currentLevelConfig);
        
        // Render touch feedback
        this.renderTouchFeedback();
        
        // Render collision debugging if enabled
        if (this.showCollisionBoxes) {
            this.renderCollisionDebug();
        }
    }
    
    // Render menu state
    renderMenuState() {
        this.ctx.fillStyle = '#00ff88';
        this.ctx.font = '32px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('ALIEN SPRUNG SPIEL', this.canvas.width / 2, this.canvas.height / 2 - 50);
        
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '16px Arial';
        this.ctx.fillText('Drücke LEERTASTE zum Starten', this.canvas.width / 2, this.canvas.height / 2 + 20);
        
        if (this.stats.bestScore > 0) {
            this.ctx.fillText(`Beste Punktzahl: ${this.stats.bestScore}`, this.canvas.width / 2, this.canvas.height / 2 + 50);
        }
    }
    
    // Render gameplay state
    renderGameplayState() {
        // Game world rendering will go here
        // For now, just show level info
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '14px Arial';
        this.ctx.textAlign = 'right';
        this.ctx.fillText(`Level: ${this.gameState.level}`, this.canvas.width - 10, 20);
        
        // Lives display with hearts
        const livesText = `Leben: `;
        this.ctx.fillText(livesText, this.canvas.width - 10, 35);
        
        // Draw heart icons for lives
        const heartsStartX = this.canvas.width - 10 - this.ctx.measureText(livesText).width;
        for (let i = 0; i < this.gameState.lives; i++) {
            this.ctx.fillStyle = '#ff4444';
            this.ctx.fillRect(heartsStartX - (i * 12) - 8, 28, 8, 6);
            this.ctx.fillRect(heartsStartX - (i * 12) - 6, 26, 4, 2);
            this.ctx.fillRect(heartsStartX - (i * 12) - 4, 26, 4, 2);
        }
        
        // Show invulnerability status
        if (this.alienCharacter && this.alienCharacter.isInvulnerable) {
            this.ctx.fillStyle = '#ffaa00';
            this.ctx.font = '12px Arial';
            this.ctx.fillText('UNVERWUNDBAR', this.canvas.width - 10, 50);
        }
    }
    
    // Render end game state overlay
    renderEndGameState() {
        // Semi-transparent overlay
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // End game message
        this.ctx.fillStyle = this.gameState.isVictory ? '#00ff88' : '#ff4444';
        this.ctx.font = '28px Arial';
        this.ctx.textAlign = 'center';
        const message = this.gameState.isVictory ? 'SIEG!' : 'SPIEL VORBEI';
        this.ctx.fillText(message, this.canvas.width / 2, this.canvas.height / 2 - 30);
        
        // Score display
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '18px Arial';
        this.ctx.fillText(`Endpunktzahl: ${this.gameState.score}`, this.canvas.width / 2, this.canvas.height / 2 + 10);
        
        if (this.gameState.score === this.stats.bestScore && this.stats.bestScore > 0) {
            this.ctx.fillStyle = '#ffaa00';
            this.ctx.font = '14px Arial';
            this.ctx.fillText('NEUE BESTPUNKTZAHL!', this.canvas.width / 2, this.canvas.height / 2 + 35);
        }
        
        // Restart instruction
        this.ctx.fillStyle = '#aaaaaa';
        this.ctx.font = '14px Arial';
        this.ctx.fillText('Drücke R zum Neustarten', this.canvas.width / 2, this.canvas.height / 2 + 60);
    }
    
    // Render loading state
    renderLoadingState() {
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '20px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Lädt...', this.canvas.width / 2, this.canvas.height / 2);
    }
    
    // Render the alien character with enhanced animations
    renderAlienCharacter() {
        if (!this.alienCharacter) {
            console.log('No alien character to render');
            return;
        }
        
        const char = this.alienCharacter;
        const bounds = char.getVisualBounds();
        
        // Simple debug rendering first
        this.ctx.fillStyle = '#00ff88'; // Bright green
        this.ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
        
        // Debug text
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '10px Arial';
        this.ctx.fillText('ALIEN', bounds.x, bounds.y - 5);
        
        // Save context for transformations
        this.ctx.save();
        
        // Apply screen shake effect
        if (this.screenShake > 0) {
            const shakeX = (Math.random() - 0.5) * this.screenShakeIntensity * this.screenShake;
            const shakeY = (Math.random() - 0.5) * this.screenShakeIntensity * this.screenShake;
            this.ctx.translate(shakeX, shakeY);
        }
        
        // Apply invulnerability flashing effect
        if (char.isInvulnerable) {
            const flashAlpha = Math.sin(char.invulnerabilityTimer * 20) * 0.5 + 0.5;
            this.ctx.globalAlpha = 0.3 + flashAlpha * 0.7;
        }
        
        // Apply hit flash effect
        if (char.isHit) {
            this.ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
            this.ctx.fillRect(bounds.x - 5, bounds.y - 5, bounds.width + 10, bounds.height + 10);
        }
        
        // Flip horizontally if facing left
        if (char.facingDirection === 'left') {
            this.ctx.scale(-1, 1);
            this.ctx.translate(-bounds.x - bounds.width, 0);
        } else {
            this.ctx.translate(bounds.x, 0);
        }
        
        // Animation-based body modifications
        let bodyOffsetY = 0;
        let bodyScaleY = 1;
        let bodyColor = '#00ff88';
        
        switch (char.currentAnimation) {
            case 'jumping':
                bodyOffsetY = -2;
                bodyScaleY = 1.1;
                bodyColor = '#00ffaa';
                break;
            case 'falling':
                bodyOffsetY = 1;
                bodyScaleY = 0.9;
                bodyColor = '#00dd77';
                break;
            case 'running':
                bodyOffsetY = char.animationFrame % 2 === 0 ? -1 : 0;
                bodyColor = '#00ff99';
                break;
        }
        
        // Draw character shadow
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.fillRect(2, GAME_CONFIG.GROUND_LEVEL - bounds.y + bounds.height - 2, bounds.width - 4, 4);
        
        // Draw character body with animation effects
        this.ctx.fillStyle = bodyColor;
        const bodyY = bounds.y + bodyOffsetY;
        const bodyHeight = bounds.height * bodyScaleY;
        this.ctx.fillRect(0, bodyY, bounds.width, bodyHeight);
        
        // Draw character head (slightly different color)
        this.ctx.fillStyle = '#00ffbb';
        this.ctx.fillRect(4, bodyY + 2, bounds.width - 8, 12);
        
        // Draw eyes with animation
        this.ctx.fillStyle = '#ffffff';
        const eyeY = bodyY + 6;
        const eyeSize = 3;
        const eyeBlink = char.animationFrame % 20 === 0 ? 1 : eyeSize;
        
        this.ctx.fillRect(8, eyeY, eyeSize, eyeBlink);
        this.ctx.fillRect(18, eyeY, eyeSize, eyeBlink);
        
        // Draw pupils
        if (eyeBlink === eyeSize) {
            this.ctx.fillStyle = '#000000';
            this.ctx.fillRect(9, eyeY + 1, 1, 1);
            this.ctx.fillRect(19, eyeY + 1, 1, 1);
        }
        
        // Draw mouth based on state
        this.ctx.fillStyle = '#000000';
        const mouthY = bodyY + 10;
        switch (char.currentAnimation) {
            case 'jumping':
                // Happy mouth
                this.ctx.fillRect(12, mouthY, 6, 1);
                this.ctx.fillRect(13, mouthY + 1, 4, 1);
                break;
            case 'falling':
                // Worried mouth
                this.ctx.fillRect(13, mouthY + 1, 4, 1);
                this.ctx.fillRect(12, mouthY, 6, 1);
                break;
            default:
                // Neutral mouth
                this.ctx.fillRect(13, mouthY, 4, 1);
        }
        
        // Draw arms/appendages
        this.ctx.fillStyle = '#00dd88';
        const armY = bodyY + 14;
        
        if (char.currentAnimation === 'running') {
            // Animated arms for running
            const armOffset = char.animationFrame % 2 === 0 ? 2 : -2;
            this.ctx.fillRect(-2, armY + armOffset, 4, 8);
            this.ctx.fillRect(bounds.width - 2, armY - armOffset, 4, 8);
        } else if (char.currentAnimation === 'jumping') {
            // Arms up for jumping
            this.ctx.fillRect(-1, armY - 4, 3, 6);
            this.ctx.fillRect(bounds.width - 2, armY - 4, 3, 6);
        } else {
            // Normal arms
            this.ctx.fillRect(-1, armY, 3, 8);
            this.ctx.fillRect(bounds.width - 2, armY, 3, 8);
        }
        
        // Draw legs/feet
        const legY = bodyY + bounds.height - 8;
        
        if (char.currentAnimation === 'running') {
            // Animated legs for running
            const legOffset = char.animationFrame % 2 === 0 ? 1 : -1;
            this.ctx.fillRect(6 + legOffset, legY, 4, 8);
            this.ctx.fillRect(16 - legOffset, legY, 4, 8);
        } else {
            // Normal legs
            this.ctx.fillRect(6, legY, 4, 8);
            this.ctx.fillRect(16, legY, 4, 8);
        }
        
        // Animation-specific effects
        switch (char.currentAnimation) {
            case 'jumping':
                // Jump trail effect
                this.ctx.fillStyle = 'rgba(255, 255, 0, 0.5)';
                this.ctx.fillRect(5, bodyY + bounds.height, bounds.width - 10, 3);
                break;
                
            case 'running':
                // Motion blur effect
                if (Math.abs(char.velocity.x) > 2) {
                    this.ctx.fillStyle = 'rgba(0, 255, 136, 0.3)';
                    const blurOffset = char.facingDirection === 'right' ? -8 : 8;
                    this.ctx.fillRect(blurOffset, bodyY, bounds.width, bodyHeight);
                }
                
                // Dust particles
                if (char.animationFrame % 3 === 0) {
                    this.ctx.fillStyle = 'rgba(200, 200, 200, 0.6)';
                    for (let i = 0; i < 3; i++) {
                        const dustX = Math.random() * bounds.width;
                        const dustY = bodyY + bounds.height + Math.random() * 5;
                        this.ctx.fillRect(dustX, dustY, 2, 2);
                    }
                }
                break;
                
            case 'falling':
                // Wind effect lines
                this.ctx.fillStyle = 'rgba(255, 170, 0, 0.7)';
                for (let i = 0; i < 3; i++) {
                    const lineX = bounds.width / 2 + (Math.random() - 0.5) * 10;
                    const lineY = bodyY - 5 - i * 3;
                    this.ctx.fillRect(lineX, lineY, 1, 3);
                }
                break;
        }
        
        // Restore context
        this.ctx.restore();
        
        // Draw collision box for debugging (optional)
        if (false) { // Set to true for debugging
            const collisionBounds = char.getCollisionBounds();
            this.ctx.strokeStyle = '#ff0000';
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(collisionBounds.x, collisionBounds.y, collisionBounds.width, collisionBounds.height);
        }
        
        // Draw character state info for debugging
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '10px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`Status: ${char.currentAnimation}`, bounds.x, bounds.y - 35);
        this.ctx.fillText(`Geschw: ${Math.round(char.velocity.x)}, ${Math.round(char.velocity.y)}`, bounds.x, bounds.y - 25);
        this.ctx.fillText(`Frame: ${char.animationFrame}`, bounds.x, bounds.y - 15);
        this.ctx.fillText(`Am Boden: ${char.isGrounded}`, bounds.x, bounds.y - 5);
    }
    
    // Render collision debugging information
    renderCollisionDebug() {
        if (!this.physicsEngine) return;
        
        this.ctx.save();
        
        // Draw alien collision box
        if (this.alienCharacter) {
            const alienBounds = this.alienCharacter.getCollisionBounds();
            this.ctx.strokeStyle = '#00ff00';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(alienBounds.x, alienBounds.y, alienBounds.width, alienBounds.height);
            
            // Draw physics debug info
            const physicsInfo = this.physicsEngine.getDebugInfo(this.alienCharacter);
            this.ctx.fillStyle = '#00ff00';
            this.ctx.font = '10px Arial';
            this.ctx.textAlign = 'left';
            this.ctx.fillText(`Geschwindigkeit: ${Math.round(physicsInfo.speed * 10) / 10}`, 10, 100);
            this.ctx.fillText(`Energie: ${Math.round(physicsInfo.kineticEnergy * 10) / 10}`, 10, 115);
        }
        
        // Draw spike collision boxes
        this.spikeObstacles.forEach((spike, index) => {
            const spikeBounds = spike.getCollisionBounds();
            
            // Check if alien is colliding with this spike
            const isColliding = this.alienCharacter && 
                               this.physicsEngine.checkCollision(this.alienCharacter, spike);
            
            this.ctx.strokeStyle = isColliding ? '#ff0000' : '#ffaa00';
            this.ctx.lineWidth = isColliding ? 3 : 1;
            this.ctx.strokeRect(spikeBounds.x, spikeBounds.y, spikeBounds.width, spikeBounds.height);
            
            // Draw spike index
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '8px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(index.toString(), spikeBounds.x + spikeBounds.width / 2, spikeBounds.y - 2);
        });
        
        // Draw ground collision line
        this.ctx.strokeStyle = '#00ffff';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(0, GAME_CONFIG.GROUND_LEVEL);
        this.ctx.lineTo(GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.GROUND_LEVEL);
        this.ctx.stroke();
        
        // Draw collision history
        this.ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
        this.collisionHistory.forEach(collision => {
            this.ctx.fillRect(collision.x - 5, collision.y - 5, 10, 10);
        });
        
        this.ctx.restore();
        
        // Clean up old collision history
        this.collisionHistory = this.collisionHistory.filter(collision => 
            Date.now() - collision.timestamp < 2000 // Keep for 2 seconds
        );
    }
    
    // Render touch feedback for mobile users
    renderTouchFeedback() {
        if (!this.inputHandler) return;
        
        const currentTime = performance.now();
        const timeSinceTouch = currentTime - this.inputHandler.lastTouchTime;
        
        // Show touch feedback for a short time after touch
        if (timeSinceTouch < this.inputHandler.touchFeedbackDuration * 1000) {
            const alpha = 1 - (timeSinceTouch / (this.inputHandler.touchFeedbackDuration * 1000));
            
            // Draw touch indicator in bottom right
            this.ctx.save();
            this.ctx.globalAlpha = alpha;
            
            // Touch icon background
            this.ctx.fillStyle = 'rgba(0, 255, 136, 0.8)';
            this.ctx.fillRect(this.canvas.width - 60, this.canvas.height - 60, 50, 50);
            
            // Touch icon
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '20px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('👆', this.canvas.width - 35, this.canvas.height - 40);
            
            // Jump text
            this.ctx.font = '12px Arial';
            this.ctx.fillText('SPRUNG', this.canvas.width - 35, this.canvas.height - 20);
            
            this.ctx.restore();
        }
    }
    
    // Pause the game
    pause() {
        if (!this.isRunning) return;
        
        // Only allow pause/resume during gameplay
        if (this.gameState.currentState === GAME_STATES.PLAYING) {
            this.isPaused = true;
            this.changeGameState(GAME_STATES.PAUSED);
        } else if (this.gameState.currentState === GAME_STATES.PAUSED) {
            this.isPaused = false;
            this.changeGameState(GAME_STATES.PLAYING);
        }
    }
    
    // Reset the game to initial state
    reset() {
        console.log('GameEngine: Resetting game...');
        
        // Reset engine state
        this.frameCount = 0;
        this.fps = 0;
        
        // Reset game state
        this.gameState.score = 0;
        this.gameState.level = 1;
        this.gameState.lives = 3;
        this.gameState.gameTime = 0;
        this.gameState.isGameOver = false;
        this.gameState.isVictory = false;
        this.gameState.canRestart = false;
        
        // Reset statistics for this session
        this.stats.totalJumps = 0;
        this.stats.totalDistance = 0;
        this.stats.obstaclesCleared = 0;
        this.stats.playTime = 0;
        
        // Update UI
        updateScoreDisplay(0);
        
        // Reset alien character
        if (this.alienCharacter) {
            this.alienCharacter.reset();
        }
        
        // Reset level manager and regenerate level
        this.levelManager.resetToLevel1();
        this.candies = []; // Clear all candies
        this.generateCurrentLevel();
        
        // Start playing again
        if (this.isRunning) {
            this.changeGameState(GAME_STATES.PLAYING);
        }
    }
    
    // Stop the game
    stop() {
        console.log('GameEngine: Stopping game...');
        this.isRunning = false;
        this.isPaused = false;
        this.changeGameState(GAME_STATES.MENU);
    }
    
    // Update FPS calculation
    updateFPS(currentTime) {
        if (currentTime - this.fpsUpdateTime >= 1000) { // Update every second
            this.fps = Math.round(this.frameCount * 1000 / (currentTime - this.fpsUpdateTime));
            this.frameCount = 0;
            this.fpsUpdateTime = currentTime;
        }
    }
    
    // Game state management methods
    changeGameState(newState) {
        if (this.gameState.currentState === newState) {
            return; // No change needed
        }
        
        console.log(`GameEngine: State change from ${this.gameState.currentState} to ${newState}`);
        this.gameState.previousState = this.gameState.currentState;
        this.gameState.currentState = newState;
        
        // Handle state-specific logic
        switch (newState) {
            case GAME_STATES.PLAYING:
                this.gameState.isGameOver = false;
                this.gameState.isVictory = false;
                this.gameState.canRestart = false;
                updateGameStatus('Spiel läuft', '');
                break;
                
            case GAME_STATES.PAUSED:
                updateGameStatus('PAUSIERT - Drücke P zum Fortsetzen', 'paused');
                break;
                
            case GAME_STATES.GAME_OVER:
                this.gameState.isGameOver = true;
                this.gameState.canRestart = true;
                this.updateBestScore();
                updateGameStatus('SPIEL VORBEI - Drücke R zum Neustarten', 'game-over');
                break;
                
            case GAME_STATES.VICTORY:
                this.gameState.isVictory = true;
                this.gameState.canRestart = true;
                this.updateBestScore();
                updateGameStatus('SIEG! - Drücke R um nochmal zu spielen', 'victory');
                break;
                
            case GAME_STATES.MENU:
                updateGameStatus('Drücke LEERTASTE zum Starten', '');
                break;
                
            case GAME_STATES.LOADING:
                updateGameStatus('Lädt...', '');
                break;
        }
    }
    
    // Check if game is in a playable state
    isPlayable() {
        return this.gameState.currentState === GAME_STATES.PLAYING && 
               this.isRunning && 
               !this.isPaused;
    }
    
    // Add score with optional multiplier
    addScore(points, multiplier = 1) {
        const scoreToAdd = Math.floor(points * multiplier);
        this.gameState.score += scoreToAdd;
        updateScoreDisplay(this.gameState.score);
        
        console.log(`Score added: ${scoreToAdd} (Total: ${this.gameState.score})`);
    }
    
    // Reset score
    resetScore() {
        this.gameState.score = 0;
        updateScoreDisplay(this.gameState.score);
    }
    
    // Game over handling
    triggerGameOver() {
        console.log('GameEngine: Game Over triggered');
        this.changeGameState(GAME_STATES.GAME_OVER);
    }
    
    // Victory handling
    triggerVictory() {
        console.log('GameEngine: Victory triggered');
        this.changeGameState(GAME_STATES.VICTORY);
    }
    
    // Level completion handling (for endless mode level-ups)
    completeLevel() {
        console.log(`Level ${this.levelManager.currentLevel} reached!`);
        
        // Award points for level completion
        const levelBonus = this.levelManager.currentLevel * 100;
        this.addScore(levelBonus, 1);
        
        // Update game state level
        this.gameState.level = this.levelManager.currentLevel;
        
        // Show level completion message briefly (don't reset in endless mode)
        updateGameStatus(`Level ${this.levelManager.currentLevel} erreicht! +${levelBonus} Punkte`, 'victory');
        
        // Return to normal gameplay after a short delay
        setTimeout(() => {
            if (this.gameState.currentState === GAME_STATES.PLAYING) {
                updateGameStatus('', '');
            }
        }, 2000);
    }
    
    // Update best score if current score is higher
    updateBestScore() {
        if (this.gameState.score > this.stats.bestScore) {
            this.stats.bestScore = this.gameState.score;
            this.saveBestScore();
            console.log(`New best score: ${this.stats.bestScore}`);
        }
    }
    
    // Load best score from localStorage
    loadBestScore() {
        try {
            const saved = localStorage.getItem('alienJumpGame_bestScore');
            return saved ? parseInt(saved, 10) : 0;
        } catch (e) {
            console.warn('Could not load best score:', e);
            return 0;
        }
    }
    
    // Save best score to localStorage
    saveBestScore() {
        try {
            localStorage.setItem('alienJumpGame_bestScore', this.stats.bestScore.toString());
        } catch (e) {
            console.warn('Could not save best score:', e);
        }
    }
    
    // Update game statistics
    updateStats(deltaTime) {
        this.stats.playTime += deltaTime;
        this.gameState.gameTime += deltaTime;
    }
    
    // Generate level using LevelManager
    generateCurrentLevel() {
        this.spikeObstacles = [];
        
        // Generate level configuration
        const levelConfig = this.levelManager.generateLevel();
        
        // Create spike obstacles from level configuration
        levelConfig.spikePositions.forEach(spikeData => {
            const spike = new SpikeObstacle(spikeData.x, spikeData.y, spikeData.width, spikeData.height);
            this.spikeObstacles.push(spike);
        });
        
        // Store level configuration
        this.currentLevelConfig = levelConfig;
        
        // Log jumpability validation results
        const levelInfo = this.levelManager.getCurrentLevelInfo();
        console.log(`Generated level ${levelConfig.levelNumber} with ${this.spikeObstacles.length} spike obstacles`);
        console.log(`Jump capabilities: Height=${levelInfo.maxJumpHeight}px, Distance=${levelInfo.maxJumpDistance}px`);
        
        // Validate the generated level one more time
        this.validateGeneratedLevel();
    }
    
    // Final validation of the generated level
    validateGeneratedLevel() {
        if (!this.currentLevelConfig || this.spikeObstacles.length === 0) return;
        
        let validationPassed = true;
        let currentX = this.currentLevelConfig.alienStartPosition.x;
        
        console.log('Final level validation:');
        
        for (let i = 0; i < this.spikeObstacles.length; i++) {
            const spike = this.spikeObstacles[i];
            const distance = spike.position.x - currentX;
            const maxJumpDistance = this.levelManager.alienMaxJumpDistance;
            const maxJumpHeight = this.levelManager.alienMaxJumpHeight;
            
            console.log(`Spike ${i}: Distance=${distance}px, Height=${spike.height}px`);
            
            if (distance > maxJumpDistance) {
                console.error(`❌ Spike ${i} too far: ${distance}px > ${maxJumpDistance}px`);
                validationPassed = false;
            } else {
                console.log(`✅ Spike ${i} distance OK`);
            }
            
            if (spike.height > maxJumpHeight) {
                console.error(`❌ Spike ${i} too tall: ${spike.height}px > ${maxJumpHeight}px`);
                validationPassed = false;
            } else {
                console.log(`✅ Spike ${i} height OK`);
            }
            
            currentX = spike.position.x + spike.width;
        }
        
        console.log(`Level validation result: ${validationPassed ? '✅ PASSED' : '❌ FAILED'}`);
        
        if (!validationPassed) {
            console.warn('Level validation failed - some spikes may be unjumpable!');
        }
    }
    
    // Update all spike obstacles
    updateSpikes(deltaTime) {
        this.spikeObstacles.forEach(spike => {
            spike.update(deltaTime);
        });
    }
    
    // Update all candies
    updateCandies(deltaTime) {
        this.candies.forEach(candy => {
            candy.update(deltaTime);
        });
        
        // Clean up collected candies and old ones
        const cleanupThreshold = this.alienCharacter.position.x - 500;
        this.candies = this.candies.filter(candy => 
            !candy.isCollected && candy.position.x > cleanupThreshold
        );
    }
    
    // Check collisions between alien and spikes with comprehensive physics resolution
    checkSpikeCollisions() {
        if (!this.alienCharacter || !this.physicsEngine) return false;
        
        for (const spike of this.spikeObstacles) {
            // Use PhysicsEngine for precise collision detection
            if (this.physicsEngine.checkCollision(this.alienCharacter, spike)) {
                // Handle collision through character's method first
                const characterHandled = this.alienCharacter.handleSpikeCollision(spike);
                
                if (characterHandled) {
                    // Use PhysicsEngine for collision resolution
                    this.physicsEngine.resolveCollision(this.alienCharacter, spike, 'spike');
                    
                    // Record collision for debugging
                    this.collisionHistory.push({
                        x: spike.position.x + spike.width / 2,
                        y: spike.position.y + spike.height / 2,
                        timestamp: Date.now(),
                        type: 'spike'
                    });
                    
                    // Reduce lives
                    this.gameState.lives--;
                    
                    // Add screen shake effect
                    this.renderer.setCameraShake(5, 0.5);
                    
                    // Award points for surviving a hit (if not game over)
                    if (this.gameState.lives > 0) {
                        this.addScore(10); // Small survival bonus
                    }
                    
                    // Check if game over
                    if (this.gameState.lives <= 0) {
                        console.log('Game Over - No lives remaining!');
                        return { spike, gameOver: true };
                    } else {
                        console.log(`Lives remaining: ${this.gameState.lives}`);
                        return { spike, gameOver: false };
                    }
                }
            }
        }
        
        return false;
    }
    
    // Check collisions between alien and candies
    checkCandyCollisions() {
        if (!this.alienCharacter || !this.physicsEngine) return;
        
        const alienBounds = this.alienCharacter.getCollisionBounds();
        
        for (const candy of this.candies) {
            if (candy.checkCollision(alienBounds)) {
                if (candy.collect()) {
                    // Add life and score
                    this.gameState.lives += candy.lifeBonus;
                    this.addScore(candy.scoreBonus);
                    
                    // Visual feedback
                    this.renderer.setCameraShake(2, 0.3);
                    
                    console.log(`Candy collected! Lives: ${this.gameState.lives}, Score bonus: ${candy.scoreBonus}`);
                    
                    // Show collection message
                    updateGameStatus(`+1 Leben! +${candy.scoreBonus} Punkte`, 'victory');
                    setTimeout(() => {
                        if (this.gameState.currentState === GAME_STATES.PLAYING) {
                            updateGameStatus('', '');
                        }
                    }, 1500);
                }
            }
        }
    }
    
    // Check and resolve ground collision
    checkGroundCollision() {
        if (!this.alienCharacter || !this.physicsEngine) return;
        
        const groundLevel = GAME_CONFIG.GROUND_LEVEL;
        const alienBottom = this.alienCharacter.position.y + this.alienCharacter.height;
        
        if (alienBottom >= groundLevel) {
            // Create an infinite ground object for collision resolution
            const ground = {
                position: { x: -1000, y: groundLevel }, // Start far left
                width: 999999, // Very wide for endless runner
                height: GAME_CONFIG.CANVAS_HEIGHT - groundLevel,
                getCollisionBounds: function() {
                    return {
                        x: this.position.x,
                        y: this.position.y,
                        width: this.width,
                        height: this.height
                    };
                }
            };
            
            // Resolve ground collision
            this.physicsEngine.resolveCollision(this.alienCharacter, ground, 'ground');
        }
    }
    
    // Check collision with level boundaries
    checkLevelBoundaries() {
        if (!this.alienCharacter || !this.physicsEngine) return;
        
        const result = this.physicsEngine.checkWorldBounds(
            this.alienCharacter, 
            999999, // Infinite width for endless runner
            GAME_CONFIG.CANVAS_HEIGHT + 100 // Allow some fall distance before death
        );
        
        if (result === 'death') {
            console.log('AlienCharacter fell off the world!');
            this.triggerGameOver();
        }
    }
    
    // Render all spike obstacles
    renderSpikes() {
        this.spikeObstacles.forEach(spike => {
            spike.render(this.ctx);
        });
    }
    
    // Render all candies
    renderCandies() {
        this.candies.forEach(candy => {
            if (!candy.isCollected) {
                candy.render(this.ctx);
            }
        });
    }
    
    // Render level goal (in world coordinates)
    renderLevelGoal() {
        if (!this.currentLevelConfig) return;
        
        const goal = this.currentLevelConfig.goalPosition;
        
        // Only render if goal is visible on screen
        const screenPos = this.renderer.worldToScreen(goal.x, goal.y);
        if (screenPos.x < -50 || screenPos.x > this.canvas.width + 50) {
            return; // Goal is off-screen
        }
        
        // Draw goal flag (in world coordinates)
        this.ctx.fillStyle = '#00ff00';
        this.ctx.fillRect(goal.x, goal.y, 8, 40);
        
        // Draw flag
        this.ctx.fillStyle = '#ffff00';
        this.ctx.fillRect(goal.x + 8, goal.y, 30, 20);
        
        // Draw flag text
        this.ctx.fillStyle = '#000000';
        this.ctx.font = '10px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('GOAL', goal.x + 23, goal.y + 12);
    }
    
    // Get current game state (expanded)
    getGameState() {
        return {
            // Engine state
            isRunning: this.isRunning,
            isPaused: this.isPaused,
            fps: this.fps,
            deltaTime: this.deltaTime,
            
            // Game state
            currentState: this.gameState.currentState,
            score: this.gameState.score,
            level: this.gameState.level,
            lives: this.gameState.lives,
            gameTime: this.gameState.gameTime,
            isGameOver: this.gameState.isGameOver,
            isVictory: this.gameState.isVictory,
            canRestart: this.gameState.canRestart,
            
            // Statistics
            stats: { ...this.stats },
            
            // Game objects
            spikeCount: this.spikeObstacles.length
        };
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('Alien Jump Game - Initializing...');
    
    // Get canvas and context
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    // Create and initialize game engine
    gameEngine = new GameEngine(canvas, ctx);
    
    if (gameEngine.init()) {
        console.log('Game engine initialized successfully');
        
        // Start the game automatically
        gameEngine.start();
    } else {
        console.error('Failed to initialize game engine');
        updateGameStatus('Initialisierung fehlgeschlagen', 'game-over');
    }
});

// Game control input (handled by InputHandler, but keep menu start functionality)
document.addEventListener('keydown', function(event) {
    if (!gameEngine) return;
    
    const currentState = gameEngine.gameState.currentState;
    
    // Handle menu start (since InputHandler focuses on gameplay)
    if (event.code === 'Space' && currentState === GAME_STATES.MENU) {
        gameEngine.start();
        event.preventDefault();
    }
});

// Utility function to update score display
function updateScoreDisplay(score) {
    const scoreElement = document.getElementById('score');
    if (scoreElement) {
        scoreElement.textContent = score;
    }
}

// Utility function to update game status
function updateGameStatus(message, statusClass = '') {
    const statusElement = document.getElementById('gameStatus');
    if (statusElement) {
        statusElement.textContent = message;
        statusElement.className = 'game-status ' + statusClass;
    }
}

// Handle window resize for responsive canvas
window.addEventListener('resize', function() {
    // Canvas will maintain its aspect ratio through CSS
    console.log('Window resized - canvas responsive handling active');
});

console.log('Game.js loaded successfully');