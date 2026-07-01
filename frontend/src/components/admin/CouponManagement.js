import React, { useState, useEffect } from 'react';
import { couponAPI, propertyAPI } from '../../services/api';
import { Plus, Tag, Search, RefreshCw, CheckCircle, Percent, XCircle, Filter, X } from 'lucide-react';

const CouponManagement = () => {
  const [coupons, setCoupons] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  
  const [formData, setFormData] = useState({
    code: '',
    discount_type: 'percentage',
    discount_value: '',
    coupon_type: 'booking',
    property_id: '',
    plan_type: '',
    property_category: '',
    bhk_type: '',
    sqft_range: '',
  });

  const filteredCoupons = coupons.filter(c => {
    const matchesSearch = c.code.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (c.property_id && c.property_id.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          (c.property_category && c.property_category.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          (c.plan_type && c.plan_type.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType = filterType === 'all' ? true : c.coupon_type === filterType;
    const matchesStatus = filterStatus === 'all' ? true : (filterStatus === 'active' ? c.is_active : !c.is_active);
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const couponScopeText = (coupon) => {
    if (coupon.property_id) return `Property: ${coupon.property_id.substring(0, 8)}`;
    const scope = [
      coupon.property_category && coupon.property_category.replace('_', ' '),
      coupon.plan_type,
      coupon.bhk_type,
      coupon.sqft_range && `${coupon.sqft_range} sqft`,
    ].filter(Boolean);
    return scope.length ? scope.join(' · ') : 'Global';
  };

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const res = await couponAPI.listCoupons();
      setCoupons(res.data.coupons || []);
    } catch (err) {
      console.error('Failed to fetch coupons', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProperties = async () => {
    try {
      const res = await propertyAPI.searchProperties({ limit: 1000 });
      setProperties(res.data.properties || []);
    } catch (err) {
      console.error('Failed to fetch properties', err);
    }
  };

  useEffect(() => {
    fetchCoupons();
    fetchProperties();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        discount_value: parseFloat(formData.discount_value),
        property_id: formData.property_id || null,
        plan_type: formData.plan_type || null,
        property_category: formData.property_category || null,
        bhk_type: formData.bhk_type || null,
        sqft_range: formData.sqft_range || null,
      };
      await couponAPI.createCoupon(payload);
      setShowForm(false);
      setFormData({
        code: '',
        discount_type: 'percentage',
        discount_value: '',
        coupon_type: 'booking',
        property_id: '',
        plan_type: '',
        property_category: '',
        bhk_type: '',
        sqft_range: '',
      });
      fetchCoupons();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to create coupon');
    }
  };

  const handleToggleCoupon = async (couponId) => {
    try {
      await couponAPI.toggleCouponStatus(couponId);
      fetchCoupons();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to toggle coupon status');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-charcoal">Coupon Codes</h2>
          <p className="text-charcoal-muted">Create and manage discount codes for bookings and subscriptions.</p>
        </div>
        <button 
          onClick={() => setShowForm(true)}
          className="btn-premium flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>Create Coupon</span>
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-charcoal/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 max-w-xl w-full shadow-premium animate-slide-up relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-terracotta/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
            
            <div className="flex justify-between items-center mb-8 relative z-10">
              <div>
                <h3 className="text-2xl font-bold tracking-tight text-charcoal tracking-tight">New Coupon Code</h3>
                <p className="text-sm text-charcoal-muted mt-1">Configure your discount rules below.</p>
              </div>
              <button onClick={() => setShowForm(false)} className="w-10 h-10 bg-gray-50 text-charcoal rounded-full flex items-center justify-center hover:bg-sand-200 transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6 relative z-10">
              
              <div className="space-y-2">
                <label className="text-xs font-bold tracking-tight text-charcoal-muted uppercase tracking-widest block mb-1">Coupon Code</label>
                <input 
                  type="text" 
                  required
                  value={formData.code}
                  onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})}
                  className="w-full border-2 border-gray-100 rounded-xl px-4 py-2 focus:border-terracotta outline-none transition uppercase"
                  placeholder="e.g. SUMMER2026"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold tracking-tight text-charcoal-muted uppercase tracking-widest block mb-1">Applied To</label>
                <select 
                  value={formData.coupon_type}
                  onChange={e => setFormData({
                    ...formData,
                    coupon_type: e.target.value,
                    property_id: '',
                    plan_type: '',
                    property_category: '',
                    bhk_type: '',
                    sqft_range: '',
                  })}
                  className="w-full border-2 border-gray-100 rounded-xl px-4 py-2 focus:border-terracotta outline-none transition"
                >
                  <option value="booking">Booking</option>
                  <option value="subscription">Subscription</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold tracking-tight text-charcoal-muted uppercase tracking-widest block mb-1">Discount Type</label>
                <select 
                  value={formData.discount_type}
                  onChange={e => setFormData({...formData, discount_type: e.target.value})}
                  className="w-full border-2 border-gray-100 rounded-xl px-4 py-2 focus:border-terracotta outline-none transition"
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount (₹)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold tracking-tight text-charcoal-muted uppercase tracking-widest block mb-1">Discount Value</label>
                <input 
                  type="number" 
                  required
                  min="1"
                  step="0.01"
                  value={formData.discount_value}
                  onChange={e => setFormData({...formData, discount_value: e.target.value})}
                  className="w-full border-2 border-gray-100 rounded-xl px-4 py-2 focus:border-terracotta outline-none transition"
                  placeholder={formData.discount_type === 'percentage' ? "e.g. 10" : "e.g. 500"}
                />
              </div>

              {formData.coupon_type === 'booking' && (
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-bold tracking-tight text-charcoal-muted uppercase tracking-widest block mb-1">Specific Property (Optional)</label>
                  <select 
                    value={formData.property_id}
                    onChange={e => setFormData({...formData, property_id: e.target.value})}
                    className="w-full border-2 border-gray-100 rounded-xl px-4 py-2 focus:border-terracotta outline-none transition"
                  >
                    <option value="">-- Apply to All Properties --</option>
                    {properties.map(p => (
                      <option key={p.property_id} value={p.property_id}>
                        {p.title} ({p.property_id.substring(0, 8)})
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-charcoal-muted mt-1 uppercase tracking-wider">If selected, this coupon will only work for bookings on this specific property.</p>
                </div>
              )}

              {formData.coupon_type === 'subscription' && (
                <>
                  <div className="space-y-2">
                    <label className="text-xs font-bold tracking-tight text-charcoal-muted uppercase tracking-widest block mb-1">Property Type</label>
                    <select
                      value={formData.property_category}
                      onChange={e => setFormData({...formData, property_category: e.target.value})}
                      className="w-full border-2 border-gray-100 rounded-xl px-4 py-2 focus:border-terracotta outline-none transition"
                    >
                      <option value="">All Property Types</option>
                      <option value="residential">Residential</option>
                      <option value="commercial">Commercial</option>
                      <option value="event_venue">Event Venue</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold tracking-tight text-charcoal-muted uppercase tracking-widest block mb-1">Subscription Plan Type</label>
                    <select
                      value={formData.plan_type}
                      onChange={e => setFormData({...formData, plan_type: e.target.value})}
                      className="w-full border-2 border-gray-100 rounded-xl px-4 py-2 focus:border-terracotta outline-none transition"
                    >
                      <option value="">All Plans</option>
                      <option value="studio">Studio</option>
                      <option value="1bhk">1 BHK</option>
                      <option value="2bhk">2 BHK</option>
                      <option value="3bhk">3 BHK</option>
                      <option value="4bhk_plus">4 BHK+</option>
                      <option value="commercial">Commercial</option>
                      <option value="banquet">Event/Banquet</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold tracking-tight text-charcoal-muted uppercase tracking-widest block mb-1">BHK / Size Key</label>
                    <input
                      type="text"
                      value={formData.bhk_type}
                      onChange={e => setFormData({...formData, bhk_type: e.target.value})}
                      className="w-full border-2 border-gray-100 rounded-xl px-4 py-2 focus:border-terracotta outline-none transition"
                      placeholder="e.g. 2bhk, small, large_event"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold tracking-tight text-charcoal-muted uppercase tracking-widest block mb-1">Sq.ft Range</label>
                    <input
                      type="text"
                      value={formData.sqft_range}
                      onChange={e => setFormData({...formData, sqft_range: e.target.value})}
                      className="w-full border-2 border-gray-100 rounded-xl px-4 py-2 focus:border-terracotta outline-none transition"
                      placeholder="e.g. <500, 500-2000, 5000+"
                    />
                  </div>
                </>
              )}

              <div className="md:col-span-2 flex space-x-4 pt-6 border-t border-gray-100 mt-4">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-4 font-bold text-charcoal-muted bg-stone hover:bg-gray-50 rounded-xl transition">
                  Cancel
                </button>
                <button type="submit" className="flex-1 btn-premium py-4 shadow-premium hover:-translate-y-1 transition-all duration-300">
                  Generate Coupon
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
        {/* Search and Filter Bar */}
        <div className="p-5 border-b border-gray-100 bg-stone flex flex-col md:flex-row items-center gap-4">
          <div className="flex-1 relative w-full">
            <Search className="w-5 h-5 text-charcoal-muted absolute left-4 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              placeholder="Search coupons by code or property ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-gray-100 outline-none focus:border-terracotta focus:ring-2 focus:ring-terracotta/20 text-sm font-bold text-charcoal placeholder:font-semibold placeholder:text-charcoal-light py-3 pl-11 pr-4 rounded-xl transition-all"
            />
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="flex items-center bg-white border border-gray-100 rounded-xl px-3 py-1 text-sm font-bold text-charcoal focus-within:border-terracotta focus-within:ring-2 focus-within:ring-terracotta/20 transition-all">
              <Filter className="w-4 h-4 text-charcoal-muted mr-2" />
              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
                className="bg-transparent border-none outline-none py-2 cursor-pointer font-bold"
              >
                <option value="all">All Types</option>
                <option value="booking">Bookings</option>
                <option value="subscription">Subscriptions</option>
              </select>
            </div>
            <div className="flex items-center bg-white border border-gray-100 rounded-xl px-3 py-1 text-sm font-bold text-charcoal focus-within:border-terracotta focus-within:ring-2 focus-within:ring-terracotta/20 transition-all">
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="bg-transparent border-none outline-none py-2 cursor-pointer font-bold"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col justify-center items-center py-20 text-charcoal-muted">
             <RefreshCw className="w-8 h-8 animate-spin mb-4 text-terracotta" />
             <p className="font-medium">Loading coupons...</p>
          </div>
        ) : filteredCoupons.length === 0 ? (
          <div className="text-center py-20">
            <Tag className="w-12 h-12 text-sand-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-charcoal mb-2">No Coupons Found</h3>
            <p className="text-charcoal-muted">Create your first discount coupon or try a different search.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-stone border-b border-gray-100">
                  <th className="px-6 py-4 text-xs font-bold tracking-tight text-charcoal uppercase tracking-widest">Code</th>
                  <th className="px-6 py-4 text-xs font-bold tracking-tight text-charcoal uppercase tracking-widest">Type</th>
                  <th className="px-6 py-4 text-xs font-bold tracking-tight text-charcoal uppercase tracking-widest">Discount</th>
                  <th className="px-6 py-4 text-xs font-bold tracking-tight text-charcoal uppercase tracking-widest">Scope</th>
                  <th className="px-6 py-4 text-xs font-bold tracking-tight text-charcoal uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-xs font-bold tracking-tight text-charcoal uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand-100">
                {filteredCoupons.map((coupon) => (
                  <tr key={coupon.coupon_id} className="hover:bg-stone/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <Tag className="w-4 h-4 text-terracotta" />
                        <span className="font-bold tracking-tight text-charcoal">{coupon.code}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="capitalize font-medium text-charcoal-light">
                        {coupon.coupon_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-charcoal">
                      {coupon.discount_type === 'percentage' ? (
                        <span className="flex items-center"><Percent className="w-3 h-3 mr-1" />{coupon.discount_value}%</span>
                      ) : (
                        <span>₹{coupon.discount_value}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {coupon.property_id || coupon.property_category || coupon.plan_type || coupon.bhk_type || coupon.sqft_range ? (
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-sage/10 text-sage">
                          {couponScopeText(coupon)}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-sand-200 text-charcoal">
                          Global
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {coupon.is_active ? (
                        <span className="inline-flex items-center text-green-600 font-bold text-sm">
                          <CheckCircle className="w-4 h-4 mr-1" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-red-500 font-bold text-sm">
                          <XCircle className="w-4 h-4 mr-1" /> Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleToggleCoupon(coupon.coupon_id)}
                        className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition duration-300 ${
                          coupon.is_active
                            ? 'bg-red-50 hover:bg-red-100 text-red-600'
                            : 'bg-green-50 hover:bg-green-100 text-green-600'
                        }`}
                      >
                        {coupon.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default CouponManagement;
