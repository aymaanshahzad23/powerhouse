import { cn } from "@/lib/cn";

type InfiniteMarqueeProps = {
  items: string[];
  separator?: string;
  speed?: "slow" | "medium" | "fast";
  direction?: "left" | "right";
  variant?: "default" | "accent" | "ghost";
  className?: string;
  "aria-label"?: string;
};

export function InfiniteMarquee({
  items,
  separator = "   ·   ",
  speed = "medium",
  direction = "left",
  variant = "default",
  className,
  "aria-label": ariaLabel,
}: InfiniteMarqueeProps) {
  const line = items.join(separator);
  const speedClass =
    speed === "slow" ? "marquee-slow" : speed === "fast" ? "marquee-fast" : "marquee-medium";
  const dirClass = direction === "right" ? "marquee-reverse" : "";

  return (
    <div
      className={cn("marquee-strip overflow-hidden py-3", `marquee-variant-${variant}`, className)}
      aria-label={ariaLabel}
      aria-hidden={variant === "ghost" && !ariaLabel}
    >
      <div className={cn("marquee-mask overflow-hidden")}>
        <div className={cn("marquee-inner flex w-max", speedClass, dirClass)}>
          <span className="marquee-text px-10">{line}</span>
          <span className="marquee-text px-10">{line}</span>
        </div>
      </div>
    </div>
  );
}
