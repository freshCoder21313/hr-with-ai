import React, { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  audioLevel: number; // 0 to 1
  isListening: boolean;
  color?: string;
  width?: number;
  height?: number;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  audioLevel,
  isListening,
  color = '#22c55e',
  width = 300,
  height = 50,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const levelRef = useRef(audioLevel);

  useEffect(() => {
    levelRef.current = audioLevel;
  }, [audioLevel]);

  // Need to animate smoothly based on level
  // Since level comes from prop (state update), it might be jittery if not smoothed locally or updated fast enough via RAF in parent.
  // But typically props update at React render cycle (60fps if optimized, or less).
  // For smoother bars, we can interpolate.

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let currentLevel = 0;

    const draw = () => {
      // Smooth interpolation
      currentLevel += (levelRef.current - currentLevel) * 0.2;

      ctx.clearRect(0, 0, width, height);

      if (!isListening) {
        // Draw flat line
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 2;
        ctx.stroke();
        return;
      }

      const bars = 30; // Number of bars
      const barWidth = width / bars;
      const spacing = 2;

      ctx.fillStyle = color;

      for (let i = 0; i < bars; i++) {
        // Create a wave effect based on index + time + level
        // Use simpler random jitter modulated by level for "voice" look
        const jitter = Math.random() * 0.5 + 0.5;
        // Center bars are taller
        const bellCurve = Math.sin((i / bars) * Math.PI);

        const barHeight = Math.max(4, currentLevel * height * 0.8 * bellCurve * jitter);

        const x = i * barWidth;
        const y = (height - barHeight) / 2;

        ctx.fillRect(x + spacing / 2, y, barWidth - spacing, barHeight);
      }

      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [isListening, width, height, color]);

  return <canvas ref={canvasRef} width={width} height={height} className="rounded-lg" />;
};
