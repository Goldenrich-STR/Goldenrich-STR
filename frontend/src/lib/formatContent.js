import React from 'react';

/**
 * Transforms inline colon-separated lists into clean Markdown bullet points.
 * Example: "Location: Make sure... Total price: Check..." => 
 * "- **Location**: Make sure...\n- **Total price**: Check..."
 */
export const formatContentWithBullets = (text) => {
  if (!text) return '';
  let str = String(text).trim();

  // If text already has markdown bullets (- or * or 1.) or Markdown table (|), leave structure intact
  if (/^\s*[-*•]\s+/m.test(str) || /^\s*\|/m.test(str) || str.includes('|')) {
    return str;
  }

  // Look for lines or sentences like "Heading: Details..." or "Heading: Details"
  // Split into lines first
  const lines = str.split(/\r?\n/);
  const formattedLines = [];

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    // Pattern 1: Inline sentence-separated key-values like "Location: text. Total price: text."
    const inlineMatches = line.match(/([A-Z][a-zA-Z0-9\s\-/&]{1,35}):\s*([^.:]+(?:[.!?]|\b))/g);
    if (inlineMatches && inlineMatches.length > 1) {
      // Split inline multiple headings
      let tempLine = line;
      // Convert starting key: value
      tempLine = tempLine.replace(/^([A-Z][a-zA-Z0-9\s\-/&]{1,35}):\s*/, '- **$1**: ');
      // Convert subsequent key: values preceded by punctuation or space
      tempLine = tempLine.replace(/([.!?])\s+([A-Z][a-zA-Z0-9\s\-/&]{1,35}):\s*/g, '$1\n- **$2**: ');
      formattedLines.push(tempLine);
    } else if (/^([A-Z][a-zA-Z0-9\s\-/&]{1,35}):\s*(.+)/.test(line)) {
      // Pattern 2: Line starting with Key: Value
      formattedLines.push(line.replace(/^([A-Z][a-zA-Z0-9\s\-/&]{1,35}):\s*(.+)/, '- **$1**: $2'));
    } else {
      formattedLines.push(line);
    }
  }

  return formattedLines.join('\n\n');
};

export const markdownComponents = {
  h1: ({ node, ...props }) => <h1 className="text-2xl md:text-3xl font-extrabold text-charcoal mb-4 tracking-tight" {...props} />,
  h2: ({ node, ...props }) => <h2 className="text-xl md:text-2xl font-bold text-charcoal mt-6 mb-3 border-b pb-2 border-slate-100" {...props} />,
  h3: ({ node, ...props }) => <h3 className="text-lg font-bold text-charcoal mt-5 mb-2" {...props} />,
  p: ({ node, ...props }) => <p className="text-[14.5px] md:text-[15.5px] leading-relaxed text-charcoal-light mb-4 font-normal" {...props} />,
  ul: ({ node, ...props }) => <ul className="list-disc list-outside ml-6 mb-6 space-y-2.5 text-charcoal-light" {...props} />,
  ol: ({ node, ...props }) => <ol className="list-decimal list-outside ml-6 mb-6 space-y-2.5 text-charcoal-light" {...props} />,
  li: ({ node, ...props }) => <li className="leading-relaxed text-[14.5px] md:text-[15.5px] text-charcoal-light font-normal pl-1" {...props} />,
  strong: ({ node, ...props }) => <strong className="font-bold text-charcoal" {...props} />,
  em: ({ node, ...props }) => <em className="italic text-charcoal-muted" {...props} />,
  a: ({ node, ...props }) => <a className="font-bold text-terracotta hover:underline" {...props} />,
  table: ({ node, ...props }) => (
    <div className="overflow-x-auto my-6 border border-gray-300 rounded-xl shadow-sm bg-white">
      <table className="w-full text-left border-collapse text-sm" {...props} />
    </div>
  ),
  thead: ({ node, ...props }) => <thead className="bg-gray-100 border-b border-gray-300 font-bold text-charcoal" {...props} />,
  tbody: ({ node, ...props }) => <tbody className="divide-y divide-gray-200 text-charcoal-light" {...props} />,
  tr: ({ node, ...props }) => <tr className="hover:bg-amber-50/40 transition-colors" {...props} />,
  th: ({ node, ...props }) => <th className="px-4 py-3 font-bold border-r border-gray-200 last:border-r-0 text-charcoal" {...props} />,
  td: ({ node, ...props }) => <td className="px-4 py-3 border-r border-gray-200 last:border-r-0" {...props} />,
};
