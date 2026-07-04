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
    : customDocs.map(policy => ({ title: policy.label || policy.title || 'Legal Policy', text: policy.text }));

  const openLegal = (doc) => {
    setModal({
      type: legalTitleForContext(context),
      title: doc.title,
      text: doc.text || 'No legal content is published at the moment.'
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
