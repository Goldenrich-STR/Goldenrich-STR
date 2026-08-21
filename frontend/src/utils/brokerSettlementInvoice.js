const money = (value) => `Rs. ${Number(value || 0).toLocaleString('en-IN')}`;

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
  row.invoice_no || `GR/BR/${fyLabel(row.latest_at || row.created_at)}/${suffix(row.settlement_id, row.booking_id, row.commission_id)}`;

const invoiceHtml = (row = {}) => {
  const invoiceNo = brokerSettlementInvoiceNo(row);
  const date = invoiceDate(row.latest_at || row.created_at);
  const brokerName = text(row.name || row.broker_name || row.full_name, 'Broker');
  const brokerCode = text(row.code || row.broker_code || row.employee_code || row.user_id, 'NA');
  const propertyName = text(row.property_name || row.property?.title, 'Property Details');
  const propertyId = text(row.property_id || row.property?.property_id, '');
  const bookingId = text(row.booking_id, 'NA');
  const platformFee = Number(row.platform_fee_amount || row.platform_fee || row.booking_amount || 0);
  const commissionPercent = Number(row.commission_percent || row.commission_percentage || 0);
  const commissionAmount = Number(row.commission_amount || row.gross_amount || 0);
  const cgst = Number(row.commission_cgst || row.cgst || 0);
  const sgst = Number(row.commission_sgst || row.sgst || 0);
  const igst = Number(row.commission_igst || row.igst || 0);
  const tds = Number(row.tds_amount || 0);
  const net = Number(row.net_amount || row.commission_amount || row.gross_amount || 0);
  const grossTotal = commissionAmount + cgst + sgst + igst;
  const amountWords = `Indian Rupees ${Math.round(net).toLocaleString('en-IN')} Only`;

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(invoiceNo)} - Brokerage Invoice</title>
  <style>
    @page { size: A4; margin: 10mm; }
    * { box-sizing: border-box; }
    body { margin: 0; background: #f3f4f6; color: #000; font-family: Arial, Helvetica, sans-serif; }
    .page { width: 190mm; min-height: 277mm; margin: 0 auto; background: #fff; padding: 0; }
    .invoice { border: 1px solid #000; font-size: 10px; line-height: 1.25; }
    .title { text-align: center; font-weight: 700; font-size: 12px; padding: 3px; border-bottom: 1px solid #000; }
    table { width: 100%; border-collapse: collapse; }
    td, th { border: 1px solid #000; padding: 4px; vertical-align: top; }
    .no-border { border: 0; }
    .company-cell { width: 54%; height: 44mm; }
    .logo { width: 158px; height: 42px; object-fit: contain; object-position: left center; display: block; margin-bottom: 4px; }
    .company { font-weight: 800; font-size: 11px; }
    .meta td { height: 12mm; }
    .buyer { height: 24mm; }
    .items th { font-size: 9px; text-align: center; font-weight: 400; }
    .items td { height: 92mm; }
    .center { text-align: center; }
    .right { text-align: right; }
    .bold { font-weight: 800; }
    .tiny { font-size: 8.5px; }
    .summary td { height: 8mm; }
    .footer td { height: 18mm; }
    @media print { body { background: #fff; } .page { margin: 0; } }
  </style>
</head>
<body>
  <main class="page">
    <section class="invoice">
      <div class="title">Brokerage Invoice</div>
      <table>
        <tr>
          <td class="company-cell" rowspan="4">
            <img src="/logo.png" alt="X-SPACE360" class="logo" />
            <div class="company">Golden Rich Financial &amp; Real Estate Solutions Pvt. Ltd.</div>
            Office No-804, Royal Awaan Avenue,<br />
            Opp. Bhosla School Gate, Jehan Circle,<br />
            Gangapur Road Nashik-422013<br />
            <b>GSTIN/UIN:</b> 27AKCG1285C1Z5<br />
            <b>State Name:</b> Maharashtra, Code : 27<br />
            <b>Contact:</b> 9225586001<br />
            <b>Mail:</b> finance.director@goldenrichproperties.com
          </td>
          <td><b>Invoice No.</b><br />${escapeHtml(invoiceNo)}</td>
          <td><b>Dated</b><br />${escapeHtml(date)}</td>
        </tr>
        <tr><td><b>Delivery Note</b></td><td><b>Mode/Terms of Payment</b><br />Advance</td></tr>
        <tr><td>&nbsp;</td><td>&nbsp;</td></tr>
        <tr><td>&nbsp;</td><td>&nbsp;</td></tr>
      </table>
      <table>
        <tr>
          <td class="buyer">
            <b>Buyer (Bill to)</b><br />
            <b>${escapeHtml(brokerName)}</b><br />
            Broker Code: ${escapeHtml(brokerCode)}<br />
            Booking ID: ${escapeHtml(bookingId)}<br />
            Property: ${escapeHtml(propertyName)} ${propertyId ? `(${escapeHtml(propertyId)})` : ''}<br />
            State Name: Maharashtra, Code : 27
          </td>
        </tr>
      </table>
      <table class="items">
        <tr>
          <th>SR No.</th><th>Description of Services</th><th>HSN/SAC</th><th>Quantity</th><th>GST Rate</th><th>Rate</th><th>per</th><th>DISC %</th><th>Amount</th>
        </tr>
        <tr>
          <td class="center">1</td>
          <td><b>Brokerage - Property Details</b><br /><br />${escapeHtml(propertyName)}<br />Booking: ${escapeHtml(bookingId)}<br />Platform Fee: ${escapeHtml(money(platformFee))}<br />Commission: ${commissionPercent}%</td>
          <td class="center">998861</td>
          <td class="center">1 Nos</td>
          <td class="center">18%</td>
          <td class="right">${escapeHtml(money(commissionAmount))}</td>
          <td class="center">Nos</td>
          <td class="center"></td>
          <td class="right bold">${escapeHtml(money(commissionAmount))}</td>
        </tr>
        <tr>
          <td colspan="8" class="right bold">CGST @ 9%</td><td class="right">${escapeHtml(money(cgst))}</td>
        </tr>
        <tr>
          <td colspan="8" class="right bold">SGST @ 9%</td><td class="right">${escapeHtml(money(sgst))}</td>
        </tr>
        <tr>
          <td colspan="8" class="right bold">IGST</td><td class="right">${escapeHtml(money(igst))}</td>
        </tr>
        <tr>
          <td colspan="8" class="right bold">(-) TDS</td><td class="right">${escapeHtml(money(tds))}</td>
        </tr>
        <tr>
          <td colspan="3" class="right bold">Total</td><td class="center bold">1 Nos</td><td colspan="4"></td><td class="right bold">${escapeHtml(money(net))}</td>
        </tr>
      </table>
      <table class="summary">
        <tr><td colspan="2"><b>Amount Chargeable (in words)</b><br /><b>${escapeHtml(amountWords)}</b></td><td class="right">E. &amp; O.E</td></tr>
        <tr><td><b>Tax Amount (in words):</b> Indian Rupees ${escapeHtml(Math.round(cgst + sgst + igst).toLocaleString('en-IN'))} Only</td><td><b>Company's PAN:</b> ${escapeHtml('AKCG1285C')}</td><td><b>Total Before Tax:</b> ${escapeHtml(money(commissionAmount))}<br /><b>Total GST:</b> ${escapeHtml(money(cgst + sgst + igst))}<br /><b>Gross:</b> ${escapeHtml(money(grossTotal))}<br /><b>TDS:</b> ${escapeHtml(money(tds))}</td></tr>
      </table>
      <table class="footer">
        <tr>
          <td>Customer's Seal and Signature</td>
          <td class="right"><b>For Golden Rich Properties</b><br /><br /><br />Authorised Signatory</td>
        </tr>
      </table>
      <div class="center tiny">This is a Computer Generated Invoice</div>
    </section>
  </main>
</body>
</html>`;
};

export const openBrokerSettlementInvoice = (row = {}) => {
  const html = invoiceHtml(row);
  const name = brokerSettlementInvoiceNo(row).replace(/[^a-z0-9_-]+/gi, '_');
  const printWindow = window.open('', `broker-invoice-${name}`, 'width=1100,height=900');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    return;
  }
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${name}.html`;
  link.click();
  URL.revokeObjectURL(link.href);
};
