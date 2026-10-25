'use client';

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import './SloshGauge.css';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export default function SloshGauge({
  value,
  defaultValue = 0,
  onChange,
  interactive = false,
  showValue = false,
  disabled = false,
  liquidColor = '#38BDF8',
  glassColor = '#060A14',
  width = 52,
  height = 78,
  radius = 14,
  ticks = 4,
  unit = '%',
  ariaLabel = 'Water Intake Level',
  className = ''
}) {
  const root = useRef(null);
  const liquid = useRef(null);
  const marker = useRef(null);
  const textA = useRef(null);
  const textB = useRef(null);

  const initialVal = clamp(Number(value ?? defaultValue) || 0, 0, 100);
  const [currentLevel, setCurrentLevel] = useState(initialVal);
  const grip = useRef(null);
  const [held, setHeld] = useState(false);
  const live = useRef({});
  live.current = { width, height, value, onChange, unit, currentLevel };

  const paint = (L) => {
    const clamped = clamp(Math.round(L), 0, 100);
    if (liquid.current) {
      liquid.current.style.height = `${clamped}%`;
    }
    if (marker.current) {
      marker.current.style.transform = `translateY(${((100 - clamped) * height) / 100}px)`;
    }
    const label = `${clamped}${unit}`;
    if (textA.current) textA.current.textContent = label;
    if (textB.current) textB.current.textContent = label;
    if (root.current) root.current.setAttribute('aria-valuenow', String(clamped));
  };

  const setLevel = (L, notify = false) => {
    const clamped = clamp(Math.round(L), 0, 100);
    setCurrentLevel(clamped);
    paint(clamped);
    if (notify) {
      live.current.onChange?.(clamped);
    }
  };

  // Synchronize immediately whenever value prop changes from outside (e.g. + / - buttons)
  useLayoutEffect(() => {
    if (value === undefined) return;
    if (grip.current) return;
    const numVal = clamp(Number(value) || 0, 0, 100);
    setLevel(numVal, false);
  }, [value]);

  useEffect(() => {
    paint(currentLevel);
  }, [width, height, currentLevel]);

  const levelAt = (clientY, g) => {
    const rawPct = ((g.rect.bottom - clientY) / (g.rect.height || 1)) * 100;
    return clamp(Math.round(rawPct), 0, 100);
  };

  const down = (e) => {
    if (!interactive || disabled || e.button !== 0) return;
    const el = root.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const g = {
      id: e.pointerId,
      rect
    };
    grip.current = g;
    try {
      el.setPointerCapture(e.pointerId);
    } catch {}
    setHeld(true);
    const at = levelAt(e.clientY, g);
    setLevel(at, true);
  };

  const move = (e) => {
    const g = grip.current;
    if (!g || g.id !== e.pointerId) return;
    const at = levelAt(e.clientY, g);
    setLevel(at, true);
  };

  const up = (e) => {
    const g = grip.current;
    if (!g || g.id !== e.pointerId) return;
    grip.current = null;
    try {
      root.current?.releasePointerCapture(e.pointerId);
    } catch {}
    setHeld(false);
    const at = levelAt(e.clientY, g);
    setLevel(at, true);
  };

  const r = Math.min(radius, width / 2, height / 2);
  const label = `${Math.round(currentLevel)}${unit}`;

  return (
    <div
      ref={root}
      className={`slosh-gauge${className ? ` ${className}` : ''}`}
      role={interactive ? 'slider' : 'meter'}
      tabIndex={interactive && !disabled ? 0 : undefined}
      aria-label={ariaLabel}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(currentLevel)}
      aria-orientation={interactive ? 'vertical' : undefined}
      aria-disabled={disabled || undefined}
      data-interactive={interactive ? 'true' : 'false'}
      data-held={held ? 'true' : 'false'}
      data-disabled={disabled ? 'true' : 'false'}
      style={{
        '--sg-w': `${width}px`,
        '--sg-h': `${height}px`,
        '--sg-r': `${r}px`,
        '--sg-glass': glassColor,
        '--sg-liquid': liquidColor,
        '--sg-ticks': ticks,
        '--sg-font': '11px'
      }}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      onLostPointerCapture={up}
    >
      {showValue ? (
        <span ref={textA} className="slosh-gauge__value" aria-hidden="true">
          {label}
        </span>
      ) : null}

      <div ref={liquid} className="slosh-gauge__liquid" aria-hidden="true">
        {showValue ? (
          <span ref={textB} className="slosh-gauge__value">
            {label}
          </span>
        ) : null}
      </div>

      {ticks > 0 ? <div className="slosh-gauge__ticks" aria-hidden="true" /> : null}
      {interactive && !disabled ? <div ref={marker} className="slosh-gauge__marker" aria-hidden="true" /> : null}
    </div>
  );
}
