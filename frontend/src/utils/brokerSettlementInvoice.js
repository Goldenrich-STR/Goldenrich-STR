const money = (value) => `Rs. ${Math.round(Number(value || 0)).toLocaleString('en-IN')}`;

const numberToIndianWords = (value) => {
  const n = Math.round(Number(value || 0));
  if (!n) return 'Zero';
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const belowHundred = (num) => (num < 20 ? ones[num] : `${tens[Math.floor(num / 10)]}${num % 10 ? ` ${ones[num % 10]}` : ''}`);
  const belowThousand = (num) => `${num >= 100 ? `${ones[Math.floor(num / 100)]} Hundred${num % 100 ? ' ' : ''}` : ''}${num % 100 ? belowHundred(num % 100) : ''}`.trim();
  const parts = [];
  let remaining = n;
  const crore = Math.floor(remaining / 10000000);
  if (crore) parts.push(`${belowThousand(crore)} Crore`);
  remaining %= 10000000;
  const lakh = Math.floor(remaining / 100000);
  if (lakh) parts.push(`${belowThousand(lakh)} Lakh`);
  remaining %= 100000;
  const thousand = Math.floor(remaining / 1000);
  if (thousand) parts.push(`${belowThousand(thousand)} Thousand`);
  remaining %= 1000;
  if (remaining) parts.push(belowThousand(remaining));
  return parts.join(' ');
};

const rupeesInWords = (value) => `Indian Rupees ${numberToIndianWords(value)} Only`;

const text = (value, fallback = 'NA') => {
  const clean = String(value ?? '').trim();
  return clean && !['NA', 'N/A', '-'].includes(clean.toUpperCase()) ? clean : fallback;
};

const escapeHtml = (value) =>
  String(value ?? 'NA')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const firstText = (...values) => {
  for (const value of values) {
    const clean = text(value, '');
    if (clean) return clean;
  }
  return '';
};

const amountValue = (...values) => {
  for (const value of values) {
    if (value === undefined || value === null || value === '') continue;
    const number = Number(value);
    if (Number.isFinite(number)) return number;
  }
  return 0;
};

const rupeesAmount = (...values) => {
  const value = amountValue(...values);
  return value || 0;
};

const percentValue = (...values) => {
  const value = amountValue(...values);
  return Number.isFinite(value) ? value : 0;
};

const stateLine = (...values) => {
  const state = firstText(...values) || 'Maharashtra';
  const codeMatch = String(state).match(/\bCode\s*:?\s*(\d{1,2})\b/i);
  const code = codeMatch?.[1] || (String(state).toLowerCase().includes('maharashtra') ? '27' : 'NA');
  const cleanState = String(state).replace(/,\s*Code\s*:?\s*\d{1,2}/i, '').trim() || 'Maharashtra';
  return `${cleanState}, Code : ${code}`;
};

const addressLine = (...objects) => {
  for (const source of objects.filter(Boolean)) {
    const direct = firstText(source.address, source.full_address, source.billing_address, source.location);
    const city = firstText(source.city, source.district);
    const state = firstText(source.state_name, source.state);
    const pin = firstText(source.pin_code, source.pincode, source.postal_code, source.zip);
    const combined = [direct, city, state, pin].filter(Boolean).join(', ');
    if (combined) return combined;
  }
  return 'NA';
};

const invoiceDate = (value) => {
  const date = value ? new Date(value) : new Date();
  const safe = Number.isNaN(date.getTime()) ? new Date() : date;
  return safe.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }).replace(/ /g, '-');
};

const fyLabel = (value) => {
  const date = value ? new Date(value) : new Date();
  const safe = Number.isNaN(date.getTime()) ? new Date() : date;
  const year = safe.getFullYear();
  const start = safe.getMonth() + 1 >= 4 ? year : year - 1;
  return `${String(start).slice(-2)}-${String(start + 1).slice(-2)}`;
};

const suffix = (...values) => {
  const source = values.find((value) => text(value, '')).toString();
  return source.replace(/[^a-z0-9]/gi, '').toUpperCase().slice(-6) || '000001';
};

export const brokerSettlementInvoiceNo = (row = {}) =>
  row.invoice_no || row.broker_invoice_no || row.settlement_invoice_no || '';

const brokerReceiptKey = (row = {}) => suffix(row.settlement_id, row.booking_id, row.commission_id, row.broker_id, row.code);

const getBrokerSettlementInvoiceNo = (row = {}) => {
  const explicit = brokerSettlementInvoiceNo(row);
  if (explicit) return explicit;
  const fy = fyLabel(row.latest_at || row.created_at);
  const key = brokerReceiptKey(row);
  if (typeof window === 'undefined') return `STRBR/${fy}/0001`;
  const storageKey = `strbr_invoice_series_${fy}`;
  const series = JSON.parse(window.localStorage.getItem(storageKey) || '{"last":0,"items":{}}');
  if (!series.items[key]) {
    series.last = Number(series.last || 0) + 1;
    series.items[key] = `STRBR/${fy}/${String(series.last).padStart(4, '0')}`;
    window.localStorage.setItem(storageKey, JSON.stringify(series));
  }
  return series.items[key];
};

const hostReceiptKey = (row = {}) => suffix(row.payout_id, row.settlement_id, row.booking_id, row.host_id, row.host?.user_id);

export const getHostSettlementInvoiceNo = (row = {}) => {
  const explicit = row.host_invoice_no || row.payout_invoice_no || row.settlement_invoice_no || '';
  if (explicit) return explicit;
  const fy = fyLabel(row.settlement_due_at || row.eligible_at || row.latest_at || row.created_at);
  const key = hostReceiptKey(row);
  if (typeof window === 'undefined') return `STRH/${fy}/00001`;
  const storageKey = `strh_invoice_series_${fy}`;
  const series = JSON.parse(window.localStorage.getItem(storageKey) || '{"last":0,"items":{}}');
  if (!series.items[key]) {
    series.last = Number(series.last || 0) + 1;
    series.items[key] = `STRH/${fy}/${String(series.last).padStart(5, '0')}`;
    window.localStorage.setItem(storageKey, JSON.stringify(series));
  }
  return series.items[key];
};

const toolbarHtml = (fileName, downloadUrl = '') => `
  <div class="invoice-toolbar">
    <button type="button" onclick="window.print()">Print</button>
    <a class="download-button" href="${escapeHtml(downloadUrl)}" download="${escapeHtml(fileName)}.html">Download</a>
  </div>`;

const invoiceHtml = (row = {}, mode = 'broker', options = {}) => {
  const isHost = mode === 'host';
  const invoiceNo = isHost ? getHostSettlementInvoiceNo(row) : getBrokerSettlementInvoiceNo(row);
  const date = invoiceDate(row.latest_at || row.created_at);
  const broker = isHost ? (row.host || row.user || {}) : (row.broker || row.user || {});
  const property = row.property || {};
  const brokerName = text(firstText(row.name, row.broker_name, row.host_name, row.full_name, broker.full_name, broker.name), isHost ? 'Host' : 'Broker');
  const brokerCode = text(firstText(row.code, row.broker_code, row.host_code, row.employee_code, row.broker_id, row.host_id, broker.lg_code, broker.employee_code, broker.user_id), 'NA');
  const brokerPan = text(firstText(row.broker_pan_number, row.broker_pan, row.host_pan_number, row.host_pan, row.pan_number, row.pan, broker.pan_number, broker.pan), 'NA');
  const partyAddress = text(addressLine(row, broker), 'NA');
  const partyGstin = text(firstText(
    row.gstin,
    row.gst_number,
    row.gst_no,
    row.gstin_number,
    row.gstinNumber,
    row.broker_gstin,
    row.host_gstin,
    broker.gstin,
    broker.gst_number,
    broker.gst_no,
    broker.gstin_number,
    broker.gstinNumber,
    broker.gst?.gstin,
    broker.gst?.gst_number,
    broker.kyc?.gstin,
    broker.kyc?.gst_number,
    broker.documents?.gstin,
    broker.documents?.gst_number
  ), 'NA');
  const isGstRegistered = partyGstin !== 'NA';
  const partyState = stateLine(row.state_name, row.state, broker.state_name, broker.state);
  const partyContact = text(firstText(row.contact_number, row.contact, row.phone, row.mobile, row.broker_phone, row.host_phone, broker.contact_number, broker.contact, broker.phone, broker.mobile), 'NA');
  const partyEmail = text(firstText(row.email, row.broker_email, row.host_email, broker.email, broker.email_address), 'NA');
  const propertyName = text(firstText(row.property_name, property.title, property.property_name, property.name), 'Property Details');
  const propertyId = text(firstText(row.property_id, property.property_id, property.id), '');
  const bookingId = text(row.booking_id, 'NA');
  const platformFee = rupeesAmount(row.platform_fee_amount, row.platform_fee, row.booking_amount);
  const commissionPercent = percentValue(row.commission_percent, row.commission_percentage, row.rate_percent, row.rate);
  const commissionAmount = isHost
    ? rupeesAmount(row.gross_amount, row.host_actual_value, row.tds_base_amount, row.base_amount)
    : rupeesAmount(row.commission_amount, row.gross_amount, row.broker_commission_amount);
  const cgst = isGstRegistered ? rupeesAmount(row.commission_cgst, row.cgst) : 0;
  const sgst = isGstRegistered ? rupeesAmount(row.commission_sgst, row.sgst) : 0;
  const igst = isGstRegistered ? rupeesAmount(row.commission_igst, row.igst) : 0;
  const tds = rupeesAmount(row.tds_amount, row.broker_tds_amount, row.host_tds_amount);
  const tdsPercent = percentValue(row.tds_rate_percent, row.tds_percent, row.tds_percentage, row.tds_config?.rate_percent, row.tds_breakdown?.rate_percent, tds && commissionAmount ? (tds / commissionAmount) * 100 : 0);
  const calculatedNet = commissionAmount + cgst + sgst + igst - tds;
  const net = rupeesAmount(row.net_amount, row.settlement_amount, row.payable_amount) || calculatedNet;
  const grossTotal = commissionAmount + cgst + sgst + igst;
  const amountWords = rupeesInWords(net);
  const taxAmountWords = rupeesInWords(cgst + sgst + igst);
  const title = isHost ? 'Host Receipt' : 'Brokerage Receipt';
  const partyLabel = isHost ? 'Host Code' : 'Broker Code';
  const panLabel = isHost ? "Host's PAN" : "Broker's PAN";
  const serviceLabel = isHost ? 'Host Settlement' : 'Brokerage';
  const signatureLabel = isHost ? 'Host Signature' : 'Broker Signature';
  const fileName = invoiceNo.replace(/[^a-z0-9_-]+/gi, '_');

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(invoiceNo)} - ${escapeHtml(title)}</title>
  <style>
    @page { size: A4 portrait; margin: 8mm; }
    * { box-sizing: border-box; }
    body { margin: 0; background: #f3f4f6; color: #000; font-family: Arial, Helvetica, sans-serif; }
    .invoice-toolbar { position: sticky; top: 0; z-index: 10; display: flex; justify-content: flex-end; gap: 8px; width: 194mm; margin: 0 auto; padding: 8px; background: #111827; }
    .invoice-toolbar button, .invoice-toolbar .download-button { border: 0; border-radius: 6px; padding: 8px 14px; background: #fff; color: #111827; font-weight: 800; cursor: pointer; text-decoration: none; font-size: 14px; }
    .page { width: 194mm; min-height: 281mm; margin: 0 auto; background: #fff; padding: 0; }
    .invoice { border: 1px solid #000; font-size: 9px; line-height: 1.22; }
    .title { text-align: center; font-weight: 700; font-size: 12px; padding: 3px; border-bottom: 1px solid #000; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    td, th { border: 1px solid #000; padding: 4px 5px; vertical-align: top; overflow-wrap: anywhere; }
    .no-border { border: 0; }
    .party-cell { width: 54%; height: 38mm; }
    .company-cell { height: 34mm; }
    .logo { width: 132px; height: 34px; object-fit: contain; object-position: left center; display: block; margin-bottom: 3px; }
    .company { font-weight: 800; font-size: 11px; }
    .meta td { height: 10mm; }
    .buyer { height: 30mm; }
    .items th { font-size: 9px; text-align: center; font-weight: 400; }
    .items td { height: auto; }
    .items col.sr { width: 7%; }
    .items col.desc { width: 36%; }
    .items col.hsn { width: 12%; }
    .items col.gst { width: 12%; }
    .items col.rate { width: 13%; }
    .items col.amount { width: 20%; }
    .items .main-line td { height: 118mm; }
    .items .total-line td { height: 10mm; vertical-align: middle; }
    .service-desc,
    .tax-rate-cell,
    .amount-cell { position: relative; height: 100%; min-height: 116mm; }
    .tax-labels { position: absolute; left: 0; right: 0; top: 34mm; text-align: center; font-style: italic; font-weight: 800; line-height: 1.7; }
    .tds-label { position: absolute; left: 0; right: 0; top: 58mm; text-align: center; font-style: italic; font-weight: 800; }
    .tax-rate-lines { position: absolute; left: 0; right: 0; top: 34mm; text-align: center; line-height: 1.7; }
    .tds-rate-line { position: absolute; left: 0; right: 0; top: 58mm; text-align: center; font-weight: 800; }
    .amount-tax-lines { position: absolute; left: 0; right: 0; top: 34mm; text-align: right; line-height: 1.7; font-weight: 800; }
    .amount-tds { position: absolute; left: 0; right: 0; top: 58mm; text-align: right; font-weight: 800; }
    .center { text-align: center; }
    .right { text-align: right; }
    .bold { font-weight: 800; }
    .tiny { font-size: 8.5px; }
    .summary td { height: auto; padding: 5px; }
    .jurisdiction { text-align: center; font-weight: 800; padding: 4px 5px 2px; border-top: 1px solid #000; }
    .footer td { height: 18mm; }
    @media print { body { background: #fff; } .invoice-toolbar { display: none; } .page { margin: 0 auto; } }
  </style>
</head>
<body>
  ${options.hideToolbar ? '' : toolbarHtml(fileName, options.downloadUrl)}
  <main class="page">
    <section class="invoice">
      <div class="title">${escapeHtml(title)}</div>
      <table>
        <tr>
          <td class="party-cell" rowspan="3">
            <b>${escapeHtml(brokerName)}</b><br />
            ${escapeHtml(partyLabel)}: ${escapeHtml(brokerCode)}<br />
            Address: ${escapeHtml(partyAddress)}<br />
            GSTIN Number: ${escapeHtml(partyGstin)}<br />
            State Name: ${escapeHtml(partyState)}<br />
            Contact: ${escapeHtml(partyContact)}<br />
            Email: ${escapeHtml(partyEmail)}
          </td>
          <td><b>Invoice No.</b><br />${escapeHtml(invoiceNo)}</td>
          <td><b>Dated</b><br />${escapeHtml(date)}</td>
        </tr>
        <tr><td><b>Mode/Terms of Payment</b><br />Advance</td><td><b>Reference</b><br />${escapeHtml(row.payment_ref || row.utr || row.transaction_id || bookingId)}</td></tr>
        <tr><td><b>Settlement Date</b><br />${escapeHtml(date)}</td><td><b>Status</b><br />${escapeHtml(row.status || 'Paid')}</td></tr>
      </table>
      <table>
        <tr>
          <td class="company-cell">
            <img src="/logo.png" alt="X-SPACE360" class="logo" />
            <div class="company">Golden Rich Financial &amp; Real Estate Solutions Pvt. Ltd.</div>
            Office No-804, Royal Awaan Avenue, Opp. Bhosla School Gate,<br />
            Jehan Circle, Gangapur Road Nashik-422013<br />
            <b>GSTIN/UIN:</b> 27AAKCG1285C1ZP<br />
            <b>State Name:</b> Maharashtra, Code : 27<br />
            <b>Contact:</b> 9225586001<br />
            <b>Mail:</b> finance.director@goldenrichproperties.com
          </td>
          <td class="buyer">&nbsp;</td>
        </tr>
      </table>
      <table class="items">
        <colgroup>
          <col class="sr" />
          <col class="desc" />
          <col class="hsn" />
          <col class="gst" />
          <col class="rate" />
          <col class="amount" />
        </colgroup>
        <tr>
          <th>SR No.</th><th>Description of Services</th><th>HSN/SAC</th><th>Taxes</th><th>Rate</th><th>Amount</th>
        </tr>
        <tr class="main-line">
          <td class="center">1</td>
          <td>
            <div class="service-desc">
              <b>${escapeHtml(serviceLabel)} - ${escapeHtml(propertyName)}</b><br />
              Booking ID: ${escapeHtml(bookingId)}<br />
              Property ID: ${escapeHtml(propertyId || 'NA')}
              ${isGstRegistered ? '<div class="tax-labels">CGST<br />SGST</div>' : ''}
              <div class="tds-label">(-) TDS</div>
            </div>
          </td>
          <td class="center">998861</td>
          <td>
            <div class="tax-rate-cell">
              <div class="center">${isGstRegistered ? '18%' : 'NA'}</div>
              ${isGstRegistered ? '<div class="tax-rate-lines">9 %<br />9 %</div>' : ''}
              <div class="tds-rate-line">${escapeHtml(tdsPercent ? `${tdsPercent.toLocaleString('en-IN', { maximumFractionDigits: 2 })}%` : 'NA')}</div>
            </div>
          </td>
          <td class="right">${escapeHtml(money(commissionAmount))}</td>
          <td>
            <div class="amount-cell">
              <div class="right bold">${escapeHtml(money(commissionAmount))}</div>
              ${isGstRegistered ? `<div class="amount-tax-lines">${escapeHtml(money(cgst))}<br />${escapeHtml(money(sgst))}</div>` : ''}
              <div class="amount-tds">${escapeHtml(money(tds))}</div>
            </div>
          </td>
        </tr>
        <tr class="total-line">
          <td colspan="5" class="right bold">Total</td><td class="right bold">${escapeHtml(money(net))}</td>
        </tr>
      </table>
      <table class="summary">
        <tr><td colspan="2"><b>Amount Chargeable (in words)</b><br /><b>${escapeHtml(amountWords)}</b></td><td class="right">E. &amp; O.E</td></tr>
        <tr><td><b>Tax Amount (in words):</b> ${escapeHtml(taxAmountWords)}</td><td><b>${escapeHtml(panLabel)}:</b> ${escapeHtml(brokerPan)}</td><td><b>Total Before Tax:</b> ${escapeHtml(money(commissionAmount))}<br /><b>Total GST:</b> ${escapeHtml(money(cgst + sgst + igst))}<br /><b>Gross:</b> ${escapeHtml(money(grossTotal))}<br /><b>TDS:</b> ${escapeHtml(money(tds))}</td></tr>
      </table>
      <table class="footer">
        <tr>
          <td>${escapeHtml(signatureLabel)}</td>
          <td class="right"><b>Golden Rich Properties</b></td>
        </tr>
      </table>
      <div class="tiny jurisdiction">Subject to Nashik Juridiction</div>
      <div class="center tiny">This is a Computer Generated Invoice</div>
    </section>
  </main>
</body>
</html>`;
};

export const openBrokerSettlementInvoice = (row = {}) => {
  const name = getBrokerSettlementInvoiceNo(row).replace(/[^a-z0-9_-]+/gi, '_');
  const cleanHtml = invoiceHtml(row, 'broker', { hideToolbar: true });
  const downloadUrl = URL.createObjectURL(new Blob([cleanHtml], { type: 'text/html;charset=utf-8' }));
  const html = invoiceHtml(row, 'broker', { downloadUrl });
  const printWindow = window.open('', `broker-invoice-${name}`, 'width=1100,height=900');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.addEventListener('beforeunload', () => URL.revokeObjectURL(downloadUrl), { once: true });
    return;
  }
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = `${name}.html`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
};

export const openHostSettlementInvoice = (row = {}) => {
  const name = getHostSettlementInvoiceNo(row).replace(/[^a-z0-9_-]+/gi, '_');
  const cleanHtml = invoiceHtml(row, 'host', { hideToolbar: true });
  const downloadUrl = URL.createObjectURL(new Blob([cleanHtml], { type: 'text/html;charset=utf-8' }));
  const html = invoiceHtml(row, 'host', { downloadUrl });
  const printWindow = window.open('', `host-invoice-${name}`, 'width=1100,height=900');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.addEventListener('beforeunload', () => URL.revokeObjectURL(downloadUrl), { once: true });
    return;
  }
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = `${name}.html`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
};
