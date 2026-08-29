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
    <div className="bg-paper border border-ink/40 p-4 rounded-sm">
      <div className="flex items-center justify-between mb-3 border-b border-ink/20 pb-2">
        <div className="flex items-center space-x-2">
          <Navigation size={16} className="text-text-primary" />
          <span className="font-mono text-xs uppercase font-bold tracking-wider text-text-primary">
            Route Manifest Vector
          </span>
        </div>
        <span className="font-mono text-xs text-text-secondary font-semibold">
          Progress: {progressPct}%
        </span>
      </div>

      <div className="relative w-full h-32 bg-paper rounded border border-ink/30 overflow-hidden flex items-center justify-center">
        {/* Grid Background Lines */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              'linear-gradient(var(--ink) 1px, transparent 1px), linear-gradient(90deg, var(--ink) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        />

        <svg viewBox="0 0 400 140" className="w-full h-full relative z-10">
          {/* Dashed Background Path */}
          <path
            d="M 40 70 Q 200 10 360 70"
            fill="none"
            stroke="var(--ink)"
            strokeWidth="3"
            strokeDasharray="6 6"
            opacity="0.3"
          />

          {/* Progress Active Path */}
          <path
            d="M 40 70 Q 200 10 360 70"
            fill="none"
            stroke={isFailed ? 'var(--stamp-red)' : 'var(--stamp-green)'}
            strokeWidth="4"
            strokeDasharray="400"
            strokeDashoffset={400 - (400 * progressPct) / 100}
            className="transition-all duration-700 ease-out"
          />

          {/* Pickup Point Pin */}
          <g transform="translate(40, 70)">
            <circle r="12" fill="var(--paper)" stroke="var(--ink)" strokeWidth="2.5" />
            <circle r="5" fill="var(--ink)" />
          </g>

          {/* Drop Point Pin */}
          <g transform="translate(360, 70)">
            <circle r="12" fill="var(--paper)" stroke="var(--ink)" strokeWidth="2.5" />
            <circle r="5" fill={status === 'DELIVERED' ? 'var(--stamp-green)' : 'var(--stamp-red)'} />
          </g>

          {/* Moving Vehicle Indicator */}
          <g transform={`translate(${vehicleX}, ${vehicleY})`} className="transition-all duration-500 ease-out">
            <circle r="16" fill={isFailed ? 'var(--stamp-red)' : 'var(--ink)'} className="shadow-md" />
            <foreignObject x="-10" y="-10" width="20" height="20">
              <div className="w-full h-full flex items-center justify-center text-paper">
                <Truck size={13} />
              </div>
            </foreignObject>
          </g>
        </svg>

        {/* Labels */}
        <div className="absolute left-3 top-3 text-left">
          <div className="font-mono text-[10px] uppercase font-bold text-text-muted flex items-center">
            <MapPin size={11} className="mr-1 text-text-secondary" /> Origin Zone
          </div>
          <div className="font-mono text-xs font-bold text-text-primary">{pickupZoneName}</div>
          <div className="font-mono text-[10px] text-text-secondary">PIN: {pickupPincode}</div>
        </div>

        <div className="absolute right-3 top-3 text-right">
          <div className="font-mono text-[10px] uppercase font-bold text-text-muted flex items-center justify-end">
            Destination <MapPin size={11} className="ml-1 text-text-secondary" />
          </div>
          <div className="font-mono text-xs font-bold text-text-primary">{dropZoneName}</div>
          <div className="font-mono text-[10px] text-text-secondary">PIN: {dropPincode}</div>
        </div>
      </div>
    </div>
  );
};
