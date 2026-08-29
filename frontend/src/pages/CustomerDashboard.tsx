import React, { useState, useEffect } from 'react';
import { fetchApi } from '../lib/api';
import { StatusStamp, StatusType } from '../components/StatusStamp';
import { OrderTrackingTimeline } from '../components/OrderTrackingTimeline';
import { BalanceScale } from '../components/BalanceScale';
import { RescheduleModal } from '../components/RescheduleModal';
import {
  Package,
  MapPin,
  Scale,
  Truck,
  Check,
  AlertTriangle,
  RefreshCw,
  Clock,
  UserCheck,
  Calendar,
  FileText,
} from 'lucide-react';

interface ChargeBreakdown {
  pickupZoneId: string;
  pickupZoneName: string;
  dropZoneId: string;
  dropZoneName: string;
  isIntraZone: boolean;
  volumetricWeightKg: number;
  billableWeightKg: number;
  rateCardId: string;
  baseCharge: number;
  weightCharge: number;
  subtotal: number;
  codSurcharge: number;
  totalCharge: number;
}

interface Order {
  id: string;
  orderType: string;
  paymentType: string;
  pickupAddress: string;
  pickupPincode: string;
  dropAddress: string;
  dropPincode: string;
  actualWeightKg: number;
  volumetricWeightKg: number;
  billableWeightKg: number;
  baseCharge: number;
  weightCharge: number;
  codSurcharge: number;
  totalCharge: number;
  status: StatusType;
  agent?: { user: { name: string; phone?: string } };
  rescheduleDate?: string;
  createdAt: string;
  statusHistory: any[];
}

export const CustomerDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'quote' | 'orders'>('quote');

  // Form State
  const [pickupAddress, setPickupAddress] = useState('MG Road, Indiranagar');
  const [pickupPincode, setPickupPincode] = useState('560001');
  const [dropAddress, setDropAddress] = useState('HITECH City, Madhapur');
  const [dropPincode, setDropPincode] = useState('500081');
  const [lengthCm, setLengthCm] = useState(30);
  const [breadthCm, setBreadthCm] = useState(20);
  const [heightCm, setHeightCm] = useState(15);
  const [actualWeightKg, setActualWeightKg] = useState(4.0);
  const [orderType, setOrderType] = useState<'B2C' | 'B2B'>('B2C');
  const [paymentType, setPaymentType] = useState<'PREPAID' | 'COD'>('COD');

  const [quote, setQuote] = useState<ChargeBreakdown | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [ordersLoading, setOrdersLoading] = useState(false);

  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [rescheduleModalOrderId, setRescheduleModalOrderId] = useState<string | null>(null);

  // Fetch Live Quote
  const handleGetQuote = async () => {
    setQuoteLoading(true);
    setQuoteError(null);
    try {
      const breakdown = await fetchApi<ChargeBreakdown>('/orders/quote', {
        method: 'POST',
        body: JSON.stringify({
          pickupPincode,
          dropPincode,
          lengthCm: Number(lengthCm),
          breadthCm: Number(breadthCm),
          heightCm: Number(heightCm),
          actualWeightKg: Number(actualWeightKg),
          orderType,
          paymentType,
        }),
      });
      setQuote(breakdown);
    } catch (err: any) {
      setQuote(null);
      setQuoteError(err.message || 'Failed to calculate quote');
    } finally {
      setQuoteLoading(false);
    }
  };

  // Auto calculate quote on field changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (pickupPincode && dropPincode && lengthCm > 0 && breadthCm > 0 && heightCm > 0 && actualWeightKg > 0) {
        handleGetQuote();
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [pickupPincode, dropPincode, lengthCm, breadthCm, heightCm, actualWeightKg, orderType, paymentType]);

  // Fetch Customer Orders
  const fetchOrders = async () => {
    setOrdersLoading(true);
    try {
      const data = await fetchApi<Order[]>('/orders');
      setOrders(data);
      if (data.length > 0 && !selectedOrder) {
        setSelectedOrder(data[0]);
      } else if (selectedOrder) {
        // Refresh selected order
        const updated = data.find(o => o.id === selectedOrder.id);
        if (updated) setSelectedOrder(updated);
      }
    } catch (err) {
      console.error('Failed fetching orders:', err);
    } finally {
      setOrdersLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Handle Confirm & Place Order
  const handleConfirmOrder = async () => {
    setIsPlacingOrder(true);
    try {
      const newOrder = await fetchApi<Order>('/orders', {
        method: 'POST',
        body: JSON.stringify({
          pickupAddress,
          pickupPincode,
          dropAddress,
          dropPincode,
          lengthCm: Number(lengthCm),
          breadthCm: Number(breadthCm),
          heightCm: Number(heightCm),
          actualWeightKg: Number(actualWeightKg),
          orderType,
          paymentType,
        }),
      });

      await fetchOrders();
      setSelectedOrder(newOrder);
      setActiveTab('orders');
    } catch (err: any) {
      alert(err.message || 'Failed to place order');
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const volumetricKg = Math.round(((lengthCm * breadthCm * heightCm) / 5000) * 100) / 100;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Console Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-ink/40 pb-4">
        <div>
          <h1 className="font-stencil text-3xl uppercase tracking-widest text-text-primary flex items-center">
            <Truck size={28} className="mr-3 text-stamp-green" /> Customer Dispatch Console
          </h1>
          <p className="font-mono text-xs text-text-secondary">
            Calculate instant rate cards, dispatch shipments, and track waybills live.
          </p>
        </div>

        <div className="flex bg-kraft border-2 border-ink/40 p-1 rounded-xs font-mono text-xs font-bold uppercase">
          <button
            onClick={() => setActiveTab('quote')}
            className={`px-4 py-2 rounded-xs flex items-center transition-colors ${
              activeTab === 'quote' ? 'bg-ink text-paper shadow-sm' : 'text-text-primary hover:bg-paper/50'
            }`}
          >
            <FileText size={14} className="mr-1.5" /> Rate & Dispatch
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 rounded-xs flex items-center transition-colors ${
              activeTab === 'orders' ? 'bg-ink text-paper shadow-sm' : 'text-text-primary hover:bg-paper/50'
            }`}
          >
            <Package size={14} className="mr-1.5" /> Waybills ({orders.length})
          </button>
        </div>
      </div>

      {/* TAB 1: RATE & DISPATCH CONSOLE */}
      {activeTab === 'quote' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Form Specs Column */}
          <div className="lg:col-span-7 bg-paper border-2 border-ink/40 p-6 rounded-xs shadow-md space-y-6">
            <div className="font-stencil text-lg uppercase tracking-wider text-text-primary border-b border-ink/20 pb-2 flex justify-between items-center">
              <span className="flex items-center">
                <MapPin size={18} className="mr-2 text-stamp-red" /> Shipment Specs
              </span>
              <span className="font-mono text-[10px] text-text-muted uppercase">Auto-Quote Active</span>
            </div>

            {/* Pickup & Drop Addresses */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-xs">
              <div className="space-y-2">
                <label className="block font-mono text-xs font-bold uppercase text-text-primary">
                  Pickup Address & PIN
                </label>
                <input
                  type="text"
                  value={pickupAddress}
                  onChange={e => setPickupAddress(e.target.value)}
                  placeholder="Origin Address"
                  className="w-full bg-paper text-text-primary border border-ink/40 p-2 font-mono text-xs rounded-xs mb-1 focus:border-ink"
                />
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-[10px] uppercase font-bold text-text-muted">PINCODE:</span>
                  <input
                    type="text"
                    value={pickupPincode}
                    onChange={e => setPickupPincode(e.target.value)}
                    className="w-28 bg-paper text-text-primary border border-ink/40 p-1.5 font-mono text-xs font-bold rounded-xs"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block font-mono text-xs font-bold uppercase text-text-primary">
                  Drop Address & PIN
                </label>
                <input
                  type="text"
                  value={dropAddress}
                  onChange={e => setDropAddress(e.target.value)}
                  placeholder="Destination Address"
                  className="w-full bg-paper text-text-primary border border-ink/40 p-2 font-mono text-xs rounded-xs mb-1 focus:border-ink"
                />
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-[10px] uppercase font-bold text-text-muted">PINCODE:</span>
                  <input
                    type="text"
                    value={dropPincode}
                    onChange={e => setDropPincode(e.target.value)}
                    className="w-28 bg-paper text-text-primary border border-ink/40 p-1.5 font-mono text-xs font-bold rounded-xs"
                  />
                </div>
              </div>
            </div>

            {/* Package Dimensions & Weight */}
            <div className="border-t border-ink/20 pt-4">
              <label className="block font-mono text-xs font-bold uppercase mb-2 text-text-primary flex items-center">
                <Scale size={14} className="mr-1 text-stamp-amber" /> Dimensions & Weight
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <span className="font-mono text-[10px] text-text-secondary block">Length (cm)</span>
                  <input
                    type="number"
                    min="1"
                    value={lengthCm}
                    onChange={e => setLengthCm(Number(e.target.value))}
                    className="w-full bg-paper text-text-primary border border-ink/40 p-2 font-mono text-xs font-bold rounded-xs"
                  />
                </div>
                <div>
                  <span className="font-mono text-[10px] text-text-secondary block">Breadth (cm)</span>
                  <input
                    type="number"
                    min="1"
                    value={breadthCm}
                    onChange={e => setBreadthCm(Number(e.target.value))}
                    className="w-full bg-paper text-text-primary border border-ink/40 p-2 font-mono text-xs font-bold rounded-xs"
                  />
                </div>
                <div>
                  <span className="font-mono text-[10px] text-text-secondary block">Height (cm)</span>
                  <input
                    type="number"
                    min="1"
                    value={heightCm}
                    onChange={e => setHeightCm(Number(e.target.value))}
                    className="w-full bg-paper text-text-primary border border-ink/40 p-2 font-mono text-xs font-bold rounded-xs"
                  />
                </div>
                <div>
                  <span className="font-mono text-[10px] text-text-secondary block">Actual Wt (kg)</span>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={actualWeightKg}
                    onChange={e => setActualWeightKg(Number(e.target.value))}
                    className="w-full bg-paper border border-ink/40 p-2 font-mono text-xs font-bold rounded-xs text-stamp-green"
                  />
                </div>
              </div>
            </div>

            {/* Order Type & Payment Type */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-ink/20 pt-4">
              <div>
                <label className="block font-mono text-xs font-bold uppercase mb-1.5 text-text-primary">
                  Order Category
                </label>
                <div className="flex space-x-2 font-mono text-xs">
                  <button
                    type="button"
                    onClick={() => setOrderType('B2C')}
                    className={`flex-1 py-2 border border-ink/40 rounded-xs font-bold uppercase ${
                      orderType === 'B2C' ? 'bg-ink text-paper' : 'bg-paper text-text-primary'
                    }`}
                  >
                    B2C Retail
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderType('B2B')}
                    className={`flex-1 py-2 border border-ink/40 rounded-xs font-bold uppercase ${
                      orderType === 'B2B' ? 'bg-ink text-paper' : 'bg-paper text-text-primary'
                    }`}
                  >
                    B2B Commercial
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-mono text-xs font-bold uppercase mb-1.5 text-text-primary">
                  Payment Method
                </label>
                <div className="flex space-x-2 font-mono text-xs">
                  <button
                    type="button"
                    onClick={() => setPaymentType('PREPAID')}
                    className={`flex-1 py-2 border border-ink/40 rounded-xs font-bold uppercase ${
                      paymentType === 'PREPAID' ? 'bg-ink text-paper' : 'bg-paper text-text-primary'
                    }`}
                  >
                    Prepaid
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentType('COD')}
                    className={`flex-1 py-2 border border-ink/40 rounded-xs font-bold uppercase ${
                      paymentType === 'COD' ? 'bg-ink text-paper' : 'bg-paper text-text-primary'
                    }`}
                  >
                    COD Cash
                  </button>
                </div>
              </div>
            </div>

            {/* Interactive Balance Scale Visualizer */}
            <BalanceScale
              actualWeightKg={Number(actualWeightKg)}
              volumetricWeightKg={volumetricKg}
              lengthCm={Number(lengthCm)}
              breadthCm={Number(breadthCm)}
              heightCm={Number(heightCm)}
            />
          </div>

          {/* Live Itemized Quote Ticket & Order Confirmation */}
          <div className="lg:col-span-5 space-y-6">
            <div className="perforated-ticket p-6 shadow-xl rounded-xs">
              <div className="border-b-2 border-dashed border-ink/40 pb-4 mb-4 flex justify-between items-start">
                <div>
                  <div className="font-stencil text-2xl uppercase tracking-widest text-text-primary">
                    SHIPPING WAYBILL QUOTE
                  </div>
                  <div className="font-mono text-[10px] text-text-muted uppercase">
                    Calculated via Rate Engine
                  </div>
                </div>
                <div className="bg-ink text-paper font-mono text-[10px] px-2 py-1 uppercase font-bold rounded-xs">
                  {orderType} // {paymentType}
                </div>
              </div>

              {quoteError && (
                <div className="bg-stamp-red/10 border border-stamp-red text-stamp-red font-mono text-xs p-3 rounded-xs flex items-center mb-4">
                  <AlertTriangle size={16} className="mr-2 shrink-0" />
                  {quoteError}
                </div>
              )}

              {quote ? (
                <div className="space-y-4 font-mono text-xs">
                  <div className="bg-kraft/30 p-3 rounded border border-ink/30 space-y-1">
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Origin Zone:</span>
                      <span className="font-bold text-text-primary">{quote.pickupZoneName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Destination Zone:</span>
                      <span className="font-bold text-text-primary">{quote.dropZoneName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Route Type:</span>
                      <span className="font-bold text-text-primary">
                        {quote.isIntraZone ? 'Intra-Zone (Same)' : 'Inter-Zone (Cross)'}
                      </span>
                    </div>
                  </div>

                  {/* Charge Breakdown */}
                  <div className="space-y-2 border-t border-ink/20 pt-3">
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Base Flat Charge:</span>
                      <span className="font-bold text-text-primary">₹{quote.baseCharge.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Weight Charge ({quote.billableWeightKg} kg):</span>
                      <span className="font-bold text-text-primary">₹{quote.weightCharge.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-text-primary font-bold pt-1 border-t border-ink/10">
                      <span>Subtotal Rate:</span>
                      <span>₹{quote.subtotal.toFixed(2)}</span>
                    </div>

                    {paymentType === 'COD' && (
                      <div className="flex justify-between text-stamp-red pt-1 font-bold">
                        <span>COD Cash Surcharge:</span>
                        <span>+₹{quote.codSurcharge.toFixed(2)}</span>
                      </div>
                    )}

                    <div className="flex justify-between items-center text-base font-bold bg-ink text-paper p-3 rounded-xs mt-3 shadow-md">
                      <span className="font-stencil tracking-wider uppercase">TOTAL CHARGE</span>
                      <span className="text-xl">₹{quote.totalCharge.toFixed(2)}</span>
                    </div>
                  </div>

                  <button
                    onClick={handleConfirmOrder}
                    disabled={isPlacingOrder}
                    className="w-full bg-stamp-green text-paper font-mono font-bold text-sm uppercase py-3 rounded-xs hover:opacity-90 transition-colors shadow-lg flex items-center justify-center space-x-2 mt-4 disabled:opacity-50"
                  >
                    <Check size={18} />
                    <span>{isPlacingOrder ? 'Dispatching Order...' : 'Confirm & Dispatch Shipment'}</span>
                  </button>
                </div>
              ) : (
                <div className="py-12 text-center text-text-muted font-mono text-xs">
                  {quoteLoading ? 'Calculating live rate breakdown...' : 'Enter valid pincodes and package dimensions to compute rate ticket.'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: WAYBILLS & LIVE TRACKING */}
      {activeTab === 'orders' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Order History List */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex justify-between items-center font-mono text-xs">
              <span className="font-stencil text-lg uppercase text-text-primary">Active Waybills</span>
              <button
                onClick={fetchOrders}
                className="text-text-secondary hover:text-text-primary flex items-center"
              >
                <RefreshCw size={12} className={`mr-1 ${ordersLoading ? 'animate-spin' : ''}`} /> Refresh
              </button>
            </div>

            {orders.length === 0 ? (
              <div className="bg-paper border-2 border-ink/40 p-8 text-center rounded-xs font-mono text-xs text-text-muted">
                No active waybill orders. Use the Rate & Dispatch tab to create your first shipment.
              </div>
            ) : (
              <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
                {orders.map(order => {
                  const isSelected = selectedOrder?.id === order.id;
                  return (
                    <div
                      key={order.id}
                      onClick={() => setSelectedOrder(order)}
                      className={`p-4 border-2 rounded-xs cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-kraft border-ink shadow-md translate-x-1'
                          : 'bg-paper border-ink/40 hover:border-ink'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-mono text-xs font-bold text-text-primary">
                            #{order.id.substring(0, 8).toUpperCase()}
                          </div>
                          <div className="font-mono text-[10px] text-text-muted">
                            {new Date(order.createdAt).toLocaleString()}
                          </div>
                        </div>
                        <StatusStamp status={order.status} size="sm" animate={false} />
                      </div>

                      <div className="font-mono text-xs space-y-1 text-text-secondary">
                        <div className="truncate">
                          <span className="text-text-muted">From:</span> {order.pickupAddress} ({order.pickupPincode})
                        </div>
                        <div className="truncate">
                          <span className="text-text-muted">To:</span> {order.dropAddress} ({order.dropPincode})
                        </div>
                      </div>

                      <div className="flex justify-between items-center mt-3 pt-2 border-t border-ink/20 font-mono text-xs">
                        <span className="text-text-secondary">Billable: {order.billableWeightKg} kg</span>
                        <span className="font-bold text-text-primary">₹{order.totalCharge}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Selected Order Deep-Dive & Immutable Timeline */}
          <div className="lg:col-span-7">
            {selectedOrder ? (
              <div className="bg-paper border-2 border-ink/40 p-6 rounded-xs shadow-xl space-y-6">
                <div className="border-b-2 border-ink/40 pb-4 flex flex-wrap justify-between items-center gap-2">
                  <div>
                    <div className="font-stencil text-xl uppercase tracking-wider text-text-primary">
                      WAYBILL #{selectedOrder.id.substring(0, 8).toUpperCase()}
                    </div>
                    <div className="font-mono text-xs text-text-secondary">
                      Placed on {new Date(selectedOrder.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <StatusStamp status={selectedOrder.status} size="md" animate={true} />
                </div>

                {/* Reschedule Alert banner if FAILED */}
                {selectedOrder.status === 'FAILED' && (
                  <div className="bg-stamp-red/10 border-2 border-stamp-red p-4 rounded-xs font-mono text-xs space-y-2">
                    <div className="font-bold text-stamp-red flex items-center text-sm">
                      <AlertTriangle size={18} className="mr-2" /> Delivery Attempt Failed
                    </div>
                    <div className="text-text-secondary">
                      The agent was unable to complete delivery. Please select a reschedule date to re-dispatch this package to the nearest available agent.
                    </div>
                    <button
                      onClick={() => setRescheduleModalOrderId(selectedOrder.id)}
                      className="bg-stamp-red text-paper px-4 py-2 rounded-xs font-bold uppercase hover:opacity-90 transition-colors shadow-xs inline-flex items-center"
                    >
                      <Calendar size={14} className="mr-1.5" /> Reschedule Delivery Now
                    </button>
                  </div>
                )}

                {/* Rescheduled Confirmation Banner */}
                {selectedOrder.status === 'RESCHEDULED' && selectedOrder.rescheduleDate && (
                  <div className="bg-stamp-amber/20 border-2 border-stamp-amber p-4 rounded-xs font-mono text-xs space-y-1">
                    <div className="font-bold text-text-primary flex items-center">
                      <Clock size={16} className="mr-2 text-stamp-amber" /> Delivery Rescheduled
                    </div>
                    <div className="text-text-secondary">
                      New Scheduled Date:{' '}
                      <span className="font-bold text-text-primary">
                        {new Date(selectedOrder.rescheduleDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                )}

                {/* Package Specifications Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-kraft/30 p-4 rounded border border-ink/20 font-mono text-xs">
                  <div>
                    <div className="text-text-muted uppercase text-[10px]">Pickup Address</div>
                    <div className="font-bold text-text-primary truncate">{selectedOrder.pickupAddress}</div>
                    <div className="text-text-secondary">PIN: {selectedOrder.pickupPincode}</div>
                  </div>
                  <div>
                    <div className="text-text-muted uppercase text-[10px]">Drop Address</div>
                    <div className="font-bold text-text-primary truncate">{selectedOrder.dropAddress}</div>
                    <div className="text-text-secondary">PIN: {selectedOrder.dropPincode}</div>
                  </div>
                  <div>
                    <div className="text-text-muted uppercase text-[10px]">Payment Summary</div>
                    <div className="font-bold text-text-primary">
                      ₹{selectedOrder.totalCharge} ({selectedOrder.paymentType})
                    </div>
                  </div>
                  <div>
                    <div className="text-text-muted uppercase text-[10px]">Actual Weight</div>
                    <div className="font-bold text-text-primary">{selectedOrder.actualWeightKg} kg</div>
                  </div>
                  <div>
                    <div className="text-text-muted uppercase text-[10px]">Volumetric Weight</div>
                    <div className="font-bold text-text-primary">{selectedOrder.volumetricWeightKg} kg</div>
                  </div>
                  <div>
                    <div className="text-text-muted uppercase text-[10px]">Assigned Agent</div>
                    <div className="font-bold text-text-primary flex items-center">
                      <UserCheck size={14} className="mr-1 text-stamp-green" />
                      {selectedOrder.agent?.user?.name || 'Awaiting Dispatch'}
                    </div>
                  </div>
                </div>

                {/* Immutable Audit Log Timeline */}
                <div className="pt-2">
                  <OrderTrackingTimeline history={selectedOrder.statusHistory} />
                </div>
              </div>
            ) : (
              <div className="bg-paper border-2 border-ink/40 p-12 text-center rounded-xs font-mono text-xs text-text-muted">
                Select a waybill from the list to view live tracking history and details.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {rescheduleModalOrderId && (
        <RescheduleModal
          orderId={rescheduleModalOrderId}
          isOpen={!!rescheduleModalOrderId}
          onClose={() => setRescheduleModalOrderId(null)}
          onSuccess={fetchOrders}
        />
      )}
    </div>
  );
};
