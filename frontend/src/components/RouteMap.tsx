import React from 'react';
import { MapPin, Navigation, Truck } from 'lucide-react';
import { StatusType } from './StatusStamp';

interface RouteMapProps {
  pickupZoneName: string;
  dropZoneName: string;
  pickupPincode: string;
  dropPincode: string;
  status: StatusType;
}

export const RouteMap: React.FC<RouteMapProps> = ({
  pickupZoneName,
  dropZoneName,
  pickupPincode,
  dropPincode,
  status,
}) => {
  const getProgressPercentage = () => {
    switch (status) {
      case 'CREATED':
        return 0;
      case 'ASSIGNED':
        return 20;
      case 'PICKED_UP':
        return 40;
      case 'IN_TRANSIT':
        return 65;
      case 'OUT_FOR_DELIVERY':
        return 88;
      case 'DELIVERED':
        return 100;
      case 'FAILED':
        return 65;
      case 'RESCHEDULED':
        return 25;
      default:
        return 0;
    }
  };

  const progressPct = getProgressPercentage();
  // Cubic bezier path: M 40 70 C 140 10, 260 130, 360 70
  // Approximate coordinate at percentage
  const vehicleX = 40 + (360 - 40) * (progressPct / 100);
  // Sine curve offset for Y
  const vehicleY = 70 - Math.sin((progressPct / 100) * Math.PI) * 35;

  const isFailed = status === 'FAILED';

  return (
    <div className="bg-[#F8F5EE] border border-[#1E2A38] p-4 rounded-sm">
      <div className="flex items-center justify-between mb-3 border-b border-[#1E2A38]/20 pb-2">
        <div className="flex items-center space-x-2">
          <Navigation size={16} className="text-[#1E2A38]" />
          <span className="font-mono text-xs uppercase font-bold tracking-wider text-[#1E2A38]">
            Route Manifest Vector
          </span>
        </div>
        <span className="font-mono text-xs text-[#1E2A38]/80 font-semibold">
          Progress: {progressPct}%
        </span>
      </div>

      <div className="relative w-full h-32 bg-paper rounded border border-[#1E2A38]/30 overflow-hidden flex items-center justify-center">
        {/* Grid Background Lines */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              'linear-gradient(#1E2A38 1px, transparent 1px), linear-gradient(90deg, #1E2A38 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        />

        <svg viewBox="0 0 400 140" className="w-full h-full relative z-10">
          {/* Dashed Background Path */}
          <path
            d="M 40 70 Q 200 10 360 70"
            fill="none"
            stroke="#1E2A38"
            strokeWidth="3"
            strokeDasharray="6 6"
            opacity="0.3"
          />

          {/* Progress Active Path */}
          <path
            d="M 40 70 Q 200 10 360 70"
            fill="none"
            stroke={isFailed ? '#B4432E' : '#2E6B4F'}
            strokeWidth="4"
            strokeDasharray="400"
            strokeDashoffset={400 - (400 * progressPct) / 100}
            className="transition-all duration-700 ease-out"
          />

          {/* Pickup Point Pin */}
          <g transform="translate(40, 70)">
            <circle r="12" fill="#F1ECE0" stroke="#1E2A38" strokeWidth="2.5" />
            <circle r="5" fill="#1E2A38" />
          </g>

          {/* Drop Point Pin */}
          <g transform="translate(360, 70)">
            <circle r="12" fill="#F1ECE0" stroke="#1E2A38" strokeWidth="2.5" />
            <circle r="5" fill={status === 'DELIVERED' ? '#2E6B4F' : '#B4432E'} />
          </g>

          {/* Moving Vehicle Indicator */}
          <g transform={`translate(${vehicleX}, ${vehicleY})`} className="transition-all duration-500 ease-out">
            <circle r="16" fill={isFailed ? '#B4432E' : '#1E2A38'} className="shadow-md" />
            <foreignObject x="-10" y="-10" width="20" height="20">
              <div className="w-full h-full flex items-center justify-center text-paper">
                <Truck size={13} />
              </div>
            </foreignObject>
          </g>
        </svg>

        {/* Labels */}
        <div className="absolute left-3 top-3 text-left">
          <div className="font-mono text-[10px] uppercase font-bold text-slate-500 flex items-center">
            <MapPin size={11} className="mr-1 text-slate-700" /> Origin Zone
          </div>
          <div className="font-mono text-xs font-bold text-[#1E2A38]">{pickupZoneName}</div>
          <div className="font-mono text-[10px] text-slate-600">PIN: {pickupPincode}</div>
        </div>

        <div className="absolute right-3 top-3 text-right">
          <div className="font-mono text-[10px] uppercase font-bold text-slate-500 flex items-center justify-end">
            Destination <MapPin size={11} className="ml-1 text-slate-700" />
          </div>
          <div className="font-mono text-xs font-bold text-[#1E2A38]">{dropZoneName}</div>
          <div className="font-mono text-[10px] text-slate-600">PIN: {dropPincode}</div>
        </div>
      </div>
    </div>
  );
};
