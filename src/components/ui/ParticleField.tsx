import { useEffect, useRef } from 'react';
import { cn } from '../../lib/utils/cn';

type ParticleFieldProps = {
  className?: string;
  particleCount?: number;
};

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
};

export function ParticleField({ className, particleCount = 72 }: ParticleFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    let raf = 0;
    const particles: Particle[] = [];

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const seed = () => {
      particles.length = 0;
      const { width, height } = canvas.getBoundingClientRect();
      for (let i = 0; i < particleCount; i += 1) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.28,
          vy: (Math.random() - 0.5) * 0.18,
          radius: Math.random() * 1.6 + 0.55,
          alpha: Math.random() * 0.45 + 0.2,
        });
      }
    };

    const render = () => {
      const { width, height } = canvas.getBoundingClientRect();
      context.clearRect(0, 0, width, height);

      for (const particle of particles) {
        particle.x += particle.vx;
        particle.y += particle.vy;

        if (particle.x < -8) particle.x = width + 8;
        if (particle.x > width + 8) particle.x = -8;
        if (particle.y < -8) particle.y = height + 8;
        if (particle.y > height + 8) particle.y = -8;
      }

      for (let i = 0; i < particles.length; i += 1) {
        const a = particles[i];
        context.beginPath();
        context.fillStyle = `rgba(240,161,95,${a.alpha})`;
        context.arc(a.x, a.y, a.radius, 0, Math.PI * 2);
        context.fill();

        for (let j = i + 1; j < particles.length; j += 1) {
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance > 120) continue;

          const opacity = (1 - distance / 120) * 0.14;
          context.beginPath();
          context.strokeStyle = `rgba(155,181,225,${opacity})`;
          context.lineWidth = 0.7;
          context.moveTo(a.x, a.y);
          context.lineTo(b.x, b.y);
          context.stroke();
        }
      }

      raf = window.requestAnimationFrame(render);
    };

    resize();
    seed();
    render();

    const onResize = () => {
      resize();
      seed();
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
    };
  }, [particleCount]);

  return <canvas ref={canvasRef} className={cn('h-full w-full', className)} aria-hidden="true" />;
}
