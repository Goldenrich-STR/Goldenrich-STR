import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { CheckCircle, FileText, Shield } from 'lucide-react';
import SEO from '../components/SEO';
import { cmsAPI } from '../services/api';

const DEFAULT_LEGAL = {
  title: 'Legal Terms & Platform Policies',
  version: '2026.1',
  effective_date: '2026-07-03',
  terms_label: 'Terms & Conditions',
  terms_text: '',
  privacy_label: 'Privacy Policy',
  privacy_text: '',
  refund_label: 'Cancellation & Refund Policy',
  refund_text: '',
  custom_policies: []
};

const markdownComponents = {
  h1: ({ node, ...props }) => <h1 className="text-3xl font-black text-slate-950 mb-4" {...props} />,
  h2: ({ node, ...props }) => <h2 className="text-2xl font-black text-slate-950 mt-8 mb-3" {...props} />,
  h3: ({ node, ...props }) => <h3 className="text-lg font-bold text-slate-950 mt-6 mb-2" {...props} />,
  p: ({ node, ...props }) => <p className="text-[15px] leading-8 text-slate-700 mb-4" {...props} />,
  ul: ({ node, ...props }) => <ul className="list-disc pl-6 mb-4 space-y-2 text-slate-700" {...props} />,
  ol: ({ node, ...props }) => <ol className="list-decimal pl-6 mb-4 space-y-2 text-slate-700" {...props} />,
  li: ({ node, ...props }) => <li className="leading-7" {...props} />,
  strong: ({ node, ...props }) => <strong className="font-black text-slate-950" {...props} />,
  a: ({ node, ...props }) => <a className="font-bold text-terracotta hover:underline" {...props} />,
};

const slugify = (value) => String(value || '')
  .toLowerCase()
  .replace(/&/g, 'and')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '');

const LegalPage = () => {
  const location = useLocation();
  const [legalData, setLegalData] = useState(DEFAULT_LEGAL);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    cmsAPI.getLandingPage()
      .then((res) => {
        if (!mounted) return;
        setLegalData({ ...DEFAULT_LEGAL, ...(res.data?.footer || {}), ...(res.data?.legal_terms || {}) });
      })
      .catch(() => {
        if (mounted) setLegalData(DEFAULT_LEGAL);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const documents = useMemo(() => {
    const baseDocs = [
      legalData.terms_text ? {
        id: 'terms',
        type: 'policy',
        title: legalData.terms_label || 'Terms & Conditions',
        text: legalData.terms_text,
        status: 'Active',
      } : null,
      legalData.privacy_text ? {
        id: 'privacy',
        type: 'policy',
        title: legalData.privacy_label || 'Privacy Policy',
        text: legalData.privacy_text,
        status: 'Active',
      } : null,
      legalData.refund_text ? {
        id: 'refund-policy',
        type: 'policy',
        title: legalData.refund_label || 'Cancellation & Refund Policy',
        text: legalData.refund_text,
        status: 'Active',
      } : null,
    ].filter(Boolean);

    const customDocs = Array.isArray(legalData.custom_policies)
      ? legalData.custom_policies
          .filter(policy => policy?.status === 'Active' && policy?.text)
          .map(policy => ({
            id: policy.id || slugify(policy.title),
            type: policy.type || 'policy',
            title: policy.label || policy.title || 'Legal Policy',
            text: policy.text,
            status: policy.status || 'Active',
          }))
      : [];

    return [...baseDocs, ...customDocs];
  }, [legalData]);

  const pathParts = location.pathname.split('/').filter(Boolean);
  const requestedSlug = pathParts[0] === 'legal'
    ? (pathParts[1] || 'terms')
    : (pathParts[0] || 'terms');
  const selectedDoc = useMemo(() => {
    if (requestedSlug === 'terms') return documents.find(doc => doc.id === 'terms') || null;
    if (requestedSlug === 'privacy') return documents.find(doc => doc.id === 'privacy') || null;
    if (requestedSlug === 'refund-policy') return documents.find(doc => doc.id === 'refund-policy') || null;
    return documents.find(doc => slugify(doc.title) === requestedSlug || doc.id === requestedSlug) || documents[0] || null;
  }, [documents, requestedSlug]);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-950">
      <SEO
        title={selectedDoc?.title || legalData.title}
        description="Review X-Space360 legal terms, policies, privacy terms, refund rules, and platform agreements."
        canonicalUrl={`${window.location.origin}${location.pathname}`}
        type="website"
      />

      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-5 md:px-8 py-5 flex items-center justify-between">
          <Link to="/" className="inline-flex items-center">
            <img src="/logo.png" alt="X-Space360" className="h-9 w-auto object-contain" />
          </Link>
          <Link to="/" className="px-5 py-2.5 rounded-xl bg-charcoal text-white text-sm font-bold hover:bg-black transition">
            Back to Website
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-5 md:px-8 py-10">
        <div className="mb-8">
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-2">
            Legal / Platform Policies
          </p>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-950">
            {legalData.title || 'Legal Terms & Platform Policies'}
          </h1>
          <p className="text-sm text-slate-600 mt-2">
            Version {legalData.version || '2026.1'} · Effective {legalData.effective_date || '2026-07-03'}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-8">
          <aside className="lg:sticky lg:top-6 h-fit rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3 px-3 py-3 border-b border-slate-100 mb-2">
              <Shield className="w-5 h-5 text-terracotta" />
              <div>
                <p className="text-sm font-black text-slate-950">Documents</p>
                <p className="text-xs text-slate-500">{documents.length} published items</p>
              </div>
            </div>
            <nav className="space-y-1">
              {documents.length === 0 && (
                <p className="px-3 py-4 text-sm text-slate-500">No published legal policies are available.</p>
              )}
              {documents.map(doc => {
                const slug = doc.id === 'terms' || doc.id === 'privacy' || doc.id === 'refund-policy'
                  ? doc.id
                  : slugify(doc.title);
                const href = doc.id === 'terms'
                  ? '/terms'
                  : doc.id === 'privacy'
                    ? '/privacy'
                    : doc.id === 'refund-policy'
                      ? '/refund-policy'
                      : `/legal/${slug}`;
                const active = selectedDoc?.id === doc.id || selectedDoc?.title === doc.title;
                return (
                  <Link
                    key={`${doc.id}-${doc.title}`}
                    to={href}
                    className={`flex items-center justify-between gap-3 px-3 py-3 rounded-xl text-sm font-bold transition ${
                      active
                        ? 'bg-terracotta text-white shadow-sm'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      <span>{doc.title}</span>
                    </span>
                    {doc.status === 'Active' && <CheckCircle className="w-4 h-4" />}
                  </Link>
                );
              })}
            </nav>
          </aside>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm">
            {loading ? (
              <p className="text-slate-500">Loading legal document...</p>
            ) : selectedDoc ? (
              <>
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-5 mb-6 border-b border-slate-100">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-terracotta mb-2">
                      {selectedDoc?.type === 'agreement' ? 'Agreement' : 'Policy'}
                    </p>
                    <h2 className="text-2xl md:text-3xl font-black text-slate-950">
                      {selectedDoc?.title}
                    </h2>
                  </div>
                  <span className="inline-flex w-fit items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Published
                  </span>
                </div>

                <article className="prose max-w-none">
                  <ReactMarkdown components={markdownComponents}>
                    {selectedDoc?.text || 'No content is available for this legal document.'}
                  </ReactMarkdown>
                </article>
              </>
            ) : (
              <div className="text-center py-16">
                <Shield className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h2 className="text-2xl font-black text-slate-950">No Legal Policy Published</h2>
                <p className="text-sm text-slate-500 mt-2">Please publish a policy from Admin CMS to show it here.</p>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
};

export default LegalPage;
