import React, { useId } from 'react';

export default function FestiveDiya({ className = '', label = 'Festive diya' }) {
  const gradientId = useId().replace(/:/g, '');
  const flameId = `diya-flame-${gradientId}`;
  const bowlId = `diya-bowl-${gradientId}`;

  return (
    <svg viewBox="0 0 64 64" className={className} role="img" aria-label={label}>
      <defs>
        <linearGradient id={flameId} x1="0" y1="1" x2="0.78" y2="0">
          <stop offset="0" stopColor="#f28a00" />
          <stop offset="0.5" stopColor="#ffc400" />
          <stop offset="1" stopColor="#fff48a" />
        </linearGradient>
        <linearGradient id={bowlId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8c0015" />
          <stop offset="0.58" stopColor="#d70b28" />
          <stop offset="1" stopColor="#8b0013" />
        </linearGradient>
      </defs>
      <path d="M33.2 4.5c1.3 7-5.6 10.9-5.6 17.1 0 4.7 2.8 8.1 6.4 9.7 4.5-2.4 7-6.1 6.5-10.5-.5-4.1-3.3-7.1-4.8-10.3-.9-1.9-1.4-3.9-1.3-6.2-.4.1-.8.1-1.2.2Z" fill={`url(#${flameId})`} />
      <path d="M34.4 15.2c.2 3.7-3.1 5.5-3.1 8.6 0 2.1 1.2 3.8 3 4.8 2.2-1.2 3.4-3 3.2-5.1-.2-2.5-2.1-4.3-3.1-8.3Z" fill="#fff7a3" />
      <path d="M27.8 31.8c2.3-1.9 5.8-2.2 8.6-.8" fill="none" stroke="#6f0010" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M6 32.5c7.8 2.6 16.5 3.9 26 3.9s18.2-1.3 26-3.9c-1.8 14.4-12.5 24.1-26 24.1S7.8 46.9 6 32.5Z" fill={`url(#${bowlId})`} />
      <path d="M6 32.5c8.4 1.6 17.1 2.4 26 2.4s17.6-.8 26-2.4c-5.9 4-15 6.3-26 6.3S11.9 36.5 6 32.5Z" fill="#720012" />
    </svg>
  );
}
