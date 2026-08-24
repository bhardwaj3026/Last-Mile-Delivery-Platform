import React, { useState, useEffect } from 'react';
import { fetchApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { StatusStamp, StatusType } from '../components/StatusStamp';
import { OrderTrackingTimeline } from '../components/OrderTrackingTimeline';
import { UserCheck, RefreshCw, CheckCircle2, AlertTriangle, MapPin, Truck, Package } from 'lucide-react';

interface Order {
  id: string;
  orderType: string;
  paymentType: string;
  pickupAddress: string;
  pickupPincode: string;
  dropAddress: string;
  dropPincode: string;
  actualWeightKg: number;
  billableWeightKg: number;
  totalCharge: number;
  status: StatusType;
  customer?: { name: string; phone?: string; email: string };
  statusHistory: any[];
  createdAt: string;
}

export const AgentDashboard: React.FC = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const [note, setNote] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchAssignedOrders = async () => {
    setIsLoading(true);
    try {
      const data = await fetchApi<Order[]>('/orders');
      setOrders(data);
      if (data.length > 0 && !selectedOrder) {
        setSelectedOrder(data[0]);
      } else if (selectedOrder) {
        const updated = data.find(o => o.id === selectedOrder.id);
        if (updated) setSelectedOrder(updated);
      }
    } catch (err) {
      console.error('Failed fetching assigned orders:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignedOrders();
  }, []);

  const handleUpdateStatus = async (orderId: string, newStatus: StatusType) => {
    setIsUpdating(true);
    try {
      const updated = await fetchApi<Order>(`/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus, note }),
      });
      setNote('');
      await fetchAssignedOrders();
      setSelectedOrder(updated);
    } catch (err: any) {
      alert(err.message || 'Status update failed');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-2 border-[#1E2A38] pb-4">
        <div>
          <h1 className="font-stencil text-3xl uppercase tracking-widest text-[#1E2A38] flex items-center">
            <UserCheck size={28} className="mr-3 text-[#C68A2E]" /> Agent Dispatch Console
          </h1>
          <p className="font-mono text-xs text-slate-600">
            Field agent queue management, package scanning, and status advancement.
          </p>
        </div>

        <button
          onClick={fetchAssignedOrders}
          className="font-mono text-xs bg-[#E6DEC8] border border-[#1E2A38] px-3 py-2 font-bold uppercase rounded-xs hover:bg-[#D9CBAE] flex items-center"
        >
          <RefreshCw size={14} className="mr-1.5" /> Refresh Assigned Queue
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Assigned Orders Roster */}
        <div className="lg:col-span-5 space-y-4">
          <div className="font-stencil text-lg uppercase tracking-wider text-[#1E2A38]">
            Assigned Waybill Queue ({orders.length})
          </div>

          {orders.length === 0 ? (
            <div className="bg-[#F8F5EE] border border-[#1E2A38] p-8 text-center font-mono text-xs text-slate-600 rounded-xs">
              No orders assigned to your queue at this moment.
            </div>
          ) : (
            <div className="space-y-3 max-h-[75vh] overflow-y-auto pr-1">
              {orders.map(order => {
                const isSelected = selectedOrder?.id === order.id;
                return (
                  <div
                    key={order.id}
                    onClick={() => setSelectedOrder(order)}
                    className={`p-4 border-2 rounded-xs cursor-pointer transition-all ${
                      isSelected
                        ? 'border-[#1E2A38] bg-[#E6DEC8] shadow-md'
                        : 'border-[#1E2A38]/30 bg-[#F8F5EE] hover:bg-[#E6DEC8]/40'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-mono font-bold text-sm text-[#1E2A38]">
                          #{order.id.slice(0, 8).toUpperCase()}
                        </div>
                        <div className="font-mono text-[10px] text-slate-600">
                          Cust: {order.customer?.name || 'Customer'}
                        </div>
                      </div>
                      <StatusStamp status={order.status} size="sm" animate={false} />
                    </div>

                    <div className="font-mono text-xs text-slate-800 space-y-1">
                      <div>
                        <span className="font-bold text-slate-600">Pickup:</span> {order.pickupAddress} (PIN {order.pickupPincode})
                      </div>
                      <div>
                        <span className="font-bold text-slate-600">Drop:</span> {order.dropAddress} (PIN {order.dropPincode})
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Order Action Panel */}
        <div className="lg:col-span-7">
          {selectedOrder ? (
            <div className="bg-[#F8F5EE] border-2 border-[#1E2A38] p-6 rounded-xs shadow-md space-y-6">
              <div className="flex items-center justify-between border-b-2 border-[#1E2A38] pb-4">
                <div>
                  <div className="font-mono text-xs text-slate-500 uppercase font-bold">
                    Active Delivery Manifest
                  </div>
                  <div className="font-stencil text-2xl text-[#1E2A38]">
                    #{selectedOrder.id.toUpperCase()}
                  </div>
                </div>
                <StatusStamp status={selectedOrder.status} size="lg" />
              </div>

              {/* Status Advancement Action Buttons */}
              <div className="bg-[#E6DEC8] border border-[#1E2A38] p-4 rounded-xs space-y-3">
                <div className="font-mono text-xs uppercase font-bold text-[#1E2A38]">
                  Advance Status Action:
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs">
                  <button
                    onClick={() => handleUpdateStatus(selectedOrder.id, 'PICKED_UP')}
                    disabled={isUpdating || selectedOrder.status === 'DELIVERED'}
                    className="bg-[#1D5C8A] text-paper font-bold p-2.5 rounded-xs hover:bg-blue-900 disabled:opacity-40 flex items-center justify-center"
                  >
                    <Package size={14} className="mr-1" /> Picked Up
                  </button>

                  <button
                    onClick={() => handleUpdateStatus(selectedOrder.id, 'IN_TRANSIT')}
                    disabled={isUpdating || selectedOrder.status === 'DELIVERED'}
                    className="bg-[#C68A2E] text-[#1E2A38] font-bold p-2.5 rounded-xs hover:bg-amber-500 disabled:opacity-40 flex items-center justify-center"
                  >
                    <Truck size={14} className="mr-1" /> In Transit
                  </button>

                  <button
                    onClick={() => handleUpdateStatus(selectedOrder.id, 'OUT_FOR_DELIVERY')}
                    disabled={isUpdating || selectedOrder.status === 'DELIVERED'}
                    className="bg-purple-800 text-paper font-bold p-2.5 rounded-xs hover:bg-purple-900 disabled:opacity-40 flex items-center justify-center"
                  >
                    <MapPin size={14} className="mr-1" /> Out For Delivery
                  </button>

                  <button
                    onClick={() => handleUpdateStatus(selectedOrder.id, 'DELIVERED')}
                    disabled={isUpdating || selectedOrder.status === 'DELIVERED'}
                    className="bg-[#2E6B4F] text-paper font-bold p-2.5 rounded-xs hover:bg-emerald-900 disabled:opacity-40 flex items-center justify-center"
                  >
                    <CheckCircle2 size={14} className="mr-1" /> Delivered
                  </button>
                </div>

                {/* Mark Failed Option */}
                <div className="pt-2 border-t border-[#1E2A38]/20 flex items-center justify-between">
                  <span className="font-mono text-[11px] text-slate-600">Need to report a failure?</span>
                  <button
                    onClick={() => handleUpdateStatus(selectedOrder.id, 'FAILED')}
                    disabled={isUpdating || selectedOrder.status === 'DELIVERED'}
                    className="bg-[#B4432E] text-paper font-mono text-xs font-bold px-3 py-1.5 rounded-xs hover:bg-red-900 disabled:opacity-40 flex items-center"
                  >
                    <AlertTriangle size={13} className="mr-1" /> Mark Delivery Failed
                  </button>
                </div>

                {/* Note Field */}
                <div>
                  <input
                    type="text"
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder="Optional status note / delivery comment..."
                    className="w-full bg-paper border border-[#1E2A38] p-2 font-mono text-xs rounded-xs mt-1"
                  />
                </div>
              </div>

              {/* Order Details & Audit Timeline */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-xs bg-paper p-4 rounded border border-[#1E2A38]/30">
                <div>
                  <div className="text-slate-500 uppercase font-bold text-[10px]">Customer Name</div>
                  <div className="font-bold text-[#1E2A38]">{selectedOrder.customer?.name}</div>
                  <div className="text-slate-600">{selectedOrder.customer?.phone || selectedOrder.customer?.email}</div>
                </div>
                <div>
                  <div className="text-slate-500 uppercase font-bold text-[10px]">Payment Collectable</div>
                  <div className="font-bold text-[#1E2A38]">
                    ₹{selectedOrder.totalCharge} ({selectedOrder.paymentType})
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-stencil text-lg uppercase tracking-wider text-[#1E2A38] border-b border-[#1E2A38]/20 pb-1">
                  Waybill Audit Trail
                </h3>
                <OrderTrackingTimeline history={selectedOrder.statusHistory || []} />
              </div>
            </div>
          ) : (
            <div className="bg-[#F8F5EE] border border-[#1E2A38] p-12 text-center font-mono text-xs text-slate-500 rounded-xs">
              Select an assigned order from the queue to process delivery transitions.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
