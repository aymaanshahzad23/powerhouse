import { cn } from "@/lib/cn";

type SectionSceneryProps = {
  variant?: "nodes" | "waves" | "grid";
  className?: string;
};

export function SectionScenery({ variant = "nodes", className }: SectionSceneryProps) {
  return (
    <div className={cn("section-scenery pointer-events-none absolute inset-0 overflow-hidden", className)} aria-hidden="true">
      {variant === "nodes" && (
        <svg className="absolute -right-[10%] top-1/2 h-[min(70vw,480px)] w-[min(70vw,480px)] -translate-y-1/2 opacity-[0.35]" viewBox="0 0 400 400">
          <g fill="none" stroke="rgba(41,151,255,0.12)" strokeWidth="1">
            <circle cx="200" cy="200" r="160" className="scenery-orbit" />
            <circle cx="200" cy="200" r="120" className="scenery-orbit scenery-orbit-delay" />
            <line x1="200" y1="40" x2="200" y2="360" />
            <line x1="40" y1="200" x2="360" y2="200" />
            <line x1="87" y1="87" x2="313" y2="313" />
            <line x1="313" y1="87" x2="87" y2="313" />
          </g>
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
            <circle
              key={deg}
              cx={200 + 160 * Math.cos((deg * Math.PI) / 180)}
              cy={200 + 160 * Math.sin((deg * Math.PI) / 180)}
              r="4"
              fill="rgba(41,151,255,0.25)"
            />
          ))}
        </svg>
      )}
      {variant === "waves" && (
        <svg className="absolute inset-x-0 bottom-0 h-32 w-full opacity-30" viewBox="0 0 1200 120" preserveAspectRatio="none">
          <path
            className="scenery-wave"
            d="M0,60 C200,120 400,0 600,60 C800,120 1000,0 1200,60 L1200,120 L0,120 Z"
            fill="rgba(41,151,255,0.03)"
            stroke="rgba(41,151,255,0.08)"
            strokeWidth="1"
          />
        </svg>
      )}
      {variant === "grid" && (
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
      )}
    </div>
  );
}
