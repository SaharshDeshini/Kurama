/**
 * Kurama Personal OS - Celebration System
 * Produces crisp particle confetti burst and synthesized celebratory sound via Web Audio API.
 * 100% zero-dependency, works offline without external asset fetches.
 */

function playCelebrationSound() {
  if (typeof window === 'undefined') return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    // Melodic ascending major triad chime (C5, E5, G5, C6)
    const notes = [
      { freq: 523.25, time: 0.00, duration: 0.18 },
      { freq: 659.25, time: 0.08, duration: 0.20 },
      { freq: 783.99, time: 0.16, duration: 0.24 },
      { freq: 1046.50, time: 0.24, duration: 0.45 }
    ];

    notes.forEach(({ freq, time, duration }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle'; // Clean, bell-like, pleasant chime
      osc.frequency.setValueAtTime(freq, ctx.currentTime + time);

      gain.gain.setValueAtTime(0.001, ctx.currentTime + time);
      gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + time + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + time + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + time);
      osc.stop(ctx.currentTime + time + duration + 0.05);
    });
  } catch (err) {
    // Audio context may be restricted by browser gesture policies
    console.debug('[Kurama] Audio celebration skipped:', err);
  }
}

export function triggerCelebration({ playSound = true } = {}) {
  if (typeof window === 'undefined') return;

  if (playSound) {
    playCelebrationSound();
  }

  // Check if canvas already exists
  let canvas = document.getElementById('kurama-celebration-canvas');
  if (canvas) return;

  canvas = document.createElement('canvas');
  canvas.id = 'kurama-celebration-canvas';
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '9999';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const width = window.innerWidth;
  const height = window.innerHeight;

  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.scale(dpr, dpr);

  // Palette: Electric glowing blue, cyber cyan, victory gold, emerald, violet, ice white
  const colors = ['#00B4FF', '#38BDF8', '#F59E0B', '#10B981', '#A855F7', '#FFFFFF', '#60A5FA'];

  const particleCount = 75;
  const particles = [];

  for (let i = 0; i < particleCount; i++) {
    // Emit from bottom two corners / center
    const originX = width * (0.3 + Math.random() * 0.4);
    const originY = height * 0.55;

    particles.push({
      x: originX,
      y: originY,
      vx: (Math.random() - 0.5) * 16,
      vy: -Math.random() * 15 - 6,
      gravity: 0.4,
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 12,
      opacity: 1,
      shape: Math.random() > 0.4 ? 'rect' : 'circle'
    });
  }

  let animationFrame;
  const startTime = Date.now();
  const maxDuration = 2400; // 2.4 seconds

  function render() {
    const elapsed = Date.now() - startTime;
    if (elapsed > maxDuration) {
      if (canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
      return;
    }

    ctx.clearRect(0, 0, width, height);

    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.vx *= 0.98; // Drag
      p.rotation += p.rotationSpeed;
      p.opacity = Math.max(0, 1 - (elapsed / maxDuration));

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.globalAlpha = p.opacity;
      ctx.fillStyle = p.color;

      if (p.shape === 'rect') {
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    });

    animationFrame = requestAnimationFrame(render);
  }

  animationFrame = requestAnimationFrame(render);
}
