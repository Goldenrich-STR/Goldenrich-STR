import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cmsAPI } from '../services/api';
import LegalDocument from './LegalDocument';

const DEFAULT_LEGAL = {
  privacy_label: 'Privacy Policy',
  privacy_text: 'X-Space360 respects your privacy. We collect only the information needed to manage accounts, property listings, bookings, support, verification, and secure platform operations.',
  terms_label: 'Terms & Conditions',
  terms_text: 'By using X-Space360, users agree to follow booking, listing, verification, payment, cancellation, and platform conduct rules published by X-Space360.',
};

const LegalLinks = ({ className = '' }) => {
  const [legal, setLegal] = useState(DEFAULT_LEGAL);
  const [modal, setModal] = useState(null);

  useEffect(() => {
    let mounted = true;
    cmsAPI.getLandingPage()
      .then((res) => {
        if (!mounted) return;
        setLegal({ ...DEFAULT_LEGAL, ...(res.data?.footer || {}) });
      })
      .catch(() => {
        if (mounted) setLegal(DEFAULT_LEGAL);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const openLegal = (type) => {
    setModal(type === 'terms'
      ? { type: 'Terms Agreement', title: legal.terms_label || 'Terms & Conditions', text: legal.terms_text || DEFAULT_LEGAL.terms_text }
      : { type: 'Privacy Notice', title: legal.privacy_label || 'Privacy Policy', text: legal.privacy_text || DEFAULT_LEGAL.privacy_text });
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
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            openLegal('terms');
          }}
          className="text-terracotta hover:underline font-bold normal-case tracking-normal"
        >
          {legal.terms_label || 'Terms & Conditions'}
        </button>
        <span> and </span>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            openLegal('privacy');
          }}
          className="text-terracotta hover:underline font-bold normal-case tracking-normal"
        >
          {legal.privacy_label || 'Privacy Policy'}
        </button>
      </span>

      {modalContent}
    </>
  );
};

export default LegalLinks;
