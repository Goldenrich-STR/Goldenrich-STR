const plainMoney = (value) => Number(value || 0).toFixed(2);

const formatDate = (value) => {
  if (!value) return 'NA';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date
    .toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    .replace(/ /g, '-');
};

const escapeHtml = (value) =>
  String(value ?? 'NA')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

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

export const getCustomerBookingAmounts = (booking = {}) => {
  const total = Number(booking.total_amount || 0);
  const taxes = Number(booking.taxes ?? booking.gst_amount ?? booking.tax_amount ?? 0);
  const paid = Number(booking.paid_amount || booking.amount_paid || total || 0);
  const base = Math.max(0, Number(booking.customer_base_amount ?? (total - taxes)));
  return { base, taxes, total, paid };
};

export const buildCustomerBookingInvoiceHtml = (booking = {}, property = {}, user = {}) => {
  const amounts = getCustomerBookingAmounts(booking);
  const taxPercent = Number(booking.tax_percent ?? booking.gst_percent ?? 0);
  const splitPercent = taxPercent / 2;
  const taxLabel = `${taxPercent.toFixed(taxPercent % 1 === 0 ? 0 : 2)}%`;
  const splitLabel = `${splitPercent.toFixed(splitPercent % 1 === 0 ? 0 : 2)}%`;
  const cgst = Number(booking.cgst ?? (amounts.taxes / 2));
  const sgst = Number(booking.sgst ?? (amounts.taxes / 2));
  const invoiceNo = booking.invoice_no || booking.booking_invoice_no || booking.booking_id || 'booking-invoice';
  const propertyName = property.title || property.property_name || property.name || booking.property?.title || booking.property_id || 'Property';
  const propertyAddress = [property.address, property.city, property.state, property.pin_code].filter(Boolean).join(', ') || 'NA';
  const customerName = user.full_name || booking.customer_name || booking.guest_name || 'Customer';
  const customerPhone = user.phone || booking.guest_phone || booking.phone || 'NA';
  const customerEmail = user.email || booking.guest_email || booking.email || 'NA';
  const customerGstin = user.gst_number || user.gst_no || booking.customer_gstin || 'NA';
  const paymentRef = booking.razorpay_payment_id || booking.upi_transaction_id || booking.payment_id || 'NA';
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(invoiceNo)}</title>
  <style>
    @page { size: A4; margin: 7mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { margin: 0; padding: 14px; color: #000; background: #f5f5f5; font-family: Arial, Helvetica, sans-serif; font-size: 12px; }
    .toolbar { width: 196mm; max-width: calc(100vw - 28px); margin: 0 auto 14px; display: flex; justify-content: flex-end; gap: 10px; }
    .toolbar button { border: 1px solid #ddd; border-radius: 8px; background: #fff; padding: 10px 14px; font-weight: 800; cursor: pointer; }
    .toolbar .print { background: #007a4d; color: #fff; border-color: #007a4d; }
    .invoice { width: 196mm; max-width: calc(100vw - 28px); margin: 0 auto; border: 2px solid #000; background: #fff; font-size: 11.5px; line-height: 1.28; }
    table { width: 100%; border-collapse: collapse; }
    td, th { border: 1px solid #000; padding: 7px 8px; vertical-align: top; }
    th { background: #f7f7f7; font-size: 10.5px; text-align: center; }
    .no-border td, .no-border th { border: 0; }
    .top-left { width: 50%; border-left: 0; border-top: 0; }
    .top-right { width: 50%; border-right: 0; border-top: 0; padding: 0; }
    .logo-row { display: flex; gap: 10px; align-items: flex-start; }
    .logo-row img { width: 145px; height: 42px; object-fit: contain; }
    .company { font-size: 14px; font-weight: 900; }
    .meta { margin-top: 8px; font-size: 10.5px; }
    .small-label { display: block; color: #444; font-size: 8.5px; font-weight: 800; text-transform: uppercase; margin-bottom: 4px; }
    .buyer { height: 142px; border-left: 0; }
    .blank { border-right: 0; }
    .center { text-align: center; }
    .right { text-align: right; }
    .mono { font-family: Consolas, monospace; }
    .desc { text-align: left; font-weight: 800; }
    .sub-desc { padding-left: 28px; color: #555; font-weight: 800; }
    .total-row td { font-weight: 900; }
    .words { border-left: 0; border-right: 0; }
    .bank { width: 58%; border-left: 0; height: 116px; }
    .sign { width: 42%; border-right: 0; text-align: right; font-weight: 900; }
    .declaration { margin-top: 18px; font-size: 9.5px; color: #555; font-style: italic; }
    @media print {
      html, body { width: 210mm; min-height: 297mm; background: #fff; }
      body { padding: 0; font-size: 10pt; }
      .toolbar { display: none; }
      .invoice { width: 196mm; max-width: none; margin: 0 auto; font-size: 9pt; line-height: 1.3; }
      td, th { padding: 6px 7px; }
      th { font-size: 8.4pt; }
      .company { font-size: 10.5pt; }
      .meta { font-size: 8.2pt; }
      .small-label { font-size: 7pt; }
      .logo-row img { width: 38mm; height: 11mm; }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <button class="print" onclick="window.print()">Print / Download PDF</button>
    <button onclick="window.close()">Close</button>
  </div>
  <section class="invoice">
    <table>
      <tbody>
        <tr>
          <td class="top-left">
            <div class="logo-row">
              <img src="/logo.png" alt="X-Space360" />
              <div>
                <div class="company">Golden Rich Financial &amp; Real Estate<br />Solutions Pvt. Ltd.</div>
                <div>Office No-804, Royal Avaan Avenue,<br />Opp. Bhosla School Gate, Jehan Circle,<br />Gangapur Road, Nashik-422013</div>
              </div>
            </div>
            <div class="meta">
              <strong>GSTIN/UIN:</strong> 27AAKCG1285C1ZP<br />
              <strong>State Name:</strong> Maharashtra, Code : 27<br />
              <strong>Contact:</strong> 9225586001<br />
              <strong>Email:</strong> finance.director@goldenrichproperties.com
            </div>
          </td>
          <td class="top-right">
            <table>
              <tbody>
                <tr>
                  <td><span class="small-label">Invoice No.</span><strong>${escapeHtml(invoiceNo)}</strong></td>
                  <td><span class="small-label">Dated</span><strong>${escapeHtml(formatDate(booking.created_at))}</strong></td>
                </tr>
                <tr>
                  <td><span class="small-label">Mode/Terms of Payment</span><strong>NET BANKING</strong></td>
                  <td><span class="small-label">Reference No. &amp; Date</span><strong>${escapeHtml(paymentRef)}</strong></td>
                </tr>
                <tr><td colspan="2" style="height:31px;">&nbsp;</td></tr>
              </tbody>
            </table>
          </td>
        </tr>
        <tr>
          <td class="buyer">
            <span class="small-label">Buyer (Bill To)</span>
            <strong>${escapeHtml(propertyName)}</strong><br />
            Address: ${escapeHtml(propertyAddress)}<br />
            GSTIN/UIN: ${escapeHtml(customerGstin)}<br />
            State Name: Maharashtra, Code : 27<br />
            Contact Person: ${escapeHtml(customerName)}<br />
            Mobile: ${escapeHtml(customerPhone)}<br />
            Email: ${escapeHtml(customerEmail)}
          </td>
          <td class="blank">&nbsp;</td>
        </tr>
      </tbody>
    </table>

    <table>
      <thead>
        <tr>
          <th style="width:5%;">Sr.No</th>
          <th style="width:40%;">Description of Services</th>
          <th style="width:9%;">HSN/SAC</th>
          <th style="width:9%;">Services Offer</th>
          <th style="width:9%;">GST Rate</th>
          <th style="width:9%;">Rate</th>
          <th style="width:7%;">per</th>
          <th style="width:6%;">Disc. %</th>
          <th style="width:10%;">Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="center">1</td>
          <td class="desc">Booking Accommodation Charges [booking_id: ${escapeHtml(booking.booking_id || 'NA')}]</td>
          <td class="center mono">998399</td>
          <td class="center"><strong>01</strong></td>
          <td class="center">${taxLabel}</td>
          <td class="right mono">${plainMoney(amounts.base)}</td>
          <td class="center">Nos</td>
          <td></td>
          <td class="right mono">${plainMoney(amounts.base)}</td>
        </tr>
        <tr>
          <td></td>
          <td class="sub-desc">CGST @ ${splitLabel}</td>
          <td></td><td></td>
          <td class="center">${splitLabel}</td>
          <td class="right mono">${plainMoney(cgst)}</td>
          <td></td><td></td>
          <td class="right mono">${plainMoney(cgst)}</td>
        </tr>
        <tr>
          <td></td>
          <td class="sub-desc">SGST @ ${splitLabel}</td>
          <td></td><td></td>
          <td class="center">${splitLabel}</td>
          <td class="right mono">${plainMoney(sgst)}</td>
          <td></td><td></td>
          <td class="right mono">${plainMoney(sgst)}</td>
        </tr>
        <tr class="total-row">
          <td></td>
          <td>Total</td>
          <td></td>
          <td class="center">01 Nos</td>
          <td></td><td></td><td></td><td></td>
          <td class="right mono">${plainMoney(amounts.paid)}</td>
        </tr>
      </tbody>
    </table>

    <table>
      <tbody>
        <tr><td class="words"><span class="small-label">Amount Chargeable (in words)</span><strong>Indian Rupees ${escapeHtml(numberToWords(amounts.paid))} Only</strong></td></tr>
      </tbody>
    </table>

    <table>
      <thead>
        <tr>
          <th rowspan="2">HSN/SAC</th>
          <th rowspan="2">Taxable Value</th>
          <th colspan="2">Central Tax</th>
          <th colspan="2">State Tax</th>
          <th rowspan="2">Total Tax Amount</th>
        </tr>
        <tr>
          <th>Rate</th><th>Amount</th><th>Rate</th><th>Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="mono">998399</td>
          <td class="center mono">${plainMoney(amounts.base)}</td>
          <td class="center">${splitLabel}</td>
          <td class="center mono">${plainMoney(cgst)}</td>
          <td class="center">${splitLabel}</td>
          <td class="center mono">${plainMoney(sgst)}</td>
          <td class="center mono">${plainMoney(amounts.taxes)}</td>
        </tr>
        <tr class="total-row">
          <td>Total</td>
          <td class="center mono">${plainMoney(amounts.base)}</td>
          <td></td>
          <td class="center mono">${plainMoney(cgst)}</td>
          <td></td>
          <td class="center mono">${plainMoney(sgst)}</td>
          <td class="center mono">${plainMoney(amounts.taxes)}</td>
        </tr>
      </tbody>
    </table>

    <table>
      <tbody>
        <tr><td class="words"><span class="small-label">Tax Amount (in words)</span><strong>Indian Rupees ${escapeHtml(numberToWords(amounts.taxes))} Only</strong></td></tr>
      </tbody>
    </table>

    <table>
      <tbody>
        <tr>
          <td class="bank">
            <strong><u>Company's Bank Details:</u></strong><br />
            <strong>A/c Holder's Name:</strong> Golden Rich Financial &amp; Real Estate Solutions Pvt. Ltd.<br />
            <strong>Bank Name:</strong> IDFC FIRST BANK<br />
            <strong>A/c No.:</strong> 10250563892<br />
            <strong>Branch &amp; IFSC Code:</strong> Gangapur Road, Nashik &amp; IDFB0042283
            <div class="declaration">Declaration: We declare that this invoice shows the actual price of the Service described and that all particulars are true and correct.</div>
          </td>
          <td class="sign">
            For Golden Rich Properties<br /><br /><br /><br /><br />
            Authorized Signatory
          </td>
        </tr>
      </tbody>
    </table>
  </section>
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
