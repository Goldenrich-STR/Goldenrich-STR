const plainMoney = (value) => Number(value || 0).toFixed(2);

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
  const text = String(value || '').trim();
  if (!text) return '';
  return text
    .replace(/[_-]+/g, ' ')
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
  const extraCharges = Number(
    booking.total_extra_charges
    ?? booking.extra_charges_total
    ?? booking.platform_fee
    ?? booking.service_fee
    ?? booking.convenience_fee
    ?? 0
  );
  const base = Math.max(0, Number(booking.customer_base_amount ?? booking.base_amount ?? (paid - extraCharges + discount)));
  return { base, extraCharges, discount, total, paid };
};

export const buildCustomerBookingInvoiceHtml = (booking = {}, property = {}, user = {}, options = {}) => {
  const amounts = getCustomerBookingAmounts(booking);
  const bookingId = booking.booking_id || booking.id || 'NA';
  const propertyName = property.title || property.property_name || property.name || booking.property?.title || booking.property_name || 'Property';
  const propertyAddress = [property.address, property.city, property.state, property.pin_code].filter(Boolean).join(', ') || booking.property_address || 'NA';
  const customerName = user.full_name || booking.customer_name || booking.guest_name || 'Customer';
  const customerPhone = user.phone || booking.guest_phone || booking.phone || 'NA';
  const customerEmail = user.email || booking.guest_email || booking.email || 'NA';
  const checkIn = booking.check_in_date || booking.check_in || booking.start_date;
  const checkOut = booking.check_out_date || booking.check_out || booking.end_date;
  const checkInTime = property.check_in_time || booking.property?.check_in_time || booking.check_in_time || '12:00';
  const checkOutTime = property.check_out_time || booking.property?.check_out_time || booking.check_out_time || '11:00';
  const checkInDisplay = [formatDate(checkIn), formatTime(checkInTime)].filter(Boolean).join(' ');
  const checkOutDisplay = [formatDate(checkOut), formatTime(checkOutTime)].filter(Boolean).join(' ');
  const nights = booking.nights || daysBetween(checkIn, checkOut);
  const guestCount = booking.number_of_guests || booking.guests || booking.guest_count || 'NA';
  const roomType = property.room_type || property.bhk_type || property.property_type || booking.room_type || booking.property_type || 'Standard';
  const paymentRef = booking.razorpay_payment_id || booking.upi_transaction_id || booking.payment_id || 'NA';
  const paymentMode = booking.payment_method || (booking.upi_transaction_id ? 'UPI' : 'Online Payment');
  const amenities = [
    ...asArray(property.amenities),
    ...asArray(property.top_amenities),
    ...asArray(booking.amenities),
  ];
  const uniqueAmenities = [...new Set(amenities.map(formatReadableText).filter(Boolean))].slice(0, 8);
  const displayAmenities = uniqueAmenities.length ? uniqueAmenities : ['Amenities as listed by host'];
  const fareRows = [
    ['Base Price', amounts.base],
    ['Tax', amounts.extraCharges],
    ['Discounts', -amounts.discount],
  ];
  const importantConditionsHtml = importantConditions.map((item) => `<li>${escapeHtml(item)}</li>`).join('');

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Booking ${escapeHtml(bookingId)}</title>
  <style>
    @page { size: A4; margin: 10mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { margin: 0; background: #f5f5f5; color: #111827; font-family: Arial, Helvetica, sans-serif; font-size: 12px; line-height: 1.42; }
    .toolbar { width: 190mm; max-width: calc(100vw - 28px); margin: 12px auto; display: ${options.hideToolbar ? 'none' : 'flex'}; justify-content: flex-end; gap: 10px; }
    .toolbar button { border: 1px solid #d8dee8; border-radius: 8px; background: #fff; padding: 10px 14px; font-weight: 800; cursor: pointer; }
    .toolbar .print { background: #007a4d; color: #fff; border-color: #007a4d; }
    .ticket { width: 190mm; max-width: calc(100vw - 28px); margin: 0 auto 20px; background: #fff; padding: 18px 22px 24px; border: 1px solid #e5e7eb; }
    .topbar { display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; border-bottom: 1px solid #d1d5db; padding-bottom: 12px; }
    .brand { display: flex; align-items: center; gap: 10px; }
    .brand img { width: 132px; height: 36px; object-fit: contain; object-position: left center; }
    .partner { font-size: 11px; color: #6b7280; font-weight: 700; margin-top: 3px; }
    .status { text-align: right; font-size: 11px; }
    .confirmed { color: #128a3a; font-size: 14px; font-weight: 900; }
    .section { padding: 13px 0; border-bottom: 1px solid #d1d5db; }
    h3 { margin: 0 0 10px; font-size: 13px; color: #111827; }
    h4 { margin: 0 0 5px; font-size: 11px; }
    .grid { display: grid; grid-template-columns: 94px 1fr; gap: 5px 12px; }
    .label { font-size: 10px; color: #374151; font-weight: 700; }
    .value { font-weight: 700; }
    .muted { color: #6b7280; font-weight: 500; }
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 22px; }
    .amenities { display: grid; grid-template-columns: repeat(3, 1fr); gap: 7px 18px; margin: 0; padding-left: 18px; }
    .fare { width: 100%; border-collapse: collapse; font-size: 11px; }
    .fare th { text-align: left; background: #eef6ff; color: #111827; padding: 8px; border: 1px solid #e5e7eb; }
    .fare td { padding: 7px 8px; border: 1px solid #e5e7eb; }
    .fare .amount { text-align: right; font-family: Consolas, 'Courier New', monospace; }
    .fare .total td { font-weight: 900; border-top: 1px solid #9ca3af; }
    .paid { margin-top: 8px; display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 11px; }
    .notice { background: #eaf4ff; border: 1px solid #cfe4ff; padding: 10px 12px; }
    .notice h3 { margin-bottom: 7px; }
    .notice ol { margin: 0; padding-left: 18px; }
    .notice li { margin: 0 0 5px; }
    .policy-block { margin-top: 8px; }
    .policy-block ol { margin: 0; padding-left: 18px; }
    .policy-block li { margin-bottom: 4px; }
    .contact { display: grid; grid-template-columns: 120px 1fr; gap: 4px 12px; }
    .amount-words { margin-top: 8px; font-size: 11px; font-weight: 800; }
    @media print {
      html, body { background: #fff; }
      body { font-size: 10pt; }
      .toolbar { display: none; }
      .ticket { width: 190mm; max-width: none; margin: 0 auto; border: 0; padding: 0; }
      .section { break-inside: avoid; page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  ${options.hideToolbar ? '' : `<div class="toolbar">
    <button class="print" onclick="window.print()">Print / Download PDF</button>
    <button onclick="window.close()">Close</button>
  </div>`}
  <main class="ticket">
    <header class="topbar">
      <div>
        <div class="brand">
          <img src="/logo.png" alt="X-Space360" />
        </div>
      </div>
      <div class="status">
        <div class="confirmed">Booking Confirmed</div>
        <div>Booking ID: <strong>${escapeHtml(bookingId)}</strong></div>
        <div>Payment Ref: <strong>${escapeHtml(paymentRef)}</strong></div>
        <div>Booked on: <strong>${escapeHtml(formatDateTime(booking.created_at))}</strong></div>
      </div>
    </header>

    <section class="section">
      <h3>Booking Details</h3>
      <div class="grid">
        <div class="label">Hotel Name:</div><div class="value">${escapeHtml(propertyName)}</div>
        <div class="label">Address:</div><div>${escapeHtml(propertyAddress)}</div>
        <div class="label">Check-In:</div><div><strong>${escapeHtml(checkInDisplay)}</strong>${checkInTime ? ' <span class="muted">(Local destination timings are mentioned)</span>' : ''}</div>
        <div class="label">Check-Out:</div><div><strong>${escapeHtml(checkOutDisplay)}</strong>${checkOutTime ? ' <span class="muted">(Local destination timings are mentioned)</span>' : ''}</div>
        <div class="label">Stay:</div><div><strong>${escapeHtml(nights)} ${property.category === 'commercial' || property.category === 'event_venue' ? 'Day(s)' : 'Night(s)'}</strong></div>
        <div class="label">Guest Name:</div><div class="value">${escapeHtml(customerName)}</div>
      </div>
    </section>

    <section class="section two-col">
      <div>
        <h3>Room</h3>
        <div class="grid">
          <div class="label">Room Type:</div><div class="value">${escapeHtml(roomType)}</div>
          <div class="label">No of Guest:</div><div>${escapeHtml(guestCount)}</div>
        </div>
      </div>
      <div>
        <h3>Payment Details</h3>
        <div class="grid">
          <div class="label">Mode:</div><div class="value">${escapeHtml(paymentMode)}</div>
          <div class="label">Status:</div><div class="value">${escapeHtml(booking.payment_status || 'Paid')}</div>
        </div>
      </div>
    </section>

    <section class="section">
      <h3>Top Amenities at This Property</h3>
      <ul class="amenities">${displayAmenities.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
    </section>

    <section class="section">
      <h3>Price Summary</h3>
      <table class="fare">
        <thead><tr><th>Price Details</th><th class="amount">Amount (Rs.)</th></tr></thead>
        <tbody>
          ${fareRows.map(([label, amount]) => `<tr><td>${escapeHtml(label)}</td><td class="amount">Rs. ${plainMoney(amount)}</td></tr>`).join('')}
          <tr class="total"><td>Total Price</td><td class="amount">Rs. ${plainMoney(amounts.paid)}</td></tr>
        </tbody>
      </table>
      <div class="paid">
        <div>Paid by Online Payment</div><div class="amount">Rs. ${plainMoney(amounts.paid)}</div>
      </div>
      <div class="amount-words">Amount in words: Indian Rupees ${escapeHtml(numberToWords(amounts.paid))} Only</div>
    </section>

    <section class="section">
      <h3>Contact Details</h3>
      <div class="contact">
        <div class="label">Guest Mobile</div><div>${escapeHtml(customerPhone)}</div>
        <div class="label">Guest Email</div><div>${escapeHtml(customerEmail)}</div>
        <div class="label">Contact Number</div><div>${escapeHtml(property.contact_phone || property.phone || booking.host_phone || '9225586001')}</div>
      </div>
    </section>

    <section class="section notice">
      <h3>Attention! Please read important hotel ticket information</h3>
      <ol>
        <li>This ticket is booked through X-Space360.</li>
        <li>Carry any valid photo ID during check-in. Modification and cancellation are subject to the refund policy below.</li>
        <li>Local destination check-in and check-out timings are maintained by the property.</li>
        <li>Additional services, damages, penalties, or property-level charges may be collected directly by the property if applicable.</li>
      </ol>
    </section>

    <section class="section notice">
      <h3>Important Conditions</h3>
      <ol>${importantConditionsHtml}</ol>
    </section>
  </main>
</body>
</html>`;
};

export const downloadCustomerBookingInvoice = (booking = {}, property = {}, user = {}) => {
  const invoiceNo = booking.invoice_no || booking.booking_invoice_no || booking.booking_id || 'booking-invoice';
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
