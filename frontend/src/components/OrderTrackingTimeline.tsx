import React from 'react';
import { StatusStamp, StatusType } from './StatusStamp';
import { Clock, ShieldCheck, UserCheck, Cpu } from 'lucide-react';

export interface StatusHistoryItem {
  id: string;
  status: StatusType;
  actorId: string;
  actorRole: 'ADMIN' | 'AGENT' | 'CUSTOMER';
  note?: string | null;
  createdAt: string;
}

interface OrderTrackingTimelineProps {
  history: StatusHistoryItem[];
}

export const OrderTrackingTimeline: React.FC<OrderTrackingTimelineProps> = ({ history }) => {
  const getActorBadge = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return (
          <span className="inline-flex items-center text-[10px] font-mono font-bold bg-ink text-paper px-1.5 py-0.5 rounded-xs">
            <ShieldCheck size={10} className="mr-1" /> ADMIN
          </span>
        );
      case 'AGENT':
        return (
          <span className="inline-flex items-center text-[10px] font-mono font-bold bg-stamp-amber text-ink px-1.5 py-0.5 rounded-xs">
            <UserCheck size={10} className="mr-1" /> AGENT
          </span>
        );
      case 'CUSTOMER':
        return (
          <span className="inline-flex items-center text-[10px] font-mono font-bold bg-kraft text-text-primary px-1.5 py-0.5 rounded-xs border border-ink/20">
            CUSTOMER
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center text-[10px] font-mono font-bold bg-stamp-blue text-paper px-1.5 py-0.5 rounded-xs">
            <Cpu size={10} className="mr-1" /> SYSTEM
          </span>
        );
    }
  };

  return (
    <div className="space-y-4 relative pl-4 border-l-2 border-ink/40 my-4">
      {history.map((item, index) => {
        const dateStr = new Date(item.createdAt).toLocaleString();
        const isLatest = index === history.length - 1;

        return (
          <div key={item.id} className="relative group">
            {/* Timeline Dot */}
            <div
              className={`absolute -left-[25px] top-1.5 w-4 h-4 rounded-full border-2 border-ink ${
                isLatest ? 'bg-stamp-green ring-4 ring-stamp-green/20' : 'bg-paper'
              }`}
            />

            <div className="bg-paper p-3 rounded border border-ink/30 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                <StatusStamp status={item.status} size="sm" animate={isLatest} />
                <div className="flex items-center space-x-2">
                  {getActorBadge(item.actorRole)}
                  <span className="font-mono text-[11px] text-text-muted flex items-center">
                    <Clock size={11} className="mr-1" /> {dateStr}
                  </span>
                </div>
              </div>

              {item.note && (
                <div className="font-mono text-xs text-text-primary bg-kraft/30 p-2 rounded border border-ink/20 mt-1">
                  "{item.note}"
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
