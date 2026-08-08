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
  const invoiceNo = booking.invoice_no || booking.booking_invoice_no || booking.transaction_id || bookingId;
  const propertyName = property.title || property.property_name || property.name || booking.property?.title || booking.property_name || 'Property';
  const propertyAddress = [property.address, property.city, property.state, property.pin_code].filter(Boolean).join(', ') || booking.property_address || 'NA';
  const customerName = user.full_name || booking.customer_name || booking.guest_name || 'Customer';
  const customerPhone = user.phone || booking.guest_phone || booking.phone || 'NA';
  const customerEmail = user.email || booking.guest_email || booking.email || 'NA';
  const customerAddress = [user.address, user.city, user.state, user.pin_code].filter(Boolean).join(', ') || booking.guest_address || booking.customer_address || 'NA';
  const customerGst = user.gst_number || user.gst_no || booking.guest_gst_number || booking.customer_gst_number || 'NA';
  const ownerName = property.host?.full_name || property.owner_name || booking.host_name || booking.property?.host?.full_name || 'Property Owner';
  const ownerPhone = property.contact_phone || property.phone || booking.host_phone || '9225586001';
  const ownerEmail = property.host?.email || property.owner_email || booking.host_email || 'NA';
  const ownerGst = property.gst_number || property.host?.gst_number || booking.host_gst_number || 'NA';
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
  const taxAmount = Math.max(0, amounts.extraCharges);
  const cgst = taxAmount / 2;
  const sgst = taxAmount / 2;
  const taxableValue = Math.max(0, amounts.paid - taxAmount);
  const accommodationDescription = `Accommodation / Property Booking - ${propertyName}<br />Stay: ${escapeHtml(nights)} Night(s) | Room: ${escapeHtml(roomType)}`;
  const importantConditionsHtml = importantConditions.map((item) => `<li>${escapeHtml(item)}</li>`).join('');

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
    body { font-size: 10px; line-height: 1.28; }
    .toolbar { width: 190mm; max-width: calc(100vw - 28px); margin: 12px auto; display: ${options.hideToolbar ? 'none' : 'flex'}; justify-content: flex-end; gap: 10px; }
    .toolbar button { border: 1px solid #d8dee8; border-radius: 8px; background: #fff; padding: 10px 14px; font-weight: 800; cursor: pointer; }
    .toolbar .print { background: #007a4d; color: #fff; border-color: #007a4d; }
    .invoice-page { width: 190mm; max-width: calc(100vw - 28px); margin: 0 auto 20px; background: #fff; }
    .invoice { border: 1.5px solid #000; background: #fff; color: #000; }
    .title { text-align: center; font-size: 13px; font-weight: 800; padding: 5px 0; border-bottom: 0.75px solid #444; letter-spacing: .2px; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; border-spacing: 0; }
    td, th { border: 0.75px solid #444; padding: 5px 6px; vertical-align: top; overflow-wrap: anywhere; color: #000; }
    th { background: #f7f7f7; font-size: 9px; text-align: center; vertical-align: middle; }
    .no-top td, .no-top th { border-top: 0; }
    .company-cell, .invoice-cell, .party-cell { width: 50%; }
    .company-cell { font-size: 9px; line-height: 1.22; }
    .company-name { font-size: 13px; font-weight: 800; line-height: 1.16; }
    .invoice-cell { padding: 0; }
    .invoice-cell table, .invoice-cell td { border-top: 0; border-right: 0; border-bottom: 0.75px solid #444; border-left: 0.75px solid #444; }
    .invoice-cell td { width: 50%; height: 29px; font-size: 9px; line-height: 1.2; }
    .invoice-cell .booking-box { height: 74px; font-weight: 700; }
    .field-label { display: block; color: #555; font-size: 8px; font-weight: 800; text-transform: uppercase; margin-bottom: 2px; }
    .confirmed { font-size: 12px; font-weight: 800; }
    .party-cell { height: 108px; font-size: 9px; line-height: 1.32; }
    .section-heading { text-align: center; font-weight: 800; font-size: 11px; padding: 5px; background: #fbfbfb; }
    .details-table td { height: 27px; font-size: 9px; vertical-align: middle; }
    .details-table .label { width: 16%; font-weight: 800; background: #fbfbfb; }
    .details-table .value { width: 34%; font-weight: 600; }
    .details-table .wide-value { width: 84%; }
    .amenities { padding: 7px 10px; font-size: 9px; line-height: 1.35; min-height: 34px; }
    .amenities span { display: inline-block; margin-right: 16px; white-space: nowrap; }
    .price-table th { font-size: 9px; padding: 6px; }
    .price-table td { font-size: 9.5px; padding: 6px; }
    .price-table .desc { width: 68%; }
    .price-table .amount { width: 32%; text-align: right; font-family: Consolas, 'Courier New', monospace; }
    .price-table .total td { font-weight: 800; background: #fbfbfb; }
    .paid-row td, .words-row td { font-size: 9.5px; padding: 7px 9px; }
    .terms { padding: 8px 11px 10px; font-size: 8.3px; line-height: 1.25; }
    .terms ol { margin: 5px 0 0; padding-left: 17px; }
    .terms li { margin-bottom: 2px; }
    .mono { font-family: Consolas, 'Courier New', monospace; }
    .right { text-align: right; }
    .center { text-align: center; }
    .bold { font-weight: 800; }
    @media print {
      html, body { margin: 0 !important; padding: 0 !important; width: 210mm !important; min-height: 297mm !important; background: #fff !important; }
      .toolbar { display: none; }
      .invoice-page { width: 190mm !important; max-width: none !important; margin: 0 auto !important; }
      .invoice { border: 1.5px solid #000 !important; }
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
      <div class="title">TAX INVOICE</div>
      <table>
        <tbody>
          <tr>
            <td class="company-cell" rowspan="2">
              <div class="company-name">X-SPACE360</div>
              <div class="bold">(Golden Rich Financial &amp; Real Estate Solutions Pvt. Ltd.)</div>
              Office No-804, Royal Avaan Avenue, Opp. Bhosla School Gate,<br />
              Jehan Circle, Gangapur Road, Nashik-422013<br />
              <span class="bold">GSTIN/UIN:</span> 27AAKCG1285C1ZP<br />
              <span class="bold">State Name:</span> Maharashtra, Code : 27<br />
              <span class="bold">Contact:</span> 9225586001<br />
              <span class="bold">Mail:</span> finance.director@goldenrichproperties.com
            </td>
            <td class="invoice-cell">
              <table>
                <tbody>
                  <tr>
                    <td><span class="field-label">Invoice No.</span><strong>${escapeHtml(invoiceNo)}</strong></td>
                    <td><span class="field-label">Invoice Date</span><strong>${escapeHtml(formatDate(booking.created_at || new Date()))}</strong></td>
                  </tr>
                  <tr>
                    <td><span class="field-label">Mode / Terms of Payment</span><strong>${escapeHtml(paymentMode)}</strong></td>
                    <td><span class="field-label">Reference No.</span><strong>${escapeHtml(paymentRef)}</strong></td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
          <tr>
            <td class="invoice-cell booking-box">
              <div class="confirmed">Booking Confirmed</div>
              Booking ID: <strong>${escapeHtml(bookingId)}</strong><br />
              Payment Ref.: <strong>${escapeHtml(paymentRef)}</strong><br />
              Booked on: <strong>${escapeHtml(formatDateTime(booking.created_at))}</strong>
            </td>
          </tr>
        </tbody>
      </table>

      <table class="no-top">
        <tbody>
          <tr>
            <td class="party-cell">
              <strong>Property Owner Details:</strong><br />
              ${escapeHtml(ownerName)}<br />
              Property: ${escapeHtml(propertyName)}<br />
              ${escapeHtml(propertyAddress)}<br />
              Contact No. ${escapeHtml(ownerPhone)}<br />
              Email: ${escapeHtml(ownerEmail)}<br />
              GSTIN: ${escapeHtml(ownerGst)}
            </td>
            <td class="party-cell">
              <strong>Guest Name:</strong><br />
              ${escapeHtml(customerName)}<br />
              Address: ${escapeHtml(customerAddress)}<br />
              Contact No. ${escapeHtml(customerPhone)}<br />
              Email: ${escapeHtml(customerEmail)}<br />
              GSTIN: ${escapeHtml(customerGst)}
            </td>
          </tr>
        </tbody>
      </table>

      <div class="section-heading">BUYER / BOOKING DETAILS</div>
      <table class="details-table no-top">
        <tbody>
          <tr>
            <td class="label">Guest Name</td><td class="value">${escapeHtml(customerName)}</td>
            <td class="label">Booking Status</td><td class="value">Booking Confirmed</td>
          </tr>
          <tr>
            <td class="label">Guest Mobile</td><td class="value">${escapeHtml(customerPhone)}</td>
            <td class="label">Guest Email</td><td class="value">${escapeHtml(customerEmail)}</td>
          </tr>
          <tr>
            <td class="label">Property / Hotel</td><td class="value">${escapeHtml(propertyName)}</td>
            <td class="label">Room Type</td><td class="value">${escapeHtml(roomType)}</td>
          </tr>
          <tr>
            <td class="label">Property Address</td><td class="value wide-value" colspan="3">${escapeHtml(propertyAddress)}</td>
          </tr>
          <tr>
            <td class="label">Check-in</td><td class="value">${escapeHtml(checkInDisplay)}</td>
            <td class="label">Check-out</td><td class="value">${escapeHtml(checkOutDisplay)}</td>
          </tr>
          <tr>
            <td class="label">Stay</td><td class="value">${escapeHtml(nights)} Night(s)</td>
            <td class="label">Payment Mode / Status</td><td class="value">${escapeHtml(paymentMode)} / ${escapeHtml(booking.payment_status || 'Paid')}</td>
          </tr>
          <tr>
            <td class="label">No. of Guest</td><td class="value">${escapeHtml(guestCount)}</td>
            <td class="label">Contact Number</td><td class="value">${escapeHtml(ownerPhone)}</td>
          </tr>
        </tbody>
      </table>

      <div class="section-heading">PROPERTY AMENITIES</div>
      <div class="amenities">${displayAmenities.map((item) => `<span>• ${escapeHtml(item)}</span>`).join('')}</div>

      <div class="section-heading">Price Summary</div>
      <table class="price-table no-top">
        <thead><tr><th class="desc">Description</th><th class="amount">Amount (Rs.)</th></tr></thead>
        <tbody>
          <tr><td>${accommodationDescription}</td><td class="amount">${plainMoney(amounts.base || taxableValue)}</td></tr>
          <tr><td>Taxable Value</td><td class="amount">${plainMoney(taxableValue || amounts.base)}</td></tr>
          <tr><td>CGST</td><td class="amount">${plainMoney(cgst)}</td></tr>
          <tr><td>SGST</td><td class="amount">${plainMoney(sgst)}</td></tr>
          ${amounts.discount > 0 ? `<tr><td>Discounts</td><td class="amount">-${plainMoney(amounts.discount)}</td></tr>` : ''}
          <tr class="total"><td>Total Price</td><td class="amount">${plainMoney(amounts.paid)}</td></tr>
        </tbody>
      </table>
      <table class="no-top">
        <tbody>
          <tr class="paid-row"><td>Amount Paid by ${escapeHtml(paymentMode)}:</td><td class="right mono bold">Rs. ${plainMoney(amounts.paid)}</td></tr>
          <tr class="words-row"><td colspan="2"><strong>Amount in Words:</strong> Indian Rupees ${escapeHtml(numberToWords(amounts.paid))} Only</td></tr>
        </tbody>
      </table>

      <div class="section-heading">TERMS &amp; CONDITIONS</div>
      <div class="terms">
        <ol>
          <li>This ticket is booked through X-Space360.</li>
          <li>Carry any valid photo ID during check-in. Modification and cancellation are subject to the refund policy below.</li>
          <li>Local destination check-in and check-out timings are maintained by the property.</li>
          <li>Additional services, damages, penalties, or property-level charges may be collected directly by the property, if applicable.</li>
          ${importantConditionsHtml}
        </ol>
      </div>
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
