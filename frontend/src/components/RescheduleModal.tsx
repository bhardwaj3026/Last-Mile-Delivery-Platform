import React, { useState } from 'react';
import { Calendar, AlertCircle, X } from 'lucide-react';
import { fetchApi } from '../lib/api';

interface RescheduleModalProps {
  orderId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const RescheduleModal: React.FC<RescheduleModalProps> = ({ orderId, isOpen, onClose, onSuccess }) => {
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const [rescheduleDate, setRescheduleDate] = useState(tomorrow);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await fetchApi(`/orders/${orderId}/reschedule`, {
        method: 'POST',
        body: JSON.stringify({ rescheduleDate }),
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Reschedule failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-ink/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-paper border-2 border-ink rounded-sm max-w-md w-full p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute right-3 top-3 text-text-muted hover:text-text-primary p-1"
        >
          <X size={20} />
        </button>

        <div className="flex items-center space-x-2 border-b border-ink/20 pb-3 mb-4">
          <Calendar size={20} className="text-stamp-red" />
          <h2 className="font-stencil text-xl uppercase tracking-wider text-text-primary">
            Reschedule Delivery Ticket
          </h2>
        </div>

        <p className="text-sm font-sans text-text-secondary mb-4">
          The previous delivery attempt for order <span className="font-mono font-bold text-text-primary">#{orderId.slice(0, 8).toUpperCase()}</span> was unsuccessful. Please choose a new date to re-enter the dispatch queue.
        </p>

        {error && (
          <div className="mb-4 bg-stamp-red/10 border border-stamp-red text-stamp-red text-xs font-mono p-3 rounded-xs flex items-center">
            <AlertCircle size={16} className="mr-2 shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-mono text-xs font-bold uppercase mb-1 text-text-primary">
              Select New Delivery Date
            </label>
            <input
              type="date"
              min={new Date().toISOString().split('T')[0]}
              value={rescheduleDate}
              onChange={e => setRescheduleDate(e.target.value)}
              className="w-full bg-paper text-text-primary border-2 border-ink/40 p-2.5 font-mono text-sm rounded-xs focus:outline-none focus:border-ink"
              required
            />
          </div>

          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-ink/40 text-xs font-mono font-bold uppercase rounded-xs hover:bg-kraft text-text-primary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-ink text-paper text-xs font-mono font-bold uppercase rounded-xs hover:opacity-90 disabled:opacity-50"
            >
              {isSubmitting ? 'Confirming...' : 'Confirm Reschedule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
