import { cn } from "@/lib/utils";

interface CometLogoProps {
  className?: string;
  size?: number;
}

/**
 * Animated Comet mark — a glowing nucleus with a streaking tail of
 * particles. Pure SVG + CSS keyframes, no external deps.
 */
export function CometLogo({ className, size = 40 }: CometLogoProps) {
  return (
    <div
      className={cn("comet-logo relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg
        viewBox="0 0 64 64"
        width={size}
        height={size}
        className="overflow-visible"
      >
        <defs>
          <radialGradient id="comet-core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="40%" stopColor="#e0f2ff" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#7dd3fc" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="comet-tail" x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="#a78bfa" stopOpacity="0" />
            <stop offset="45%" stopColor="#38bdf8" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="1" />
          </linearGradient>
          <filter id="comet-blur" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="0.8" />
          </filter>
        </defs>

        {/* rotating tail cluster */}
        <g className="comet-orbit" style={{ transformOrigin: "32px 32px" }}>
          {/* main tail */}
          <path
            d="M 8 34 Q 26 32 44 30"
            stroke="url(#comet-tail)"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
            filter="url(#comet-blur)"
          />
          <path
            d="M 12 36 Q 28 33 42 31"
            stroke="url(#comet-tail)"
            strokeWidth="1.2"
            strokeLinecap="round"
            fill="none"
            opacity="0.7"
          />
          {/* particle sparks */}
          <circle cx="18" cy="35" r="0.9" fill="#ffffff" className="comet-spark spark-1" />
          <circle cx="24" cy="33" r="0.6" fill="#e0f2ff" className="comet-spark spark-2" />
          <circle cx="30" cy="34" r="0.5" fill="#a78bfa" className="comet-spark spark-3" />
          {/* glowing nucleus */}
          <circle cx="46" cy="30" r="7" fill="url(#comet-core)" />
          <circle cx="46" cy="30" r="2.4" fill="#ffffff" />
        </g>
      </svg>
    </div>
  );
}