export function PageBackground() {
  return (
    <div className="page-bg" aria-hidden="true">
      {/* Circuit mesh SVG — fixed full viewport */}
      <svg className="page-bg-svg page-bg-circuit" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
        <defs>
          <pattern id="circuit-grid" width="80" height="80" patternUnits="userSpaceOnUse">
            <path
              d="M 80 0 L 0 0 0 80"
              fill="none"
              stroke="rgba(41,151,255,0.06)"
              strokeWidth="0.5"
            />
          </pattern>
          <linearGradient id="circuit-fade" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(41,151,255,0.12)" />
            <stop offset="50%" stopColor="rgba(120,80,255,0.06)" />
            <stop offset="100%" stopColor="rgba(41,151,255,0.08)" />
          </linearGradient>
          <filter id="glow-soft">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <rect width="100%" height="100%" fill="url(#circuit-grid)" />
        {/* Node network */}
        <g className="circuit-nodes" fill="none" stroke="url(#circuit-fade)" strokeWidth="0.75" opacity="0.5">
          <path d="M120 200 H400 M400 200 V450 M400 450 H720 M720 450 V180 M720 180 H1100" />
          <path d="M200 600 H520 M520 600 V320 M520 320 H880 M880 320 V680 M880 680 H1280" />
          <path d="M80 750 Q360 650 600 780 T1100 720" />
        </g>
        <g className="circuit-dots" fill="rgba(41,151,255,0.35)">
          <circle cx="120" cy="200" r="3" />
          <circle cx="400" cy="200" r="3" />
          <circle cx="400" cy="450" r="3" />
          <circle cx="720" cy="450" r="3" />
          <circle cx="720" cy="180" r="3" />
          <circle cx="1100" cy="180" r="3" />
          <circle cx="520" cy="600" r="3" />
          <circle cx="880" cy="680" r="3" />
        </g>
        {/* Animated pulse rings */}
        <circle className="pulse-ring pulse-ring-1" cx="720" cy="400" r="120" fill="none" stroke="rgba(41,151,255,0.15)" strokeWidth="1" />
        <circle className="pulse-ring pulse-ring-2" cx="720" cy="400" r="200" fill="none" stroke="rgba(120,80,255,0.08)" strokeWidth="1" />
      </svg>

      {/* Flow lines — diagonal automation streams */}
      <svg className="page-bg-svg page-bg-flow" viewBox="0 0 800 600" preserveAspectRatio="none">
        <defs>
          <linearGradient id="flow-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="50%" stopColor="rgba(41,151,255,0.2)" />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
        </defs>
        <path className="flow-line flow-line-1" d="M-50 100 Q200 150 400 100 T850 80" fill="none" stroke="url(#flow-grad)" strokeWidth="1" />
        <path className="flow-line flow-line-2" d="M-50 400 Q250 350 500 420 T900 380" fill="none" stroke="url(#flow-grad)" strokeWidth="1" opacity="0.6" />
        <path className="flow-line flow-line-3" d="M-50 520 Q300 480 600 540 T950 500" fill="none" stroke="url(#flow-grad)" strokeWidth="1" opacity="0.4" />
      </svg>

      {/* Hex automation motif — bottom right */}
      <svg className="page-bg-svg page-bg-hex" viewBox="0 0 400 400">
        <g className="hex-spin" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1">
          <polygon points="200,40 340,120 340,280 200,360 60,280 60,120" />
          <polygon points="200,80 300,140 300,260 200,320 100,260 100,140" />
          <polygon points="200,120 260,160 260,240 200,280 140,240 140,160" />
        </g>
        <circle cx="200" cy="200" r="4" fill="rgba(41,151,255,0.5)" className="hex-core" />
      </svg>

      <div className="page-bg-vignette" />
      <div className="page-bg-grain" />
    </div>
  );
}
