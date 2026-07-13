import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cmsAPI } from '../services/api';
import LegalDocument from './LegalDocument';

const DEFAULT_LEGAL = {
  privacy_label: 'Privacy Policy',
  privacy_text: '',
  terms_label: 'Terms & Conditions',
  terms_text: '',
};

const DEFAULT_CONTEXT_TEXTS = {
  guest_registration: `### Guest Registration Terms
1. **Account Creation**: By creating a guest account on X-Space360, you agree to provide true, accurate, and complete information. You are responsible for maintaining the confidentiality of your account credentials.
2. **Eligibility**: You must be at least 18 years old to register as a guest and book properties on X-Space360.
3. **Verification**: X-Space360 reserves the right to verify guest identity through Government KYC validation, including Aadhaar ID and mobile number verification, to maintain trust and security.
4. **Platform Rules**: You agree to follow all guest conduct rules, including respect for property owners, compliance with check-in/check-out guidelines, quiet hours, and cancellation policies.`,

  host_registration: `### Host Onboarding & Registration Terms
1. **Host Account & Listing**: To register as a host and list properties on X-Space360, you must provide verified personal information, including Government Aadhaar/KYC ID and valid contact details.
2. **Physical Verification**: Every host listing is subject to a physical audit visit and coordinate geolocation mapping by an assigned Relationship Manager (RM).
3. **Property Standards**: Hosts must ensure listed properties match physical descriptions, contain stated amenities, and comply with safety and quality standards.
4. **Subscription & Payments**: By onboarding, you agree to the selected subscription plan terms, including the 3-Month Free Trial, registration fees, and Razorpay double-signature payouts.`,

  booking: `### Property Booking Terms & Conditions
1. **Reservation & Checkout**: A booking is officially confirmed only after successful payment authentication and authorization.
2. **10-Minute Lock**: During checkout, a 10-minute calendar lock is placed to protect against duplicate reservations. If checkout is not completed, the lock is automatically released.
3. **Guest Compliance**: Guests must adhere to check-in/check-out timings, maximum occupancy limits, quiet hours, and specific house rules defined by the host.
4. **Fees & Charges**: Bookings are subject to base rates, applicable platform services fees, GST remittances, and security deposits (if configured).`,

  booking_cancellation: `### Cancellation & Refund Policy
1. **Policy Enforcement**: Cancellations are governed by the specific policy tier (Flexible, Moderate, or Strict) selected by the host and visible at checkout.
2. **Refund Authentication**: Approved refunds are settled compliantly to the original payment source within standard banking windows.
3. **Host Cancellations**: Host-initiated cancellations are strictly monitored and may trigger penalties, listing visibility downgrades, or RM reviews.`,

  host_verification: `### Host ID & Property Verification Agreement
1. **Mandatory Audit**: Hosts agree to schedule and coordinate an on-site audit visit with a Relationship Manager to verify coordinates, physical standards, and legitimacy.
2. **Coord Sync**: Geolocation coordinates mapped via Leaflet must match the physically verified boundaries to prevent clone or fake listings.
3. **KYC Verification**: Host profile verification requires government ID uploads and SMS-based OTP authorization.`,

  host_onboarding: `### Host Onboarding Guide & Agreement
1. **Onboarding Pipeline**: To activate a listing, hosts must complete account registration, KYC verification, RM physical inspection, and subscription tier selection.
2. **Elite Badge**: Successful verification awards a green trust badge and provides 2.5x discover index visibility.
3. **Support & Training**: Relationship Managers provide ongoing ticketer priority support, WhatsApp alerts, and dashboard training.`,

  host_terms: `### Host Terms & Conditions
1. **Platform Service**: Hosts grant X-Space360 a non-exclusive license to display, promote, and manage bookings for the host's properties.
2. **Payout Settlements**: Payouts are transferred net of platform service fees and GST compliance deductions directly to the verified bank ledger.
3. **Liability**: Hosts are responsible for maintaining property safety, insurance, tax-compliant records, and guest relations during stays.`
};

const legalTitleForContext = (context) => {
  switch (context) {
    case 'guest_registration':
      return 'Guest Registration Legal Terms';
    case 'host_registration':
      return 'Host Registration Legal Terms';
    case 'booking':
      return 'Booking Legal Terms';
    case 'booking_cancellation':
      return 'Cancellation Policy';
    case 'host_verification':
      return 'Host Verification Agreement';
    case 'host_onboarding':
      return 'Host Onboarding Agreement';
    case 'host_terms':
      return 'Host Terms & Conditions';
    default:
      return 'Legal Terms';
  }
};

const LegalLinks = ({ className = '', context = 'general' }) => {
  const [legal, setLegal] = useState(DEFAULT_LEGAL);
  const [modal, setModal] = useState(null);

  useEffect(() => {
    let mounted = true;
    cmsAPI.getLandingPage()
      .then((res) => {
        if (!mounted) return;
        setLegal({ ...DEFAULT_LEGAL, ...(res.data?.footer || {}), ...(res.data?.legal_terms || {}) });
      })
      .catch(() => {
        if (mounted) setLegal(DEFAULT_LEGAL);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const customDocs = Array.isArray(legal.custom_policies)
    ? legal.custom_policies.filter(policy => {
        if (policy?.status !== 'Active' || !policy?.text) return false;
        const placements = Array.isArray(policy.placements) ? policy.placements : [];
        return placements.includes(context);
      })
    : [];

  const contextDocs = context === 'general'
    ? [
        ...(legal.terms_text ? [{ title: legal.terms_label || 'Terms & Conditions', text: legal.terms_text }] : []),
        ...(legal.privacy_text ? [{ title: legal.privacy_label || 'Privacy Policy', text: legal.privacy_text }] : []),
      ]
    : (customDocs.length
        ? customDocs.map(policy => ({ title: policy.label || policy.title || 'Legal Policy', text: policy.text }))
        : [{ title: legalTitleForContext(context), text: DEFAULT_CONTEXT_TEXTS[context] || '' }]
      );

  const openLegal = (doc) => {
    setModal({
      type: legalTitleForContext(context),
      title: doc.title,
      text: doc.text || DEFAULT_CONTEXT_TEXTS[context] || 'No legal content is published at the moment.'
    });
  };

  const modalContent = modal ? createPortal(
    <div className="fixed inset-0 z-[99999] bg-charcoal/70 backdrop-blur-sm flex items-center justify-center px-4 py-6 normal-case tracking-normal">
      <div
        className="bg-white rounded-2xl shadow-elevated border border-gray-100 w-full max-w-4xl max-h-[88vh] overflow-hidden animate-scale-in"
        role="dialog"
        aria-modal="true"
        aria-labelledby="legal-dialog-title"
      >
        <div className="px-6 py-5 md:px-8 border-b border-gray-100 bg-white flex items-start justify-between gap-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-terracotta mb-2">
              {modal.type}
            </p>
            <h3 id="legal-dialog-title" className="text-2xl md:text-3xl font-bold tracking-tight text-charcoal">
              {modal.title}
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setModal(null)}
            className="w-10 h-10 rounded-full border border-gray-100 text-charcoal-muted hover:text-charcoal hover:bg-stone transition flex items-center justify-center shrink-0"
            aria-label="Close legal details"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="max-h-[calc(88vh-96px)] overflow-y-auto px-6 py-6 md:px-10 md:py-8">
          <div className="rounded-xl border border-gray-100 bg-stone/40 px-4 py-3 mb-5">
            <p className="text-xs leading-relaxed text-charcoal-muted">
              Please read this document carefully. It explains the agreement and policy terms that apply when you use X-Space360.
            </p>
          </div>
          <LegalDocument text={modal.text} />
        </div>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <>
      <span className={className}>
        {contextDocs.length ? contextDocs.map((doc, index) => (
          <React.Fragment key={`${doc.title}-${index}`}>
            {index > 0 && <span>{index === contextDocs.length - 1 ? ' and ' : ', '}</span>}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                openLegal(doc);
              }}
              className="text-terracotta hover:underline font-bold normal-case tracking-normal"
            >
              {doc.title}
            </button>
          </React.Fragment>
        )) : (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              openLegal({ title: legalTitleForContext(context), text: '' });
            }}
            className="text-terracotta hover:underline font-bold normal-case tracking-normal"
          >
            {legalTitleForContext(context)}
          </button>
        )}
      </span>

      {modalContent}
    </>
  );
};

export default LegalLinks;
