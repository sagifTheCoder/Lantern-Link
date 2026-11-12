import React, { useRef, useEffect, useState, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { LevelConfig, LanternStats, Vector2D, WindTrail, Particle } from '../types/game';
import { soundManager } from '../utils/audio';

interface GameCanvasProps {
  level: LevelConfig;
  lantern: LanternStats;
  onLevelComplete: (stars: number, gustsUsed: number, patternsCollected: number) => void;
  onLevelFailed: (reason: 'gusts' | 'destroyed') => void;
  onPatternCollectedTrivia: (patternName: string, trivia: string) => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  level,
  lantern,
  onLevelComplete,
  onLevelFailed,
  onPatternCollectedTrivia,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Game physical state refs (for 60fps loop without React re-render lag)
  const stateRef = useRef({
    pos: { x: level.startPos.x, y: level.startPos.y },
    vel: { x: 0, y: 0 },
    angle: 0,
    angularVel: 0,
    radius: 22,
    health: lantern.durability,
    maxHealth: lantern.durability,
    gustsLeft: level.maxGusts,
    patterns: JSON.parse(JSON.stringify(level.patterns)),
    fireflies: JSON.parse(JSON.stringify(level.fireflies || [])),
    particles: [] as Particle[],
    windTrails: [] as WindTrail[],
    activeSwipe: null as { startX: number; startY: number; currX: number; currY: number; startTime: number; points: { x: number; y: number; time: number }[] } | null,
    isComplete: false,
    isFailed: false,
    inGoalTimer: 0,
    tasselPos1: { x: level.startPos.x, y: level.startPos.y + 24 },
    tasselPos2: { x: level.startPos.x, y: level.startPos.y + 44 },
    lastTime: performance.now(),
    canvasWidth: 800,
    canvasHeight: 560,
  });

  // UI state for reactive HUD overlay
  const [hudGusts, setHudGusts] = useState(level.maxGusts);
  const [hudHealth, setHudHealth] = useState(100);
  const [hudPatterns, setHudPatterns] = useState(0);

  // Initialize/Reset when level or lantern changes
  useEffect(() => {
    stateRef.current.pos = { x: level.startPos.x, y: level.startPos.y };
    stateRef.current.vel = { x: 0, y: 0 };
    stateRef.current.angle = 0;
    stateRef.current.angularVel = 0;
    stateRef.current.health = lantern.durability;
    stateRef.current.maxHealth = lantern.durability;
    stateRef.current.gustsLeft = level.maxGusts;
    stateRef.current.patterns = JSON.parse(JSON.stringify(level.patterns));
    stateRef.current.fireflies = JSON.parse(JSON.stringify(level.fireflies || []));
    stateRef.current.particles = [];
    stateRef.current.windTrails = [];
    stateRef.current.activeSwipe = null;
    stateRef.current.isComplete = false;
    stateRef.current.isFailed = false;
    stateRef.current.inGoalTimer = 0;
    stateRef.current.tasselPos1 = { x: level.startPos.x, y: level.startPos.y + 24 };
    stateRef.current.tasselPos2 = { x: level.startPos.x, y: level.startPos.y + 44 };

    setHudGusts(level.maxGusts);
    setHudHealth(100);
    setHudPatterns(0);
  }, [level, lantern]);

  // Pointer / Touch Swipe Events
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (stateRef.current.isComplete || stateRef.current.isFailed) return;
    if (stateRef.current.gustsLeft <= 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    stateRef.current.activeSwipe = {
      startX: x,
      startY: y,
      currX: x,
      currY: y,
      startTime: performance.now(),
      points: [{ x, y, time: performance.now() }],
    };

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const swipe = stateRef.current.activeSwipe;
    if (!swipe) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    swipe.currX = x;
    swipe.currY = y;
    swipe.points.push({ x, y, time: performance.now() });

    // Spawn slight wind trail particles
    if (Math.random() > 0.4) {
      stateRef.current.particles.push({
        x: x + (Math.random() - 0.5) * 10,
        y: y + (Math.random() - 0.5) * 10,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        size: Math.random() * 4 + 2,
        color: level.chapter === 'korea' ? '#93c5fd' : '#fef08a',
        alpha: 0.8,
        life: 0,
        maxLife: 24,
        type: level.chapter === 'korea' ? 'dust' : 'petal',
      });
    }
  };

  const handlePointerUp = () => {
    const swipe = stateRef.current.activeSwipe;
    if (!swipe) return;

    const now = performance.now();
    const duration = Math.max(40, now - swipe.startTime);
    const dx = swipe.currX - swipe.startX;
    const dy = swipe.currY - swipe.startY;
    const distance = Math.hypot(dx, dy);

    // Minimum swipe threshold to trigger wind
    if (distance > 25 && stateRef.current.gustsLeft > 0) {
      // Swipe velocity
      const speed = distance / (duration / 1000);
      const intensity = Math.min(speed / 450, 2.4);

      // Force direction
      const dirX = dx / distance;
      const dirY = dy / distance;

      // Distance from lantern to swipe line
      const lp = stateRef.current.pos;
      const distToLine = pointToSegmentDistance(lp.x, lp.y, swipe.startX, swipe.startY, swipe.currX, swipe.currY);

      // Effect range: if swipe was anywhere in vicinity or general screen flow
      const maxEffectDist = 320;
      if (distToLine < maxEffectDist) {
        const falloff = Math.max(0.2, 1 - distToLine / maxEffectDist);
        const impulsePower = intensity * 4.2 * level.windPowerMultiplier * falloff * (1 / lantern.mass);

        stateRef.current.vel.x += dirX * impulsePower;
        stateRef.current.vel.y += dirY * impulsePower;

        // Apply tilt torque
        stateRef.current.angularVel += dirX * 0.15;

        // Sound & haptics
        soundManager.playWindSwipe(intensity);
        if (navigator.vibrate) navigator.vibrate(25);
      } else {
        // Subtle ambient push if swiped far away
        stateRef.current.vel.x += dirX * 0.4;
        stateRef.current.vel.y += dirY * 0.4;
        soundManager.playWindSwipe(0.6);
      }

      // Add wind visual ribbon
      stateRef.current.windTrails.push({
        points: [...swipe.points],
        startX: swipe.startX,
        startY: swipe.startY,
        endX: swipe.currX,
        endY: swipe.currY,
        force: { x: dirX * intensity, y: dirY * intensity },
        life: 1.0,
        color: level.chapter === 'korea' ? '#60a5fa' : '#f59e0b',
      });

      // Decrement wind gusts
      stateRef.current.gustsLeft -= 1;
      setHudGusts(stateRef.current.gustsLeft);

      // Spawn wind swoosh petals
      for (let i = 0; i < 14; i++) {
        const t = Math.random();
        stateRef.current.particles.push({
          x: swipe.startX + dx * t + (Math.random() - 0.5) * 20,
          y: swipe.startY + dy * t + (Math.random() - 0.5) * 20,
          vx: dirX * 3 + (Math.random() - 0.5) * 2,
          vy: dirY * 3 + (Math.random() - 0.5) * 2,
          size: Math.random() * 5 + 3,
          color: level.chapter === 'korea' ? '#bfdbfe' : '#fed7aa',
          alpha: 0.9,
          life: 0,
          maxLife: 35,
          type: 'petal',
        });
      }
    }

    stateRef.current.activeSwipe = null;
  };

  // Distance helper from point to line segment
  const pointToSegmentDistance = (px: number, py: number, x1: number, y1: number, x2: number, y2: number) => {
    const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
    if (l2 === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
  };

  // Circle to polygon collision
  const checkCirclePolygonCollision = (cx: number, cy: number, r: number, points: Vector2D[]) => {
    for (let i = 0; i < points.length; i++) {
      const p1 = points[i];
      const p2 = points[(i + 1) % points.length];
      const dist = pointToSegmentDistance(cx, cy, p1.x, p1.y, p2.x, p2.y);
      if (dist < r) {
        // Normal vector pointing away from segment
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const nx = -dy;
        const ny = dx;
        const nlen = Math.hypot(nx, ny) || 1;
        return { hit: true, nx: nx / nlen, ny: ny / nlen, dist };
      }
    }
    return { hit: false, nx: 0, ny: 0, dist: 999 };
  };

  // Main Physics & Render Loop
  useEffect(() => {
    let animationFrameId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gameLoop = (time: number) => {
      const dt = Math.min((time - stateRef.current.lastTime) / 1000, 0.05);
      stateRef.current.lastTime = time;

      const s = stateRef.current;

      if (!s.isComplete && !s.isFailed) {
        // --- PHYSICS UPDATE ---
        // 1. Natural Buoyancy vs Gravity
        const gravity = 0.22;
        const netUpwardForce = (lantern.buoyancy * 2.8) - gravity;
        s.vel.y -= netUpwardForce;

        // 2. Air Drag
        s.vel.x *= lantern.airResistance;
        s.vel.y *= lantern.airResistance;

        // 3. Environmental Forces (Updrafts & Vortexes)
        level.obstacles.forEach((obs) => {
          if (obs.type === 'updraft' && obs.width && obs.height) {
            if (
              s.pos.x >= obs.x &&
              s.pos.x <= obs.x + obs.width &&
              s.pos.y >= obs.y &&
              s.pos.y <= obs.y + obs.height
            ) {
              s.vel.y += (obs.strength || -0.25) * 1.5;
              // Spark gentle updraft particles
              if (Math.random() > 0.6) {
                s.particles.push({
                  x: obs.x + Math.random() * obs.width,
                  y: obs.y + obs.height - 5,
                  vx: (Math.random() - 0.5) * 0.5,
                  vy: -Math.random() * 2 - 1,
                  size: Math.random() * 3 + 1,
                  color: '#fdba74',
                  alpha: 0.7,
                  life: 0,
                  maxLife: 30,
                  type: 'spark',
                });
              }
            }
          } else if (obs.type === 'vortex' && obs.width && obs.height) {
            const centerX = obs.x + obs.width / 2;
            const centerY = obs.y + obs.height / 2;
            const vDist = Math.hypot(s.pos.x - centerX, s.pos.y - centerY);
            const vRadius = obs.width / 2;
            if (vDist < vRadius) {
              const angle = Math.atan2(s.pos.y - centerY, s.pos.x - centerX);
              // Swirl tangent + slight pull
              const tangent = angle + Math.PI / 2;
              const swirlPower = (obs.strength || 0.3) * (1 - vDist / vRadius);
              s.vel.x += Math.cos(tangent) * swirlPower * 3.5 - Math.cos(angle) * swirlPower * 1.2;
              s.vel.y += Math.sin(tangent) * swirlPower * 3.5 - Math.sin(angle) * swirlPower * 1.2;
              s.angularVel += 0.08;
            }
          }
        });

        // 4. Update Position
        s.pos.x += s.vel.x;
        s.pos.y += s.vel.y;

        // 5. Sway & Tassel Pendulum Physics
        // Upright restoring torque
        const targetAngle = Math.max(-0.6, Math.min(0.6, s.vel.x * 0.08));
        s.angularVel += (targetAngle - s.angle) * 0.12;
        s.angularVel *= 0.88;
        s.angle += s.angularVel;

        // Tassel segment 1 (verlet follow)
        const tLen1 = lantern.tasselLength * 0.5;
        const anchorX = s.pos.x - Math.sin(s.angle) * s.radius;
        const anchorY = s.pos.y + Math.cos(s.angle) * s.radius;
        const tdx1 = s.tasselPos1.x - anchorX;
        const tdy1 = s.tasselPos1.y - anchorY;
        const curLen1 = Math.hypot(tdx1, tdy1) || 1;
        s.tasselPos1.x = anchorX + (tdx1 / curLen1) * tLen1;
        s.tasselPos1.y = anchorY + (tdy1 / curLen1) * tLen1 + 1.2; // gravity pull

        // Tassel segment 2
        const tLen2 = lantern.tasselLength * 0.6;
        const tdx2 = s.tasselPos2.x - s.tasselPos1.x;
        const tdy2 = s.tasselPos2.y - s.tasselPos1.y;
        const curLen2 = Math.hypot(tdx2, tdy2) || 1;
        s.tasselPos2.x = s.tasselPos1.x + (tdx2 / curLen2) * tLen2;
        s.tasselPos2.y = s.tasselPos1.y + (tdy2 / curLen2) * tLen2 + 1.5;

        // 6. Collision with Boundaries
        if (s.pos.x - s.radius < 10) {
          s.pos.x = 10 + s.radius;
          s.vel.x = -s.vel.x * 0.4;
          soundManager.playLanternBump(0.5);
        } else if (s.pos.x + s.radius > canvas.width - 10) {
          s.pos.x = canvas.width - 10 - s.radius;
          s.vel.x = -s.vel.x * 0.4;
          soundManager.playLanternBump(0.5);
        }

        if (s.pos.y - s.radius < 20) {
          s.pos.y = 20 + s.radius;
          s.vel.y = Math.abs(s.vel.y) * 0.3;
          soundManager.playLanternBump(0.6);
        }

        // River water or bottom ground
        const bottomY = level.waterLevel || canvas.height - 25;
        if (s.pos.y + s.radius > bottomY) {
          s.pos.y = bottomY - s.radius;
          s.vel.y = -Math.abs(s.vel.y) * 0.35;
          s.vel.x *= 0.85;
          soundManager.playLanternBump(0.8);

          // Water ripples or splash sparks
          for (let i = 0; i < 5; i++) {
            s.particles.push({
              x: s.pos.x + (Math.random() - 0.5) * 16,
              y: bottomY,
              vx: (Math.random() - 0.5) * 2,
              vy: -Math.random() * 1.5,
              size: Math.random() * 3 + 1,
              color: '#38bdf8',
              alpha: 0.8,
              life: 0,
              maxLife: 20,
              type: 'dust',
            });
          }
        }

        // 7. Obstacle Collisions
        level.obstacles.forEach((obs) => {
          if (obs.type === 'roof_slope' && obs.points) {
            const col = checkCirclePolygonCollision(s.pos.x, s.pos.y, s.radius, obs.points);
            if (col.hit) {
              // Push out
              s.pos.x += col.nx * (s.radius - col.dist + 1);
              s.pos.y += col.ny * (s.radius - col.dist + 1);

              const dot = s.vel.x * col.nx + s.vel.y * col.ny;
              s.vel.x = (s.vel.x - 1.6 * dot * col.nx) * 0.6;
              s.vel.y = (s.vel.y - 1.6 * dot * col.ny) * 0.6;

              // Collision damage
              const impact = Math.hypot(s.vel.x, s.vel.y);
              if (impact > 1.2) {
                const dmg = Math.round(impact * 6);
                s.health = Math.max(0, s.health - dmg);
                setHudHealth(Math.round((s.health / s.maxHealth) * 100));
                soundManager.playLanternBump(1.2);
              }
            }
          } else if ((obs.type === 'wall' || obs.type === 'bridge') && obs.width && obs.height) {
            // AABB vs Circle
            const nearestX = Math.max(obs.x, Math.min(s.pos.x, obs.x + obs.width));
            const nearestY = Math.max(obs.y, Math.min(s.pos.y, obs.y + obs.height));
            const dist = Math.hypot(s.pos.x - nearestX, s.pos.y - nearestY);

            if (dist < s.radius) {
              const nx = (s.pos.x - nearestX) / (dist || 1);
              const ny = (s.pos.y - nearestY) / (dist || 1);
              s.pos.x = nearestX + nx * (s.radius + 1);
              s.pos.y = nearestY + ny * (s.radius + 1);

              const dot = s.vel.x * nx + s.vel.y * ny;
              s.vel.x = (s.vel.x - 1.5 * dot * nx) * 0.5;
              s.vel.y = (s.vel.y - 1.5 * dot * ny) * 0.5;

              soundManager.playLanternBump(0.9);
            }
          } else if (obs.type === 'branch_soft' && obs.width && obs.height) {
            // Soft foliage slows the lantern down
            if (
              s.pos.x >= obs.x &&
              s.pos.x <= obs.x + obs.width &&
              s.pos.y >= obs.y &&
              s.pos.y <= obs.y + obs.height
            ) {
              s.vel.x *= 0.94;
              s.vel.y *= 0.94;
            }
          } else if (obs.type === 'spikes' && obs.width && obs.height) {
            // Spikes deal heavy damage
            if (
              s.pos.x >= obs.x - s.radius &&
              s.pos.x <= obs.x + obs.width + s.radius &&
              s.pos.y >= obs.y - s.radius &&
              s.pos.y <= obs.y + obs.height + s.radius
            ) {
              s.health = Math.max(0, s.health - 25);
              setHudHealth(Math.round((s.health / s.maxHealth) * 100));
              s.vel.y = -Math.abs(s.vel.y) - 2;
              soundManager.playLanternBump(2.0);

              // Spark particles
              for (let i = 0; i < 8; i++) {
                s.particles.push({
                  x: s.pos.x,
                  y: s.pos.y,
                  vx: (Math.random() - 0.5) * 4,
                  vy: (Math.random() - 0.5) * 4,
                  size: Math.random() * 4 + 2,
                  color: '#ef4444',
                  alpha: 1,
                  life: 0,
                  maxLife: 20,
                  type: 'spark',
                });
              }
            }
          } else if (obs.type === 'chime' && obs.width && obs.height) {
            const dist = Math.hypot(s.pos.x - (obs.x + obs.width / 2), s.pos.y - (obs.y + obs.height / 2));
            if (dist < s.radius + 20) {
              soundManager.playPatternCollect(2);
            }
          }
        });

        // 8. Collect Cultural Patterns
        s.patterns.forEach((pat: { id: string; collected: boolean; x: number; y: number; radius: number; name: string; trivia: string }, idx: number) => {
          if (!pat.collected) {
            const dist = Math.hypot(s.pos.x - pat.x, s.pos.y - pat.y);
            if (dist < s.radius + pat.radius) {
              pat.collected = true;
              soundManager.playPatternCollect(idx);
              onPatternCollectedTrivia(pat.name, pat.trivia);

              // Update HUD count
              const count = s.patterns.filter((p: { collected: boolean }) => p.collected).length;
              setHudPatterns(count);

              // Spawn gold celebration burst
              for (let i = 0; i < 18; i++) {
                const angle = (i / 18) * Math.PI * 2;
                const spd = Math.random() * 3 + 2;
                s.particles.push({
                  x: pat.x,
                  y: pat.y,
                  vx: Math.cos(angle) * spd,
                  vy: Math.sin(angle) * spd,
                  size: Math.random() * 4 + 2,
                  color: '#fbbf24',
                  alpha: 1,
                  life: 0,
                  maxLife: 35,
                  type: 'spark',
                });
              }
            }
          }
        });

        // 9. Collect Fireflies (Grant bonus or extra wind gust)
        s.fireflies.forEach((ff: { collected: boolean; x: number; y: number; baseX: number; baseY: number; offset: number }) => {
          if (!ff.collected) {
            // Hover animation
            ff.y = ff.baseY + Math.sin(time * 0.003 + ff.offset) * 12;
            ff.x = ff.baseX + Math.cos(time * 0.002 + ff.offset) * 8;

            const dist = Math.hypot(s.pos.x - ff.x, s.pos.y - ff.y);
            if (dist < s.radius + 15) {
              ff.collected = true;
              soundManager.playFireflyCollect();
              // Grant bonus wind gust
              s.gustsLeft = Math.min(s.gustsLeft + 1, level.maxGusts + 2);
              setHudGusts(s.gustsLeft);

              // Visual sparkle
              for (let i = 0; i < 10; i++) {
                s.particles.push({
                  x: ff.x,
                  y: ff.y,
                  vx: (Math.random() - 0.5) * 3,
                  vy: (Math.random() - 0.5) * 3,
                  size: Math.random() * 3 + 2,
                  color: '#34d399',
                  alpha: 1,
                  life: 0,
                  maxLife: 25,
                  type: 'spark',
                });
              }
            }
          }
        });

        // 10. Check Goal / Destination
        const distToGoal = Math.hypot(s.pos.x - level.targetPos.x, s.pos.y - level.targetPos.y);
        if (distToGoal < level.targetRadius + s.radius * 0.6) {
          s.inGoalTimer += dt;
          // Dampen velocity inside goal
          s.vel.x *= 0.90;
          s.vel.y *= 0.90;

          if (s.inGoalTimer >= 0.35 && !s.isComplete) {
            s.isComplete = true;
            soundManager.playFestivalWin();

            // Burst festival confetti
            confetti({
              particleCount: 80,
              spread: 70,
              origin: { x: level.targetPos.x / canvas.width, y: level.targetPos.y / canvas.height },
              colors: ['#f59e0b', '#ef4444', '#3b82f6', '#10b981', '#ec4899'],
            });

            const collectedCount = s.patterns.filter((p: { collected: boolean }) => p.collected).length;
            const gustsUsed = level.maxGusts - s.gustsLeft;
            let stars = 1;
            if (collectedCount === 3) stars++;
            if (s.gustsLeft >= 1 && s.health >= s.maxHealth * 0.4) stars++;

            setTimeout(() => {
              onLevelComplete(stars, Math.max(0, gustsUsed), collectedCount);
            }, 900);
          }
        } else {
          s.inGoalTimer = Math.max(0, s.inGoalTimer - dt * 2);
        }

        // 11. Check Failure Conditions
        if (s.health <= 0) {
          s.isFailed = true;
          soundManager.playLevelFail();
          onLevelFailed('destroyed');
        } else if (s.gustsLeft <= 0 && Math.hypot(s.vel.x, s.vel.y) < 0.25 && distToGoal > level.targetRadius) {
          // Lantern ran out of gusts and came to rest outside goal
          s.isFailed = true;
          soundManager.playLevelFail();
          onLevelFailed('gusts');
        }
      }

      // --- RENDERING ---
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 1. Starry Night Sky Background
      drawNightSky(ctx, canvas.width, canvas.height, level.chapter, time);

      // 2. Distant Architectural Silhouettes (Hội An Pagoda & Hanok Cheoma Eaves)
      drawBackgroundSilhouettes(ctx, canvas.width, canvas.height, level.chapter);

      // 3. Environmental Obstacles (Roofs, Walls, Updrafts, Foliage)
      drawObstacles(ctx, level.obstacles, time);

      // 4. River Water Reflection & Floating Lanterns (Hoa Đăng)
      if (level.waterLevel) {
        drawRiverWater(ctx, canvas.width, canvas.height, level.waterLevel, s.pos, lantern.glowColor, time);
      }

      // 5. Destination Festival Altar / Gateway
      drawDestination(ctx, level.targetPos, level.targetRadius, time, level.chapter, s.inGoalTimer);

      // 6. Cultural Patterns to Collect
      drawCulturalPatterns(ctx, s.patterns, time);

      // 7. Fireflies
      drawFireflies(ctx, s.fireflies, time);

      // 8. Wind Ribbon Trails
      drawWindTrails(ctx, s.windTrails, dt);

      // 9. Active Swipe Guidance Line
      if (s.activeSwipe) {
        drawActiveSwipeLine(ctx, s.activeSwipe);
      }

      // 10. Particles (Sparks, Petals, Dust)
      drawParticles(ctx, s.particles);

      // 11. Lantern Soft Dynamic Ambient Light Casting (Vignette & Glow)
      drawLanternLightCasting(ctx, canvas.width, canvas.height, s.pos, lantern);

      // 12. Lantern Body & Tassel
      drawLantern(ctx, s.pos, s.angle, s.tasselPos1, s.tasselPos2, lantern, s.health / s.maxHealth, time);

      animationFrameId = requestAnimationFrame(gameLoop);
    };

    animationFrameId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [level, lantern, onLevelComplete, onLevelFailed, onPatternCollectedTrivia]);

  // --- CANVAS DRAWING SUB-ROUTINES ---
  const drawNightSky = (ctx: CanvasRenderingContext2D, w: number, h: number, chapter: string, time: number) => {
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
    if (chapter === 'vietnam') {
      // Hoi An warm twilight & indigo night
      skyGrad.addColorStop(0, '#0a0d24');
      skyGrad.addColorStop(0.6, '#121838');
      skyGrad.addColorStop(1, '#1e1430');
    } else if (chapter === 'korea') {
      // Hanok crisp moonlight winter night
      skyGrad.addColorStop(0, '#060a17');
      skyGrad.addColorStop(0.6, '#0f172a');
      skyGrad.addColorStop(1, '#1e293b');
    } else {
      // Convergence mystical celestial violet
      skyGrad.addColorStop(0, '#0d0722');
      skyGrad.addColorStop(0.6, '#1e103a');
      skyGrad.addColorStop(1, '#2c1035');
    }
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h);

    // Crescent Moon
    ctx.save();
    const moonX = w - 90;
    const moonY = 80;
    ctx.beginPath();
    ctx.arc(moonX, moonY, 26, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(254, 240, 138, 0.9)';
    ctx.shadowColor = '#fef08a';
    ctx.shadowBlur = 24;
    ctx.fill();

    // Shadow cut for crescent moon shape
    ctx.beginPath();
    ctx.arc(moonX + 10, moonY - 4, 22, 0, Math.PI * 2);
    ctx.fillStyle = chapter === 'vietnam' ? '#0a0d24' : '#060a17';
    ctx.shadowBlur = 0;
    ctx.fill();
    ctx.restore();

    // Twinkling stars
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    const starCount = 35;
    for (let i = 0; i < starCount; i++) {
      const sx = ((i * 127 + 45) % w);
      const sy = ((i * 83 + 20) % (h * 0.55));
      const twinkle = Math.sin(time * 0.002 + i) * 0.4 + 0.6;
      ctx.fillRect(sx, sy, twinkle * 1.6, twinkle * 1.6);
    }
  };

  const drawBackgroundSilhouettes = (ctx: CanvasRenderingContext2D, w: number, h: number, chapter: string) => {
    ctx.save();
    ctx.fillStyle = 'rgba(10, 14, 28, 0.55)';

    if (chapter === 'vietnam') {
      // Hoi An townhouse gables & tiled roofs in background
      ctx.beginPath();
      ctx.moveTo(0, h * 0.7);
      ctx.lineTo(80, h * 0.58);
      ctx.lineTo(160, h * 0.7);
      ctx.lineTo(240, h * 0.54);
      ctx.lineTo(330, h * 0.68);
      ctx.lineTo(440, h * 0.52);
      ctx.lineTo(540, h * 0.66);
      ctx.lineTo(650, h * 0.55);
      ctx.lineTo(760, h * 0.65);
      ctx.lineTo(w, h * 0.6);
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.fill();
    } else {
      // Hanok curved eaves (Cheoma) silhouettes
      ctx.beginPath();
      ctx.moveTo(0, h * 0.68);
      ctx.quadraticCurveTo(70, h * 0.52, 140, h * 0.68);
      ctx.quadraticCurveTo(240, h * 0.48, 340, h * 0.68);
      ctx.quadraticCurveTo(460, h * 0.50, 560, h * 0.70);
      ctx.quadraticCurveTo(670, h * 0.46, w, h * 0.66);
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.fill();
    }
    ctx.restore();
  };

  const drawObstacles = (ctx: CanvasRenderingContext2D, obstacles: LevelConfig['obstacles'], time: number) => {
    obstacles.forEach((obs) => {
      ctx.save();

      if (obs.type === 'roof_slope' && obs.points) {
        // Tiled Roof with curved Chinese/Vietnamese/Korean edge
        ctx.beginPath();
        ctx.moveTo(obs.points[0].x, obs.points[0].y);
        for (let i = 1; i < obs.points.length; i++) {
          ctx.lineTo(obs.points[i].x, obs.points[i].y);
        }
        ctx.closePath();
        ctx.fillStyle = obs.color || '#92400e';
        ctx.fill();

        // Decorative roof eave trim line
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Roof ridge tile detail
        ctx.fillStyle = '#78350f';
        ctx.fillRect(obs.points[1].x - 14, obs.points[1].y - 8, 28, 8);
      } else if (obs.type === 'wall' || obs.type === 'bridge') {
        if (obs.width && obs.height) {
          ctx.fillStyle = obs.color || '#ca8a04';
          ctx.fillRect(obs.x, obs.y, obs.width, obs.height);

          // Wood or Stone texture stripes
          ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
          for (let py = obs.y + 12; py < obs.y + obs.height; py += 16) {
            ctx.fillRect(obs.x, py, obs.width, 1.5);
          }
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);
        }
      } else if (obs.type === 'branch_soft' && obs.width && obs.height) {
        // Soft Bougainvillea or Willow foliage
        ctx.fillStyle = obs.color || '#f43f5e';
        ctx.beginPath();
        const cx = obs.x + obs.width / 2;
        const cy = obs.y + obs.height / 2;
        ctx.ellipse(cx, cy, obs.width / 2, obs.height / 2, 0, 0, Math.PI * 2);
        ctx.fill();

        // Subtle swaying blossom petals
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.beginPath();
        ctx.arc(cx - 15, cy - 8, 8, 0, Math.PI * 2);
        ctx.arc(cx + 12, cy + 6, 9, 0, Math.PI * 2);
        ctx.fill();
      } else if (obs.type === 'spikes' && obs.width && obs.height) {
        // Warning hazard spikes (sharp roof gables / ice stalactites)
        ctx.fillStyle = obs.color || '#ef4444';
        const count = Math.max(3, Math.floor(obs.width / 14));
        const step = obs.width / count;
        ctx.beginPath();
        ctx.moveTo(obs.x, obs.y + obs.height);
        for (let i = 0; i < count; i++) {
          ctx.lineTo(obs.x + i * step + step / 2, obs.y);
          ctx.lineTo(obs.x + (i + 1) * step, obs.y + obs.height);
        }
        ctx.fill();
      } else if (obs.type === 'updraft' && obs.width && obs.height) {
        // Upward thermal air stream
        const grad = ctx.createLinearGradient(0, obs.y + obs.height, 0, obs.y);
        grad.addColorStop(0, 'rgba(56, 189, 248, 0.05)');
        grad.addColorStop(1, 'rgba(56, 189, 248, 0.22)');
        ctx.fillStyle = grad;
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);

        // Animated ascending dashed lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 8]);
        ctx.lineDashOffset = -time * 0.04;
        ctx.beginPath();
        ctx.moveTo(obs.x + obs.width * 0.3, obs.y + obs.height);
        ctx.lineTo(obs.x + obs.width * 0.3, obs.y);
        ctx.moveTo(obs.x + obs.width * 0.7, obs.y + obs.height);
        ctx.lineTo(obs.x + obs.width * 0.7, obs.y);
        ctx.stroke();
      } else if (obs.type === 'vortex' && obs.width && obs.height) {
        // Swirling vortex circle
        const cx = obs.x + obs.width / 2;
        const cy = obs.y + obs.height / 2;
        const r = obs.width / 2;
        ctx.strokeStyle = 'rgba(96, 165, 250, 0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, r, (time * 0.003) % (Math.PI * 2), ((time * 0.003) % (Math.PI * 2)) + Math.PI * 1.5);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(147, 197, 253, 0.3)';
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.55, (-time * 0.004) % (Math.PI * 2), ((-time * 0.004) % (Math.PI * 2)) + Math.PI * 1.3);
        ctx.stroke();
      } else if (obs.type === 'chime' && obs.width && obs.height) {
        // Traditional Wind Chime (Phong Linh)
        ctx.fillStyle = obs.color || '#fbbf24';
        ctx.fillRect(obs.x + obs.width / 2 - 2, obs.y, 4, 15);
        ctx.beginPath();
        ctx.arc(obs.x + obs.width / 2, obs.y + 18, 8, 0, Math.PI * 2);
        ctx.fill();
        // Pendulum fish or paper strip
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(obs.x + obs.width / 2, obs.y + 26);
        ctx.lineTo(obs.x + obs.width / 2 + Math.sin(time * 0.005) * 6, obs.y + obs.height);
        ctx.stroke();
      }

      ctx.restore();
    });
  };

  const drawRiverWater = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    waterY: number,
    lanternPos: Vector2D,
    lanternColor: string,
    time: number
  ) => {
    ctx.save();
    // River gradient
    const waterGrad = ctx.createLinearGradient(0, waterY, 0, h);
    waterGrad.addColorStop(0, '#0c1a2e');
    waterGrad.addColorStop(0.4, '#091626');
    waterGrad.addColorStop(1, '#050c17');
    ctx.fillStyle = waterGrad;
    ctx.fillRect(0, waterY, w, h - waterY);

    // Water surface boundary wave line
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, waterY);
    for (let x = 0; x <= w; x += 30) {
      const y = waterY + Math.sin(x * 0.03 + time * 0.003) * 2;
      ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Shimmering reflection of player's lantern on the water
    const reflectDist = Math.max(0, waterY - lanternPos.y);
    if (reflectDist < 260) {
      const alpha = Math.max(0, 0.45 - reflectDist / 350);
      ctx.save();
      ctx.fillStyle = lanternColor;
      ctx.globalAlpha = alpha;
      ctx.filter = 'blur(6px)';
      const refY = waterY + reflectDist * 0.6;
      ctx.beginPath();
      ctx.ellipse(lanternPos.x, Math.min(refY, h - 10), 22, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Distant floating flower lanterns (hoa đăng trên sông Hoài)
    for (let i = 0; i < 6; i++) {
      const fx = ((i * 139 + 70 + time * 0.015) % (w + 40)) - 20;
      const fy = waterY + 12 + ((i * 23) % 24);
      const bob = Math.sin(time * 0.003 + i) * 1.5;

      ctx.fillStyle = i % 2 === 0 ? 'rgba(244, 63, 94, 0.7)' : 'rgba(245, 158, 11, 0.75)';
      ctx.beginPath();
      ctx.arc(fx, fy + bob, 5, 0, Math.PI * 2);
      ctx.fill();

      // Soft glow
      ctx.fillStyle = 'rgba(254, 240, 138, 0.3)';
      ctx.beginPath();
      ctx.arc(fx, fy + bob, 11, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  };

  const drawDestination = (
    ctx: CanvasRenderingContext2D,
    pos: Vector2D,
    radius: number,
    time: number,
    chapter: string,
    inGoalTimer: number
  ) => {
    ctx.save();
    const pulse = Math.sin(time * 0.004) * 4;

    // Glowing aura
    const auraGrad = ctx.createRadialGradient(pos.x, pos.y, 10, pos.x, pos.y, radius + pulse + 25);
    auraGrad.addColorStop(0, chapter === 'korea' ? 'rgba(96, 165, 250, 0.45)' : 'rgba(245, 158, 11, 0.5)');
    auraGrad.addColorStop(0.7, chapter === 'korea' ? 'rgba(59, 130, 246, 0.18)' : 'rgba(234, 88, 12, 0.22)');
    auraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = auraGrad;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, radius + pulse + 25, 0, Math.PI * 2);
    ctx.fill();

    // Sacred Festival Ring
    ctx.strokeStyle = inGoalTimer > 0 ? '#10b981' : chapter === 'korea' ? '#60a5fa' : '#fbbf24';
    ctx.lineWidth = inGoalTimer > 0 ? 4 : 2.5;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, radius + pulse, 0, Math.PI * 2);
    ctx.stroke();

    // Traditional Festival Gate Arch / Lotus Pedestal
    ctx.fillStyle = '#fef08a';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ĐÍCH ĐẾN', pos.x, pos.y - radius - 14);

    // Cultural symbol in center (Lotus or Taegeuk)
    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.rotate(time * 0.001);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 4; i++) {
      ctx.strokeRect(-8, -8, 16, 16);
      ctx.rotate(Math.PI / 4);
    }
    ctx.restore();

    ctx.restore();
  };

  const drawCulturalPatterns = (
    ctx: CanvasRenderingContext2D,
    patterns: LevelConfig['patterns'],
    time: number
  ) => {
    patterns.forEach((pat, idx) => {
      if (pat.collected) return;
      ctx.save();

      const floatY = pat.y + Math.sin(time * 0.004 + idx * 1.5) * 6;
      const spin = time * 0.002 + idx;

      // Glow halo
      ctx.fillStyle = 'rgba(245, 158, 11, 0.25)';
      ctx.beginPath();
      ctx.arc(pat.x, floatY, pat.radius + 8, 0, Math.PI * 2);
      ctx.fill();

      // Outer gold medallion ring
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(pat.x, floatY, pat.radius, 0, Math.PI * 2);
      ctx.stroke();

      // Inner ornate geometric pattern
      ctx.translate(pat.x, floatY);
      ctx.rotate(spin);

      if (pat.culture === 'korea') {
        // Korean Dancheong / Taegeuk style red & blue swirl
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(0, 0, pat.radius * 0.75, 0, Math.PI);
        ctx.fill();

        ctx.fillStyle = '#3b82f6';
        ctx.beginPath();
        ctx.arc(0, 0, pat.radius * 0.75, Math.PI, Math.PI * 2);
        ctx.fill();
      } else {
        // Vietnamese Lotus / Dong Son stylized petal motif
        ctx.fillStyle = '#facc15';
        for (let p = 0; p < 6; p++) {
          ctx.beginPath();
          ctx.ellipse(0, -pat.radius * 0.45, 3.5, 7, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.rotate(Math.PI / 3);
        }
      }

      ctx.restore();
    });
  };

  const drawFireflies = (
    ctx: CanvasRenderingContext2D,
    fireflies: LevelConfig['fireflies'],
    time: number
  ) => {
    if (!fireflies) return;
    fireflies.forEach((ff) => {
      if (ff.collected) return;
      ctx.save();

      const pulse = Math.sin(time * 0.006 + ff.offset) * 0.3 + 0.7;

      // Bioluminescent green-gold glow
      ctx.fillStyle = `rgba(52, 211, 153, ${0.4 * pulse})`;
      ctx.beginPath();
      ctx.arc(ff.x, ff.y, 10 * pulse, 0, Math.PI * 2);
      ctx.fill();

      // Core firefly body
      ctx.fillStyle = '#a7f3d0';
      ctx.beginPath();
      ctx.arc(ff.x, ff.y, 2.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    });
  };

  const drawWindTrails = (
    ctx: CanvasRenderingContext2D,
    trails: WindTrail[],
    dt: number
  ) => {
    for (let i = trails.length - 1; i >= 0; i--) {
      const trail = trails[i];
      trail.life -= dt * 2.2;
      if (trail.life <= 0) {
        trails.splice(i, 1);
        continue;
      }

      if (trail.points.length < 2) continue;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(trail.points[0].x, trail.points[0].y);
      for (let p = 1; p < trail.points.length; p++) {
        ctx.lineTo(trail.points[p].x, trail.points[p].y);
      }

      ctx.strokeStyle = trail.color;
      ctx.globalAlpha = Math.max(0, trail.life * 0.75);
      ctx.lineWidth = 4 * trail.life;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowColor = trail.color;
      ctx.shadowBlur = 10;
      ctx.stroke();

      ctx.restore();
    }
  };

  const drawActiveSwipeLine = (
    ctx: CanvasRenderingContext2D,
    swipe: { startX: number; startY: number; currX: number; currY: number; points: { x: number; y: number }[] }
  ) => {
    ctx.save();
    if (swipe.points.length > 1) {
      ctx.beginPath();
      ctx.moveTo(swipe.points[0].x, swipe.points[0].y);
      for (let i = 1; i < swipe.points.length; i++) {
        ctx.lineTo(swipe.points[i].x, swipe.points[i].y);
      }
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.stroke();
    }

    // Arrowhead indicating wind direction
    const dx = swipe.currX - swipe.startX;
    const dy = swipe.currY - swipe.startY;
    const dist = Math.hypot(dx, dy);
    if (dist > 20) {
      const angle = Math.atan2(dy, dx);
      ctx.save();
      ctx.translate(swipe.currX, swipe.currY);
      ctx.rotate(angle);
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-12, -6);
      ctx.lineTo(-12, 6);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  };

  const drawParticles = (ctx: CanvasRenderingContext2D, particles: Particle[]) => {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life++;
      if (p.life >= p.maxLife) {
        particles.splice(i, 1);
        continue;
      }

      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.04; // slight gravity for petals
      const progress = p.life / p.maxLife;
      const alpha = (1 - progress) * p.alpha;

      ctx.save();
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, alpha);

      if (p.type === 'petal') {
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, p.size, p.size * 0.5, p.life * 0.1, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1 - progress * 0.5), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  };

  const drawLanternLightCasting = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    pos: Vector2D,
    lanternStats: LanternStats
  ) => {
    ctx.save();
    // Warm radial glow that illuminates obstacles & environment
    const glowRadius = lanternStats.glowRadius;
    const glow = ctx.createRadialGradient(pos.x, pos.y, 8, pos.x, pos.y, glowRadius);
    glow.addColorStop(0, lanternStats.glowColor);
    glow.addColorStop(0.35, `${lanternStats.glowColor}55`);
    glow.addColorStop(0.75, `${lanternStats.glowColor}15`);
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = glow;
    ctx.globalCompositeOperation = 'screen';
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, glowRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  const drawLantern = (
    ctx: CanvasRenderingContext2D,
    pos: Vector2D,
    angle: number,
    tassel1: Vector2D,
    tassel2: Vector2D,
    stats: LanternStats,
    healthRatio: number,
    time: number
  ) => {
    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.rotate(angle);

    const r = 22;

    // Candle Flicker Core
    const flicker = Math.sin(time * 0.015) * 1.5;
    ctx.fillStyle = '#fffbeb';
    ctx.beginPath();
    ctx.arc(0, 0, 5 + flicker, 0, Math.PI * 2);
    ctx.fill();

    // Lantern Shape Rendering
    if (stats.shape === 'cylinder_dual') {
      // Hanok Cheongsachorong: Top Red silk, Bottom Blue silk
      // Top Half (Red)
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(-r * 0.8, -r * 1.1, r * 1.6, r * 1.0);

      // Bottom Half (Blue)
      ctx.fillStyle = '#2563eb';
      ctx.fillRect(-r * 0.8, -r * 0.1, r * 1.6, r * 1.0);

      // Traditional gold band dividing Yin and Yang
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(-r * 0.85, -r * 0.12, r * 1.7, 3);

      // Hanok Wooden top & bottom rim
      ctx.fillStyle = '#78350f';
      ctx.fillRect(-r * 0.9, -r * 1.15, r * 1.8, 4);
      ctx.fillRect(-r * 0.9, r * 0.9, r * 1.8, 4);
    } else if (stats.shape === 'diamond') {
      // Hoi An Diamond Lantern
      ctx.beginPath();
      ctx.moveTo(0, -r * 1.25);
      ctx.lineTo(r * 1.1, 0);
      ctx.lineTo(0, r * 1.25);
      ctx.lineTo(-r * 1.1, 0);
      ctx.closePath();
      ctx.fillStyle = stats.glowColor;
      ctx.fill();

      // Bamboo rib struts
      ctx.strokeStyle = '#b45309';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else if (stats.shape === 'hexagonal') {
      // Korean Hanji Hexagonal Lantern
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const hx = Math.cos(a) * r;
        const hy = Math.sin(a) * (r * 1.15);
        if (i === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
      }
      ctx.closePath();
      ctx.fillStyle = '#fef08a';
      ctx.fill();
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 2;
      ctx.stroke();
    } else if (stats.shape === 'lotus') {
      // Lotus Petal Flower Lantern
      ctx.fillStyle = '#f43f5e';
      for (let p = 0; p < 8; p++) {
        ctx.beginPath();
        ctx.ellipse(0, -r * 0.5, r * 0.35, r * 0.8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.rotate(Math.PI / 4);
      }
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.45, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Standard Hoi An Round (Cúc) Silk Lantern
      ctx.fillStyle = stats.glowColor;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();

      // Vertical silk rib curves
      ctx.strokeStyle = '#b45309';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.55, r, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Wooden top and base rings
      ctx.fillStyle = '#78350f';
      ctx.fillRect(-r * 0.45, -r - 3, r * 0.9, 4);
      ctx.fillRect(-r * 0.45, r - 1, r * 0.9, 4);
    }

    // Damage cracks if health is degraded
    if (healthRatio < 0.7) {
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-6, -4);
      ctx.lineTo(2, 6);
      ctx.lineTo(8, 2);
      ctx.stroke();
    }

    ctx.restore();

    // Dynamic Swaying Tassels (Dây tua rua lụa)
    ctx.save();
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y + r);
    ctx.lineTo(tassel1.x, tassel1.y);
    ctx.lineTo(tassel2.x, tassel2.y);
    ctx.stroke();

    // Gold bead knot
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(tassel1.x, tassel1.y, 3.5, 0, Math.PI * 2);
    ctx.arc(tassel2.x, tassel2.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  return (
    <div className="relative w-full max-w-[840px] mx-auto select-none">
      {/* Top HUD Overlay */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10 pointer-events-none">
        {/* Wind Gusts Left */}
        <div className="bg-slate-900/85 backdrop-blur-md border border-amber-500/30 rounded-xl px-4 py-2 flex items-center gap-2 shadow-lg">
          <span className="text-xl">💨</span>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Lượt Gió Thổi</div>
            <div className="text-base font-bold text-amber-400 font-cinzel">
              {hudGusts} / {level.maxGusts}
            </div>
          </div>
        </div>

        {/* Level Title Badge */}
        <div className="bg-slate-900/85 backdrop-blur-md border border-slate-700/60 rounded-xl px-4 py-2 text-center shadow-lg hidden sm:block">
          <div className="text-xs font-bold text-amber-200">{level.title}</div>
          <div className="text-[10px] text-slate-400">{level.subtitle}</div>
        </div>

        {/* Patterns Collected & Lantern Health */}
        <div className="flex items-center gap-2">
          {/* Cultural Patterns */}
          <div className="bg-slate-900/85 backdrop-blur-md border border-amber-500/30 rounded-xl px-3 py-2 flex items-center gap-2 shadow-lg">
            <span className="text-base">✨</span>
            <div className="text-xs font-bold text-amber-300 font-cinzel">
              {hudPatterns}/3
            </div>
          </div>

          {/* Lantern Integrity Health */}
          <div className="bg-slate-900/85 backdrop-blur-md border border-rose-500/30 rounded-xl px-3 py-2 flex items-center gap-2 shadow-lg">
            <span className="text-sm">🏮</span>
            <div className="w-14 bg-slate-800 rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 rounded-full ${
                  hudHealth > 50 ? 'bg-emerald-500' : hudHealth > 25 ? 'bg-amber-500' : 'bg-rose-500 animate-pulse'
                }`}
                style={{ width: `${hudHealth}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Interactive 2D Canvas */}
      <canvas
        ref={canvasRef}
        width={800}
        height={560}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="w-full aspect-[800/560] rounded-2xl shadow-2xl border border-amber-500/20 bg-slate-950 cursor-crosshair game-canvas-container"
      />

      {/* Swipe Instruction Helper Prompt */}
      <div className="mt-2 flex items-center justify-between text-xs text-slate-400 px-2">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          Vuốt trên màn hình để tạo hướng gió đẩy đèn lồng
        </span>
        <span className="text-slate-400">
          Chương {level.chapter === 'vietnam' ? '1: Phố Cổ Hội An' : level.chapter === 'korea' ? '2: Làng Hanok' : '3: Cầu Nối Hội Tụ'}
        </span>
      </div>
    </div>
  );
};
