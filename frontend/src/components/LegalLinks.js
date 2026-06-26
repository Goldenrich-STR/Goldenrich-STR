import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { cmsAPI } from '../services/api';

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
      ? { title: 'Terms & Conditions', text: legal.terms_text || DEFAULT_LEGAL.terms_text }
      : { title: 'Privacy Policy', text: legal.privacy_text || DEFAULT_LEGAL.privacy_text });
  };

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
          className="text-terracotta hover:underline"
        >
          Terms & Conditions
        </button>
        <span> and </span>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            openLegal('privacy');
          }}
          className="text-terracotta hover:underline"
        >
          Privacy Policy
        </button>
      </span>

      {modal && (
        <div className="fixed inset-0 z-[99999] bg-charcoal/60 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="bg-white rounded-3xl shadow-elevated border border-gray-100 w-full max-w-xl max-h-[85vh] overflow-y-auto p-7 md:p-9 animate-scale-in">
            <div className="flex items-start justify-between gap-6 mb-6">
              <h3 className="text-2xl font-bold tracking-tight text-charcoal">{modal.title}</h3>
              <button
                type="button"
                onClick={() => setModal(null)}
                className="w-10 h-10 rounded-full border border-gray-100 text-charcoal-muted hover:text-charcoal hover:bg-stone transition flex items-center justify-center"
                aria-label="Close legal details"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-charcoal-light leading-relaxed whitespace-pre-line">{modal.text}</p>
          </div>
        </div>
      )}
    </>
  );
};

export default LegalLinks;
