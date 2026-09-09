import React from 'react';

export default function PropertySelect({ properties, value, onChange, label = 'Property / Listing', disabled = false }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-xs font-bold uppercase text-slate-500">{label}</span>
      <select
        className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
        disabled={disabled || !properties.length}
        onChange={(event) => onChange(event.target.value)}
        value={value || ''}
      >
        {!properties.length && <option value="">No properties available</option>}
        {properties.map((property) => (
          <option key={property.id} value={property.id}>
            {property.name}{property.location ? ` - ${property.location}` : ''}
          </option>
        ))}
      </select>
    </label>
  );
}
