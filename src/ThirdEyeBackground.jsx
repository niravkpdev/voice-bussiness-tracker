import React from 'react';

/**
 * ThirdEyeBackground
 * Ethereal celestial Third Eye (Trinetra) backdrop featuring:
 * - Sacred horizontal eye arches glowing in neon cyan & sapphire
 * - Vertical Third Eye flame (symbol of perception, wisdom, and Trinetr brand)
 * - Sweeping energy wings from the official Trinetr emblem
 * - Concentric cosmic awakening rings with subtle breathing glow
 */
export default function ThirdEyeBackground() {
  return (
    <div className="neon-third-eye-container" aria-hidden="true">
      {/* Ambient Radial Nebula Glows */}
      <div className="third-eye-nebula nebula-core" />
      <div className="third-eye-nebula nebula-cyan" />
      <div className="third-eye-nebula nebula-indigo" />

      {/* Sacred Third Eye Vector Artwork */}
      <svg
        className="third-eye-svg"
        viewBox="0 0 1100 680"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {/* Gradients */}
          <linearGradient id="eyeOutlineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#00dfc4" stopOpacity="0.15" />
            <stop offset="30%" stopColor="#0ea5e9" stopOpacity="0.75" />
            <stop offset="50%" stopColor="#00dfc4" stopOpacity="0.95" />
            <stop offset="70%" stopColor="#0ea5e9" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#00dfc4" stopOpacity="0.15" />
          </linearGradient>

          <linearGradient id="flameGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#0369a1" />
            <stop offset="35%" stopColor="#0284c7" />
            <stop offset="70%" stopColor="#00dfc4" />
            <stop offset="100%" stopColor="#e0f2fe" />
          </linearGradient>

          <linearGradient id="innerFlameGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="60%" stopColor="#f0fdfa" stopOpacity="1" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="1" />
          </linearGradient>

          <linearGradient id="wingGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0284c7" stopOpacity="0" />
            <stop offset="25%" stopColor="#0ea5e9" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#00dfc4" stopOpacity="0.95" />
            <stop offset="75%" stopColor="#0ea5e9" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#0284c7" stopOpacity="0" />
          </linearGradient>

          <linearGradient id="wingGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#00dfc4" stopOpacity="0" />
            <stop offset="30%" stopColor="#0284c7" stopOpacity="0.7" />
            <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.85" />
            <stop offset="70%" stopColor="#0284c7" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#00dfc4" stopOpacity="0" />
          </linearGradient>

          <radialGradient id="irisAura" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#00dfc4" stopOpacity="0.45" />
            <stop offset="35%" stopColor="#0284c7" stopOpacity="0.25" />
            <stop offset="70%" stopColor="#4f46e5" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#050811" stopOpacity="0" />
          </radialGradient>

          {/* Glow Filters */}
          <filter id="neonEyeGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur1" />
            <feGaussianBlur in="SourceGraphic" stdDeviation="16" result="blur2" />
            <feMerge>
              <feMergeNode in="blur2" />
              <feMergeNode in="blur1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="flameIntenseGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="b1" />
            <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="b2" />
            <feGaussianBlur in="SourceGraphic" stdDeviation="28" result="b3" />
            <feMerge>
              <feMergeNode in="b3" />
              <feMergeNode in="b2" />
              <feMergeNode in="b1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* 1. Concentric Energy Rings (Awakening / Wisdom) */}
        <g className="third-eye-rings" transform="translate(550, 340)">
          <ellipse rx="490" ry="290" stroke="rgba(0, 223, 196, 0.12)" strokeWidth="1" strokeDasharray="6 8" />
          <ellipse rx="380" ry="220" stroke="rgba(14, 165, 233, 0.2)" strokeWidth="1.2" strokeDasharray="10 8" />
          <circle r="220" stroke="rgba(0, 223, 196, 0.22)" strokeWidth="1" strokeDasharray="4 6" />
          <circle r="160" stroke="rgba(14, 165, 233, 0.35)" strokeWidth="1.5" />
          <circle r="110" stroke="rgba(0, 223, 196, 0.45)" strokeWidth="1.5" strokeDasharray="8 6" />
          <circle r="70" fill="url(#irisAura)" />
        </g>

        {/* 2. Cosmic Rays of Consciousness */}
        <g className="third-eye-rays" transform="translate(550, 340)">
          <line x1="-360" y1="-180" x2="360" y2="180" stroke="rgba(0, 223, 196, 0.08)" strokeWidth="1" />
          <line x1="-360" y1="180" x2="360" y2="-180" stroke="rgba(0, 223, 196, 0.08)" strokeWidth="1" />
          <line x1="0" y1="-280" x2="0" y2="280" stroke="rgba(14, 165, 233, 0.12)" strokeWidth="1" strokeDasharray="4 8" />
          <line x1="-480" y1="0" x2="480" y2="0" stroke="rgba(0, 223, 196, 0.12)" strokeWidth="1" strokeDasharray="4 8" />
        </g>

        {/* 3. Primary Almond / Cosmic Third Eye Arches */}
        {/* Outer Eyelid Arch - sweeping horizontally across the dark background */}
        <g filter="url(#neonEyeGlow)">
          {/* Upper Eyelid Curve */}
          <path
            d="M 70 340 C 270 120, 830 120, 1030 340"
            stroke="url(#eyeOutlineGrad)"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          {/* Lower Eyelid Curve */}
          <path
            d="M 1030 340 C 830 560, 270 560, 70 340"
            stroke="url(#eyeOutlineGrad)"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
        </g>

        {/* Inner Secondary Eyelid Contour */}
        <path
          d="M 160 340 C 330 180, 770 180, 940 340"
          stroke="rgba(0, 223, 196, 0.35)"
          strokeWidth="1.5"
          strokeDasharray="8 6"
        />
        <path
          d="M 940 340 C 770 500, 330 500, 160 340"
          stroke="rgba(0, 223, 196, 0.35)"
          strokeWidth="1.5"
          strokeDasharray="8 6"
        />

        {/* 4. The Sacred Shiva / Trinetra Winged Arcs (from Trinetr Logo) */}
        <g filter="url(#neonEyeGlow)">
          {/* Primary Lower Wing Wave */}
          <path
            d="M 230 450 C 380 430, 480 380, 550 380 C 620 380, 720 430, 870 450 C 750 490, 630 460, 550 425 C 470 460, 350 490, 230 450 Z"
            fill="url(#wingGrad)"
          />
          {/* Secondary Lower Wing Wave */}
          <path
            d="M 310 495 C 430 480, 490 440, 550 440 C 610 440, 670 480, 790 495 C 690 525, 610 505, 550 475 C 490 505, 410 525, 310 495 Z"
            fill="url(#wingGrad2)"
          />
        </g>

        {/* 5. Central Vertical Third Eye Flame (The All-Seeing Trinetra Flame) */}
        <g filter="url(#flameIntenseGlow)" className="third-eye-flame-group">
          {/* Outer Royal/Cyan Flame */}
          <path
            d="M 550 110 C 625 210, 625 325, 550 405 C 475 325, 475 210, 550 110 Z"
            fill="url(#flameGrad)"
          />

          {/* Inner Bright White/Cyan Flame */}
          <path
            d="M 550 185 C 592 250, 592 320, 550 365 C 508 320, 508 250, 550 185 Z"
            fill="url(#innerFlameGrad)"
          />

          {/* Deep Sapphire Pupil Core */}
          <path
            d="M 550 240 C 570 280, 570 315, 550 340 C 530 315, 530 280, 550 240 Z"
            fill="#031525"
          />

          {/* Divine Bindu Spark (Awakened Consciousness) */}
          <circle cx="550" cy="290" r="7" fill="#00dfc4" />
          <circle cx="550" cy="290" r="3" fill="#ffffff" />
        </g>

        {/* 6. Cosmic Constellation Stardust Accent Points */}
        <g className="third-eye-stars">
          <circle cx="120" cy="280" r="2" fill="#00dfc4" opacity="0.6" />
          <circle cx="200" cy="220" r="2.5" fill="#38bdf8" opacity="0.8" />
          <circle cx="980" cy="280" r="2" fill="#00dfc4" opacity="0.6" />
          <circle cx="900" cy="220" r="2.5" fill="#38bdf8" opacity="0.8" />
          <circle cx="420" cy="140" r="1.5" fill="#ffffff" opacity="0.7" />
          <circle cx="680" cy="140" r="1.5" fill="#ffffff" opacity="0.7" />
          <circle cx="550" cy="65" r="3" fill="#00dfc4" opacity="0.9" />
        </g>
      </svg>
    </div>
  );
}
