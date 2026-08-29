import React from 'react';
import { CheckCircle2, AlertTriangle, Clock, Truck, Package, RefreshCw } from 'lucide-react';

export type StatusType =
  | 'CREATED'
  | 'ASSIGNED'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'FAILED'
  | 'RESCHEDULED';

interface StatusStampProps {
  status: StatusType;
  animate?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'hero';
  label?: string;
}

export const StatusStamp: React.FC<StatusStampProps> = ({ status, animate = true, size = 'md', label }) => {
  const getColors = () => {
    switch (status) {
      case 'DELIVERED':
        return 'text-stamp-green border-stamp-green bg-stamp-green/15';
      case 'FAILED':
        return 'text-stamp-red border-stamp-red bg-stamp-red/15';
      case 'IN_TRANSIT':
      case 'OUT_FOR_DELIVERY':
        return 'text-stamp-blue border-stamp-blue bg-stamp-blue/15';
      case 'ASSIGNED':
      case 'PICKED_UP':
        return 'text-stamp-amber border-stamp-amber bg-stamp-amber/15';
      case 'RESCHEDULED':
        return 'text-purple-400 border-purple-400 bg-purple-950/30';
      default:
        return 'text-text-secondary border-text-secondary bg-kraft/30';
    }
  };

  const getIcon = () => {
    const iconSize = size === 'hero' ? 28 : size === 'lg' ? 20 : size === 'sm' ? 14 : 16;
    switch (status) {
      case 'DELIVERED':
        return <CheckCircle2 size={iconSize} className="mr-2 inline" />;
      case 'FAILED':
        return <AlertTriangle size={iconSize} className="mr-2 inline" />;
      case 'OUT_FOR_DELIVERY':
      case 'IN_TRANSIT':
        return <Truck size={iconSize} className="mr-1.5 inline" />;
      case 'PICKED_UP':
      case 'ASSIGNED':
        return <Package size={iconSize} className="mr-1.5 inline" />;
      case 'RESCHEDULED':
        return <RefreshCw size={iconSize} className="mr-1.5 inline" />;
      default:
        return <Clock size={iconSize} className="mr-1.5 inline" />;
    }
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 border-2',
    md: 'text-sm px-3 py-1 border-2 font-bold tracking-wider',
    lg: 'text-base px-4 py-1.5 border-[3px] font-bold tracking-widest',
    hero: 'text-xl sm:text-2xl px-6 py-3 border-[4px] font-extrabold tracking-widest shadow-xl',
  };

  return (
    <div
      className={`inline-flex items-center uppercase font-mono rounded-xs shadow-xs transform -rotate-3 transition-transform ${getColors()} ${
        sizeClasses[size]
      } ${animate ? 'animate-stamp-drop' : ''}`}
      style={{
        boxShadow: size === 'hero' ? '2px 4px 0px rgba(30, 42, 56, 0.25), inset 0 0 0 2px currentColor' : '1px 2px 0px rgba(30, 42, 56, 0.2), inset 0 0 0 1px currentColor',
      }}
    >
      {getIcon()}
      <span>{label || status.replace(/_/g, ' ')}</span>
    </div>
  );
};

