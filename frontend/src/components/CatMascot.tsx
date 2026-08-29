import React, { useEffect, useState, useRef } from 'react';

export interface CatMascotProps {
  mirrored?: boolean;
  eyesCovered?: boolean;
  bobDelayMs?: number;
  blinkOffsetMs?: number;
  positionClassName?: string;
}

export const CatMascot: React.FC<CatMascotProps> = ({
  mirrored = false,
  eyesCovered = false,
  bobDelayMs = 0,
  blinkOffsetMs = 0,
  positionClassName,
}) => {
  const leftEyeRef = useRef<SVGCircleElement>(null);
  const rightEyeRef = useRef<SVGCircleElement>(null);

  const [leftPupil, setLeftPupil] = useState({ x: 0, y: 0 });
  const [rightPupil, setRightPupil] = useState({ x: 0, y: 0 });
  const [isBlinking, setIsBlinking] = useState(false);
  const [isReducedMotion, setIsReducedMotion] = useState(false);

  const animFrameId = useRef<number | null>(null);

  // Detect prefers-reduced-motion
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setIsReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setIsReducedMotion(e.matches);
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    } else {
      mediaQuery.addListener(handler);
      return () => mediaQuery.removeListener(handler);
    }
  }, []);

  // Eye tracking cursor logic (disabled when eyesCovered)
  useEffect(() => {
    if (eyesCovered) {
      setLeftPupil({ x: 0, y: 0 });
      setRightPupil({ x: 0, y: 0 });
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);

      animFrameId.current = requestAnimationFrame(() => {
        const mouseX = e.clientX;
        const mouseY = e.clientY;
        const xFactor = mirrored ? -1 : 1;

        // Calculate left eye offset
        if (leftEyeRef.current) {
          const rect = leftEyeRef.current.getBoundingClientRect();
          const eyeCenterX = rect.left + rect.width / 2;
          const eyeCenterY = rect.top + rect.height / 2;
          const dx = mouseX - eyeCenterX;
          const dy = mouseY - eyeCenterY;
          const angle = Math.atan2(dy, dx);
          const dist = Math.min(Math.hypot(dx, dy), 3.5);
          setLeftPupil({
            x: Math.cos(angle) * dist * xFactor,
            y: Math.sin(angle) * dist,
          });
        }

        // Calculate right eye offset
        if (rightEyeRef.current) {
          const rect = rightEyeRef.current.getBoundingClientRect();
          const eyeCenterX = rect.left + rect.width / 2;
          const eyeCenterY = rect.top + rect.height / 2;
          const dx = mouseX - eyeCenterX;
          const dy = mouseY - eyeCenterY;
          const angle = Math.atan2(dy, dx);
          const dist = Math.min(Math.hypot(dx, dy), 3.5);
          setRightPupil({
            x: Math.cos(angle) * dist * xFactor,
            y: Math.sin(angle) * dist,
          });
        }
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
    };
  }, [eyesCovered, mirrored]);

  // Periodic blinking effect every ~4.5s (suppressed when eyesCovered)
  useEffect(() => {
    if (eyesCovered) {
      setIsBlinking(false);
      return;
    }

    let intervalId: ReturnType<typeof setInterval> | null = null;
    let blinkResetTimer: ReturnType<typeof setTimeout> | null = null;

    const initialTimer = setTimeout(() => {
      setIsBlinking(true);
      blinkResetTimer = setTimeout(() => setIsBlinking(false), 160);

      intervalId = setInterval(() => {
        setIsBlinking(true);
        setTimeout(() => setIsBlinking(false), 160);
      }, 4500);
    }, blinkOffsetMs);

    return () => {
      clearTimeout(initialTimer);
      if (blinkResetTimer) clearTimeout(blinkResetTimer);
      if (intervalId) clearInterval(intervalId);
    };
  }, [eyesCovered, blinkOffsetMs]);

  const defaultPosition = mirrored
    ? 'absolute -top-10 left-4 z-20'
    : 'absolute -top-10 right-4 z-20';

  return (
    <div
      className={`${positionClassName || defaultPosition} pointer-events-none select-none animate-cat-bob`}
      style={{
        animationDelay: `${bobDelayMs}ms`,
      }}
    >
      <svg
        width="96"
        height="76"
        viewBox="0 0 96 76"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-md"
        style={{
          transform: mirrored ? 'scaleX(-1)' : 'none',
        }}
      >
        {/* Pokémon-style Pointy Left Ear */}
        <g>
          <polygon points="12,28 22,2 36,22" fill="#F7E5A9" stroke="#1E2A38" strokeWidth="2.5" strokeLinejoin="round" />
          {/* Black Tip */}
          <path d="M 12,28 L 22,2 L 27,12 Q 20,18 12,28 Z" fill="#1E2A38" />
        </g>

        {/* Pokémon-style Pointy Right Ear */}
        <g>
          <polygon points="60,22 74,2 84,28" fill="#F7E5A9" stroke="#1E2A38" strokeWidth="2.5" strokeLinejoin="round" />
          {/* Black Tip */}
          <path d="M 84,28 L 74,2 L 69,12 Q 76,18 84,28 Z" fill="#1E2A38" />
        </g>

        {/* Tail sticking out behind right side */}
        <path
          d="M 76,46 L 88,38 L 84,48 L 92,44 L 84,58 Z"
          fill="#F7E5A9"
          stroke="#1E2A38"
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {/* Round Pokémon Head */}
        <circle cx="48" cy="42" r="27" fill="#F7E5A9" stroke="#1E2A38" strokeWidth="2.5" />

        {/* Rosy Red Cheek Spots */}
        <circle cx="27" cy="48" r="6.5" fill="#B4432E" opacity="0.9" />
        <circle cx="69" cy="48" r="6.5" fill="#B4432E" opacity="0.9" />

        {/* Left Eye White Container */}
        <g className={isBlinking && !eyesCovered ? 'cat-eye-blink' : ''} style={{ transformOrigin: '36px 38px' }}>
          <circle ref={leftEyeRef} cx="36" cy="38" r="8" fill="#FFFFFF" stroke="#1E2A38" strokeWidth="2" />
          {/* Left Pupil */}
          <circle cx={36 + leftPupil.x} cy={38 + leftPupil.y} r="3.5" fill="#1E2A38" />
          {/* Eye Shine Catchlight */}
          <circle cx={36 + leftPupil.x - 1.2} cy={38 + leftPupil.y - 1.2} r="1.2" fill="#FFFFFF" />
        </g>

        {/* Right Eye White Container */}
        <g className={isBlinking && !eyesCovered ? 'cat-eye-blink' : ''} style={{ transformOrigin: '60px 38px' }}>
          <circle ref={rightEyeRef} cx="60" cy="38" r="8" fill="#FFFFFF" stroke="#1E2A38" strokeWidth="2" />
          {/* Right Pupil */}
          <circle cx={60 + rightPupil.x} cy={38 + rightPupil.y} r="3.5" fill="#1E2A38" />
          {/* Eye Shine Catchlight */}
          <circle cx={60 + rightPupil.x - 1.2} cy={38 + rightPupil.y - 1.2} r="1.2" fill="#FFFFFF" />
        </g>

        {/* Tiny Pokémon Nose */}
        <polygon points="46,45 50,45 48,47.5" fill="#1E2A38" />

        {/* Cute Anime 'w' Mouth */}
        <path d="M 42,48 Q 45,52 48,49 Q 51,52 54,48" fill="none" stroke="#1E2A38" strokeWidth="1.8" strokeLinecap="round" />

        {/* Front Paws / Privacy Eye-Covering Paws */}
        <g
          style={{
            transform: eyesCovered ? 'translateY(-29px)' : 'translateY(0px)',
            transition: isReducedMotion ? 'none' : 'transform 200ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {/* Left Paw */}
          <g>
            <ellipse cx="36" cy="67" rx="9.5" ry="8" fill="#F7E5A9" stroke="#1E2A38" strokeWidth="2" />
            <path d="M 33,62.5 L 33,65.5 M 36,61.5 L 36,64.5 M 39,62.5 L 39,65.5" stroke="#1E2A38" strokeWidth="1.3" strokeLinecap="round" />
          </g>

          {/* Right Paw */}
          <g>
            <ellipse cx="60" cy="67" rx="9.5" ry="8" fill="#F7E5A9" stroke="#1E2A38" strokeWidth="2" />
            <path d="M 57,62.5 L 57,65.5 M 60,61.5 L 60,64.5 M 63,62.5 L 63,65.5" stroke="#1E2A38" strokeWidth="1.3" strokeLinecap="round" />
          </g>
        </g>
      </svg>
    </div>
  );
};
