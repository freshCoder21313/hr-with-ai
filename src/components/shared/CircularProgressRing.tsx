import React from 'react';
import { cn } from '@/lib/utils';

export interface CircularProgressRingProps {
  progress: number; // 0 to 100
  size?: number; // pixel diameter (default: 136)
  strokeWidth?: number; // pixel stroke width (default: 10)
  title?: string;
  subtitle?: string;
  badge?: React.ReactNode;
  className?: string;
  showPercent?: boolean;
  centerIcon?: React.ReactNode;
}

export const CircularProgressRing: React.FC<CircularProgressRingProps> = ({
  progress,
  size = 136,
  strokeWidth = 10,
  title,
  subtitle,
  badge,
  className,
  showPercent = true,
  centerIcon,
}) => {
  const clampedProgress = Math.min(100, Math.max(0, progress));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (circumference * clampedProgress) / 100;

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(clampedProgress)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={title || 'Analyzing progress'}
      className={cn('flex flex-col items-center justify-center text-center space-y-4', className)}
    >
      {/* Circular Progress Ring */}
      <div
        className="relative flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <svg
          width={size}
          height={size}
          className="transform -rotate-90 origin-center"
          aria-hidden="true"
        >
          {/* Background Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="transparent"
            className="text-muted/30"
          />
          {/* Progress Indicator */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="text-primary transition-all duration-300 ease-out"
          />
        </svg>

        {/* Center Content: Percentage & Icon */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          {centerIcon && <div className="mb-0.5 text-primary">{centerIcon}</div>}
          {showPercent && (
            <div className="flex items-baseline justify-center">
              <span className="text-3xl sm:text-4xl font-black text-foreground tracking-tight tabular-nums">
                {Math.round(clampedProgress)}
              </span>
              <span className="text-sm font-semibold text-muted-foreground ml-0.5">%</span>
            </div>
          )}
        </div>
      </div>

      {/* Badge & Description */}
      {(badge || title || subtitle) && (
        <div className="space-y-1.5 max-w-md px-2" aria-live="polite">
          {badge && <div className="flex justify-center">{badge}</div>}
          {title && (
            <h3 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{subtitle}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default CircularProgressRing;
