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
  size?: 'sm' | 'md' | 'lg';
}

export const StatusStamp: React.FC<StatusStampProps> = ({ status, animate = true, size = 'md' }) => {
  const getColors = () => {
    switch (status) {
      case 'DELIVERED':
        return 'text-[#2E6B4F] border-[#2E6B4F] bg-[#2E6B4F]/10';
      case 'FAILED':
        return 'text-[#B4432E] border-[#B4432E] bg-[#B4432E]/10';
      case 'IN_TRANSIT':
      case 'OUT_FOR_DELIVERY':
        return 'text-[#1D5C8A] border-[#1D5C8A] bg-[#1D5C8A]/10';
      case 'ASSIGNED':
      case 'PICKED_UP':
        return 'text-[#C68A2E] border-[#C68A2E] bg-[#C68A2E]/10';
      case 'RESCHEDULED':
        return 'text-purple-800 border-purple-800 bg-purple-100';
      default:
        return 'text-slate-700 border-slate-700 bg-slate-200/50';
    }
  };

  const getIcon = () => {
    const iconSize = size === 'sm' ? 14 : size === 'lg' ? 20 : 16;
    switch (status) {
      case 'DELIVERED':
        return <CheckCircle2 size={iconSize} className="mr-1 inline" />;
      case 'FAILED':
        return <AlertTriangle size={iconSize} className="mr-1 inline" />;
      case 'OUT_FOR_DELIVERY':
      case 'IN_TRANSIT':
        return <Truck size={iconSize} className="mr-1 inline" />;
      case 'PICKED_UP':
      case 'ASSIGNED':
        return <Package size={iconSize} className="mr-1 inline" />;
      case 'RESCHEDULED':
        return <RefreshCw size={iconSize} className="mr-1 inline" />;
      default:
        return <Clock size={iconSize} className="mr-1 inline" />;
    }
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 border-2',
    md: 'text-sm px-3 py-1 border-2 font-bold tracking-wider',
    lg: 'text-base px-4 py-1.5 border-[3px] font-bold tracking-widest',
  };

  return (
    <div
      className={`inline-flex items-center uppercase font-mono rounded-xs shadow-xs transform -rotate-3 transition-transform ${getColors()} ${
        sizeClasses[size]
      } ${animate ? 'animate-stamp-drop' : ''}`}
      style={{
        boxShadow: '1px 2px 0px rgba(30, 42, 56, 0.2), inset 0 0 0 1px currentColor',
      }}
    >
      {getIcon()}
      <span>{status.replace(/_/g, ' ')}</span>
    </div>
  );
};
