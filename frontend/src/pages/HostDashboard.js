import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { propertyAPI, subscriptionAPI, getImageUrl, accountAPI, uploadAPI } from '../services/api';
import { Building2, Plus, Calendar, IndianRupee, Eye, MapPin, Lock, Check, Upload, FileText, CheckCircle2, AlertCircle, Edit3, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { NotificationBell } from '../components/NotificationCenter';

const HostDashboard = () => {
  const navigate = useNavigate();
  const { user, logout, refreshUser } = useAuth();
  const [properties, setProperties] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [plans, setPlans] = useState([]);
  const [purchasing, setPurchasing] = useState(false);
  const [paymentConfig, setPaymentConfig] = useState(null);
  const [payouts, setPayouts] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, property: null, reason: '', deleting: false });
  const itemsPerPage = 5;

  // Verification & Agreement Modal States
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [showAgreementModal, setShowAgreementModal] = useState(false);
  const [verificationSubmitting, setVerificationSubmitting] = useState(false);
  
  // KYC Documents Form State
  const [aadharCard, setAadharCard] = useState('');
  const [propertyProof, setPropertyProof] = useState('');
  const [cancelledCheque, setCancelledCheque] = useState('');
  const [gstCertificate, setGstCertificate] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [agreementOwnerName, setAgreementOwnerName] = useState('');
  const [agreementOwnerAddress, setAgreementOwnerAddress] = useState('');
  const [agreementSignature, setAgreementSignature] = useState('');
  
  // File uploading states
  const [uploadingDocs, setUploadingDocs] = useState({
    aadhar: false,
    property: false,
    cheque: false,
    gst: false
  });

  // Canvas drawing states
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [penWidth, setPenWidth] = useState(3);
  const [canvasHeight, setCanvasHeight] = useState(120);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [propRes, subRes, plansRes, configRes, payoutsRes] = await Promise.all([
        propertyAPI.getHostProperties(),
        subscriptionAPI.getUserSubscriptions(),
        subscriptionAPI.getPlans(),
        subscriptionAPI.getPaymentConfig(),
        accountAPI.listMyPayouts().catch(() => ({ data: { payouts: [] } }))
      ]);
      setProperties(propRes.data.properties || []);
      setSubscriptions(subRes.data.subscriptions || []);
      setPlans(plansRes.data.plans || []);
      setPaymentConfig(configRes.data);
      setPayouts(payoutsRes.data.payouts || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get clean filename from uploaded document URL
  const getFileName = (url) => {
    if (!url) return '';
    try {
      const decoded = decodeURIComponent(url);
      const parts = decoded.split('/');
      const filename = parts[parts.length - 1];
      return filename.split('?')[0];
    } catch (e) {
      return 'document_file';
    }
  };

  // Doc Upload Helper
  const handleDocUpload = async (file, docType) => {
    if (!file) return;
    setUploadingDocs(prev => ({ ...prev, [docType]: true }));
    try {
      const res = await uploadAPI.uploadImage(file);
      if (docType === 'aadhar') setAadharCard(res.url);
      else if (docType === 'property') setPropertyProof(res.url);
      else if (docType === 'cheque') setCancelledCheque(res.url);
      else if (docType === 'gst') setGstCertificate(res.url);
    } catch (err) {
      alert(`Failed to upload ${docType}: ` + (err.response?.data?.detail || err.message));
    } finally {
      setUploadingDocs(prev => ({ ...prev, [docType]: false }));
    }
  };

  // Canvas signature helpers
  const startDrawing = (e) => {
    if (e.cancelable) {
      e.preventDefault();
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.lineWidth = penWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1F2937'; // charcoal-ish color
    
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    
    if (clientX === undefined || clientY === undefined) return;
    
    const x = (clientX - rect.left) * (canvas.width / rect.width);
    const y = (clientY - rect.top) * (canvas.height / rect.height);
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    if (e.cancelable) {
      e.preventDefault();
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.lineWidth = penWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1F2937';
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    
    if (clientX === undefined || clientY === undefined) return;
    
    const x = (clientX - rect.left) * (canvas.width / rect.width);
    const y = (clientY - rect.top) * (canvas.height / rect.height);
    
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = (e) => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleSaveSignatureAndAgreement = async () => {
    if (!agreementOwnerName.trim()) {
      alert('Please enter Owner Name');
      return;
    }
    if (!agreementOwnerAddress.trim()) {
      alert('Please enter Owner Address');
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Check if canvas is blank
    const blank = document.createElement('canvas');
    blank.width = canvas.width;
    blank.height = canvas.height;
    if (canvas.toDataURL() === blank.toDataURL()) {
      alert('Please draw your signature before saving.');
      return;
    }

    const dataUrl = canvas.toDataURL('image/png');
    
    try {
      // Convert base64 dataUrl to File
      const arr = dataUrl.split(',');
      const mime = arr[0].match(/:(.*?);/)[1];
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      const sigFile = new File([u8arr], 'signature.png', { type: mime });
      
      setUploadingDocs(prev => ({ ...prev, gst: true })); // temp loading state
      const res = await uploadAPI.uploadImage(sigFile);
      setAgreementSignature(res.url);
      setShowAgreementModal(false);
      alert('Agreement signed successfully!');
    } catch (err) {
      alert('Failed to save signature: ' + err.message);
    } finally {
      setUploadingDocs(prev => ({ ...prev, gst: false }));
    }
  };

  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    if (!aadharCard || !propertyProof || !cancelledCheque || !agreementSignature) {
      alert('Please upload all mandatory documents and sign the agreement.');
      return;
    }
    setVerificationSubmitting(true);
    try {
      await accountAPI.submitHostVerification({
        aadhar_card: aadharCard,
        property_proof: propertyProof,
        cancelled_cheque: cancelledCheque,
        gst_certificate: gstCertificate || null,
        gst_number: gstNumber || null,
        agreement_owner_name: agreementOwnerName,
        agreement_owner_address: agreementOwnerAddress,
        agreement_signature: agreementSignature
      });
      
      alert('Verification documents submitted successfully for Admin review!');
      setShowVerificationModal(false);
      if (refreshUser) {
        await refreshUser();
      }
    } catch (error) {
      alert('Verification submission failed: ' + (error.response?.data?.detail || error.message));
    } finally {
      setVerificationSubmitting(false);
    }
  };

  const unusedSubsCount = subscriptions.filter(s => !s.property_id && s.status === 'active').length;
  const isLocked = properties.length >= 1 && unusedSubsCount === 0;

  const handleListPropertyClick = () => {
    if (!user?.kyc_status || user.kyc_status === 'unverified' || user.kyc_status === 'rejected') {
      setShowVerificationModal(true);
    } else if (isLocked) {
      setShowPurchaseModal(true);
    } else {
      navigate('/host/list-property');
    }
  };

  const handlePurchaseSubscription = async (plan) => {
    setPurchasing(true);
    try {
      const subRes = await subscriptionAPI.subscribe({
        plan_id: plan.plan_id,
        billing_cycle: 'monthly'
      });
      const subOrder = subRes.data;

      if (paymentConfig?.is_mock) {
        // Mock payment confirmation
        await subscriptionAPI.mockPaySubscription(subOrder.subscription_id, subOrder.razorpay_order_id);
        alert('Subscription purchased successfully! (Demo Mode)');
        setShowPurchaseModal(false);
        fetchData();
      } else {
        if (!window.Razorpay) {
          alert('Razorpay SDK failed to load. Please check your internet connection.');
          return;
        }
        const options = {
          key: paymentConfig.key_id,
          amount: subOrder.amount,
          currency: 'INR',
          name: 'X-Space360',
          description: `Plan: ${plan.plan_name} (${plan.plan_type})`,
          order_id: subOrder.razorpay_order_id,
          prefill: {
            name: user?.full_name || '',
            email: user?.email || '',
          },
          handler: async (response) => {
            try {
              await subscriptionAPI.confirmSubscription({
                subscription_id: subOrder.subscription_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature
              });
              alert('Subscription activated successfully!');
              setShowPurchaseModal(false);
              fetchData();
            } catch (err) {
              alert('Payment confirmation failed: ' + (err.response?.data?.detail || err.message));
            }
          },
          theme: { color: '#C05C4F' }
        };
        const rzp = new window.Razorpay(options);
        rzp.open();
      }
    } catch (error) {
      alert('Subscription failed: ' + (error.response?.data?.detail || error.message));
    } finally {
      setPurchasing(false);
    }
  };

  const openDeleteModal = (property) => {
    setDeleteModal({ isOpen: true, property, reason: '', deleting: false });
  };

  const closeDeleteModal = () => {
    if (deleteModal.deleting) return;
    setDeleteModal({ isOpen: false, property: null, reason: '', deleting: false });
  };

  const handleDeleteProperty = async () => {
    const property = deleteModal.property;
    const reason = deleteModal.reason.trim();
    if (!property) return;
    if (reason.length < 10) {
      alert('Please enter a deletion reason with at least 10 characters.');
      return;
    }

    setDeleteModal(prev => ({ ...prev, deleting: true }));
    try {
      await propertyAPI.deleteProperty(property.property_id, reason);
      setProperties(prev => prev.filter(p => p.property_id !== property.property_id));
      setDeleteModal({ isOpen: false, property: null, reason: '', deleting: false });
      alert('Property deleted successfully.');
    } catch (error) {
      const method = error.config?.method?.toUpperCase();
      const url = error.config?.url;
      const detail = error.response?.data?.detail || error.message;
      alert(`Delete failed: ${detail}${method && url ? `\n${method} ${url}` : ''}`);
      setDeleteModal(prev => ({ ...prev, deleting: false }));
    }
  };

  const totalEarningsPaise = payouts
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + (p.net_amount || 0), 0);

  const formattedEarnings = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(totalEarningsPaise / 100);

  const stats = [
    { label: 'Total Properties', value: properties.length, icon: Building2 },
    { label: 'Active Listings', value: properties.filter(p => p.status === 'live').length, icon: Eye },
    { label: 'Pending Review', value: properties.filter(p => p.status === 'pending_verification').length, icon: Calendar },
    { label: 'Total Earnings', value: formattedEarnings, icon: IndianRupee },
  ];

  return (
    <div className="min-h-screen bg-sand-50 selection:bg-terracotta selection:text-white">
      <header className="glass px-8 py-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div 
            className="flex items-center space-x-3 cursor-pointer group" 
            onClick={() => navigate('/')}
          >
            <img 
              src="/logo.png" 
              alt="Logo" 
              className="w-10 h-10 object-contain transition-transform duration-300 group-hover:scale-110"
            />
            <h1 className="text-xl font-black text-charcoal tracking-tighter">
              HOST<span className="text-terracotta">CENTRAL</span>
            </h1>
          </div>
          <div className="flex items-center space-x-6">
            <nav className="hidden md:flex items-center space-x-6">
               {[
                 { label: 'CALENDAR', path: '/host/calendar' },
                 { label: 'PAYOUTS', path: '/host/payouts' },
                 { label: 'BOOKINGS', path: '/host/bookings' }
               ].map((item) => (
                 <button
                   key={item.label}
                   onClick={() => navigate(item.path)}
                   className="text-[10px] font-black text-charcoal-muted hover:text-terracotta tracking-[0.2em] transition-colors"
                 >
                   {item.label}
                 </button>
               ))}
            </nav>
            <div className="h-6 w-px bg-sand-200"></div>
            <div className="flex items-center space-x-4">
              <NotificationBell />
              <div className="flex items-center space-x-3 px-3 py-1.5 bg-white border border-sand-200 rounded-full shadow-sm">
                 <div className="w-6 h-6 rounded-full bg-sage flex items-center justify-center text-[10px] font-black text-white">
                    {user?.full_name?.[0]}
                 </div>
                 <span className="text-[10px] font-black text-charcoal uppercase tracking-widest">{user?.full_name?.split(' ')[0]}</span>
              </div>
              <button 
                onClick={() => {
                  navigate('/');
                  setTimeout(() => {
                    logout();
                  }, 50);
                }} 
                className="text-[10px] font-black text-terracotta uppercase tracking-widest hover:underline"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-8 py-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12 animate-fade-in">
          <div>
            <h2 className="text-4xl font-black text-charcoal tracking-tight mb-2" data-testid="dashboard-title">
              Your Portfolio
            </h2>
            <p className="text-charcoal-muted font-bold text-xs uppercase tracking-widest">Manage your properties and track performance</p>
          </div>
          <button
            onClick={handleListPropertyClick}
            className={`flex items-center space-x-3 px-8 py-4 shadow-premium rounded-3xl font-black uppercase tracking-widest text-sm transition-all duration-500 ${
              isLocked 
                ? 'bg-sand-200 text-charcoal-muted hover:bg-sand-300' 
                : 'btn-premium'
            }`}
            data-testid="create-property-btn"
          >
            {isLocked ? <Lock className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
            <span>List New Property</span>
          </button>
        </div>

        {/* Verification Status Banner */}
        {user?.kyc_status === 'pending' && (
          <div className="bg-amber-50 border-l-4 border-amber-500 rounded-2xl p-6 mb-8 shadow-premium animate-fade-in flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-amber-100 p-3 rounded-xl text-amber-600">
                <Lock className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h4 className="font-black text-charcoal tracking-tight text-sm">Host Verification Pending Review</h4>
                <p className="text-xs text-charcoal-muted mt-1">Your documents are under review. You can list new properties, but guest bookings will remain disabled until approved by the administrator.</p>
              </div>
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest bg-amber-500 text-white px-3 py-1.5 rounded-full">Under Review</span>
          </div>
        )}

        {user?.kyc_status === 'rejected' && (
          <div className="bg-red-50 border-l-4 border-red-500 rounded-2xl p-6 mb-8 shadow-premium animate-fade-in flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="bg-red-100 p-3 rounded-xl text-red-600">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-black text-charcoal tracking-tight text-sm">Host Verification Rejected</h4>
                <p className="text-xs text-charcoal-muted mt-1">Rejection reason: <span className="font-bold text-red-700">{user.kyc_remarks || 'Invalid documents.'}</span>. Please update and re-submit your verification documents.</p>
              </div>
            </div>
            <button
              onClick={() => setShowVerificationModal(true)}
              className="px-5 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all self-start sm:self-auto shadow-md"
            >
              Re-submit Documents
            </button>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12 animate-slide-up" data-testid="stats-grid">
          {stats.map((stat, idx) => (
            <div 
              key={idx} 
              className="bg-white rounded-3xl p-8 border border-sand-200 shadow-premium group hover:border-terracotta transition-all duration-500" 
              data-testid={`stat-${idx}`}
            >
              <div className="bg-sand-50 w-12 h-12 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-terracotta/5 transition-colors">
                <stat.icon className="w-6 h-6 text-terracotta" />
              </div>
              <p className="text-4xl font-black text-charcoal tracking-tighter mb-1">{stat.value}</p>
              <p className="text-[10px] font-black text-charcoal-muted uppercase tracking-[0.2em]">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Properties List */}
        <div className="animate-slide-up" style={{ animationDelay: '200ms' }}>
          <div className="flex items-center mb-6">
             <h3 className="text-xl font-black text-charcoal tracking-tight">Active Listings</h3>
             <div className="ml-4 h-px flex-1 bg-sand-200"></div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-4">
               {[1,2,3].map(i => (
                 <div key={i} className="h-32 bg-white rounded-3xl border border-sand-200 animate-pulse"></div>
               ))}
            </div>
          ) : properties.length > 0 ? (
            <div data-testid="properties-list">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[...properties]
                  .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
                  .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                  .map((property) => (
                  <div 
                    key={property.property_id} 
                    className="bg-white rounded-3xl p-5 border border-sand-200 shadow-sm hover:shadow-premium transition-all duration-300 flex flex-col h-full group" 
                    data-testid={`property-${property.property_id}`}
                  >
                    <div className="relative overflow-hidden w-full h-48 rounded-2xl mb-4">
                      <img
                        src={getImageUrl(property.images[0]) || 'https://images.unsplash.com/photo-1503174971373-b1f69850bded'}
                        alt={property.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      />
                      <div className="absolute inset-0 bg-charcoal/10"></div>
                      <span className={`absolute top-3 left-3 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                        property.status === 'live' ? 'bg-sage text-white' :
                        property.status === 'pending_verification' ? 'bg-amber-500 text-white' :
                        'bg-charcoal text-white'
                      }`}>
                        {property.status.replace('_', ' ')}
                      </span>
                    </div>
                    
                    <div className="flex-1">
                      <h3 className="text-lg font-black text-charcoal mb-1 line-clamp-1" title={property.title}>{property.title}</h3>
                      <div className="flex items-center text-charcoal-muted space-x-2 mb-4">
                         <MapPin className="w-3 h-3" />
                         <span className="text-[10px] font-bold uppercase tracking-widest">{property.city}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 mt-auto pt-4 border-t border-sand-100">
                      <button
                        onClick={() => {
                          if (property.status === 'live') {
                            navigate(`/host/calendar?property=${property.property_id}`);
                          } else {
                            alert('This property is not verified yet. Calendar will be available once the property is live.');
                          }
                        }}
                        className={`flex-1 py-3 rounded-xl border-2 border-sand-200 text-[10px] font-black uppercase tracking-widest transition-all ${
                          property.status === 'live' ? 'hover:border-charcoal' : 'opacity-50 cursor-not-allowed'
                        }`}
                        data-testid={`property-calendar-${property.property_id}`}
                      >
                        Calendar
                      </button>
                      <button
                        onClick={() => {
                          if (property.status !== 'live') {
                            navigate(`/host/list-property?edit=${property.property_id}`);
                          } else {
                            navigate(`/property/${property.property_id}`);
                          }
                        }}
                        className="flex-1 py-3 rounded-xl bg-charcoal text-white text-[10px] font-black uppercase tracking-widest hover:bg-terracotta transition-all shadow-premium"
                      >
                        Manage
                      </button>
                    </div>
                    <button
                      onClick={() => openDeleteModal(property)}
                      className="mt-3 w-full py-3 rounded-xl border-2 border-red-100 bg-red-50/60 text-red-600 text-[10px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white hover:border-red-600 transition-all flex items-center justify-center gap-2"
                      data-testid={`property-delete-${property.property_id}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete Property
                    </button>
                  </div>
                ))}
              </div>
              
              {properties.length > itemsPerPage && (
                <div className="mt-8 flex justify-center items-center space-x-4">
                  <button 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="w-10 h-10 rounded-full border border-sand-200 flex items-center justify-center text-charcoal hover:bg-sand-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="text-xs font-black text-charcoal uppercase tracking-widest">
                    Page {currentPage} of {Math.ceil(properties.length / itemsPerPage)}
                  </span>
                  <button 
                    onClick={() => setCurrentPage(p => Math.min(Math.ceil(properties.length / itemsPerPage), p + 1))}
                    disabled={currentPage === Math.ceil(properties.length / itemsPerPage)}
                    className="w-10 h-10 rounded-full border border-sand-200 flex items-center justify-center text-charcoal hover:bg-sand-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-sand-300">
              <Building2 className="w-16 h-16 text-sand-200 mx-auto mb-6" />
              <h4 className="text-xl font-black text-charcoal mb-2">No Properties Listed</h4>
              <p className="text-charcoal-muted font-bold text-xs uppercase tracking-widest mb-8">Ready to start earning? List your first home today.</p>
              <button
                onClick={handleListPropertyClick}
                className="btn-premium px-10 py-4 shadow-premium"
              >
                Get Started
              </button>
            </div>
          )}
        </div>

        {deleteModal.isOpen && (
          <div className="fixed inset-0 bg-charcoal/60 backdrop-blur-md z-[110] flex items-center justify-center p-6">
            <div className="bg-white rounded-[2rem] p-8 max-w-lg w-full shadow-2xl animate-scale-up border border-red-100">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-charcoal tracking-tight mb-1">Delete Property</h3>
                  <p className="text-xs text-charcoal-muted font-bold leading-relaxed">
                    This will permanently remove <span className="text-charcoal">{deleteModal.property?.title}</span> from your listings. A reason is required for audit records.
                  </p>
                </div>
              </div>

              <label className="block text-[10px] font-black uppercase tracking-widest text-charcoal-muted mb-2">
                Reason for deletion
              </label>
              <textarea
                value={deleteModal.reason}
                onChange={(e) => setDeleteModal(prev => ({ ...prev, reason: e.target.value }))}
                rows={4}
                placeholder="Example: Duplicate listing, property no longer available, incorrect details..."
                className="w-full rounded-2xl border-2 border-sand-200 bg-sand-50 px-4 py-3 text-sm font-semibold text-charcoal outline-none focus:border-terracotta transition-colors resize-none"
                disabled={deleteModal.deleting}
              />
              <p className="mt-2 text-[10px] font-bold text-charcoal-muted">
                Minimum 10 characters. Properties with active or confirmed bookings cannot be deleted.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 mt-8">
                <button
                  onClick={closeDeleteModal}
                  disabled={deleteModal.deleting}
                  className="flex-1 py-4 rounded-2xl border-2 border-sand-200 text-charcoal text-[10px] font-black uppercase tracking-widest hover:border-charcoal transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteProperty}
                  disabled={deleteModal.deleting || deleteModal.reason.trim().length < 10}
                  className="flex-1 py-4 rounded-2xl bg-red-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleteModal.deleting ? 'Deleting...' : 'Delete Property'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Purchase Subscription Modal */}
        {showPurchaseModal && (
          <div className="fixed inset-0 bg-charcoal/60 backdrop-blur-md z-[100] flex items-center justify-center p-6 overflow-y-auto">
            <div className="bg-sand-50 rounded-[3rem] p-10 max-w-4xl w-full shadow-2xl animate-scale-up">
               <div className="flex justify-between items-start mb-10">
                  <div>
                    <h3 className="text-3xl font-black text-charcoal tracking-tight mb-2">Subscription Required</h3>
                    <p className="text-charcoal-muted font-bold text-xs uppercase tracking-widest">To list more properties, please purchase a plan</p>
                  </div>
                  <button onClick={() => setShowPurchaseModal(false)} className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-charcoal-muted hover:text-terracotta transition-colors border border-sand-200">
                    <Plus className="w-6 h-6 rotate-45" />
                  </button>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {plans.map(plan => (
                    <div key={plan.plan_id} className="bg-white rounded-[2rem] p-8 border border-sand-200 hover:border-terracotta transition-all group flex flex-col h-full">
                       <span className="inline-block px-3 py-1 bg-sand-50 rounded-full text-[9px] font-black uppercase tracking-widest text-charcoal-muted mb-4 group-hover:bg-terracotta/5 group-hover:text-terracotta transition-colors">
                          {plan.plan_type} Configuration
                       </span>
                       <h4 className="text-xl font-black text-charcoal mb-2">{plan.plan_name}</h4>
                       <h4 className="text-xs font-black text-charcoal-muted mb-4 uppercase tracking-widest opacity-60">{plan.plan_id}</h4>
                       <p className="text-xs text-charcoal-muted font-bold leading-relaxed mb-8 flex-1">{plan.description}</p>
                       <div className="mt-auto pt-6 border-t border-sand-100">
                          <div className="flex items-baseline space-x-1 mb-6">
                             <span className="text-2xl font-black text-charcoal tracking-tighter">₹{plan.price_monthly.toLocaleString('en-IN')}</span>
                             <span className="text-[10px] font-bold text-charcoal-muted uppercase">/mo</span>
                          </div>
                          <button 
                            disabled={purchasing}
                            onClick={() => handlePurchaseSubscription(plan)}
                            className="w-full py-4 rounded-2xl bg-charcoal text-white text-[10px] font-black uppercase tracking-widest hover:bg-terracotta transition-all disabled:opacity-50"
                          >
                            {purchasing ? 'Processing...' : 'Choose Plan'}
                          </button>
                       </div>
                    </div>
                  ))}
               </div>

               <div className="mt-10 flex items-center justify-center space-x-6 text-charcoal-muted">
                  <div className="flex items-center space-x-2">
                     <Check className="w-4 h-4 text-sage-dark" />
                     <span className="text-[10px] font-bold uppercase tracking-widest">3 Months Free Trial</span>
                  </div>
                  <div className="h-1 w-1 bg-sand-300 rounded-full"></div>
                  <div className="flex items-center space-x-2">
                     <Check className="w-4 h-4 text-sage-dark" />
                     <span className="text-[10px] font-bold uppercase tracking-widest">Dedicated RM Support</span>
                  </div>
               </div>
            </div>
          </div>
        )}

        {/* Document Verification Modal */}
        {showVerificationModal && (
          <div className="fixed inset-0 bg-charcoal/60 backdrop-blur-md z-[100] flex items-center justify-center p-6 overflow-y-auto">
            <div className="bg-sand-50 rounded-[3rem] p-10 max-w-3xl w-full shadow-2xl animate-scale-up max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h3 className="text-3xl font-black text-charcoal tracking-tight mb-2 flex items-center">
                    <FileText className="w-8 h-8 text-terracotta mr-3" />
                    Document Verification
                  </h3>
                  <p className="text-charcoal-muted font-bold text-xs uppercase tracking-widest">Please upload your documents to verify your host profile</p>
                </div>
                <button onClick={() => setShowVerificationModal(false)} className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-charcoal-muted hover:text-terracotta transition-colors border border-sand-200">
                  <Plus className="w-6 h-6 rotate-45" />
                </button>
              </div>

              <form onSubmit={handleVerifySubmit} className="space-y-6">                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   {/* Card 1: Aadhar Card */}
                   <div className="bg-white p-6 rounded-[2rem] border border-sand-200 flex flex-col justify-between min-h-[12rem] h-auto group hover:border-terracotta transition-all">
                     <div>
                       <div className="flex justify-between items-start mb-4">
                         <span className="text-[10px] font-black text-terracotta uppercase tracking-widest bg-terracotta/5 px-3 py-1 rounded-full">Mandatory</span>
                         {aadharCard && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                       </div>
                       <h4 className="text-lg font-black text-charcoal mb-1">Aadhar Card</h4>
                       <p className="text-xs text-charcoal-muted font-bold">Upload front and back side in a single image or PDF.</p>
                       {aadharCard && (
                         <div className="mt-2 text-xs text-sage font-medium truncate flex items-center bg-sand-50/50 px-2 py-1 rounded-lg border border-sand-200/50">
                           <FileText className="w-3.5 h-3.5 mr-1.5 flex-shrink-0 text-sage" />
                           <span className="truncate" title={getFileName(aadharCard)}>{getFileName(aadharCard)}</span>
                         </div>
                       )}
                     </div>
                     <div className="mt-4">
                       <label className="w-full flex items-center justify-center px-4 py-3 bg-sand-50 hover:bg-sand-100 text-charcoal font-bold text-[10px] uppercase tracking-widest rounded-xl cursor-pointer transition-colors border border-sand-200">
                         <Upload className="w-4 h-4 mr-2" />
                         {uploadingDocs.aadhar ? 'Uploading...' : aadharCard ? 'Update File' : 'Upload File'}
                         <input
                           type="file"
                           accept="image/*,application/pdf"
                           onChange={(e) => handleDocUpload(e.target.files[0], 'aadhar')}
                           className="hidden"
                           disabled={uploadingDocs.aadhar}
                         />
                       </label>
                     </div>
                   </div>

                   {/* Card 2: Property Ownership Proof */}
                   <div className="bg-white p-6 rounded-[2rem] border border-sand-200 flex flex-col justify-between min-h-[12rem] h-auto group hover:border-terracotta transition-all">
                     <div>
                       <div className="flex justify-between items-start mb-4">
                         <span className="text-[10px] font-black text-terracotta uppercase tracking-widest bg-terracotta/5 px-3 py-1 rounded-full">Mandatory</span>
                         {propertyProof && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                       </div>
                       <h4 className="text-lg font-black text-charcoal mb-1">Property Ownership Proof</h4>
                       <p className="text-xs text-charcoal-muted font-bold">Electricity bill, index-2, registry document, etc.</p>
                       {propertyProof && (
                         <div className="mt-2 text-xs text-sage font-medium truncate flex items-center bg-sand-50/50 px-2 py-1 rounded-lg border border-sand-200/50">
                           <FileText className="w-3.5 h-3.5 mr-1.5 flex-shrink-0 text-sage" />
                           <span className="truncate" title={getFileName(propertyProof)}>{getFileName(propertyProof)}</span>
                         </div>
                       )}
                     </div>
                     <div className="mt-4">
                       <label className="w-full flex items-center justify-center px-4 py-3 bg-sand-50 hover:bg-sand-100 text-charcoal font-bold text-[10px] uppercase tracking-widest rounded-xl cursor-pointer transition-colors border border-sand-200">
                         <Upload className="w-4 h-4 mr-2" />
                         {uploadingDocs.property ? 'Uploading...' : propertyProof ? 'Update File' : 'Upload File'}
                         <input
                           type="file"
                           accept="image/*,application/pdf"
                           onChange={(e) => handleDocUpload(e.target.files[0], 'property')}
                           className="hidden"
                           disabled={uploadingDocs.property}
                         />
                       </label>
                     </div>
                   </div>

                   {/* Card 3: Cancelled Cheque / Passbook */}
                   <div className="bg-white p-6 rounded-[2rem] border border-sand-200 flex flex-col justify-between min-h-[12rem] h-auto group hover:border-terracotta transition-all">
                     <div>
                       <div className="flex justify-between items-start mb-4">
                         <span className="text-[10px] font-black text-terracotta uppercase tracking-widest bg-terracotta/5 px-3 py-1 rounded-full">Mandatory</span>
                         {cancelledCheque && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                       </div>
                       <h4 className="text-lg font-black text-charcoal mb-1">Cancelled Cheque / Passbook</h4>
                       <p className="text-xs text-charcoal-muted font-bold">To verify bank details for secure payouts.</p>
                       {cancelledCheque && (
                         <div className="mt-2 text-xs text-sage font-medium truncate flex items-center bg-sand-50/50 px-2 py-1 rounded-lg border border-sand-200/50">
                           <FileText className="w-3.5 h-3.5 mr-1.5 flex-shrink-0 text-sage" />
                           <span className="truncate" title={getFileName(cancelledCheque)}>{getFileName(cancelledCheque)}</span>
                         </div>
                       )}
                     </div>
                     <div className="mt-4">
                       <label className="w-full flex items-center justify-center px-4 py-3 bg-sand-50 hover:bg-sand-100 text-charcoal font-bold text-[10px] uppercase tracking-widest rounded-xl cursor-pointer transition-colors border border-sand-200">
                         <Upload className="w-4 h-4 mr-2" />
                         {uploadingDocs.cheque ? 'Uploading...' : cancelledCheque ? 'Update File' : 'Upload File'}
                         <input
                           type="file"
                           accept="image/*,application/pdf"
                           onChange={(e) => handleDocUpload(e.target.files[0], 'cheque')}
                           className="hidden"
                           disabled={uploadingDocs.cheque}
                         />
                       </label>
                     </div>
                   </div>

                   {/* Card 4: GST Certificate or GST No */}
                   <div className="bg-white p-6 rounded-[2rem] border border-sand-200 flex flex-col justify-between min-h-[12rem] h-auto group hover:border-terracotta transition-all">
                     <div>
                       <div className="flex justify-between items-start mb-2">
                         <span className="text-[10px] font-black text-charcoal-muted uppercase tracking-widest bg-sand-50 px-3 py-1 rounded-full">If Applicable</span>
                         {(gstCertificate || gstNumber) && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                       </div>
                       <h4 className="text-base font-black text-charcoal mb-1">GST Certificate / GST Number</h4>
                       <input
                         type="text"
                         placeholder="Enter GST Number"
                         value={gstNumber}
                         onChange={(e) => setGstNumber(e.target.value)}
                         className="w-full px-3 py-1.5 border border-sand-200 rounded-xl text-xs outline-none focus:border-terracotta mb-2"
                       />
                       {gstCertificate && (
                         <div className="mt-1 mb-2 text-xs text-sage font-medium truncate flex items-center bg-sand-50/50 px-2 py-1 rounded-lg border border-sand-200/50">
                           <FileText className="w-3.5 h-3.5 mr-1.5 flex-shrink-0 text-sage" />
                           <span className="truncate" title={getFileName(gstCertificate)}>{getFileName(gstCertificate)}</span>
                         </div>
                       )}
                     </div>
                     <div>
                       <label className="w-full flex items-center justify-center px-4 py-2 bg-sand-50 hover:bg-sand-100 text-charcoal font-bold text-[9px] uppercase tracking-widest rounded-xl cursor-pointer transition-colors border border-sand-200">
                         <Upload className="w-3.5 h-3.5 mr-2" />
                         {uploadingDocs.gst ? 'Uploading...' : gstCertificate ? 'GST Certificate Uploaded' : 'Upload GST Certificate'}
                         <input
                           type="file"
                           accept="image/*,application/pdf"
                           onChange={(e) => handleDocUpload(e.target.files[0], 'gst')}
                           className="hidden"
                           disabled={uploadingDocs.gst}
                         />
                       </label>
                     </div>
                   </div>
                 </div>

                {/* Card 5: GR & Owner Agreement */}
                <div className="bg-white p-6 rounded-[2rem] border border-sand-200 group hover:border-terracotta transition-all mt-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-start space-x-4">
                      <div className="bg-terracotta/5 p-3 rounded-xl text-terracotta">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="text-lg font-black text-charcoal">GR & Owner Agreement</h4>
                          <span className="text-[10px] font-black text-terracotta uppercase tracking-widest bg-terracotta/5 px-2 py-0.5 rounded-md">Mandatory</span>
                        </div>
                        <p className="text-xs text-charcoal-muted font-bold mt-1">Review the STR platform agreement terms, enter details and sign.</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      {agreementSignature ? (
                        <div className="flex items-center space-x-2 text-green-600 font-bold text-xs uppercase tracking-wider">
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                          <span>Signed</span>
                        </div>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => setShowAgreementModal(true)}
                        className="px-6 py-3 bg-charcoal hover:bg-terracotta text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md flex items-center"
                      >
                        <Edit3 className="w-4 h-4 mr-2" />
                        {agreementSignature ? 'Edit & Re-sign' : 'Review & Sign'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Submit button */}
                <div className="pt-6 border-t border-sand-200 flex space-x-4">
                  <button
                    type="button"
                    onClick={() => setShowVerificationModal(false)}
                    className="flex-1 py-4 text-charcoal-muted hover:text-charcoal font-black text-xs uppercase tracking-widest transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={verificationSubmitting || !aadharCard || !propertyProof || !cancelledCheque || !agreementSignature}
                    className="flex-1 btn-premium py-4 shadow-premium disabled:opacity-40"
                  >
                    {verificationSubmitting ? 'Submitting...' : 'Submit for Verification'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Agreement Signing Modal */}
        {showAgreementModal && (
          <div className="fixed inset-0 bg-charcoal/60 backdrop-blur-md z-[110] flex items-center justify-center p-6 overflow-y-auto">
            <div className="bg-white rounded-[3rem] p-10 max-w-2xl w-full shadow-2xl animate-scale-up max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-2xl font-black text-charcoal tracking-tight mb-1">X-Space360 Agreement</h3>
                  <span className="text-[10px] font-black text-charcoal-muted uppercase tracking-widest">Review and draw signature below</span>
                </div>
                <button onClick={() => setShowAgreementModal(false)} className="w-8 h-8 rounded-full bg-sand-100 flex items-center justify-center text-charcoal-muted hover:text-terracotta transition-colors">
                  <Plus className="w-5 h-5 rotate-45" />
                </button>
              </div>

              <div className="bg-sand-50 p-6 rounded-2xl text-[11px] text-charcoal-light leading-relaxed h-48 overflow-y-auto mb-6 border border-sand-200 select-none">
                <p className="font-bold mb-2">SHORT-TERM RENTAL HOST AGREEMENT</p>
                <p className="mb-2">This Short-Term Rental Agreement (the "Agreement") is entered into by and between the Property Owner (hereinafter referred to as the "Host") and X-Space360.</p>
                <p className="mb-2">1. Listing Permission: The Host hereby grants X-Space360 the non-exclusive right to list and market their verified properties on the X-Space360 booking application and coordinate reservations.</p>
                <p className="mb-2">2. Compliance & Legalities: The Host guarantees that they are the legal owner or authorized representative of the property, holding all necessary local government permissions, and complies with local taxation and occupancy regulations.</p>
                <p className="mb-2">3. Platform Services & Fees: X-Space360 coordinates checkout billing, handles guest verification, and processes payouts. X-Space360 will deduct its standard platform service fee from host payouts.</p>
                <p className="mb-2">4. Host Standards: The Host agrees to maintain properties in clean, functional, and guest-ready conditions. High hospitality standards, correct GPS geolocation, and physical representation of all amenities are mandatory.</p>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-black text-charcoal-muted uppercase tracking-widest block mb-1.5 font-bold">Owner Name (Full Name)</label>
                    <input
                      type="text"
                      required
                      placeholder="Enter full legal name"
                      value={agreementOwnerName}
                      onChange={(e) => setAgreementOwnerName(e.target.value)}
                      className="w-full border-2 border-sand-200 rounded-xl px-4 py-2.5 outline-none focus:border-terracotta font-semibold text-charcoal text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-black text-charcoal-muted uppercase tracking-widest block mb-1.5 font-bold">Owner Address</label>
                    <input
                      type="text"
                      required
                      placeholder="Enter legal address"
                      value={agreementOwnerAddress}
                      onChange={(e) => setAgreementOwnerAddress(e.target.value)}
                      className="w-full border-2 border-sand-200 rounded-xl px-4 py-2.5 outline-none focus:border-terracotta font-semibold text-charcoal text-sm"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5 flex-wrap gap-2">
                    <div className="flex items-center space-x-4 flex-wrap gap-2">
                      <label className="text-xs font-black text-charcoal-muted uppercase tracking-widest font-bold">Draw Signature</label>
                      
                      {/* Pen thickness control */}
                      <div className="flex items-center space-x-2 bg-sand-100/80 px-2 py-0.5 rounded-lg border border-sand-200">
                        <span className="text-[9px] font-bold text-charcoal-muted uppercase tracking-wider">Pen:</span>
                        {[2, 3, 5, 8].map((size) => (
                          <button
                            key={size}
                            type="button"
                            onClick={() => setPenWidth(size)}
                            className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                              penWidth === size 
                                ? 'bg-charcoal text-white font-bold' 
                                : 'text-charcoal-light hover:bg-sand-200'
                            }`}
                          >
                            <span 
                              className="rounded-full bg-current" 
                              style={{ 
                                width: `${size === 2 ? 3 : size === 3 ? 5 : size === 5 ? 7 : 10}px`, 
                                height: `${size === 2 ? 3 : size === 3 ? 5 : size === 5 ? 7 : 10}px` 
                              }} 
                            />
                          </button>
                        ))}
                      </div>

                      {/* Box height control */}
                      <div className="flex items-center space-x-1.5 bg-sand-100/80 px-2 py-0.5 rounded-lg border border-sand-200">
                        <span className="text-[9px] font-bold text-charcoal-muted uppercase tracking-wider">Box:</span>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm('Changing the box size will clear your current signature. Do you want to proceed?')) {
                              setCanvasHeight(120);
                              clearCanvas();
                            }
                          }}
                          className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider transition-all ${
                            canvasHeight === 120 
                              ? 'bg-charcoal text-white' 
                              : 'text-charcoal-light hover:bg-sand-200'
                          }`}
                        >
                          Standard
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm('Changing the box size will clear your current signature. Do you want to proceed?')) {
                              setCanvasHeight(200);
                              clearCanvas();
                            }
                          }}
                          className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider transition-all ${
                            canvasHeight === 200 
                              ? 'bg-charcoal text-white' 
                              : 'text-charcoal-light hover:bg-sand-200'
                          }`}
                        >
                          Large
                        </button>
                      </div>
                    </div>
                    
                    <button
                      type="button"
                      onClick={clearCanvas}
                      className="text-[10px] font-black text-terracotta hover:underline uppercase tracking-wider"
                    >
                      Clear Signature
                    </button>
                  </div>
                  <div className="border-2 border-dashed border-sand-300 rounded-2xl bg-sand-50/50 p-2 overflow-hidden flex justify-center items-center">
                    <canvas
                      ref={canvasRef}
                      width={500}
                      height={canvasHeight === 120 ? 150 : 250}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                      className="w-full bg-white rounded-xl shadow-inner border border-sand-200 cursor-crosshair touch-none transition-all duration-300"
                      style={{ height: `${canvasHeight}px` }}
                    />
                  </div>
                  <span className="text-[9px] text-charcoal-muted block mt-1">Draw your signature inside the box using mouse, trackpad, or touch screen. You can adjust the pen stroke and drawing box size using the controls above.</span>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-sand-200 flex space-x-4">
                <button
                  type="button"
                  onClick={() => setShowAgreementModal(false)}
                  className="flex-1 py-4 text-charcoal-muted hover:text-charcoal font-black text-xs uppercase tracking-widest transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveSignatureAndAgreement}
                  className="flex-1 btn-premium py-4 shadow-premium"
                >
                  I Agree & Save Signature
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HostDashboard;
