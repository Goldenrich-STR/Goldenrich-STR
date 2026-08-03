import React from 'react';
import ReactMarkdown from 'react-markdown';

const markdownComponents = {
  h1: ({ node, ...props }) => <h1 className="text-2xl font-extrabold text-charcoal mb-4" {...props} />,
  h2: ({ node, ...props }) => <h2 className="text-xl font-extrabold text-charcoal mt-6 mb-3 border-b pb-2 border-slate-100" {...props} />,
  h3: ({ node, ...props }) => <h3 className="text-lg font-bold text-charcoal mt-5 mb-2" {...props} />,
  p: ({ node, ...props }) => <p className="text-[14.5px] leading-relaxed text-slate-600 mb-4 text-justify" {...props} />,
  ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-4 space-y-2 text-slate-600" {...props} />,
  ol: ({ node, ...props }) => <ol className="list-decimal pl-5 mb-4 space-y-2 text-slate-600 animate-fade-in" {...props} />,
  li: ({ node, ...props }) => <li className="leading-relaxed text-[14.5px]" {...props} />,
  strong: ({ node, ...props }) => <strong className="font-extrabold text-charcoal" {...props} />,
  a: ({ node, ...props }) => <a className="font-bold text-terracotta hover:underline" {...props} />,
};

const LegalDocument = ({ text = '' }) => {
  if (!text) {
    return (
      <p className="text-sm leading-relaxed text-charcoal-light">
        No legal content is available at the moment.
      </p>
    );
  }

  // Pre-process text to strip double titles or double headers if they exist
  let cleanedText = String(text || '');

  return (
    <article className="prose max-w-none text-left">
      <ReactMarkdown components={markdownComponents}>
        {cleanedText}
      </ReactMarkdown>
    </article>
  );
};

export default LegalDocument;
