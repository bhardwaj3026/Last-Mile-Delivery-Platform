import React, { useEffect, useState, useRef } from 'react';

export const CatMascot: React.FC = () => {
  const leftEyeRef = useRef<SVGCircleElement>(null);
  const rightEyeRef = useRef<SVGCircleElement>(null);

  const [leftPupil, setLeftPupil] = useState({ x: 0, y: 0 });
  const [rightPupil, setRightPupil] = useState({ x: 0, y: 0 });
  const [isBlinking, setIsBlinking] = useState(false);

  const animFrameId = useRef<number | null>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);

      animFrameId.current = requestAnimationFrame(() => {
        const mouseX = e.clientX;
        const mouseY = e.clientY;

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
            x: Math.cos(angle) * dist,
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
            x: Math.cos(angle) * dist,
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
  }, []);

  // Periodic blinking effect every ~4.5s
  useEffect(() => {
    const interval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 160);
    }, 4500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute -top-10 right-4 z-20 pointer-events-none select-none animate-cat-bob">
      <svg
        width="96"
        height="76"
        viewBox="0 0 96 76"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-md"
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
        <g className={isBlinking ? 'cat-eye-blink' : ''} style={{ transformOrigin: '36px 38px' }}>
          <circle ref={leftEyeRef} cx="36" cy="38" r="8" fill="#FFFFFF" stroke="#1E2A38" strokeWidth="2" />
          {/* Left Pupil */}
          <circle cx={36 + leftPupil.x} cy={38 + leftPupil.y} r="3.5" fill="#1E2A38" />
          {/* Eye Shine Catchlight */}
          <circle cx={36 + leftPupil.x - 1.2} cy={38 + leftPupil.y - 1.2} r="1.2" fill="#FFFFFF" />
        </g>

        {/* Right Eye White Container */}
        <g className={isBlinking ? 'cat-eye-blink' : ''} style={{ transformOrigin: '60px 38px' }}>
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

        {/* Front Paws perched over ticket card top border */}
        <ellipse cx="34" cy="67" rx="6.5" ry="4.5" fill="#F7E5A9" stroke="#1E2A38" strokeWidth="2" />
        <ellipse cx="62" cy="67" rx="6.5" ry="4.5" fill="#F7E5A9" stroke="#1E2A38" strokeWidth="2" />
      </svg>
    </div>
  );
};
