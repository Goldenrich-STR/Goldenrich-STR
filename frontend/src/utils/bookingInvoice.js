const plainMoney = (value) => Math.round(Number(value || 0)).toLocaleString('en-IN');

const usefulInvoiceText = (...values) => {
  for (const value of values) {
    if (value === undefined || value === null) continue;
    const text = String(value).trim();
    if (text && !['NA', 'N/A', '-'].includes(text.toUpperCase())) return text;
  }
  return null;
};

const invoiceFinancialYear = (value) => {
  const date = value ? new Date(value) : new Date();
  const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;
  const year = safeDate.getFullYear();
  const startYear = safeDate.getMonth() + 1 >= 4 ? year : year - 1;
  return `${String(startYear).slice(-2)}-${String(startYear + 1).slice(-2)}`;
};

const bookingIdSuffix = (...values) => {
  const value = usefulInvoiceText(...values);
  if (!value) return null;
  const compact = String(value).replace(/[^a-z0-9]/gi, '').toUpperCase();
  return compact ? compact.slice(-5) : null;
};

const customerBookingInvoiceNo = (booking = {}) => {
  const explicit = usefulInvoiceText(
    booking.customer_invoice_no,
    booking.tax_invoice_no,
    booking.booking_invoice_no,
    booking.invoice_no,
    booking.invoice_number,
  );
  if (explicit?.toUpperCase().startsWith('STRC/')) return explicit;
  const suffix = bookingIdSuffix(booking.booking_id, booking.id, booking.transaction_id);
  if (suffix) return `STRC/${invoiceFinancialYear(booking.invoice_date || booking.created_at)}/${suffix}`;
  if (explicit?.toUpperCase().startsWith('STRB/')) return `STRC/${explicit.split('/').slice(1).join('/')}`;
  return explicit || 'NA';
};

const formatDate = (value) => {
  if (!value) return 'NA';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date
    .toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    .replace(/ /g, '-');
};

const formatDateTime = (value) => {
  if (!value) return 'NA';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).replace(',', '');
};

const formatTime = (value) => {
  if (!value) return '';
  const raw = String(value).trim();
  if (!raw) return '';
  const match = raw.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return raw;
  const hours = Number(match[1]);
  const minutes = match[2];
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours % 12 || 12;
  return `${displayHour}:${minutes} ${suffix}`;
};

const formatReadableText = (value) => {
  const rawValue = typeof value === 'object' && value !== null
    ? value.label || value.name || value.title || value.amenity || value.value || value.key
    : value;
  const text = String(rawValue || '').trim();
  if (!text) return '';
  const aliasKey = text.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  const aliases = {
    ac: 'Air Conditioning',
    air_conditioner: 'Air Conditioning',
    air_conditioning: 'Air Conditioning',
    tv: 'Smart TV',
    smart_tv: 'Smart TV',
    wifi: 'WiFi',
    wi_fi: 'WiFi',
    pool: 'Swimming Pool',
    swimming_pool: 'Swimming Pool',
    kitchen: 'Fully-Equipped Kitchen',
    fully_equipped_kitchen: 'Fully-Equipped Kitchen',
    gym: 'Fitness Center/Gym',
    fitness_center_gym: 'Fitness Center/Gym',
    washer: 'Washing Machine',
    washing_machine: 'Washing Machine',
    parking: 'Parking Space',
    parking_space: 'Parking Space',
  };
  if (aliases[aliasKey]) return aliases[aliasKey];
  const normalized = text.includes(' ')
    ? text.replace(/_+/g, ' ')
    : text.replace(/[_-]+/g, ' ');
  return normalized
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const escapeHtml = (value) =>
  String(value ?? 'NA')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const asArray = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string' && value.trim()) {
    return value.split(',').map((item) => item.trim()).filter(Boolean);
  }
  return [];
};

const EXTRA_CHARGE_LABELS = {
  platform_fee: 'Platform Fee',
  payment_gateway_charge: 'Payment Gateway Charge',
  convenience_fee: 'Convenience Fee',
  insurance_fee: 'Insurance Fee',
  cleaning_fee: 'Cleaning Fee',
  extra_guest_fee: 'Extra Guest Fee',
};

const getExtraChargeEntries = (booking = {}, totalExtraCharges = 0) => {
  const source = booking.extra_charges || booking.customer_charge_breakdown || booking.charge_breakdown || booking.applied_charges || {};
  const amountFor = (...keys) => keys.reduce((sum, key) => (
    sum + Number(source[key] ?? booking[key] ?? 0)
  ), 0);
  const platformAmount = amountFor('platform_fee', 'platform_charge', 'service_fee');
  const gatewayAmount = amountFor('payment_gateway_charge', 'gateway_charge', 'payment_gateway_fee', 'gateway_fee');
  const convenienceAmount = amountFor('convenience_fee', 'convenience_charge');
  const insuranceAmount = amountFor('insurance_fee', 'insurance_charge');
  const explicitCleaningAmount = amountFor('cleaning_fee');
  const extraGuestAmount = amountFor('extra_guest_fee', 'host_extra_guest_fee', 'extra_person_fee', 'extra_person_charge');
  const knownWithoutCleaning = platformAmount + gatewayAmount + convenienceAmount + insuranceAmount + extraGuestAmount;
  const residualCleaningAmount = Math.max(0, Number(totalExtraCharges || 0) - knownWithoutCleaning);
  const cleaningAmount = explicitCleaningAmount > 0 ? explicitCleaningAmount : residualCleaningAmount;

  return [
    {
      key: 'platform_fee',
      label: EXTRA_CHARGE_LABELS.platform_fee,
      amount: platformAmount,
    },
    {
      key: 'payment_gateway_charge',
      label: EXTRA_CHARGE_LABELS.payment_gateway_charge,
      amount: gatewayAmount,
    },
    {
      key: 'convenience_fee',
      label: EXTRA_CHARGE_LABELS.convenience_fee,
      amount: convenienceAmount,
    },
    {
      key: 'insurance_fee',
      label: EXTRA_CHARGE_LABELS.insurance_fee,
      amount: insuranceAmount,
    },
    {
      key: 'cleaning_fee',
      label: EXTRA_CHARGE_LABELS.cleaning_fee,
      amount: cleaningAmount,
    },
    {
      key: 'extra_guest_fee',
      label: EXTRA_CHARGE_LABELS.extra_guest_fee,
      amount: extraGuestAmount,
    },
  ];
};

const daysBetween = (start, end) => {
  const a = new Date(start);
  const b = new Date(end);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 1;
  return Math.max(1, Math.round((b - a) / (1000 * 60 * 60 * 24)));
};

const numberToWords = (amount) => {
  const n = Math.round(Number(amount || 0));
  if (n === 0) return 'Zero';
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const underHundred = (x) => (x < 20 ? ones[x] : `${tens[Math.floor(x / 10)]}${x % 10 ? ` ${ones[x % 10]}` : ''}`);
  const underThousand = (x) => `${x >= 100 ? `${ones[Math.floor(x / 100)]} Hundred${x % 100 ? ' ' : ''}` : ''}${x % 100 ? underHundred(x % 100) : ''}`;
  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const rest = n % 1000;
  return [
    crore ? `${underThousand(crore)} Crore` : '',
    lakh ? `${underThousand(lakh)} Lakh` : '',
    thousand ? `${underThousand(thousand)} Thousand` : '',
    rest ? underThousand(rest) : '',
  ].filter(Boolean).join(' ');
};

const importantConditions = [
  'Cancellation, modification, and refund charges are subject to the respective Host\'s policy.',
  'Quote your X-Space360 Booking ID for all booking-related communication.',
  'X-Space360 is not liable for cancellations or delays caused by Force Majeure events.',
  'Refunds will be processed only after confirmation from the respective Property Host.',
  'Refund timelines depend on banks and payment gateways.',
  'Your X-Space360 Booking ID is the official booking confirmation.',
  'Carry a digital or printed copy of your Booking Confirmation during check-in.',
  'A valid Government-issued Photo ID is mandatory for all guests at check-in.',
  'Additional charges (Security Deposit, Extra Guest Fees, Parking, etc.) must be paid directly to the Host, if applicable.',
  'Guests must comply with the property\'s House Rules, Check-in/Check-out timings, and Occupancy Policy.',
  'Any complaint must be reported to X-Space360 within 24 hours of check-in.',
  'X-Space360 acts only as a booking platform; the Host is responsible for the property and services.',
  'X-Space360 reserves the right to cancel bookings involving fraud, misuse, or policy violations.',
  'By confirming the booking, the Guest agrees to the X-Space360 Terms & Conditions, Refund Policy, and Privacy Policy.',
];

export const getCustomerBookingAmounts = (booking = {}) => {
  const total = Number(booking.total_amount || 0);
  const paid = Number(booking.paid_amount || booking.amount_paid || total || 0);
  const discount = Number(booking.discount_amount || booking.customer_discount_amount || 0);
  const explicitTaxes = Number(
    booking.gst_amount
    ?? booking.tax_amount
    ?? booking.taxes
    ?? (Number(booking.cgst || 0) + Number(booking.sgst || 0) + Number(booking.igst || 0))
    ?? 0
  );
  const taxes = Number.isFinite(explicitTaxes) ? explicitTaxes : 0;
  const extraCharges = Number(
    booking.extra_charges_total
    ?? booking.total_extra_charges
    ?? booking.platform_fee
    ?? booking.service_fee
    ?? booking.convenience_fee
    ?? 0
  );
  const base = Math.max(0, Number(booking.customer_base_amount ?? booking.base_amount ?? (paid - taxes - extraCharges + discount)));
  const taxable = Math.max(0, Number(booking.taxable_amount ?? (paid - taxes)));
  return { base, extraCharges, discount, total, paid, taxes, taxable };
};

export const buildCustomerBookingInvoiceHtml = (booking = {}, property = {}, user = {}, options = {}) => {
  const amounts = getCustomerBookingAmounts(booking);
  const extraChargeEntries = options.showExtraChargeBreakdown ? getExtraChargeEntries(booking, amounts.extraCharges) : [];
  const bookingId = booking.booking_id || booking.id || 'NA';
  const invoiceNo = customerBookingInvoiceNo(booking);
  const invoiceDate = formatDate(booking.created_at || new Date());
  const bookedOnDateTime = formatDateTime(booking.created_at || new Date());

  const propObj = booking.property || property || {};
  const propertyName = propObj.title || propObj.property_name || propObj.name || booking.property_name || propObj.property_id || booking.property_id || 'NA';
  const propertyAddress = [propObj.address, propObj.city, propObj.state, propObj.pin_code].filter(Boolean).join(', ') || booking.property_address || 'NA';
  
  const userObj = user || booking.user || booking.guest || {};
  const customerName = userObj.full_name || userObj.name || booking.customer_name || booking.guest_name || 'Guest';
  const customerPhone = userObj.phone || userObj.mobile || booking.guest_phone || booking.customer_phone || booking.phone || 'NA';
  const customerEmail = userObj.email || booking.guest_email || booking.customer_email || booking.email || 'NA';
  const customerGst = userObj.gst_number || userObj.gst_no || booking.guest_gst_number || booking.customer_gst_number || booking.gst_number || '';
  const roomType = propObj.room_type || propObj.bhk_type || propObj.property_type || booking.room_type || booking.property_type || 'Standard';

  const hostObj = propObj.host || property.host || booking.host || {};
  const ownerName = hostObj.full_name || hostObj.name || propObj.owner_name || booking.host_name || booking.owner_name || 'Property Owner';
  const ownerPhone = hostObj.phone || propObj.contact_phone || propObj.phone || booking.host_phone || 'NA';

  const checkIn = booking.check_in_date || booking.check_in || booking.start_date;
  const checkOut = booking.check_out_date || booking.check_out || booking.end_date;
  const checkInTime = propObj.check_in_time || booking.check_in_time || '12:00 PM';
  const checkOutTime = propObj.check_out_time || booking.check_out_time || '11:00 AM';
  const checkInDisplay = checkIn ? `${formatDate(checkIn)} ${checkInTime.includes('AM') || checkInTime.includes('PM') ? checkInTime : formatTime(checkInTime)}` : 'NA';
  const checkOutDisplay = checkOut ? `${formatDate(checkOut)} ${checkOutTime.includes('AM') || checkOutTime.includes('PM') ? checkOutTime : formatTime(checkOutTime)}` : 'NA';

  const nights = booking.nights || (checkIn && checkOut ? daysBetween(checkIn, checkOut) : 1);
  const guestCount = booking.number_of_guests || booking.guests || booking.guest_count || 'NA';
  const paymentRef = booking.razorpay_payment_id || booking.upi_transaction_id || booking.payment_id || booking.transaction_id || 'NA';
  const paymentMode = booking.payment_method || (booking.upi_transaction_id ? 'UPI' : 'Online Payment');

  const amenities = [
    ...asArray(propObj.amenities),
    ...asArray(propObj.top_amenities),
    ...asArray(booking.amenities),
  ];
  const uniqueAmenities = [...new Set(amenities.map(formatReadableText).filter(Boolean))].slice(0, 8);
  const displayAmenities = uniqueAmenities.length ? uniqueAmenities : ['Property Amenities as per listing'];

  const gstAmount = Number(
    booking.gst_amount
    ?? booking.tax_amount
    ?? booking.taxes
    ?? amounts.taxes
    ?? Math.max(0, amounts.paid - amounts.base - amounts.extraCharges + amounts.discount)
  );
  const cgst = Number(booking.cgst ?? (booking.igst ? 0 : gstAmount / 2));
  const sgst = Number(booking.sgst ?? (booking.igst ? 0 : gstAmount / 2));
  const taxableValue = Math.max(0, amounts.taxable || (amounts.base + amounts.extraCharges - amounts.discount));
  const publicAccommodationAmount = options.showExtraChargeBreakdown ? amounts.base : taxableValue;
  const accommodationDescription = `Accommodation / Property Booking – ${propertyName}<br />Stay: ${escapeHtml(nights)} Night | Room: ${escapeHtml(roomType)}`;

  const termsList = [
    'This ticket is booked through X-Space360.',
    'Carry any valid photo ID during check-in. Modification and cancellation are subject to the refund policy below.',
    'Local destination check-in and check-out timings are maintained by the property.',
    'Additional services, damages, penalties, or property-level charges may be collected directly by the property, if applicable.',
    'Cancellation, modification, and refund charges are subject to the respective Host\'s policy.',
    'Quote your X-Space360 Booking ID for all booking-related communication.',
    'X-Space360 is not liable for cancellations or delays caused by Force Majeure events.',
    'Refunds will be processed only after confirmation from the respective Property Host.',
    'Refund timelines depend on banks and payment gateways.',
    'Your X-Space360 Booking ID is the official booking confirmation.',
    'Carry a digital or printed copy of your Booking Confirmation during check-in.',
    'A valid Government-issued Photo ID is mandatory for all guests at check-in.',
    'Additional charges (Security Deposit, Extra Guest Fees, Parking, etc.) must be paid directly to the Host, if applicable.',
    'Guests must comply with the property\'s House Rules, Check-in/Check-out timings, and Occupancy Policy.',
    'Any complaint must be reported to X-Space360 within 24 hours of check-in.',
    'X-Space360 acts only as a booking platform; the Host is responsible for the property and services.',
    'X-Space360 reserves the right to cancel bookings involving fraud, misuse, or policy violations.',
    'By confirming the booking, the Guest agrees to the X-Space360 Terms & Conditions, Refund Policy, and Privacy Policy.',
  ];

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(invoiceNo)} - Tax Invoice</title>
  <style>
    @page { size: A4 portrait; margin: 8mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    html, body { margin: 0; padding: 0; width: 210mm; min-height: 297mm; background: #fff; color: #000; font-family: Arial, Helvetica, sans-serif; }
    body { font-size: 10px; line-height: 1.25; }
    .toolbar { width: 190mm; max-width: calc(100vw - 28px); margin: 12px auto; display: ${options.hideToolbar ? 'none' : 'flex'}; justify-content: flex-end; gap: 10px; }
    .toolbar button { border: 1px solid #d8dee8; border-radius: 8px; background: #fff; padding: 10px 14px; font-weight: 800; cursor: pointer; }
    .toolbar .print { background: #007a4d; color: #fff; border-color: #007a4d; }
    .invoice-page { width: 190mm; min-width: 190mm; margin: 0 auto 20px; background: #fff; }
    .invoice { border: 1px solid #000; background: #fff; color: #000; }
    .invoice-title { text-align: center; font-size: 12px; font-weight: 900; text-transform: uppercase; padding: 5px 6px; border-bottom: 1px solid #000; letter-spacing: 0; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; border-spacing: 0; }
    td, th { border: 1px solid #000; padding: 4px 6px; vertical-align: top; overflow-wrap: anywhere; color: #000; }
    th { background: #fff; font-size: 9px; text-align: left; vertical-align: middle; font-weight: 800; }
    
    .header-table td { border: none; border-bottom: 1px solid #000; }
    .header-table td.company-cell { width: 50%; border-right: 1px solid #000; padding: 6px; font-size: 8.5px; line-height: 1.25; }
    .header-table td.invoice-cell { width: 50%; padding: 6px; font-size: 8.5px; line-height: 1.35; }
    .logo-img { width: 140px; height: 38px; object-fit: contain; object-position: left center; display: block; margin-bottom: 4px; }
    .company-title { font-size: 11px; font-weight: 800; line-height: 1.15; margin-bottom: 2px; }

    .section-title { font-weight: 900; font-size: 9.5px; padding: 5px 6px; border-bottom: 1px solid #000; background: #fff; text-transform: uppercase; }
    
    .party-table td { border: none; border-bottom: 1px solid #000; width: 50%; padding: 6px; font-size: 8.5px; line-height: 1.35; }
    .party-table td.party-left { border-right: 1px solid #000; }

    .details-table td { border: none; border-bottom: 1px solid #000; font-size: 8.5px; vertical-align: middle; padding: 5px 6px; }
    .details-table td.label { width: 50%; font-weight: 900; border-right: 1px solid #000; }
    .details-table td.value { width: 50%; font-weight: 500; }

    .amenities-container { border-bottom: 1px solid #000; padding: 8px 10px; font-size: 8.5px; line-height: 1.35; }
    .amenities-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px 10px; }
    .amenity-item { border: 1px solid #e5e7eb; border-radius: 6px; background: #fff; padding: 6px 8px; font-weight: 800; color: #111; }

    .price-title { font-weight: 900; font-size: 9.5px; padding: 5px 6px; border-bottom: 1px solid #000; text-transform: lowercase; }
    .price-title::first-letter { text-transform: uppercase; }

    .price-table td, .price-table th { border: none; border-bottom: 1px solid #000; font-size: 8.5px; padding: 5px 6px; }
    .price-table th.desc, .price-table td.desc { width: 50%; border-right: 1px solid #000; }
    .price-table th.amount, .price-table td.amount { width: 50%; text-align: left; }
    .price-table tr:last-child td { border-bottom: 1px solid #000; }
    .price-table tr.total td { font-weight: 900; }

    .summary-table td, .terms-table td { border-left: 0; border-right: 0; border-top: 0; border-bottom: 1px solid #000; }
    .terms-table tr:last-child td { border-bottom: 0; }
    .summary-table td { font-size: 8.8px; padding: 8px 9px; }
    .terms-heading { font-weight: 900; font-size: 9px; text-transform: uppercase; padding: 8px 9px; }
    .terms { font-size: 8px; line-height: 1.45; padding: 0; }
    .terms ol { margin: 0; padding-left: 14px; }
    .terms li { margin-bottom: 4px; }
    .bold { font-weight: 900; }

    @media print {
      html, body { margin: 0 !important; padding: 0 !important; width: 210mm !important; min-height: 297mm !important; background: #fff !important; }
      .toolbar { display: none; }
      .invoice-page { width: 190mm !important; max-width: none !important; margin: 0 auto !important; }
      .invoice { border: 1px solid #000 !important; }
      table, tr, td, th { break-inside: avoid; page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  ${options.hideToolbar ? '' : `<div class="toolbar">
    <button class="print" onclick="window.print()">Print / Download PDF</button>
    <button onclick="window.close()">Close</button>
  </div>`}
  <main class="invoice-page">
    <section class="invoice">
      <div class="invoice-title">Tax Invoice</div>
      <table class="header-table">
        <tbody>
          <tr>
            <td class="company-cell">
              <img src="/logo.png" alt="X-Space360 Logo" class="logo-img" />
              <div class="company-title">Golden Rich Financial &amp; Real Estate Solutions Pvt. Ltd.</div>
              Office No-804, Royal Avaan Avenue, Opp. Bhosla School Gate,<br />
              Jehan Circle, Gangapur Road Nashik-422013<br />
              <span class="bold">GSTIN/UIN:</span> 27AAKCG1285C1ZP<br />
              <span class="bold">State Name :</span> Maharashtra, Code : 27<br />
              <span class="bold">Contact :</span> 9225586001<br />
              <span class="bold">Mail:</span> finance.director@goldenrichproperties.com
            </td>
            <td class="invoice-cell">
              Invoice No. : ${escapeHtml(invoiceNo)}<br />
              Invoice Date: ${escapeHtml(invoiceDate)}<br />
              <div style="border-top: 1px solid #000; margin: 4px -6px 0 -6px; padding-top: 4px; padding-left: 6px; padding-right: 6px;">
                <strong>Booking Confirmed</strong><br />
                Booking ID: ${escapeHtml(bookingId)}<br />
                Payment Ref.: ${escapeHtml(paymentRef)}<br />
                Booked on &ndash; ${escapeHtml(bookedOnDateTime)}
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <div class="section-title">BOOKING DETAILS</div>

      <table class="party-table">
        <tbody>
          <tr>
            <td class="party-left">
              <strong>Property Owner Details:</strong><br />
              ${escapeHtml(ownerName)}<br />
              Property: ${escapeHtml(propertyName)}<br />
              ${escapeHtml(propertyAddress)}<br />
              Contact No. ${escapeHtml(ownerPhone)}
            </td>
            <td>
              <strong>Guest Name:</strong><br />
              ${escapeHtml(customerName)}<br />
              Contact No. ${escapeHtml(customerPhone)}<br />
              Email: ${escapeHtml(customerEmail)}<br />
              GSTIN: ${customerGst ? escapeHtml(customerGst) : '27XXXXXXXXXXXXX [Optional]'}<br />
              Property / Hotel- ${escapeHtml(propertyName)}<br />
              Booking Status - Booking Confirmed<br />
              Room Type - ${escapeHtml(roomType)}
            </td>
          </tr>
        </tbody>
      </table>

      <table class="details-table">
        <tbody>
          <tr>
            <td class="label">Check-in</td>
            <td class="value">${escapeHtml(checkInDisplay)}</td>
          </tr>
          <tr>
            <td class="label">Check-out</td>
            <td class="value">${escapeHtml(checkOutDisplay)}</td>
          </tr>
          <tr>
            <td class="label">Stay</td>
            <td class="value">${escapeHtml(nights)} Night(s)</td>
          </tr>
          <tr>
            <td class="label">No of Guest</td>
            <td class="value">${escapeHtml(guestCount)}</td>
          </tr>
          <tr>
            <td class="label">Payment Mode / Status</td>
            <td class="value">${escapeHtml(paymentMode)} / ${escapeHtml(booking.payment_status || 'Paid')}</td>
          </tr>
        </tbody>
      </table>

      <div class="section-title">PROPERTY AMENITIES</div>
      <div class="amenities-container">
        <div class="amenities-grid">
          ${displayAmenities.map((item) => `<div class="amenity-item">• ${escapeHtml(item)}</div>`).join('')}
        </div>
      </div>

      <div class="price-title">Price summary</div>
      <table class="price-table">
        <thead>
          <tr>
            <th class="desc">Description</th>
            <th class="amount">Amount (Rs.)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="desc">${accommodationDescription}</td>
            <td class="amount">${plainMoney(publicAccommodationAmount)}</td>
          </tr>
          ${options.showExtraChargeBreakdown ? `<tr>
            <td class="desc">Discount</td>
            <td class="amount">${plainMoney(amounts.discount)}</td>
          </tr>` : ''}
          ${extraChargeEntries.map((item) => `
          <tr>
            <td class="desc">${escapeHtml(item.label)}</td>
            <td class="amount">${item.amount > 0 ? plainMoney(item.amount) : 'NA'}</td>
          </tr>`).join('')}
          <tr>
            <td class="desc">Taxable Value</td>
            <td class="amount">${plainMoney(taxableValue || amounts.base)}</td>
          </tr>
          <tr>
            <td class="desc">CGST</td>
            <td class="amount">${plainMoney(cgst)}</td>
          </tr>
          <tr>
            <td class="desc">SGST</td>
            <td class="amount">${plainMoney(sgst)}</td>
          </tr>
          <tr class="total">
            <td class="desc">Total Price</td>
            <td class="amount">${plainMoney(amounts.paid)}</td>
          </tr>
        </tbody>
      </table>

      <table class="summary-table">
        <tbody>
          <tr><td><strong>Amount Paid by ${escapeHtml(paymentMode)}:</strong> Rs. ${plainMoney(amounts.paid)}</td></tr>
          <tr><td><strong>Amount in Words:</strong> Indian Rupees ${escapeHtml(numberToWords(amounts.paid))} Only</td></tr>
        </tbody>
      </table>

      <table class="terms-table">
        <tbody>
          <tr><td class="terms-heading">TERMS &amp; CONDITIONS</td></tr>
          <tr>
            <td>
              <div class="terms">
                <ol>
                  ${termsList.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
                </ol>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  </main>
</body>
</html>`;
};

export const downloadCustomerBookingInvoice = (booking = {}, property = {}, user = {}) => {
  const invoiceNo = customerBookingInvoiceNo(booking) || booking.booking_id || 'booking-invoice';
  const invoiceHtml = buildCustomerBookingInvoiceHtml(booking, property, user);

  const printWindow = window.open('', 'xspace-booking-invoice', 'width=1100,height=900');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(invoiceHtml);
    printWindow.document.close();
    return;
  }

  const blob = new Blob([invoiceHtml], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${String(invoiceNo).replace(/[^a-z0-9_-]+/gi, '_')}.html`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};
