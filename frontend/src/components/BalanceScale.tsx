import React from 'react';
import { Scale } from 'lucide-react';

interface BalanceScaleProps {
  actualWeightKg: number;
  volumetricWeightKg: number;
  lengthCm: number;
  breadthCm: number;
  heightCm: number;
}

export const BalanceScale: React.FC<BalanceScaleProps> = ({
  actualWeightKg,
  volumetricWeightKg,
  lengthCm,
  breadthCm,
  heightCm,
}) => {
  const isActualHeavier = actualWeightKg >= volumetricWeightKg;
  const billableWeight = Math.max(actualWeightKg, volumetricWeightKg);

  // Compute beam tilt angle (-12deg to +12deg)
  const diff = actualWeightKg - volumetricWeightKg;
  let angle = 0;
  if (diff > 0) {
    angle = -Math.min(12, Math.max(3, diff * 2));
  } else if (diff < 0) {
    angle = Math.min(12, Math.max(3, Math.abs(diff) * 2));
  }

  return (
    <div className="bg-[#E6DEC8]/60 border border-[#1E2A38] p-4 rounded-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-xs uppercase font-bold tracking-wider text-[#1E2A38] flex items-center">
          <Scale size={16} className="mr-1.5 text-[#1E2A38]" /> Volumetric Weight Comparator
        </span>
        <span className="font-mono text-xs px-2 py-0.5 bg-[#1E2A38] text-paper font-bold uppercase rounded-xs">
          Billed On: {isActualHeavier ? 'Actual Weight' : 'Volumetric Weight'}
        </span>
      </div>

      {/* SVG Balance Scale Visualizer */}
      <div className="relative w-full h-32 flex items-center justify-center my-1 bg-paper/50 rounded border border-[#1E2A38]/30">
        <svg viewBox="0 0 300 120" className="w-full h-full">
          {/* Fulcrum Base */}
          <polygon points="150,75 138,110 162,110" fill="#1E2A38" />
          <circle cx="150" cy="75" r="4" fill="#F1ECE0" stroke="#1E2A38" strokeWidth="2" />

          {/* Balance Beam (Rotated) */}
          <g transform={`rotate(${angle}, 150, 75)`} className="transition-transform duration-500 ease-out">
            {/* Beam Bar */}
            <line x1="50" y1="75" x2="250" y2="75" stroke="#1E2A38" strokeWidth="4" strokeLinecap="round" />

            {/* Left Pan Attachment (Actual Weight) */}
            <line x1="50" y1="75" x2="50" y2="95" stroke="#1E2A38" strokeWidth="1.5" />
            <path d="M 30,95 Q 50,105 70,95 Z" fill={isActualHeavier ? '#2E6B4F' : '#D9CBAE'} stroke="#1E2A38" strokeWidth="2" />

            {/* Right Pan Attachment (Volumetric Weight) */}
            <line x1="250" y1="75" x2="250" y2="95" stroke="#1E2A38" strokeWidth="1.5" />
            <path d="M 230,95 Q 250,105 270,95 Z" fill={!isActualHeavier ? '#2E6B4F' : '#D9CBAE'} stroke="#1E2A38" strokeWidth="2" />
          </g>

          {/* Ground Line */}
          <line x1="20" y1="110" x2="280" y2="110" stroke="#1E2A38" strokeWidth="2" strokeDasharray="4 4" />
        </svg>

        {/* Callout overlays */}
        <div className="absolute left-3 bottom-2 text-left">
          <div className="font-mono text-xs font-bold text-[#1E2A38]">Actual</div>
          <div className={`font-mono text-sm font-bold ${isActualHeavier ? 'text-[#2E6B4F]' : 'text-slate-600'}`}>
            {actualWeightKg.toFixed(2)} kg
          </div>
        </div>

        <div className="absolute right-3 bottom-2 text-right">
          <div className="font-mono text-xs font-bold text-[#1E2A38]">Volumetric</div>
          <div className={`font-mono text-sm font-bold ${!isActualHeavier ? 'text-[#2E6B4F]' : 'text-slate-600'}`}>
            {volumetricWeightKg.toFixed(2)} kg
          </div>
          <div className="font-mono text-[10px] text-slate-500">
            ({lengthCm}×{breadthCm}×{heightCm})/5000
          </div>
        </div>
      </div>

      <div className="mt-2 text-xs font-mono flex justify-between items-center bg-paper p-2 rounded border border-[#1E2A38]/40">
        <span className="text-slate-700">Billable Weight Result:</span>
        <span className="font-bold text-[#1E2A38] text-sm bg-[#E6DEC8] px-2 py-0.5 rounded border border-[#1E2A38]/30">
          {billableWeight.toFixed(2)} kg
        </span>
      </div>
    </div>
  );
};
