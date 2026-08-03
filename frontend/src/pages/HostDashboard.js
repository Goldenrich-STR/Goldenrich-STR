import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { propertyAPI, subscriptionAPI, getImageUrl, accountAPI, uploadAPI, loadRazorpaySdk, cmsAPI } from '../services/api';
import ReactMarkdown from 'react-markdown';
import { Building2, Plus, Calendar, IndianRupee, Eye, MapPin, Lock, Check, Upload, FileText, CheckCircle2, AlertCircle, Edit3, ChevronLeft, ChevronRight, Trash2, Clock, Users, Landmark, Briefcase, User, Star } from 'lucide-react';
import { NotificationBell } from '../components/NotificationCenter';
import LegalLinks from '../components/LegalLinks';
import HostSupportWidget from '../components/HostSupportWidget';

const hostNavigation = [
  { label: 'Dashboard', group: 'Control', path: '/host/dashboard', icon: Building2 },
  { label: 'Calendar', group: 'Operations', path: '/host/calendar', icon: Calendar },
  { label: 'Payouts', group: 'Finance', path: '/host/payouts', icon: IndianRupee },
  { label: 'Bookings', group: 'Reservations', path: '/host/bookings', icon: FileText },
  { label: 'Performance', group: 'Insights', path: '/host/performance', icon: Star },
];

const DEFAULT_HOST_AGREEMENT_TITLE = 'SHORT-TERM RENTAL HOST AGREEMENT';
const DEFAULT_HOST_AGREEMENT_TEXT = `## SHORT-TERM RENTAL HOST AGREEMENT

This Short-Term Rental Host Agreement ("Agreement") is executed between **X-Space360 / Golden Rich Financial & Real Estate Solutions Private Limited** ("Platform") and the property owner or authorized host ("Host") for listing, promotion, booking facilitation, and guest coordination services through the X-Space360 platform.

### 1. Appointment and Listing Authorization
The Host appoints X-Space360 on a non-exclusive basis to display, promote, and facilitate bookings for the Host's property/properties. The Host confirms that all property information, photographs, documents, amenities, pricing, availability, and location details submitted to X-Space360 are true, complete, current, and not misleading.

### 2. Ownership, Authority, and Compliance
The Host represents that they are the lawful owner, lessee, manager, or duly authorized representative of the listed property and have full authority to enter into this Agreement. The Host shall remain responsible for all licenses, permissions, society approvals, statutory registrations, tax obligations, safety requirements, and local law compliance applicable to short-term rental operations.

### 3. Platform Role and Services
X-Space360 acts as a technology-enabled marketplace and service facilitator. The Platform may assist with listing visibility, guest discovery, booking coordination, guest verification, payment facilitation, support, and operational communication. X-Space360 does not assume ownership, possession, tenancy, or direct control of the Host's property.

### 4. Host Duties and Property Standards
The Host shall maintain the property in a clean, safe, functional, guest-ready, and legally compliant condition. The Host agrees to provide accurate check-in instructions, honor confirmed bookings, maintain promised amenities, respond to platform communications, and ensure that guests receive the accommodation and services represented in the listing.

### 5. Payments, Charges, and Deductions
The Host authorizes X-Space360 to collect or facilitate collection of booking amounts, applicable platform fees, subscription fees, taxes, penalties, refunds, adjustments, and other lawful deductions as per platform policy. Net payouts, where applicable, shall be processed after deducting platform charges, commissions, taxes, refunds, disputes, or other applicable amounts.

### 6. Cancellations, Refunds, and Guest Issues
The Host agrees to comply with X-Space360 cancellation, refund, guest grievance, and dispute resolution policies. X-Space360 may withhold or adjust payouts where bookings are cancelled, services are not delivered, guest claims are verified, property standards are breached, or legal/policy violations are identified.

### 7. Documents, Verification, and Declarations
The Host shall submit valid KYC, ownership, bank, tax, and other verification documents requested by X-Space360. The Host confirms that all submitted details are genuine and authorizes X-Space360 to verify documents and information with internal teams, third-party vendors, government sources, banks, brokers, employees, or other lawful channels.

### 8. Indemnity and Liability
The Host shall indemnify and hold X-Space360 harmless against claims, losses, penalties, damages, complaints, legal proceedings, guest disputes, regulatory actions, or third-party claims arising from property ownership, inaccurate information, unsafe premises, non-compliance, unauthorized listing, fraud, negligence, or breach of this Agreement by the Host.

### 9. Termination and Suspension
X-Space360 may suspend, restrict, delist, or terminate the Host's account, listing, subscription, or access if the Host breaches this Agreement, violates platform policies, submits false documents, causes guest harm, fails verification, or engages in unlawful, abusive, fraudulent, or reputation-damaging conduct.

### 10. Acceptance and Electronic Signature
By entering the Host's legal details and drawing/signing electronically, the Host confirms that they have read, understood, accepted, and agreed to be bound by this Agreement and all applicable X-Space360 platform policies. The electronic signature shall be treated as valid consent and acceptance for platform verification and onboarding purposes.`;

const isLegacyAgreementText = (text = '') =>
  text.includes('1. Listing Permission') && text.includes('4. Host Standards');

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
  const [filterStatus, setFilterStatus] = useState('all');

  // Verification & Agreement Modal States
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showAgreementModal, setShowAgreementModal] = useState(false);
  const [showAgreementSuccessModal, setShowAgreementSuccessModal] = useState(false);
  const [verificationSubmitting, setVerificationSubmitting] = useState(false);

  // Dynamic Host Agreement State
  const [agreementContent, setAgreementContent] = useState({
    title: DEFAULT_HOST_AGREEMENT_TITLE,
    agreement_text: DEFAULT_HOST_AGREEMENT_TEXT
  });
  
    // KYC Documents Form State
  const [aadharCard, setAadharCard] = useState('');
  const [propertyProof, setPropertyProof] = useState('');
  const [cancelledCheque, setCancelledCheque] = useState('');
  const [societyNoc, setSocietyNoc] = useState('');
  const [shopAct, setShopAct] = useState('');
  const [gstCertificate, setGstCertificate] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [agreementOwnerName, setAgreementOwnerName] = useState('');
  const [agreementOwnerAddress, setAgreementOwnerAddress] = useState('');
  const [agreementSignature, setAgreementSignature] = useState('');
  const [verificationConsent, setVerificationConsent] = useState(false);
  
    // File uploading states
  const [uploadingDocs, setUploadingDocs] = useState({
    aadhar: false,
    property: false,
    cheque: false,
    gst: false,
    society: false,
    shop_act: false
  });

  const profilePrimaryAssignmentType = user?.assignment_primary_type || (user?.broker_id ? 'Broker' : user?.rm_id ? 'RM' : 'Broker / RM');
  const profileSecondaryAssignmentType = user?.assignment_secondary_type || (user?.broker_id ? 'RM' : user?.branch_manager_id ? 'Branch Manager' : 'Branch Manager / RM');
  const profilePrimaryAssignmentId = user?.assignment_primary_id || user?.broker_id || user?.rm_id || '';
  const profileSecondaryAssignmentId = user?.assignment_secondary_id || (user?.broker_id ? user?.rm_id : user?.branch_manager_id) || '';
  const profilePrimaryAssignmentCode = user?.assignment_primary_code || user?.lg_code || user?.broker_lg_code || user?.rm_code || profilePrimaryAssignmentId || 'Not assigned';
  const profileSecondaryAssignmentCode = user?.assignment_secondary_code || user?.employee_code || user?.branch_manager_code || profileSecondaryAssignmentId || 'Not assigned';
  const profilePrimaryAssignmentName = user?.assignment_primary_name || '';
  const profileSecondaryAssignmentName = user?.assignment_secondary_name || '';

  // Canvas drawing states
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [penWidth, setPenWidth] = useState(3);
  const [canvasHeight, setCanvasHeight] = useState(120);

  useEffect(() => {
    fetchData();
  }, []);

  // Pre-populate KYC fields from user data if they exist
  useEffect(() => {
    if (user && user.kyc_documents) {
      const aadhar = user.kyc_documents.find(d => d.document_type === 'aadhar_card')?.document_url || '';
      const prop = user.kyc_documents.find(d => d.document_type === 'property_proof')?.document_url || '';
      const cheque = user.kyc_documents.find(d => d.document_type === 'cancelled_cheque')?.document_url || '';
            const society = user.kyc_documents.find(d => d.document_type === 'society_noc')?.document_url || '';
      const shopActVal = user.kyc_documents.find(d => d.document_type === 'shop_act')?.document_url || '';
      const gstCert = user.kyc_documents.find(d => d.document_type === 'gst_certificate')?.document_url || '';
      const gstDoc = user.kyc_documents.find(d => d.document_type === 'gst_number') || {};
      const gstNum = gstDoc.text_value || gstDoc.value || gstDoc.document_url || user.gst_number || '';
      const panDoc = user.kyc_documents.find(d => d.document_type === 'pan_number') || {};
      const panNum = panDoc.text_value || panDoc.value || panDoc.document_url || user.pan_number || '';
      
      setAadharCard(aadhar);
      setPropertyProof(prop);
      setCancelledCheque(cheque);
      setSocietyNoc(society);
      setShopAct(shopActVal);
      setGstCertificate(gstCert);
      setGstNumber(gstNum);
      setPanNumber(panNum);
      
      if (user.agreement_owner_name) setAgreementOwnerName(user.agreement_owner_name);
      if (user.agreement_owner_address) setAgreementOwnerAddress(user.agreement_owner_address);
      if (user.agreement_signature) setAgreementSignature(user.agreement_signature);
    }
  }, [user, showVerificationModal]);

  const fetchData = async () => {
    try {
      await refreshUser();
      const [propRes, subRes, plansRes, configRes, payoutsRes, cmsRes] = await Promise.all([
        propertyAPI.getHostProperties(),
        subscriptionAPI.getUserSubscriptions(),
        subscriptionAPI.getPlans(),
        subscriptionAPI.getPaymentConfig(),
        accountAPI.listMyPayouts().catch(() => ({ data: { payouts: [] } })),
        cmsAPI.getLandingPage().catch(() => null)
      ]);
      setProperties(propRes.data.properties || []);
      setSubscriptions(subRes.data.subscriptions || []);
      setPlans(plansRes.data.plans || []);
      setPaymentConfig(configRes.data);
      setPayouts(payoutsRes.data.payouts || []);
      if (cmsRes && cmsRes.data && cmsRes.data.agreement) {
        const cmsAgreement = cmsRes.data.agreement;
        setAgreementContent({
          title: cmsAgreement.title || DEFAULT_HOST_AGREEMENT_TITLE,
          agreement_text: isLegacyAgreementText(cmsAgreement.agreement_text || '')
            ? DEFAULT_HOST_AGREEMENT_TEXT
            : (cmsAgreement.agreement_text || DEFAULT_HOST_AGREEMENT_TEXT),
        });
      }
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
      const res = await uploadAPI.uploadDocument(file);
      if (docType === 'aadhar') setAadharCard(res.url);
      else if (docType === 'property') setPropertyProof(res.url);
      else if (docType === 'cheque') setCancelledCheque(res.url);
      else if (docType === 'gst') setGstCertificate(res.url);
      else if (docType === 'society') setSocietyNoc(res.url);
      else if (docType === 'shop_act') setShopAct(res.url);
      
      // Save draft immediately to backend database
      await accountAPI.saveDraftDocument({
        document_type: docType,
        document_url: res.url
      });
      
      // Refresh user context to sync state
      await refreshUser();
    } catch (err) {
      alert(`Failed to upload ${docType}: ` + (err.response?.data?.detail || err.message));
    } finally {
      setUploadingDocs(prev => ({ ...prev, [docType]: false }));
    }
  };

  const saveGstNumberDraft = async () => {
    const value = gstNumber.trim();
    if (!value) return;
    try {
      await accountAPI.saveDraftDocument({
        document_type: 'gst_number',
        text_value: value
      });
      await refreshUser();
    } catch (err) {
      console.error('Failed to save GST number draft:', err);
    }
  };

  const normalizePanNumber = (value) => value.trim().toUpperCase().replace(/\s+/g, '');
  const isPanNotApplicable = (value) => ['NA', 'N/A', 'NOTAPPLICABLE', 'NOT_APPLICABLE', 'NOT-APPLICABLE'].includes(normalizePanNumber(value));
  const getPanSubmitValue = () => isPanNotApplicable(panNumber) ? 'NOT_APPLICABLE' : normalizePanNumber(panNumber);
  const isValidPanNumber = (value) => isPanNotApplicable(value) || /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(normalizePanNumber(value));

  const savePanNumberDraft = async (nextValue = panNumber) => {
    const value = isPanNotApplicable(nextValue) ? 'NOT_APPLICABLE' : normalizePanNumber(nextValue);
    if (!value) return;
    if (!isValidPanNumber(value)) return;
    try {
      await accountAPI.saveDraftDocument({
        document_type: 'pan_number',
        text_value: value
      });
      await refreshUser();
    } catch (err) {
      console.error('Failed to save PAN number draft:', err);
    }
  };

  const markPanNotApplicable = async () => {
    setPanNumber('NOT_APPLICABLE');
    await savePanNumberDraft('NOT_APPLICABLE');
  };

  const clearDocumentValue = (docType) => {
    if (docType === 'aadhar') setAadharCard('');
    else if (docType === 'property') setPropertyProof('');
    else if (docType === 'cheque') setCancelledCheque('');
    else if (docType === 'gst') setGstCertificate('');
    else if (docType === 'society') setSocietyNoc('');
    else if (docType === 'shop_act') setShopAct('');
  };

  const handleRejectedDocRemove = async (docType) => {
    if (!window.confirm('Remove this rejected document and upload a new one?')) return;
    setUploadingDocs(prev => ({ ...prev, [docType]: true }));
    try {
      await accountAPI.deleteRejectedDraftDocument(docType);
      clearDocumentValue(docType);
      await refreshUser();
    } catch (err) {
      alert('Failed to remove document: ' + (err.response?.data?.detail || err.message));
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
      const res = await uploadAPI.uploadDocument(sigFile);
      setAgreementSignature(res.url);
      
      // Save draft agreement to backend
      await accountAPI.saveDraftAgreement({
        agreement_owner_name: agreementOwnerName,
        agreement_owner_address: agreementOwnerAddress,
        agreement_signature: res.url
      });
      
      await refreshUser();
      
      setShowAgreementModal(false);
      setShowAgreementSuccessModal(true);
    } catch (err) {
      alert('Failed to save signature: ' + err.message);
    } finally {
      setUploadingDocs(prev => ({ ...prev, gst: false }));
    }
  };

  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    if (!aadharCard || !propertyProof || !cancelledCheque || !shopAct || !agreementSignature) {
      alert('Please upload all mandatory documents and sign the agreement.');
      return;
    }
    if (!panNumber.trim()) {
      alert('Please enter PAN Card Number or select Not Applicable.');
      return;
    }
    if (!isValidPanNumber(panNumber)) {
      alert('Invalid PAN Card Number. Use format ABCDE1234F or select Not Applicable.');
      return;
    }
    if (!verificationConsent) {
      alert('Please accept the Terms & Conditions consent before submitting.');
      return;
    }
    setVerificationSubmitting(true);
    try {
      if (gstNumber.trim()) {
        await accountAPI.saveDraftDocument({
          document_type: 'gst_number',
          text_value: gstNumber.trim()
        });
      }
      await accountAPI.saveDraftDocument({
        document_type: 'pan_number',
        text_value: getPanSubmitValue()
      });
            await accountAPI.submitHostVerification({
        aadhar_card: aadharCard,
        pan_number: getPanSubmitValue(),
        property_proof: propertyProof,
        cancelled_cheque: cancelledCheque,
        society_noc: societyNoc || null,
        shop_act: shopAct || null,
        gst_certificate: gstCertificate || null,
        gst_number: gstNumber || null,
        agreement_owner_name: agreementOwnerName,
        agreement_owner_address: agreementOwnerAddress,
        agreement_signature: agreementSignature,
        terms_accepted: true,
        terms_version: 'host-verification-2026-06'
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

  const getDocStatus = (docType) => {
    if (!user || !user.kyc_documents) return null;
    const doc = user.kyc_documents.find(d => d.document_type === docType);
    return doc ? doc.status : null;
  };
  
  const getDocRejectionReason = (docType) => {
    if (!user || !user.kyc_documents) return null;
    const doc = user.kyc_documents.find(d => d.document_type === docType);
    return doc ? doc.rejection_reason : null;
  };

  const renderDocCard = (number, title, description, docType, value, accept, isMandatory, Icon) => {
        const backendDocTypeMap = {
      aadhar: 'aadhar_card',
      property: 'property_proof',
      cheque: 'cancelled_cheque',
      society: 'society_noc',
      shop_act: 'shop_act',
      gst: 'gst_certificate'
    };
    const dbType = backendDocTypeMap[docType];
    const docStatus = getDocStatus(dbType);
    const rejectionReason = getDocRejectionReason(dbType);
    const canReplaceDocument = docStatus === 'rejected' || user?.kyc_status === 'rejected';

    return (
            <div className="bg-white rounded-none border border-sand-200 p-6 shadow-sm flex flex-col justify-between min-h-[18rem] h-auto relative overflow-hidden transition-all duration-300 hover:shadow-premium hover:border-terracotta group">
        {/* Corner Badge */}
        <div className="absolute top-0 left-0 bg-terracotta text-white font-black text-[10px] tracking-wider px-3.5 py-1.5 rounded-none shadow-sm">
          {number}
        </div>

        <div className="flex flex-col items-center flex-1 w-full">
          {/* Square Icon Container */}
          <div className="w-14 h-14 rounded-none bg-sand-50 border border-sand-200 flex items-center justify-center mb-4 group-hover:bg-terracotta/5 transition-colors">
            <Icon className="w-6 h-6 text-terracotta" />
          </div>

          <h4 className="text-sm font-black text-charcoal text-center mb-1">
            {title} {isMandatory && <span className="text-red-500 font-bold ml-1">*</span>}
          </h4>
          <p className="text-[11px] text-charcoal-muted font-bold text-center mb-4 leading-normal max-w-[90%]">{description}</p>
          
          {/* Optional GST Input for GST Card */}
                              {docType === 'gst' && (
            <div className="w-full mb-3 text-left">
              <label className="text-[8px] font-black text-charcoal-muted uppercase tracking-widest block mb-1">
                GST Number (Optional)
              </label>
              <input
                type="text"
                placeholder="Enter GST Number"
                value={gstNumber}
                onChange={(e) => setGstNumber(e.target.value)}
                onBlur={saveGstNumberDraft}
                className="w-full px-3 py-2 border border-sand-200 rounded-none text-[11px] outline-none focus:border-terracotta font-semibold"
              />
            </div>
          )}

          {/* Status badge */}
          {value ? (
            <div className="flex flex-col items-center mb-4 space-y-1">
              {docStatus === 'approved' ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-600 border border-green-200 rounded-full text-[9px] font-black uppercase tracking-wider">
                  <Check className="w-3 h-3" />
                  Verified
                </span>
              ) : docStatus === 'rejected' ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-600 border border-red-200 rounded-full text-[9px] font-black uppercase tracking-wider">
                  <AlertCircle className="w-3 h-3" />
                  Rejected
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-600 border border-amber-200 rounded-full text-[9px] font-black uppercase tracking-wider animate-pulse">
                  <Clock className="w-3 h-3" />
                  Pending
                </span>
              )}
              {docStatus === 'rejected' && rejectionReason && (
                <span className="text-[9px] text-red-600 font-bold max-w-[220px] text-center leading-relaxed" title={rejectionReason}>
                  {rejectionReason}
                </span>
              )}
            </div>
          ) : null}
        </div>

                  {/* Bottom Upload/Attachment area */}
        {value ? (
          <>
            <div className="bg-sand-50/80 border border-sand-200 rounded-none p-3 flex items-center justify-between mt-auto w-full">
            <div className="flex items-center space-x-2 min-w-0">
              <div className="bg-red-50 text-red-500 p-2 rounded-none flex-shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="text-left min-w-0">
                <p className="text-[11px] font-black text-charcoal truncate max-w-[100px] sm:max-w-[120px]" title={getFileName(value)}>
                  {getFileName(value)}
                </p>
                <p className="text-[8px] font-bold text-charcoal-muted uppercase tracking-wider">
                  Uploaded File
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-1.5">
              <a
                href={getImageUrl(value)}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 hover:bg-sand-200 rounded-none text-charcoal-muted hover:text-terracotta transition-colors"
                title="View File"
              >
                <Eye className="w-4 h-4" />
              </a>
              
              <label className="p-1.5 hover:bg-sand-200 rounded-none text-charcoal-muted hover:text-terracotta cursor-pointer transition-colors" title="Change File">
                <Upload className="w-4 h-4" />
                <input
                  type="file"
                  accept={accept}
                  onChange={(e) => handleDocUpload(e.target.files[0], docType)}
                  className="hidden"
                  disabled={uploadingDocs[docType]}
                />
              </label>
              {canReplaceDocument && (
                <button
                  type="button"
                  onClick={() => handleRejectedDocRemove(docType)}
                  disabled={uploadingDocs[docType]}
                  className="p-1.5 hover:bg-red-100 text-red-500 disabled:opacity-50 transition-colors"
                  title="Remove Rejected File"
                  aria-label={`Remove rejected ${title}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            </div>
            {canReplaceDocument && (
              <label className="mt-2 w-full inline-flex items-center justify-center gap-2 border border-red-200 bg-red-50 px-3 py-2 text-[9px] font-black uppercase tracking-wider text-red-600 cursor-pointer hover:bg-red-100 transition-colors">
                <Upload className="w-3.5 h-3.5" />
                {uploadingDocs[docType] ? 'Uploading...' : 'Replace Document'}
                <input
                  type="file"
                  accept={accept}
                  onChange={(e) => handleDocUpload(e.target.files[0], docType)}
                  className="hidden"
                  disabled={uploadingDocs[docType]}
                />
              </label>
            )}
          </>
        ) : (
          <label className="w-full border-2 border-dashed border-sand-300 hover:border-terracotta bg-white hover:bg-sand-50/50 rounded-none p-5 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 min-h-[7rem] mt-auto">
            <div className="bg-sand-50 p-2.5 rounded-none mb-2 flex items-center justify-center">
              {uploadingDocs[docType] ? (
                <div className="w-4 h-4 border-2 border-terracotta border-t-transparent rounded-full animate-spin" />
              ) : (
                <Upload className="w-4 h-4 text-charcoal-muted" />
              )}
            </div>
            <span className="text-[10px] font-black text-charcoal uppercase tracking-wider text-center">
              {uploadingDocs[docType] ? 'Uploading...' : 'Upload Document'}
            </span>
            <span className="text-[8px] text-charcoal-muted font-bold mt-0.5 text-center">
              PDF, JPG or PNG (Max. 5MB)
            </span>
            <input
              type="file"
              accept={accept}
              onChange={(e) => handleDocUpload(e.target.files[0], docType)}
              className="hidden"
              disabled={uploadingDocs[docType]}
            />
          </label>
        )}
      </div>
    );
  };

  const unusedSubsCount = subscriptions.filter(s => !s.property_id && s.status === 'active').length;
  const isLocked = false;

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
        const sdkLoaded = await loadRazorpaySdk();
        if (!sdkLoaded || !window.Razorpay) {
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
            contact: user?.phone || '',
          },
          config: {
            display: {
              blocks: {
                upi: {
                  name: 'Pay via UPI',
                  instruments: [{ method: 'upi' }],
                },
              },
              sequence: ['block.upi', 'upi', 'card', 'netbanking'],
              preferences: {
                show_default_blocks: true,
              },
            },
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
          theme: { color: '#006437' }
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
  const propertyRatings = properties
    .map((property) => Number(property.rating || property.average_rating || 0))
    .filter((rating) => rating > 0);
  const averageRating = propertyRatings.length
    ? `${(propertyRatings.reduce((sum, rating) => sum + rating, 0) / propertyRatings.length).toFixed(1)} / 5`
    : 'Not Rated';

  const isRejected = (property) => {
    return property.status === 'rejected' || (property.status === 'draft' && property.verification_remarks);
  };

  const isPending = (property) => {
    return property.status === 'pending_verification' || property.status === 'under_review';
  };

  const isLive = (property) => {
    return property.status === 'live';
  };

  const stats = [
    { label: 'Total Properties', value: properties.length, note: 'All listed spaces', icon: Building2, statusFilter: 'all', tone: 'text-slate-700 bg-slate-100' },
    { label: 'Active Listings', value: properties.filter(isLive).length, note: 'Available to guests', icon: Eye, statusFilter: 'live', tone: 'text-slate-700 bg-slate-100' },
    { label: 'Pending Review', value: properties.filter(isPending).length, note: 'Awaiting approval', icon: Calendar, statusFilter: 'pending_verification', tone: 'text-slate-700 bg-slate-100' },
    { label: 'Rejected Properties', value: properties.filter(isRejected).length, note: 'Needs correction', icon: AlertCircle, statusFilter: 'rejected', tone: 'text-slate-700 bg-slate-100' },
    { label: 'Total Earnings', value: formattedEarnings, note: 'Paid payouts', icon: IndianRupee, tone: 'text-slate-700 bg-slate-100' },
    { label: 'Guest Rating', value: averageRating, note: 'Property reviews', icon: Star, action: () => navigate('/host/performance'), tone: 'text-slate-700 bg-slate-100' },
  ];

  return (
    <div className="min-h-screen bg-[#f7f7f5] selection:bg-slate-900 selection:text-white">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 px-4 py-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)] backdrop-blur md:px-8 lg:px-12">
        <div className="flex w-full items-center justify-between gap-3">
          <div
            className="flex cursor-pointer items-center space-x-3"
            onClick={() => navigate('/')}
          >
            <img src="/logo.png" alt="X-Space360 Logo" className="h-8 w-auto object-contain" />
          </div>

          <div className="flex items-center gap-3 md:gap-6">
            <NotificationBell />
            <div
              onClick={() => setShowProfileModal(true)}
              className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-2xl border border-slate-300 bg-slate-900 text-xs font-black text-white shadow-sm transition-colors hover:bg-black"
            >
              {user?.profile_image ? (
                <img src={getImageUrl(user.profile_image)} alt="Profile" className="h-full w-full rounded-2xl object-cover" />
              ) : (
                user?.full_name?.[0]?.toUpperCase()
              )}
            </div>
            <button
              onClick={() => {
                navigate('/');
                setTimeout(() => {
                  logout();
                }, 50);
              }}
              className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 transition hover:text-slate-950"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full px-4 py-8 md:px-8 lg:px-12">
        <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="h-fit rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_16px_36px_rgba(15,23,42,0.04)] xl:sticky xl:top-28">
            <div className="border-b border-slate-200 px-2 pb-4">
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Host Panel</p>
              <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-slate-950">Dashboard</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Listings, payouts, bookings, calendar and guest experience in one workspace.
              </p>
            </div>

            <div className="mt-5 space-y-2">
              {hostNavigation.map((item) => (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left transition-all ${
                    item.path === '/host/dashboard'
                      ? 'bg-slate-900 text-white shadow-[0_12px_24px_rgba(15,23,42,0.14)]'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                  }`}
                >
                  <item.icon className={`h-4 w-4 shrink-0 ${item.path === '/host/dashboard' ? 'text-white' : 'text-slate-700'}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-bold leading-5">{item.label}</span>
                    <span className={`mt-0.5 block text-[10px] font-semibold uppercase tracking-[0.18em] ${item.path === '/host/dashboard' ? 'text-white/65' : 'text-slate-400'}`}>
                      {item.group}
                    </span>
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-6 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Account Snapshot</p>
              <div className="mt-4 space-y-3">
                {[
                  ['Host', user?.full_name || 'Host'],
                  ['KYC', user?.kyc_status || 'pending'],
                  ['Live Properties', properties.filter(isLive).length],
                  ['Open Payouts', payouts.filter((p) => ['eligible', 'processing', 'needs_destination'].includes(p.status)).length],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
                    <p className="mt-1 text-sm font-bold capitalize text-slate-950">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          <main className="min-w-0">
            <section className="mb-8 rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_16px_36px_rgba(15,23,42,0.04)] md:p-8 animate-fade-in">
              <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
                <div className="max-w-3xl">
                  <p className="mb-2 text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">X-Space360 Host Workspace</p>
                  <h2 className="text-[32px] font-black tracking-[-0.05em] text-slate-950 md:text-[42px]" data-testid="dashboard-title">
                    Your Portfolio
                  </h2>
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
                    Manage listings, subscriptions, calendar readiness, payouts and guest experience from one clean workspace.
                  </p>
                </div>
                <div className="flex w-full flex-col gap-3 sm:flex-row xl:w-auto">
                  <button
                    onClick={() => navigate('/host/performance')}
                    className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-slate-200 px-5 text-xs font-bold uppercase tracking-widest text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    <Star className="h-4 w-4" />
                    Ratings
                  </button>
                  <button
                    onClick={handleListPropertyClick}
                    className={`inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl px-6 text-xs font-bold uppercase tracking-widest transition-all ${
                      isLocked
                        ? 'bg-slate-200 text-slate-500 hover:bg-slate-300'
                        : 'bg-slate-900 text-white shadow-[0_14px_28px_rgba(15,23,42,0.14)] hover:bg-black'
                    }`}
                    data-testid="create-property-btn"
                  >
                    {isLocked ? <Lock className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    List New Property
                  </button>
                </div>
              </div>
            </section>

        {/* Verification Status Banner */}
        {user?.kyc_status === 'pending' && (
          <div className="mb-8 flex flex-col gap-4 rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_16px_36px_rgba(15,23,42,0.04)] animate-fade-in sm:flex-row sm:items-center sm:justify-between md:p-6">
            <div className="flex items-center space-x-4">
              <div className="shrink-0 rounded-2xl bg-slate-100 p-3 text-slate-700">
                <Lock className="h-6 w-6 animate-pulse" />
              </div>
              <div>
                <h4 className="text-sm font-bold tracking-tight text-charcoal">Host Verification Pending Review</h4>
                <p className="mt-1 text-xs text-charcoal-muted">Your documents are under review. You can list new properties, but guest bookings will remain disabled until approved by the administrator.</p>
              </div>
            </div>
            <span className="self-start rounded-full bg-slate-900 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white sm:self-auto">Under Review</span>
          </div>
        )}

        {user?.kyc_status === 'rejected' && (
          <div className="mb-8 flex flex-col gap-4 rounded-[28px] border border-red-200 bg-white p-6 shadow-[0_16px_36px_rgba(15,23,42,0.04)] animate-fade-in sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-red-100 p-3 rounded-xl text-red-600">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold tracking-tight text-charcoal tracking-tight text-sm">Host Verification Rejected</h4>
                <p className="text-xs text-charcoal-muted mt-1">Rejection reason: <span className="font-bold text-red-700">{user.kyc_remarks || 'Invalid documents.'}</span>. Please update and re-submit your verification documents.</p>
              </div>
            </div>
            <button
              onClick={() => setShowVerificationModal(true)}
              className="px-5 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-[10px] font-bold tracking-tight uppercase tracking-widest transition-all self-start sm:self-auto shadow-subtle"
            >
              Re-submit Documents
            </button>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 gap-4 mb-8 animate-slide-up" data-testid="stats-grid">
          {stats.map((stat, idx) => {
            const isClickable = !!stat.statusFilter || !!stat.action;
            const isActive = isClickable && filterStatus === stat.statusFilter;
            return (
              <div 
                key={idx} 
                onClick={() => {
                  if (stat.action) {
                    stat.action();
                    return;
                  }
                  if (isClickable) {
                    setFilterStatus(stat.statusFilter);
                    setCurrentPage(1);
                  }
                }}
                className={`bg-white rounded-3xl p-5 border shadow-[0_16px_36px_rgba(15,23,42,0.04)] group transition-all duration-300 min-h-[150px] ${
                  isClickable 
                    ? 'cursor-pointer hover:border-slate-300 hover:-translate-y-0.5 hover:shadow-[0_22px_48px_rgba(15,23,42,0.06)]' 
                    : ''
                } ${
                  isActive 
                    ? 'border-slate-900 ring-1 ring-slate-900/10 bg-slate-50/70' 
                    : 'border-slate-200'
                }`}
                data-testid={`stat-${idx}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[9px] font-bold text-charcoal-muted uppercase tracking-widest">{stat.label}</p>
                    <p className="text-2xl md:text-3xl font-bold text-charcoal mt-4 break-words">{stat.value}</p>
                  </div>
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors ${isActive ? 'bg-slate-900 text-white' : stat.tone}`}>
                    <stat.icon className={`w-5 h-5 ${isActive ? 'text-white' : ''}`} />
                  </div>
                </div>
                <p className="text-[11px] font-semibold text-charcoal-muted mt-3">{stat.note}</p>
              </div>
            );
          })}
        </div>

        {/* Properties List */}
        <div className="animate-slide-up" style={{ animationDelay: '200ms' }}>
          <div className="mb-6 rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_16px_36px_rgba(15,23,42,0.04)] md:p-5">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Listing Operations</p>
                <h3 className="text-xl font-bold text-charcoal tracking-tight">
               {filterStatus === 'all' ? 'All Properties' :
                filterStatus === 'live' ? 'Active Listings' :
                filterStatus === 'pending_verification' ? 'Pending Review' :
                filterStatus === 'rejected' ? 'Rejected Properties' : 'Properties'}
                </h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  ['all', 'All'],
                  ['live', 'Live'],
                  ['pending_verification', 'Pending'],
                  ['rejected', 'Rejected'],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setFilterStatus(value);
                      setCurrentPage(1);
                    }}
                    className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition ${
                      filterStatus === value ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {(() => {
            const filteredProperties = properties.filter(p => {
              if (filterStatus === 'all') return true;
              if (filterStatus === 'live') return isLive(p);
              if (filterStatus === 'pending_verification') return isPending(p);
              if (filterStatus === 'rejected') return isRejected(p);
              return true;
            });

            if (loading) {
              return (
                <div className="grid grid-cols-1 gap-4">
                   {[1,2,3].map(i => (
                     <div key={i} className="h-32 bg-white rounded-3xl border border-gray-100 animate-pulse"></div>
                   ))}
                </div>
              );
            }

            if (filteredProperties.length > 0) {
              return (
                <div data-testid="properties-list">
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                    {[...filteredProperties]
                      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
                      .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                      .map((property) => (
                      <div 
                        key={property.property_id} 
                        className="bg-white rounded-2xl p-3 border border-gray-100 shadow-sm hover:shadow-premium transition-all duration-300 flex flex-col h-full group" 
                        data-testid={`property-${property.property_id}`}
                      >
                        <div className="relative overflow-hidden w-full aspect-[16/8] rounded-xl mb-3 bg-stone">
                          <img
                            src={getImageUrl(property.images?.[0]) || 'https://images.unsplash.com/photo-1503174971373-b1f69850bded'}
                            alt={property.title}
                            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-charcoal/45 via-transparent to-transparent"></div>
                          <span className={`absolute top-2 left-2 px-2.5 py-0.5 rounded-full text-[8px] font-bold tracking-tight uppercase tracking-widest ${
                            isLive(property) ? 'bg-sage text-white' :
                            isPending(property) ? 'bg-amber-500 text-white' :
                            isRejected(property) ? 'bg-red-600 text-white' :
                            'bg-charcoal text-white'
                          }`}>
                            {isRejected(property) ? 'rejected' : (property.status === 'live' && property.is_edited ? 'live (edited)' : property.status.replace('_', ' '))}
                          </span>
                          <div className="absolute bottom-2 left-2 right-2">
                            <h3 className="text-sm font-bold text-white line-clamp-1" title={property.title}>{property.title}</h3>
                            <div className="flex items-center text-white/85 gap-1 mt-0.5">
                              <MapPin className="w-3 h-3" />
                              <span className="text-[10px] font-bold uppercase tracking-widest">{property.city || 'No city'}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex-1">
                          <div className="grid grid-cols-3 gap-1.5 mb-3">
                            {[
                              ['Rating', property.rating_avg || property.rating || '0.0'],
                              ['Reviews', property.rating_count || property.review_count || 0],
                              ['Type', property.bhk_type || property.property_type || 'N/A'],
                            ].map(([label, value]) => (
                              <div key={label} className="rounded-xl bg-stone/70 border border-sand-100 px-2 py-1.5 min-w-0">
                                <p className="text-[8px] font-bold text-charcoal-muted uppercase tracking-widest">{label}</p>
                                <p className="text-xs font-bold text-charcoal mt-1 truncate">{value}</p>
                              </div>
                            ))}
                          </div>

                          {isRejected(property) && property.verification_remarks && (
                            <div className="mt-2 p-3 bg-red-50 border border-red-100 rounded-2xl flex items-start space-x-2 text-red-800 text-[11px] leading-relaxed mb-4 animate-in fade-in duration-300">
                              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-600" />
                              <div>
                                <span className="font-bold uppercase tracking-wider block text-[9px] mb-0.5 text-red-700">Rejection Reason</span>
                                <span>{property.verification_remarks}</span>
                              </div>
                            </div>
                          )}

                          {(() => {
                            const propSub = subscriptions.find(s => s.property_id === property.property_id);
                            if (!propSub) return null;
                            const plan = plans.find(p => p.plan_id === propSub.plan_id);
                            
                            const formatDate = (dateStr) => {
                              if (!dateStr) return 'N/A';
                              try {
                                const d = new Date(dateStr);
                                return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
                              } catch {
                                return dateStr;
                              }
                            };

                            return (
                              <div className="mt-2 p-3 bg-stone/80 rounded-xl border border-sand-100 flex flex-col gap-1.5 mb-3">
                                <div className="flex justify-between items-center text-[10px] font-bold">
                                  <span className="uppercase tracking-widest text-charcoal-muted">Sub Plan</span>
                                  <span className="text-terracotta">{plan ? plan.plan_name : (propSub.plan_type || 'N/A').toUpperCase()}</span>
                                </div>
                                <div className="flex justify-between items-center text-[10px] font-bold">
                                  <span className="uppercase tracking-widest text-charcoal-muted">Purchase Date</span>
                                  <span className="text-charcoal">{formatDate(propSub.start_date)}</span>
                                </div>
                                <div className="flex justify-between items-center text-[10px] font-bold">
                                  <span className="uppercase tracking-widest text-charcoal-muted">Renew Date</span>
                                  <span className="text-charcoal">{formatDate(propSub.end_date)}</span>
                                </div>
                                <div className="flex justify-between items-center text-[10px] font-bold">
                                  <span className="uppercase tracking-widest text-charcoal-muted">Status</span>
                                  <span className={`uppercase tracking-widest px-2 py-0.5 rounded-full text-[9px] ${
                                    propSub.status === 'active' ? 'bg-sage/10 text-sage' :
                                    propSub.status === 'trial' ? 'bg-amber-500/10 text-amber-600' :
                                    'bg-red-500/10 text-red-600'
                                  }`}>{propSub.status}</span>
                                </div>
                              </div>
                            );
                          })()}
                        </div>

                        <div className="grid grid-cols-2 gap-2 mt-auto pt-3 border-t border-sand-100">
                          <button
                            onClick={() => {
                              if (isLive(property)) {
                                navigate(`/host/calendar?property=${property.property_id}`);
                              } else {
                                alert('This property is not verified yet. Calendar will be available once the property is live.');
                              }
                            }}
                            className={`py-2.5 rounded-xl border border-gray-200 text-[9px] font-bold uppercase tracking-widest transition-all ${
                              isLive(property) ? 'hover:border-charcoal' : 'opacity-50 cursor-not-allowed'
                            }`}
                            data-testid={`property-calendar-${property.property_id}`}
                          >
                            Calendar
                          </button>
                          <button
                            onClick={() => navigate(`/host/list-property?edit=${property.property_id}`)}
                            className="py-2.5 rounded-xl bg-charcoal text-white text-[9px] font-bold uppercase tracking-widest hover:bg-terracotta transition-all shadow-premium"
                          >
                            Manage
                          </button>
                        </div>
                        <button
                          onClick={() => openDeleteModal(property)}
                          className="mt-2 w-full py-2.5 rounded-xl border border-red-100 bg-red-50/60 text-red-600 text-[9px] font-bold tracking-tight uppercase tracking-widest hover:bg-red-600 hover:text-white hover:border-red-600 transition-all flex items-center justify-center gap-2"
                          data-testid={`property-delete-${property.property_id}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete Property
                        </button>
                      </div>
                    ))}
                  </div>
                  
                  {filteredProperties.length > itemsPerPage && (
                    <div className="mt-8 flex justify-center items-center space-x-4">
                      <button 
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="w-10 h-10 rounded-full border border-gray-100 flex items-center justify-center text-charcoal hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <span className="text-xs font-bold tracking-tight text-charcoal uppercase tracking-widest">
                        Page {currentPage} of {Math.ceil(filteredProperties.length / itemsPerPage)}
                      </span>
                      <button 
                        onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredProperties.length / itemsPerPage), p + 1))}
                        disabled={currentPage === Math.ceil(filteredProperties.length / itemsPerPage)}
                        className="w-10 h-10 rounded-full border border-gray-100 flex items-center justify-center text-charcoal hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            }

            if (properties.length > 0) {
              return (
                <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-200">
                  <Building2 className="w-16 h-16 text-sand-200 mx-auto mb-6" />
                  <h4 className="text-xl font-bold tracking-tight text-charcoal mb-2">
                    No {filterStatus === 'live' ? 'Active' :
                        filterStatus === 'pending_verification' ? 'Pending Review' :
                        filterStatus === 'rejected' ? 'Rejected' : ''} Properties
                  </h4>
                  <p className="text-charcoal-light text-sm">There are no properties matching this category.</p>
                </div>
              );
            }

            return (
              <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-200">
                <Building2 className="w-16 h-16 text-sand-200 mx-auto mb-6" />
                <h4 className="text-xl font-bold tracking-tight text-charcoal mb-2">No Properties Listed</h4>
                <p className="text-charcoal-muted font-bold text-xs uppercase tracking-widest mb-8">Ready to start earning? List your first home today.</p>
                <button
                  onClick={handleListPropertyClick}
                  className="btn-premium px-10 py-4 shadow-premium"
                >
                  Get Started
                </button>
              </div>
            );
          })()}
        </div>
          </main>
        </div>

        {deleteModal.isOpen && (
          <div className="fixed inset-0 bg-charcoal/60 backdrop-blur-md z-[110] flex items-center justify-center p-6">
            <div className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-elevated animate-scale-up border border-red-100">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold tracking-tight text-charcoal tracking-tight mb-1">Delete Property</h3>
                  <p className="text-xs text-charcoal-muted font-bold leading-relaxed">
                    This will permanently remove <span className="text-charcoal">{deleteModal.property?.title}</span> from your listings. A reason is required for audit records.
                  </p>
                </div>
              </div>

              <label className="block text-[10px] font-bold tracking-tight uppercase tracking-widest text-charcoal-muted mb-2">
                Reason for deletion
              </label>
              <textarea
                value={deleteModal.reason}
                onChange={(e) => setDeleteModal(prev => ({ ...prev, reason: e.target.value }))}
                rows={4}
                placeholder="Example: Duplicate listing, property no longer available, incorrect details..."
                className="w-full rounded-2xl border-2 border-gray-100 bg-stone px-4 py-3 text-sm font-semibold text-charcoal outline-none focus:border-terracotta transition-colors resize-none"
                disabled={deleteModal.deleting}
              />
              <p className="mt-2 text-[10px] font-bold text-charcoal-muted">
                Minimum 10 characters. Properties with active or confirmed bookings cannot be deleted.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 mt-8">
                <button
                  onClick={closeDeleteModal}
                  disabled={deleteModal.deleting}
                  className="flex-1 py-4 rounded-2xl border-2 border-gray-100 text-charcoal text-[10px] font-bold tracking-tight uppercase tracking-widest hover:border-charcoal transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteProperty}
                  disabled={deleteModal.deleting || deleteModal.reason.trim().length < 10}
                  className="flex-1 py-4 rounded-2xl bg-red-600 text-white text-[10px] font-bold tracking-tight uppercase tracking-widest hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleteModal.deleting ? 'Deleting...' : 'Delete Property'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Purchase Subscription Modal */}
        {showPurchaseModal && (
          <div className="fixed inset-0 bg-charcoal/60 backdrop-blur-md z-[100] flex justify-center overflow-y-auto p-4 md:p-10">
            <div className="my-auto bg-stone rounded-[3rem] p-10 max-w-4xl w-full shadow-elevated animate-scale-up">
               <div className="flex justify-between items-start mb-10">
                  <div>
                    <h3 className="text-3xl font-bold tracking-tight text-charcoal tracking-tight mb-2">Subscription Required</h3>
                    <p className="text-charcoal-muted font-bold text-xs uppercase tracking-widest">To list more properties, please purchase a plan</p>
                  </div>
                  <button onClick={() => setShowPurchaseModal(false)} className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-charcoal-muted hover:text-terracotta transition-colors border border-gray-100">
                    <Plus className="w-6 h-6 rotate-45" />
                  </button>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {plans.map(plan => (
                    <div key={plan.plan_id} className="bg-white rounded-2xl p-8 border border-gray-100 hover:border-terracotta transition-all group flex flex-col h-full">
                       <span className="inline-block px-3 py-1 bg-stone rounded-full text-[9px] font-bold tracking-tight uppercase tracking-widest text-charcoal-muted mb-4 group-hover:bg-terracotta/5 group-hover:text-terracotta transition-colors">
                          {plan.plan_type} Configuration
                       </span>
                       <h4 className="text-xl font-bold tracking-tight text-charcoal mb-2">{plan.plan_name}</h4>
                       <h4 className="text-xs font-bold tracking-tight text-charcoal-muted mb-4 uppercase tracking-widest opacity-60">{plan.plan_id}</h4>
                       <p className="text-xs text-charcoal-muted font-bold leading-relaxed mb-8 flex-1">{plan.description}</p>
                       <div className="mt-auto pt-6 border-t border-sand-100">
                          <div className="flex items-baseline space-x-1 mb-6">
                             <span className="text-2xl font-bold tracking-tight text-charcoal tracking-tighter">₹{plan.price_monthly.toLocaleString('en-IN')}</span>
                             <span className="text-[10px] font-bold text-charcoal-muted uppercase">/mo</span>
                          </div>
                          <button 
                            disabled={purchasing}
                            onClick={() => handlePurchaseSubscription(plan)}
                            className="w-full py-4 rounded-2xl bg-charcoal text-white text-[10px] font-bold tracking-tight uppercase tracking-widest hover:bg-terracotta transition-all disabled:opacity-50"
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

        {showVerificationModal && (
          <div className="fixed inset-0 bg-charcoal/60 backdrop-blur-md z-[100] flex items-center justify-center p-6">
            <div className="bg-stone rounded-[3rem] max-w-5xl w-full shadow-elevated animate-scale-up max-h-[90vh] flex flex-col overflow-hidden">
              <div className="flex justify-between items-start p-10 pb-4 border-b border-gray-100 flex-shrink-0">
                <div>
                  <h3 className="text-3xl font-bold tracking-tight text-charcoal tracking-tight mb-2 flex items-center">
                    <FileText className="w-8 h-8 text-terracotta mr-3" />
                    Document Verification
                  </h3>
                  <p className="text-charcoal-muted font-bold text-xs uppercase tracking-widest">Please upload your documents to verify your host profile</p>
                </div>
                <button onClick={() => setShowVerificationModal(false)} className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-charcoal-muted hover:text-terracotta transition-colors border border-gray-100">
                  <Plus className="w-6 h-6 rotate-45" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-10 pb-10 pt-6 custom-modal-scrollbar">
                <form onSubmit={handleVerifySubmit} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {renderDocCard("01", "KYC - Owner", "Aadhaar Card / PAN Card / Passport of owner", "aadhar", aadharCard, "image/*,application/pdf", true, User)}
                  <div className="bg-white rounded-none border border-sand-200 p-6 shadow-sm flex flex-col justify-between min-h-[18rem] h-auto relative overflow-hidden transition-all duration-300 hover:shadow-premium hover:border-terracotta group">
                    <div className="absolute top-0 left-0 bg-terracotta text-white font-black text-[10px] tracking-wider px-3.5 py-1.5 rounded-none shadow-sm">02</div>
                    <div className="flex flex-col items-center flex-1 w-full">
                      <div className="w-14 h-14 rounded-none bg-sand-50 border border-sand-200 flex items-center justify-center mb-4 group-hover:bg-terracotta/5 transition-colors">
                        <FileText className="w-6 h-6 text-terracotta" />
                      </div>
                      <h4 className="text-sm font-black text-charcoal text-center mb-1">PAN Card Number <span className="text-red-500 font-bold ml-1">*</span></h4>
                      <p className="text-[11px] text-charcoal-muted font-bold text-center mb-4 leading-normal max-w-[90%]">Enter owner PAN number or mark Not Applicable.</p>
                      <div className="w-full text-left">
                        <label className="text-[8px] font-black text-charcoal-muted uppercase tracking-widest block mb-1">PAN Number</label>
                        <input
                          type="text"
                          placeholder="ABCDE1234F"
                          value={panNumber === 'NOT_APPLICABLE' ? 'Not Applicable' : panNumber}
                          onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                          onBlur={() => savePanNumberDraft()}
                          className={`w-full px-3 py-2 border rounded-none text-[11px] outline-none font-semibold ${panNumber && !isValidPanNumber(panNumber) ? 'border-red-300 focus:border-red-500' : 'border-sand-200 focus:border-terracotta'}`}
                        />
                        {panNumber && !isValidPanNumber(panNumber) && (
                          <p className="mt-1 text-[9px] font-bold text-red-600">Use ABCDE1234F format or select Not Applicable.</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={markPanNotApplicable}
                        className="mt-3 w-full border border-sand-200 bg-sand-50 px-3 py-2 text-[9px] font-black uppercase tracking-wider text-charcoal hover:border-terracotta transition-colors"
                      >
                        Not Applicable
                      </button>
                      {panNumber && isValidPanNumber(panNumber) && (
                        <span className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-600 border border-amber-200 rounded-full text-[9px] font-black uppercase tracking-wider">
                          <Clock className="w-3 h-3" />
                          Pending
                        </span>
                      )}
                    </div>
                  </div>
                  {renderDocCard("03", "Property Documents", "Property Tax / Water Tax / MSEB Bill", "property", propertyProof, "image/*,application/pdf", true, Building2)}
                  {renderDocCard("04", "Society NOC", "If not a society, then Neighbour NOC", "society", societyNoc, "image/*,application/pdf", false, Users)}
                  {renderDocCard("05", "Cancelled Cheque / Bank Statement", "Latest cancelled cheque or bank statement", "cheque", cancelledCheque, "image/*,application/pdf", true, Landmark)}
                  {renderDocCard("06", "Shop Act License", "Shop Act registration copy of the business", "shop_act", shopAct, "image/*,application/pdf", true, FileText)}
                  {renderDocCard("07", "GST Document", "GST Certificate / GST Registration (Optional)", "gst", gstCertificate, "image/*,application/pdf", false, Briefcase)}
                </div>
                <div style={{ display: 'none' }}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   {/* Card 1: Aadhar Card */}
                   <div className="bg-white p-6 rounded-2xl border border-gray-100 flex flex-col justify-between min-h-[12rem] h-auto group hover:border-terracotta transition-all">
                     <div>
                       <div className="flex justify-between items-start mb-4">
                         <span className="text-[10px] font-bold tracking-tight text-terracotta uppercase tracking-widest bg-terracotta/5 px-3 py-1 rounded-full">Mandatory</span>
                         {aadharCard && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                       </div>
                       <h4 className="text-lg font-bold tracking-tight text-charcoal mb-1">Aadhar Card</h4>
                       <p className="text-xs text-charcoal-muted font-bold">Upload front and back side in a single image or PDF.</p>
                       {aadharCard && (
                         <div className="mt-2 text-xs text-sage font-medium truncate flex items-center bg-stone/50 px-2 py-1 rounded-lg border border-gray-100">
                           <FileText className="w-3.5 h-3.5 mr-1.5 flex-shrink-0 text-sage" />
                           <span className="truncate" title={getFileName(aadharCard)}>{getFileName(aadharCard)}</span>
                         </div>
                       )}
                     </div>
                     <div className="mt-4">
                       <label className="w-full flex items-center justify-center px-4 py-3 bg-stone hover:bg-gray-50 text-charcoal font-bold text-[10px] uppercase tracking-widest rounded-xl cursor-pointer transition-colors border border-gray-100">
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
                   <div className="bg-white p-6 rounded-2xl border border-gray-100 flex flex-col justify-between min-h-[12rem] h-auto group hover:border-terracotta transition-all">
                     <div>
                       <div className="flex justify-between items-start mb-4">
                         <span className="text-[10px] font-bold tracking-tight text-terracotta uppercase tracking-widest bg-terracotta/5 px-3 py-1 rounded-full">Mandatory</span>
                         {propertyProof && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                       </div>
                       <h4 className="text-lg font-bold tracking-tight text-charcoal mb-1">Property Ownership Proof</h4>
                       <p className="text-xs text-charcoal-muted font-bold">Electricity bill, index-2, registry document, etc.</p>
                       {propertyProof && (
                         <div className="mt-2 text-xs text-sage font-medium truncate flex items-center bg-stone/50 px-2 py-1 rounded-lg border border-gray-100">
                           <FileText className="w-3.5 h-3.5 mr-1.5 flex-shrink-0 text-sage" />
                           <span className="truncate" title={getFileName(propertyProof)}>{getFileName(propertyProof)}</span>
                         </div>
                       )}
                     </div>
                     <div className="mt-4">
                       <label className="w-full flex items-center justify-center px-4 py-3 bg-stone hover:bg-gray-50 text-charcoal font-bold text-[10px] uppercase tracking-widest rounded-xl cursor-pointer transition-colors border border-gray-100">
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
                   <div className="bg-white p-6 rounded-2xl border border-gray-100 flex flex-col justify-between min-h-[12rem] h-auto group hover:border-terracotta transition-all">
                     <div>
                       <div className="flex justify-between items-start mb-4">
                         <span className="text-[10px] font-bold tracking-tight text-terracotta uppercase tracking-widest bg-terracotta/5 px-3 py-1 rounded-full">Mandatory</span>
                         {cancelledCheque && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                       </div>
                       <h4 className="text-lg font-bold tracking-tight text-charcoal mb-1">Cancelled Cheque / Passbook</h4>
                       <p className="text-xs text-charcoal-muted font-bold">To verify bank details for secure payouts.</p>
                       {cancelledCheque && (
                         <div className="mt-2 text-xs text-sage font-medium truncate flex items-center bg-stone/50 px-2 py-1 rounded-lg border border-gray-100">
                           <FileText className="w-3.5 h-3.5 mr-1.5 flex-shrink-0 text-sage" />
                           <span className="truncate" title={getFileName(cancelledCheque)}>{getFileName(cancelledCheque)}</span>
                         </div>
                       )}
                     </div>
                     <div className="mt-4">
                       <label className="w-full flex items-center justify-center px-4 py-3 bg-stone hover:bg-gray-50 text-charcoal font-bold text-[10px] uppercase tracking-widest rounded-xl cursor-pointer transition-colors border border-gray-100">
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
                   <div className="bg-white p-6 rounded-2xl border border-gray-100 flex flex-col justify-between min-h-[12rem] h-auto group hover:border-terracotta transition-all">
                     <div>
                       <div className="flex justify-between items-start mb-2">
                         <span className="text-[10px] font-bold tracking-tight text-charcoal-muted uppercase tracking-widest bg-stone px-3 py-1 rounded-full">If Applicable</span>
                         {(gstCertificate || gstNumber) && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                       </div>
                       <h4 className="text-base font-bold tracking-tight text-charcoal mb-1">GST Certificate / GST Number</h4>
                       <input
                         type="text"
                         placeholder="Enter GST Number"
                         value={gstNumber}
                         onChange={(e) => setGstNumber(e.target.value)}
                         onBlur={saveGstNumberDraft}
                         className="w-full px-3 py-1.5 border border-gray-100 rounded-xl text-xs outline-none focus:border-terracotta mb-2"
                       />
                       {gstCertificate && (
                         <div className="mt-1 mb-2 text-xs text-sage font-medium truncate flex items-center bg-stone/50 px-2 py-1 rounded-lg border border-gray-100">
                           <FileText className="w-3.5 h-3.5 mr-1.5 flex-shrink-0 text-sage" />
                           <span className="truncate" title={getFileName(gstCertificate)}>{getFileName(gstCertificate)}</span>
                         </div>
                       )}
                     </div>
                     <div>
                       <label className="w-full flex items-center justify-center px-4 py-2 bg-stone hover:bg-gray-50 text-charcoal font-bold text-[9px] uppercase tracking-widest rounded-xl cursor-pointer transition-colors border border-gray-100">
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

                </div>
                {/* Card 5: X-Space360 GRP & Owner (Host) Agreement */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 group hover:border-terracotta transition-all mt-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-start space-x-4">
                      <div className="bg-terracotta/5 p-3 rounded-xl text-terracotta">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="text-lg font-bold tracking-tight text-charcoal">X-Space360 GRP & Owner (Host) Agreement.</h4>
                          <span className="text-[10px] font-bold tracking-tight text-terracotta uppercase tracking-widest bg-terracotta/5 px-2 py-0.5 rounded-md">Mandatory</span>
                        </div>
                        <p className="text-xs text-charcoal-muted font-bold mt-1">Review the X-space360 platform T&C - Mutual Agreement between Host & X-space360 enter details and sign.</p>
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
                        className="px-6 py-3 bg-charcoal hover:bg-terracotta text-white rounded-xl text-[10px] font-bold tracking-tight uppercase tracking-widest transition-all shadow-subtle flex items-center"
                      >
                        <Edit3 className="w-4 h-4 mr-2" />
                        {agreementSignature ? 'Edit & Re-sign' : 'Review & Sign'}
                      </button>
                    </div>
                  </div>
                </div>



                {/* Terms Consent */}
                <label className="flex items-start gap-4 bg-white rounded-2xl border border-gray-100 p-5 cursor-pointer hover:border-terracotta transition-all">
                  <input
                    type="checkbox"
                    checked={verificationConsent}
                    onChange={(e) => setVerificationConsent(e.target.checked)}
                    className="mt-1 w-5 h-5 rounded border-gray-200 text-terracotta focus:ring-terracotta cursor-pointer"
                    data-testid="host-verification-consent-checkbox"
                    required
                  />
                  <span className="text-xs md:text-sm text-charcoal-light font-bold leading-relaxed">
                    I confirm the submitted details are true, consent to verification, and accept the <LegalLinks context="host_verification" />.
                  </span>
                </label>

                {/* Submit button */}
                <div className="pt-6 border-t border-gray-100 flex space-x-4">
                  <button
                    type="button"
                    onClick={() => setShowVerificationModal(false)}
                    className="flex-1 py-4 text-charcoal-muted hover:text-charcoal font-bold tracking-tight text-xs uppercase tracking-widest transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={verificationSubmitting || !aadharCard || !propertyProof || !cancelledCheque || !shopAct || !agreementSignature || !verificationConsent}
                    className="flex-1 btn-premium py-4 shadow-premium disabled:opacity-40"
                  >
                    {verificationSubmitting ? 'Submitting...' : 'Submit for Verification'}
                                    </button>
                </div>
              </form>
            </div>
          </div>
        </div>
        )}

        {/* Agreement Signing Modal */}
        {showAgreementModal && (
          <div className="fixed inset-0 bg-charcoal/60 backdrop-blur-md z-[110] flex items-center justify-center p-6 overflow-y-auto">
            <div className="bg-white rounded-[3rem] p-10 max-w-2xl w-full shadow-elevated animate-scale-up max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-2xl font-bold tracking-tight text-charcoal tracking-tight mb-1">X-Space360 Agreement</h3>
                  <span className="text-[10px] font-bold tracking-tight text-charcoal-muted uppercase tracking-widest">Review and draw signature below</span>
                </div>
                <button onClick={() => setShowAgreementModal(false)} className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-charcoal-muted hover:text-terracotta transition-colors">
                  <Plus className="w-5 h-5 rotate-45" />
                </button>
              </div>

              <div className="bg-stone p-6 rounded-2xl h-56 overflow-y-auto mb-6 border border-gray-100 select-text">
                <p className="font-black mb-4 text-sm text-charcoal uppercase tracking-[0.16em]">{agreementContent.title || DEFAULT_HOST_AGREEMENT_TITLE}</p>
                <div className="prose prose-sm max-w-none text-charcoal-light prose-headings:text-charcoal prose-headings:font-black prose-h2:text-base prose-h2:uppercase prose-h2:tracking-[0.12em] prose-h3:text-sm prose-h3:uppercase prose-h3:tracking-[0.1em] prose-p:leading-7 prose-p:text-justify prose-li:leading-7 prose-strong:text-charcoal">
                <ReactMarkdown>{agreementContent.agreement_text || ''}</ReactMarkdown>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold tracking-tight text-charcoal-muted uppercase tracking-widest block mb-1.5 font-bold">Owner Name (Full Name)</label>
                    <input
                      type="text"
                      required
                      placeholder="Full Name as per Pancard"
                      value={agreementOwnerName}
                      onChange={(e) => setAgreementOwnerName(e.target.value)}
                      className="w-full border-2 border-gray-100 rounded-xl px-4 py-2.5 outline-none focus:border-terracotta font-semibold text-charcoal text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold tracking-tight text-charcoal-muted uppercase tracking-widest block mb-1.5 font-bold">Owner Address</label>
                    <input
                      type="text"
                      required
                      placeholder="Enter Address as per Adharcard"
                      value={agreementOwnerAddress}
                      onChange={(e) => setAgreementOwnerAddress(e.target.value)}
                      className="w-full border-2 border-gray-100 rounded-xl px-4 py-2.5 outline-none focus:border-terracotta font-semibold text-charcoal text-sm"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5 flex-wrap gap-2">
                    <div className="flex items-center space-x-4 flex-wrap gap-2">
                      <label className="text-xs font-bold tracking-tight text-charcoal-muted uppercase tracking-widest font-bold">Draw Signature</label>
                      
                      {/* Pen thickness control */}
                      <div className="flex items-center space-x-2 bg-gray-50/80 px-2 py-0.5 rounded-lg border border-gray-100">
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
                      <div className="flex items-center space-x-1.5 bg-gray-50/80 px-2 py-0.5 rounded-lg border border-gray-100">
                        <span className="text-[9px] font-bold text-charcoal-muted uppercase tracking-wider">Box:</span>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm('Changing the box size will clear your current signature. Do you want to proceed?')) {
                              setCanvasHeight(120);
                              clearCanvas();
                            }
                          }}
                          className={`px-1.5 py-0.5 rounded text-[8px] font-bold tracking-tight uppercase tracking-wider transition-all ${
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
                          className={`px-1.5 py-0.5 rounded text-[8px] font-bold tracking-tight uppercase tracking-wider transition-all ${
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
                      className="text-[10px] font-bold tracking-tight text-terracotta hover:underline uppercase tracking-wider"
                    >
                      Clear Signature
                    </button>
                  </div>
                  <div className="border-2 border-dashed border-gray-200 rounded-2xl bg-stone/50 p-2 overflow-hidden flex justify-center items-center">
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
                      className="w-full bg-white rounded-xl shadow-inner border border-gray-100 cursor-crosshair touch-none transition-all duration-300"
                      style={{ height: `${canvasHeight}px` }}
                    />
                  </div>
                  <span className="text-[9px] text-charcoal-muted block mt-1">Draw your signature inside the box using mouse, trackpad, or touch screen. You can adjust the pen stroke and drawing box size using the controls above.</span>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-gray-100 flex space-x-4">
                <button
                  type="button"
                  onClick={() => setShowAgreementModal(false)}
                  className="flex-1 py-4 text-charcoal-muted hover:text-charcoal font-bold tracking-tight text-xs uppercase tracking-widest transition-colors"
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

        {showAgreementSuccessModal && (
          <div className="fixed inset-0 bg-charcoal/60 backdrop-blur-sm z-[120] flex items-center justify-center p-6">
            <div className="bg-white rounded-3xl shadow-elevated border border-gray-100 w-full max-w-md p-8 animate-scale-up">
              <div className="w-14 h-14 rounded-2xl bg-terracotta/10 text-terracotta flex items-center justify-center mb-5">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold tracking-tight text-charcoal mb-2">Congratulations</h3>
              <p className="text-sm font-semibold text-charcoal-muted mb-8">
                Agreement signed successfully!
              </p>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowAgreementSuccessModal(false)}
                  className="min-w-[96px] rounded-2xl bg-terracotta px-6 py-3 text-sm font-bold text-white shadow-premium hover:bg-terracotta/90 transition"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}

        {showProfileModal && (
          <div className="fixed inset-0 bg-charcoal/60 backdrop-blur-md z-[200] flex items-center justify-center p-6">
            <div className="bg-white rounded-[2rem] p-8 max-w-lg w-full shadow-elevated border border-gray-100 animate-scale-up">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-2xl font-bold tracking-tight text-charcoal">Profile Details</h3>
                  <p className="text-[10px] font-bold text-charcoal-muted uppercase tracking-widest mt-1">Your registered account parameters</p>
                </div>
                <button 
                  onClick={() => setShowProfileModal(false)} 
                  className="w-8 h-8 rounded-full bg-stone flex items-center justify-center text-charcoal-muted hover:text-terracotta transition-all"
                >
                  <Plus className="w-5 h-5 rotate-45" />
                </button>
              </div>

              <div className="flex items-center space-x-4 mb-6 p-4 bg-stone rounded-2xl">
                <div className="w-14 h-14 rounded-xl bg-terracotta text-white flex items-center justify-center text-xl font-bold">
                  {user?.full_name?.[0]}
                </div>
                <div>
                  <h4 className="text-lg font-bold text-charcoal">{user?.full_name}</h4>
                  <span className="inline-block px-2.5 py-0.5 mt-1 bg-charcoal text-white rounded-full text-[9px] font-bold uppercase tracking-widest">
                    {user?.role}
                  </span>
                </div>
              </div>

              <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
                <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
                  <div className="grid grid-cols-1 divide-y divide-gray-100 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
                    <ProfileInfoItem label="User ID" value={user?.user_id || 'N/A'} mono />
                    <ProfileInfoItem label="System UID / Code" value={user?.uid || 'N/A'} mono />
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-100 bg-stone/40 p-4">
                  <p className="mb-3 text-[9px] font-black uppercase tracking-widest text-terracotta">Contact & Verification</p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <ProfileMiniField label="Email Address" value={user?.email || 'N/A'} />
                    <ProfileMiniField label="Phone Number" value={user?.phone || 'N/A'} />
                    <ProfileMiniField label="City" value={user?.city || 'N/A'} />
                    <div className="rounded-xl border border-gray-100 bg-white px-3 py-2.5">
                      <span className="text-[8px] font-bold text-charcoal-muted uppercase tracking-wider block">KYC Status</span>
                      <span className="inline-block mt-1 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider bg-stone text-charcoal">
                        {user?.kyc_status || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-100 bg-white p-4">
                  <p className="mb-3 text-[9px] font-black uppercase tracking-widest text-terracotta">Assigned Network</p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-gray-100 bg-stone/60 p-4">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="text-[8px] font-bold text-charcoal-muted uppercase tracking-wider block">Broker / RM Code</span>
                        <span className="rounded-full border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-emerald-700">
                          {profilePrimaryAssignmentType}
                        </span>
                      </div>
                      <span className="block text-xs font-mono font-semibold text-charcoal break-all">{profilePrimaryAssignmentCode}</span>
                      {profilePrimaryAssignmentName && (
                        <span className="mt-1 block text-[10px] font-bold text-charcoal-muted break-all">{profilePrimaryAssignmentName}</span>
                      )}
                    </div>
                    <div className="rounded-2xl border border-gray-100 bg-stone/60 p-4">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="text-[8px] font-bold text-charcoal-muted uppercase tracking-wider block">Branch Manager / RM Code</span>
                        <span className="rounded-full border border-amber-100 bg-amber-50 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-amber-700">
                          {profileSecondaryAssignmentType}
                        </span>
                      </div>
                      <span className="block text-xs font-mono font-semibold text-charcoal break-all">{profileSecondaryAssignmentCode}</span>
                      {profileSecondaryAssignmentName && (
                        <span className="mt-1 block text-[10px] font-bold text-charcoal-muted break-all">{profileSecondaryAssignmentName}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-gray-100 flex justify-end">
                <button 
                  onClick={() => setShowProfileModal(false)}
                  className="btn-premium px-8 py-3 shadow-premium text-xs uppercase tracking-widest font-bold"
                >
                  Close Details
                </button>
              </div>
            </div>
          </div>
        )}
        <HostSupportWidget context="host_dashboard" />
      </div>
    </div>
  );
};

const ProfileInfoItem = ({ label, value, mono = false }) => (
  <div className="p-4">
    <span className="mb-1 block text-[8px] font-bold uppercase tracking-wider text-charcoal-muted">{label}</span>
    <span className={`block text-xs font-semibold text-charcoal break-all ${mono ? 'font-mono' : ''}`}>{value}</span>
  </div>
);

const ProfileMiniField = ({ label, value }) => (
  <div className="rounded-xl border border-gray-100 bg-white px-3 py-2.5">
    <span className="mb-1 block text-[8px] font-bold uppercase tracking-wider text-charcoal-muted">{label}</span>
    <span className="block text-xs font-semibold text-charcoal break-all">{value}</span>
  </div>
);

export default HostDashboard;
