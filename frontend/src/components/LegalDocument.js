import React, { useMemo, useState } from 'react';

const isSectionHeading = (line) => {
  const letters = line.replace(/[^A-Za-z]/g, '');
  return letters.length >= 4 && line === line.toUpperCase() && line.length <= 90;
};

const normalizeLegalText = (text) => String(text || '')
  .replace(/\r\n/g, '\n')
  .replace(/\s+(INTRODUCTION|ACCEPTANCE AND BINDING NATURE|SCOPE OF SERVICES|USER ELIGIBILITY|PAYMENTS|CANCELLATION|REFUNDS|PRIVACY POLICY|TERMS & CONDITIONS)\s+/g, '\n$1\n')
  .replace(/(\.)(\s+)([A-Z][A-Za-z\s/&-]{3,60}\.)/g, '$1\n$3\n');

const LegalDocument = ({ text = '' }) => {
  const [expanded, setExpanded] = useState(false);
  const lines = useMemo(
    () => normalizeLegalText(text)
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean),
    [text]
  );
  const previewLimit = 6;
  const visibleLines = expanded ? lines : lines.slice(0, previewLimit);
  const hasMore = lines.length > previewLimit;

  if (!lines.length) {
    return (
      <p className="text-sm leading-7 text-charcoal-light">
        No legal content is available at the moment.
      </p>
    );
  }

  return (
    <article className="space-y-5 text-left text-charcoal">
      {visibleLines.map((line, index) => {
        if (/^last updated/i.test(line)) {
          return (
            <p key={`${line}-${index}`} className="text-xs font-semibold uppercase tracking-[0.12em] text-charcoal-muted">
              {line}
            </p>
          );
        }

        if (isSectionHeading(line)) {
          return (
            <h4 key={`${line}-${index}`} className="pt-3 text-sm font-black uppercase tracking-[0.16em] text-charcoal">
              {line}
            </h4>
          );
        }

        return (
          <p key={`${line}-${index}`} className="text-[15px] leading-8 text-charcoal-light text-justify">
            {line}
          </p>
        );
      })}
      {hasMore && !expanded && (
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="inline-flex min-h-[42px] items-center rounded-xl bg-charcoal px-5 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-charcoal/90"
          >
            Read More
          </button>
        </div>
      )}
    </article>
  );
};

export default LegalDocument;
