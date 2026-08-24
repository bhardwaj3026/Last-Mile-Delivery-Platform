import React, { useState, useEffect } from 'react';
import { fetchApi } from '../lib/api';
import { StatusStamp, StatusType } from '../components/StatusStamp';
import { OrderTrackingTimeline } from '../components/OrderTrackingTimeline';
import {
  Shield,
  MapPin,
  IndianRupee,
  UserCheck,
  Bell,
  Package,
  Plus,
  RefreshCw,
  Edit2,
  Check,
  AlertTriangle,
  UserPlus,
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'orders' | 'zones' | 'rates' | 'cod' | 'agents' | 'notifications'>('orders');

  // State for All Orders
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [zoneFilter, setZoneFilter] = useState<string>('');

  // State for Zones
  // State for Zones & Pincode Lookup
  const [zones, setZones] = useState<any[]>([]);
  const [newZoneName, setNewZoneName] = useState('');
  const [newZonePincodes, setNewZonePincodes] = useState('');
  const [zoneLookupResults, setZoneLookupResults] = useState<{ pincode: string; state?: string; district?: string; isValid: boolean; message?: string }[]>([]);
  const [zoneLookupLoading, setZoneLookupLoading] = useState(false);

  // State for Pincode Mapping
  const [mapPincode, setMapPincode] = useState('');
  const [mapZoneId, setMapZoneId] = useState('');
  const [singleMapLookup, setSingleMapLookup] = useState<{ pincode: string; state?: string; district?: string; isValid: boolean; message?: string } | null>(null);
  const [singleMapLoading, setSingleMapLoading] = useState(false);

  // State for Rate Cards
  const [rateCards, setRateCards] = useState<any[]>([]);
  const [rcFromZoneId, setRcFromZoneId] = useState('');
  const [rcToZoneId, setRcToZoneId] = useState('');
  const [rcOrderType, setRcOrderType] = useState<'B2C' | 'B2B'>('B2C');
  const [rcBaseRate, setRcBaseRate] = useState(50);
  const [rcPerKgRate, setRcPerKgRate] = useState(10);

  // State for COD Config
  const [codConfigs, setCodConfigs] = useState<any[]>([]);
  const [b2cFlat, setB2cFlat] = useState(20);
  const [b2cPercent, setB2cPercent] = useState(2.5);
  const [b2bFlat, setB2bFlat] = useState(40);
  const [b2bPercent, setB2bPercent] = useState(1.5);

  // State for Agents
  const [agents, setAgents] = useState<any[]>([]);
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentEmail, setNewAgentEmail] = useState('');
  const [newAgentPass, setNewAgentPass] = useState('AgentPass123!');
  const [newAgentZoneId, setNewAgentZoneId] = useState('');

  // State for Notifications Log
  const [notificationLogs, setNotificationLogs] = useState<any[]>([]);

  // Refresh functions
  const fetchOrders = async () => {
    try {
      let url = '/orders?';
      if (statusFilter) url += `status=${statusFilter}&`;
      if (zoneFilter) url += `zoneId=${zoneFilter}&`;
      const data = await fetchApi<any[]>(url);
      setOrders(data);
    } catch (err) {
      console.error('Fetch orders error:', err);
    }
  };

  const fetchZones = async () => {
    try {
      const data = await fetchApi<any[]>('/admin/zones');
      setZones(data);
      if (data.length > 0 && !mapZoneId) setMapZoneId(data[0].id);
      if (data.length > 0 && !rcFromZoneId) {
        setRcFromZoneId(data[0].id);
        setRcToZoneId(data[0].id);
      }
      if (data.length > 0 && !newAgentZoneId) setNewAgentZoneId(data[0].id);
    } catch (err) {
      console.error('Fetch zones error:', err);
    }
  };

  const fetchRateCards = async () => {
    try {
      const data = await fetchApi<any[]>('/admin/rate-cards');
      setRateCards(data);
    } catch (err) {
      console.error('Fetch rate cards error:', err);
    }
  };

  const fetchCodConfigs = async () => {
    try {
      const data = await fetchApi<any[]>('/admin/cod-config');
      setCodConfigs(data);
      const b2c = data.find(c => c.orderType === 'B2C');
      if (b2c) {
        setB2cFlat(Number(b2c.flatFee));
        setB2cPercent(Number(b2c.percentOfBill));
      }
      const b2b = data.find(c => c.orderType === 'B2B');
      if (b2b) {
        setB2bFlat(Number(b2b.flatFee));
        setB2bPercent(Number(b2b.percentOfBill));
      }
    } catch (err) {
      console.error('Fetch COD config error:', err);
    }
  };

  const fetchAgents = async () => {
    try {
      const data = await fetchApi<any[]>('/admin/agents');
      setAgents(data);
    } catch (err) {
      console.error('Fetch agents error:', err);
    }
  };

  const fetchNotifications = async () => {
    try {
      const data = await fetchApi<any[]>('/admin/notifications');
      setNotificationLogs(data);
    } catch (err) {
      console.error('Fetch notification logs error:', err);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchZones();
    fetchRateCards();
    fetchCodConfigs();
    fetchAgents();
    fetchNotifications();
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [statusFilter, zoneFilter]);

  // Debounced lookup for Create Zone pincodes
  useEffect(() => {
    const rawPins = newZonePincodes
      .split(',')
      .map(p => p.trim())
      .filter(Boolean);

    if (rawPins.length === 0) {
      setZoneLookupResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setZoneLookupLoading(true);
      const results = await Promise.all(
        rawPins.map(async pincode => {
          try {
            const data = await fetchApi<any>(`/admin/pincode-lookup/${pincode}`);
            return {
              pincode,
              state: data.state,
              district: data.district,
              isValid: data.isValid !== false,
            };
          } catch (err) {
            return {
              pincode,
              isValid: false,
              message: 'Could not verify this pincode',
            };
          }
        })
      );
      setZoneLookupResults(results);
      setZoneLookupLoading(false);
    }, 400);

    return () => clearTimeout(timer);
  }, [newZonePincodes]);

  // Debounced lookup for Map Pincode single input
  useEffect(() => {
    const clean = mapPincode.trim();
    if (!clean || clean.length < 6) {
      setSingleMapLookup(null);
      return;
    }

    const timer = setTimeout(async () => {
      setSingleMapLoading(true);
      try {
        const data = await fetchApi<any>(`/admin/pincode-lookup/${clean}`);
        setSingleMapLookup({
          pincode: clean,
          state: data.state,
          district: data.district,
          isValid: data.isValid !== false,
        });
      } catch (err) {
        setSingleMapLookup({
          pincode: clean,
          isValid: false,
          message: 'Could not verify this pincode',
        });
      } finally {
        setSingleMapLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [mapPincode]);

  // Handlers for Admin forms
  const handleCreateZone = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const pincodes = newZonePincodes.split(',').map(p => p.trim()).filter(Boolean);
      await fetchApi('/admin/zones', {
        method: 'POST',
        body: JSON.stringify({ name: newZoneName, pincodes }),
      });
      setNewZoneName('');
      setNewZonePincodes('');
      await fetchZones();
    } catch (err: any) {
      alert(err.message || 'Failed creating zone');
    }
  };

  const handleMapPincode = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetchApi('/admin/pincode-map', {
        method: 'POST',
        body: JSON.stringify({ pincode: mapPincode.trim(), zoneId: mapZoneId }),
      });
      setMapPincode('');
      await fetchZones();
    } catch (err: any) {
      alert(err.message || 'Failed mapping pincode');
    }
  };

  const handleSaveRateCard = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetchApi('/admin/rate-cards', {
        method: 'POST',
        body: JSON.stringify({
          fromZoneId: rcFromZoneId,
          toZoneId: rcToZoneId,
          orderType: rcOrderType,
          baseRate: Number(rcBaseRate),
          perKgRate: Number(rcPerKgRate),
        }),
      });
      await fetchRateCards();
    } catch (err: any) {
      alert(err.message || 'Failed saving rate card');
    }
  };

  const handleSaveCodConfig = async (type: 'B2C' | 'B2B') => {
    try {
      const flatFee = type === 'B2C' ? b2cFlat : b2bFlat;
      const percentOfBill = type === 'B2C' ? b2cPercent : b2bPercent;
      await fetchApi('/admin/cod-config', {
        method: 'POST',
        body: JSON.stringify({ orderType: type, flatFee, percentOfBill }),
      });
      await fetchCodConfigs();
      alert(`Updated COD surcharge config for ${type}`);
    } catch (err: any) {
      alert(err.message || 'Failed saving COD config');
    }
  };

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetchApi('/admin/agents', {
        method: 'POST',
        body: JSON.stringify({
          name: newAgentName,
          email: newAgentEmail,
          password: newAgentPass,
          zoneId: newAgentZoneId,
        }),
      });
      setNewAgentName('');
      setNewAgentEmail('');
      await fetchAgents();
    } catch (err: any) {
      alert(err.message || 'Failed creating agent');
    }
  };

  const handleAssignAgent = async (orderId: string, agentId: string) => {
    try {
      await fetchApi(`/orders/${orderId}/assign`, {
        method: 'PATCH',
        body: JSON.stringify({ agentId }),
      });
      await fetchOrders();
    } catch (err: any) {
      alert(err.message || 'Assignment failed');
    }
  };

  const handleAdminStatusOverride = async (orderId: string, newStatus: string) => {
    try {
      await fetchApi(`/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus, note: 'Admin status override' }),
      });
      await fetchOrders();
    } catch (err: any) {
      alert(err.message || 'Status override failed');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-2 border-[#1E2A38] pb-4">
        <div>
          <h1 className="font-stencil text-3xl uppercase tracking-widest text-[#1E2A38] flex items-center">
            <Shield size={28} className="mr-3 text-[#B4432E]" /> Admin Command & Control
          </h1>
          <p className="font-mono text-xs text-slate-600">
            Zones, rate cards, COD surcharges, agent roster, manual overrides & audit logs.
          </p>
        </div>
      </div>

      {/* Admin Sub-Navigation */}
      <div className="flex flex-wrap bg-[#E6DEC8] border-2 border-[#1E2A38] p-1 rounded-xs gap-1 font-mono text-xs font-bold uppercase">
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-3 py-2 rounded-xs flex items-center ${
            activeTab === 'orders' ? 'bg-[#1E2A38] text-paper shadow-sm' : 'text-[#1E2A38] hover:bg-paper/50'
          }`}
        >
          <Package size={14} className="mr-1.5" /> All Orders ({orders.length})
        </button>

        <button
          onClick={() => setActiveTab('zones')}
          className={`px-3 py-2 rounded-xs flex items-center ${
            activeTab === 'zones' ? 'bg-[#1E2A38] text-paper shadow-sm' : 'text-[#1E2A38] hover:bg-paper/50'
          }`}
        >
          <MapPin size={14} className="mr-1.5" /> Zones & Pincodes
        </button>

        <button
          onClick={() => setActiveTab('rates')}
          className={`px-3 py-2 rounded-xs flex items-center ${
            activeTab === 'rates' ? 'bg-[#1E2A38] text-paper shadow-sm' : 'text-[#1E2A38] hover:bg-paper/50'
          }`}
        >
          <IndianRupee size={14} className="mr-1.5" /> Rate Cards
        </button>

        <button
          onClick={() => setActiveTab('cod')}
          className={`px-3 py-2 rounded-xs flex items-center ${
            activeTab === 'cod' ? 'bg-[#1E2A38] text-paper shadow-sm' : 'text-[#1E2A38] hover:bg-paper/50'
          }`}
        >
          <IndianRupee size={14} className="mr-1.5" /> COD Config
        </button>

        <button
          onClick={() => setActiveTab('agents')}
          className={`px-3 py-2 rounded-xs flex items-center ${
            activeTab === 'agents' ? 'bg-[#1E2A38] text-paper shadow-sm' : 'text-[#1E2A38] hover:bg-paper/50'
          }`}
        >
          <UserCheck size={14} className="mr-1.5" /> Agents Roster ({agents.length})
        </button>

        <button
          onClick={() => setActiveTab('notifications')}
          className={`px-3 py-2 rounded-xs flex items-center ${
            activeTab === 'notifications' ? 'bg-[#1E2A38] text-paper shadow-sm' : 'text-[#1E2A38] hover:bg-paper/50'
          }`}
        >
          <Bell size={14} className="mr-1.5" /> Audit Log ({notificationLogs.length})
        </button>
      </div>

      {/* TAB 1: ALL ORDERS & OVERRIDES */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
          {/* Filters Bar */}
          <div className="bg-[#F8F5EE] border-2 border-[#1E2A38] p-4 rounded-xs flex flex-wrap items-center justify-between gap-4 font-mono text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-bold text-[#1E2A38] uppercase">Filters:</span>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="bg-paper border border-[#1E2A38] p-1.5 font-bold rounded-xs"
              >
                <option value="">All Statuses</option>
                <option value="CREATED">CREATED</option>
                <option value="ASSIGNED">ASSIGNED</option>
                <option value="PICKED_UP">PICKED_UP</option>
                <option value="IN_TRANSIT">IN_TRANSIT</option>
                <option value="OUT_FOR_DELIVERY">OUT_FOR_DELIVERY</option>
                <option value="DELIVERED">DELIVERED</option>
                <option value="FAILED">FAILED</option>
                <option value="RESCHEDULED">RESCHEDULED</option>
              </select>

              <select
                value={zoneFilter}
                onChange={e => setZoneFilter(e.target.value)}
                className="bg-paper border border-[#1E2A38] p-1.5 font-bold rounded-xs"
              >
                <option value="">All Zones</option>
                {zones.map(z => (
                  <option key={z.id} value={z.id}>
                    {z.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={fetchOrders}
              className="bg-[#1E2A38] text-paper font-bold uppercase px-3 py-1.5 rounded-xs flex items-center"
            >
              <RefreshCw size={12} className="mr-1" /> Refresh Table
            </button>
          </div>

          {/* Orders Table */}
          <div className="bg-[#F8F5EE] border-2 border-[#1E2A38] rounded-xs overflow-x-auto shadow-md">
            <table className="w-full text-left border-collapse font-mono text-xs">
              <thead>
                <tr className="bg-[#1E2A38] text-paper uppercase border-b-2 border-[#1E2A38]">
                  <th className="p-3">Waybill ID</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Route (PIN)</th>
                  <th className="p-3">Charge</th>
                  <th className="p-3">Status Stamp</th>
                  <th className="p-3">Assigned Agent</th>
                  <th className="p-3">Admin Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E2A38]/20">
                {orders.map(order => (
                  <tr key={order.id} className="hover:bg-[#E6DEC8]/40">
                    <td className="p-3 font-bold text-[#1E2A38]">
                      #{order.id.slice(0, 8).toUpperCase()}
                    </td>
                    <td className="p-3">
                      <div>{order.customer?.name}</div>
                      <div className="text-[10px] text-slate-500">{order.customer?.email}</div>
                    </td>
                    <td className="p-3">
                      <div>{order.pickupPincode} → {order.dropPincode}</div>
                      <div className="text-[10px] text-slate-500">{order.orderType} // {order.paymentType}</div>
                    </td>
                    <td className="p-3 font-bold text-[#2E6B4F]">
                      ₹{order.totalCharge}
                    </td>
                    <td className="p-3">
                      <StatusStamp status={order.status} size="sm" animate={false} />
                    </td>
                    <td className="p-3">
                      <select
                        value={order.agentId || ''}
                        onChange={e => handleAssignAgent(order.id, e.target.value)}
                        className="bg-paper border border-[#1E2A38] p-1 text-[11px] font-bold rounded-xs"
                      >
                        <option value="">-- Unassigned --</option>
                        {agents.map(a => (
                          <option key={a.id} value={a.id}>
                            {a.user.name} ({a.zone.name})
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="p-3 flex items-center space-x-2">
                      {/* Status Override */}
                      <select
                        onChange={e => {
                          if (e.target.value) {
                            handleAdminStatusOverride(order.id, e.target.value);
                            e.target.value = '';
                          }
                        }}
                        className="bg-[#B4432E] text-paper p-1 text-[11px] font-bold uppercase rounded-xs"
                      >
                        <option value="">Override Status</option>
                        <option value="CREATED">CREATED</option>
                        <option value="ASSIGNED">ASSIGNED</option>
                        <option value="PICKED_UP">PICKED_UP</option>
                        <option value="IN_TRANSIT">IN_TRANSIT</option>
                        <option value="OUT_FOR_DELIVERY">OUT_FOR_DELIVERY</option>
                        <option value="DELIVERED">DELIVERED</option>
                        <option value="FAILED">FAILED</option>
                        <option value="RESCHEDULED">RESCHEDULED</option>
                      </select>

                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="bg-[#1E2A38] text-paper p-1.5 px-2 rounded-xs font-bold text-[11px]"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Selected Order Audit Modal */}
          {selectedOrder && (
            <div className="fixed inset-0 z-50 bg-[#1E2A38]/70 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-[#F8F5EE] border-2 border-[#1E2A38] rounded-xs max-w-2xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="absolute right-3 top-3 font-mono font-bold text-xs bg-[#1E2A38] text-paper px-2 py-1"
                >
                  CLOSE [X]
                </button>
                <div className="font-stencil text-2xl text-[#1E2A38] mb-4">
                  WAYBILL AUDIT #{selectedOrder.id.toUpperCase()}
                </div>
                <OrderTrackingTimeline history={selectedOrder.statusHistory || []} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ZONES & PINCODES */}
      {activeTab === 'zones' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-6 space-y-6">
            <form onSubmit={handleCreateZone} className="bg-[#F8F5EE] border-2 border-[#1E2A38] p-6 rounded-xs shadow-md space-y-4 font-mono text-xs">
              <div className="font-stencil text-lg uppercase text-[#1E2A38] border-b border-[#1E2A38]/20 pb-2">
                Create New Logistics Zone
              </div>

              <div>
                <label className="block font-bold uppercase mb-1">Zone Name</label>
                <input
                  type="text"
                  value={newZoneName}
                  onChange={e => setNewZoneName(e.target.value)}
                  placeholder="e.g. North Suburbs"
                  className="w-full bg-paper border border-[#1E2A38] p-2 font-bold rounded-xs"
                  required
                />
              </div>

              <div>
                <label className="block font-bold uppercase mb-1">Pincodes (Comma separated)</label>
                <input
                  type="text"
                  value={newZonePincodes}
                  onChange={e => setNewZonePincodes(e.target.value)}
                  placeholder="110010, 110011, 110012"
                  className="w-full bg-paper border border-[#1E2A38] p-2 font-bold rounded-xs"
                />
                {zoneLookupLoading && (
                  <div className="text-[10px] text-slate-500 font-mono flex items-center mt-1">
                    <RefreshCw size={10} className="animate-spin mr-1 text-[#C68A2E]" /> Resolving state locations...
                  </div>
                )}
                {!zoneLookupLoading && zoneLookupResults.length > 0 && (
                  <div className="mt-2 space-y-1.5 bg-[#E6DEC8]/50 p-2.5 rounded border border-[#1E2A38]/20 font-mono">
                    <div className="font-bold text-[#1E2A38] uppercase text-[9px]">State Lookup Resolution:</div>
                    <div className="flex flex-wrap gap-1.5">
                      {zoneLookupResults.map(res => (
                        <span
                          key={res.pincode}
                          className={`px-1.5 py-0.5 rounded-xs border text-[10px] font-bold ${
                            res.isValid
                              ? 'bg-[#2E6B4F]/10 border-[#2E6B4F] text-[#2E6B4F]'
                              : 'bg-amber-100 border-amber-400 text-amber-800'
                          }`}
                        >
                          {res.pincode} → {res.isValid ? `${res.state}${res.district ? ` (${res.district})` : ''}` : 'Could not verify pincode'}
                        </span>
                      ))}
                    </div>

                    {/* Multi-state warning highlight */}
                    {(() => {
                      const validStates = Array.from(
                        new Set(zoneLookupResults.filter(r => r.isValid && r.state).map(r => r.state!))
                      );
                      if (validStates.length > 1) {
                        return (
                          <div className="mt-1.5 bg-[#B4432E]/10 border border-[#B4432E] text-[#B4432E] p-1.5 rounded-xs flex items-center font-bold text-[10px]">
                            <AlertTriangle size={12} className="mr-1 shrink-0" />
                            Note: Pincodes in this zone span multiple states ({validStates.join(', ')})
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="w-full bg-[#1E2A38] text-paper font-bold uppercase py-2.5 rounded-xs hover:bg-slate-800"
              >
                Create Zone
              </button>
            </form>

            <form onSubmit={handleMapPincode} className="bg-[#F8F5EE] border-2 border-[#1E2A38] p-6 rounded-xs shadow-md space-y-4 font-mono text-xs">
              <div className="font-stencil text-lg uppercase text-[#1E2A38] border-b border-[#1E2A38]/20 pb-2">
                Map Pincode to Zone
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold uppercase mb-1">Pincode</label>
                  <input
                    type="text"
                    value={mapPincode}
                    onChange={e => setMapPincode(e.target.value)}
                    placeholder="110099"
                    className="w-full bg-paper border border-[#1E2A38] p-2 font-bold rounded-xs"
                    required
                  />
                  {singleMapLoading && (
                    <div className="text-[10px] text-slate-500 font-mono flex items-center mt-1">
                      <RefreshCw size={10} className="animate-spin mr-1 text-[#C68A2E]" /> Resolving state...
                    </div>
                  )}
                  {!singleMapLoading && singleMapLookup && (
                    <div className="mt-1 font-mono text-[10px]">
                      {singleMapLookup.isValid ? (
                        <span className="inline-block bg-[#2E6B4F]/10 border border-[#2E6B4F] text-[#2E6B4F] px-2 py-0.5 rounded-xs font-bold">
                          Detected: {singleMapLookup.state}{singleMapLookup.district ? ` (${singleMapLookup.district})` : ''}
                        </span>
                      ) : (
                        <span className="inline-block bg-amber-100 border border-amber-400 text-amber-800 px-2 py-0.5 rounded-xs font-bold">
                          Could not verify this pincode
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block font-bold uppercase mb-1">Target Zone</label>
                  <select
                    value={mapZoneId}
                    onChange={e => setMapZoneId(e.target.value)}
                    className="w-full bg-paper border border-[#1E2A38] p-2 font-bold rounded-xs"
                  >
                    {zones.map(z => (
                      <option key={z.id} value={z.id}>
                        {z.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-[#2E6B4F] text-paper font-bold uppercase py-2.5 rounded-xs hover:bg-emerald-800"
              >
                Map Pincode
              </button>
            </form>
          </div>

          <div className="lg:col-span-6 space-y-4">
            <div className="font-stencil text-lg uppercase text-[#1E2A38]">Configured Zones Roster</div>
            <div className="space-y-3 font-mono text-xs">
              {zones.map(zone => (
                <div key={zone.id} className="bg-[#F8F5EE] border-2 border-[#1E2A38] p-4 rounded-xs shadow-sm">
                  <div className="font-bold text-base text-[#1E2A38] mb-1">{zone.name}</div>
                  <div className="text-slate-600 mb-2">Zone ID: {zone.id}</div>
                  <div className="flex flex-wrap gap-1">
                    <span className="font-bold text-[10px] text-slate-500 uppercase">Mapped PINs:</span>
                    {zone.pincodeMaps?.map((pm: any) => (
                      <span key={pm.pincode} className="bg-[#E6DEC8] border border-[#1E2A38]/30 px-1.5 py-0.5 text-[10px] font-bold rounded-xs">
                        {pm.pincode}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: RATE CARDS */}
      {activeTab === 'rates' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 font-mono text-xs">
          <div className="lg:col-span-5">
            <form onSubmit={handleSaveRateCard} className="bg-[#F8F5EE] border-2 border-[#1E2A38] p-6 rounded-xs shadow-md space-y-4">
              <div className="font-stencil text-lg uppercase text-[#1E2A38] border-b border-[#1E2A38]/20 pb-2">
                Create / Update Rate Card
              </div>

              <div>
                <label className="block font-bold uppercase mb-1">From Origin Zone</label>
                <select
                  value={rcFromZoneId}
                  onChange={e => setRcFromZoneId(e.target.value)}
                  className="w-full bg-paper border border-[#1E2A38] p-2 font-bold rounded-xs"
                >
                  {zones.map(z => (
                    <option key={z.id} value={z.id}>
                      {z.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold uppercase mb-1">To Destination Zone</label>
                <select
                  value={rcToZoneId}
                  onChange={e => setRcToZoneId(e.target.value)}
                  className="w-full bg-paper border border-[#1E2A38] p-2 font-bold rounded-xs"
                >
                  {zones.map(z => (
                    <option key={z.id} value={z.id}>
                      {z.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold uppercase mb-1">Order Category</label>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setRcOrderType('B2C')}
                    className={`flex-1 py-2 border border-[#1E2A38] rounded-xs font-bold ${
                      rcOrderType === 'B2C' ? 'bg-[#1E2A38] text-paper' : 'bg-paper text-[#1E2A38]'
                    }`}
                  >
                    B2C
                  </button>
                  <button
                    type="button"
                    onClick={() => setRcOrderType('B2B')}
                    className={`flex-1 py-2 border border-[#1E2A38] rounded-xs font-bold ${
                      rcOrderType === 'B2B' ? 'bg-[#1E2A38] text-paper' : 'bg-paper text-[#1E2A38]'
                    }`}
                  >
                    B2B
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold uppercase mb-1">Base Rate (₹)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={rcBaseRate}
                    onChange={e => setRcBaseRate(Number(e.target.value))}
                    className="w-full bg-paper border border-[#1E2A38] p-2 font-bold rounded-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold uppercase mb-1">Per Kg Rate (₹)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={rcPerKgRate}
                    onChange={e => setRcPerKgRate(Number(e.target.value))}
                    className="w-full bg-paper border border-[#1E2A38] p-2 font-bold rounded-xs"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-[#1E2A38] text-paper font-bold uppercase py-2.5 rounded-xs hover:bg-slate-800"
              >
                Save Rate Card
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 space-y-4">
            <div className="font-stencil text-lg uppercase text-[#1E2A38]">Configured Rate Matrix</div>
            <div className="bg-[#F8F5EE] border-2 border-[#1E2A38] rounded-xs overflow-x-auto shadow-md">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#1E2A38] text-paper uppercase border-b-2 border-[#1E2A38]">
                    <th className="p-3">Route Pair</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Base Flat</th>
                    <th className="p-3">Per KG</th>
                    <th className="p-3">Intra Zone?</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E2A38]/20">
                  {rateCards.map(rc => (
                    <tr key={rc.id} className="hover:bg-[#E6DEC8]/40">
                      <td className="p-3 font-bold text-[#1E2A38]">
                        {rc.fromZone?.name} → {rc.toZone?.name}
                      </td>
                      <td className="p-3 uppercase font-bold text-slate-700">{rc.orderType}</td>
                      <td className="p-3 font-bold">₹{Number(rc.baseRate).toFixed(2)}</td>
                      <td className="p-3 font-bold text-[#2E6B4F]">₹{Number(rc.perKgRate).toFixed(2)}</td>
                      <td className="p-3 font-bold">{rc.isIntraZone ? 'YES' : 'NO'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: COD SURCHARGE CONFIG */}
      {activeTab === 'cod' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 font-mono text-xs">
          <div className="bg-[#F8F5EE] border-2 border-[#1E2A38] p-6 rounded-xs shadow-md space-y-4">
            <div className="font-stencil text-lg uppercase text-[#1E2A38] border-b border-[#1E2A38]/20 pb-2">
              B2C Retail COD Config
            </div>

            <div>
              <label className="block font-bold uppercase mb-1">Flat Fee (₹)</label>
              <input
                type="number"
                step="0.5"
                value={b2cFlat}
                onChange={e => setB2cFlat(Number(e.target.value))}
                className="w-full bg-paper border border-[#1E2A38] p-2 font-bold rounded-xs"
              />
            </div>

            <div>
              <label className="block font-bold uppercase mb-1">Percentage Of Bill (%)</label>
              <input
                type="number"
                step="0.1"
                value={b2cPercent}
                onChange={e => setB2cPercent(Number(e.target.value))}
                className="w-full bg-paper border border-[#1E2A38] p-2 font-bold rounded-xs"
              />
            </div>

            <button
              onClick={() => handleSaveCodConfig('B2C')}
              className="w-full bg-[#1E2A38] text-paper font-bold uppercase py-2.5 rounded-xs hover:bg-slate-800"
            >
              Update B2C COD Config
            </button>
          </div>

          <div className="bg-[#F8F5EE] border-2 border-[#1E2A38] p-6 rounded-xs shadow-md space-y-4">
            <div className="font-stencil text-lg uppercase text-[#1E2A38] border-b border-[#1E2A38]/20 pb-2">
              B2B Commercial COD Config
            </div>

            <div>
              <label className="block font-bold uppercase mb-1">Flat Fee (₹)</label>
              <input
                type="number"
                step="0.5"
                value={b2bFlat}
                onChange={e => setB2bFlat(Number(e.target.value))}
                className="w-full bg-paper border border-[#1E2A38] p-2 font-bold rounded-xs"
              />
            </div>

            <div>
              <label className="block font-bold uppercase mb-1">Percentage Of Bill (%)</label>
              <input
                type="number"
                step="0.1"
                value={b2bPercent}
                onChange={e => setB2bPercent(Number(e.target.value))}
                className="w-full bg-paper border border-[#1E2A38] p-2 font-bold rounded-xs"
              />
            </div>

            <button
              onClick={() => handleSaveCodConfig('B2B')}
              className="w-full bg-[#1E2A38] text-paper font-bold uppercase py-2.5 rounded-xs hover:bg-slate-800"
            >
              Update B2B COD Config
            </button>
          </div>
        </div>
      )}

      {/* TAB 5: AGENTS ROSTER & RADAR MAP */}
      {activeTab === 'agents' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 font-mono text-xs">
          <div className="lg:col-span-5">
            <form onSubmit={handleCreateAgent} className="bg-[#F8F5EE] border-2 border-[#1E2A38] p-6 rounded-xs shadow-md space-y-4">
              <div className="font-stencil text-lg uppercase text-[#1E2A38] border-b border-[#1E2A38]/20 pb-2 flex items-center">
                <UserPlus size={18} className="mr-2" /> Register Delivery Agent
              </div>

              <div>
                <label className="block font-bold uppercase mb-1">Agent Name</label>
                <input
                  type="text"
                  value={newAgentName}
                  onChange={e => setNewAgentName(e.target.value)}
                  placeholder="Agent Name"
                  className="w-full bg-paper border border-[#1E2A38] p-2 font-bold rounded-xs"
                  required
                />
              </div>

              <div>
                <label className="block font-bold uppercase mb-1">Email</label>
                <input
                  type="email"
                  value={newAgentEmail}
                  onChange={e => setNewAgentEmail(e.target.value)}
                  placeholder="agent@delivery.com"
                  className="w-full bg-paper border border-[#1E2A38] p-2 font-bold rounded-xs"
                  required
                />
              </div>

              <div>
                <label className="block font-bold uppercase mb-1">Initial Password</label>
                <input
                  type="password"
                  value={newAgentPass}
                  onChange={e => setNewAgentPass(e.target.value)}
                  className="w-full bg-paper border border-[#1E2A38] p-2 font-bold rounded-xs"
                  required
                />
              </div>

              <div>
                <label className="block font-bold uppercase mb-1">Assigned Base Zone</label>
                <select
                  value={newAgentZoneId}
                  onChange={e => setNewAgentZoneId(e.target.value)}
                  className="w-full bg-paper border border-[#1E2A38] p-2 font-bold rounded-xs"
                >
                  {zones.map(z => (
                    <option key={z.id} value={z.id}>
                      {z.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="w-full bg-[#1E2A38] text-paper font-bold uppercase py-2.5 rounded-xs hover:bg-slate-800"
              >
                Register Agent Profile
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 space-y-4">
            <div className="font-stencil text-lg uppercase text-[#1E2A38]">Field Agent Radar Roster</div>
            <div className="space-y-3">
              {agents.map(agent => {
                const isAvailable = agent.availability === 'AVAILABLE';
                return (
                  <div key={agent.id} className="bg-[#F8F5EE] border-2 border-[#1E2A38] p-4 rounded-xs shadow-sm flex items-center justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        {/* Radar Pulse Indicator */}
                        <div className="relative flex items-center justify-center w-4 h-4">
                          <div className={`w-3 h-3 rounded-full ${isAvailable ? 'bg-[#2E6B4F]' : 'bg-[#B4432E]'}`} />
                          {isAvailable && (
                            <div className="absolute w-6 h-6 rounded-full bg-[#2E6B4F]/40 animate-radar-pulse" />
                          )}
                        </div>
                        <span className="font-bold text-base text-[#1E2A38]">{agent.user?.name}</span>
                      </div>
                      <div className="text-slate-600 mt-1">Zone: {agent.zone?.name}</div>
                      <div className="text-[10px] text-slate-500">
                        GPS: {agent.currentLat || 'N/A'}, {agent.currentLng || 'N/A'}
                      </div>
                    </div>

                    <div className="text-right">
                      <span className={`px-3 py-1 text-xs font-bold uppercase rounded-xs border border-[#1E2A38] ${
                        isAvailable ? 'bg-[#2E6B4F] text-paper' : 'bg-[#B4432E] text-paper'
                      }`}>
                        {agent.availability}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: NOTIFICATION AUDIT LOG */}
      {activeTab === 'notifications' && (
        <div className="space-y-4 font-mono text-xs">
          <div className="font-stencil text-lg uppercase text-[#1E2A38]">System Notification Audit Trail</div>
          <div className="bg-[#F8F5EE] border-2 border-[#1E2A38] rounded-xs overflow-x-auto shadow-md">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#1E2A38] text-paper uppercase border-b-2 border-[#1E2A38]">
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Channel</th>
                  <th className="p-3">Recipient</th>
                  <th className="p-3">Subject / Event</th>
                  <th className="p-3">Delivery Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E2A38]/20">
                {notificationLogs.map(log => (
                  <tr key={log.id} className="hover:bg-[#E6DEC8]/40">
                    <td className="p-3">{new Date(log.createdAt).toLocaleString()}</td>
                    <td className="p-3 uppercase font-bold text-[#1E2A38]">{log.channel}</td>
                    <td className="p-3 font-bold">{log.toAddress}</td>
                    <td className="p-3">{log.subject}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-xs font-bold text-[10px] ${
                        log.status === 'SENT' ? 'bg-[#2E6B4F] text-paper' : 'bg-[#B4432E] text-paper'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
