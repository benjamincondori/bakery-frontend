const fmt = (n: number | string) =>
  new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB' }).format(Number(n));

const fmtDT = (d: string | Date) =>
  new Date(d).toLocaleString('es-BO', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

const STATUS_LABELS: Record<string, string> = { ACTIVE: 'ACTIVA', CANCELLED: 'ANULADA', PAID: 'PAGADA' };
const STATUS_COLOR: Record<string, string> = { ACTIVE: '#22c55e', CANCELLED: '#ef4444', PAID: '#3b82f6' };
const PAYMENT_LABELS: Record<string, string> = { CASH: 'Efectivo', QR: 'QR', CARD: 'Tarjeta', TRANSFER: 'Transferencia' };

export function printInvoice(invoice: any) {
  const customer = invoice.customer;
  const customerName = customer ? `${customer.firstName} ${customer.lastName}` : 'Cliente ocasional';
  const issuedBy = invoice.user ? `${invoice.user.firstName} ${invoice.user.lastName}` : '—';
  const details: any[] = invoice.sale?.saleDetails ?? [];
  const payments: any[] = invoice.sale?.payments ?? [];
  const globalDiscount = Number(invoice.sale?.discount ?? 0);
  const statusColor = STATUS_COLOR[invoice.status] ?? '#6366f1';

  // Determine if any line item has a discount
  const hasItemDiscounts = details.some((d) => Number(d.discount ?? 0) > 0);
  const totalItemDiscounts = details.reduce((sum, d) => sum + Number(d.discount ?? 0), 0);
  // Gross = sum of (quantity × unitPrice) before any discount
  const grossAmount = details.reduce((sum, d) => sum + Number(d.quantity) * Number(d.unitPrice), 0);

  const taxPct = Number(invoice.subtotal) > 0
    ? ((Number(invoice.tax) / Number(invoice.subtotal)) * 100).toFixed(0)
    : '0';

  // Table header — add discount columns only when at least one item has a discount
  const tableHead = hasItemDiscounts
    ? `<tr>
        <th>Producto</th>
        <th class="c">Cant.</th>
        <th class="r">Precio unit.</th>
        <th class="r disc">Descuento</th>
        <th class="r">Subtotal</th>
       </tr>`
    : `<tr>
        <th>Producto</th>
        <th class="c">Cant.</th>
        <th class="r">Precio unit.</th>
        <th class="r">Subtotal</th>
       </tr>`;

  const detailRows = details.map((d) => {
    const itemDiscount = Number(d.discount ?? 0);
    const gross = Number(d.quantity) * Number(d.unitPrice);
    const sub = gross - itemDiscount;
    const cat = d.product?.category ? `<span class="cat"> · ${d.product.category.name}</span>` : '';
    if (hasItemDiscounts) {
      return `<tr>
        <td>${d.product?.name ?? '—'}${cat}</td>
        <td class="c">${d.quantity}</td>
        <td class="r">${fmt(d.unitPrice)}</td>
        <td class="r disc">${itemDiscount > 0 ? `-${fmt(itemDiscount)}` : '—'}</td>
        <td class="r bold">${fmt(sub)}</td>
      </tr>`;
    }
    return `<tr>
      <td>${d.product?.name ?? '—'}${cat}</td>
      <td class="c">${d.quantity}</td>
      <td class="r">${fmt(d.unitPrice)}</td>
      <td class="r bold">${fmt(sub)}</td>
    </tr>`;
  }).join('') || `<tr><td colspan="${hasItemDiscounts ? 5 : 4}" class="empty">Sin productos registrados</td></tr>`;

  const paymentRows = payments.map((p) => `
    <div class="pay-row">
      <span>${PAYMENT_LABELS[p.method] ?? p.method}</span>
      <span>${fmt(p.amount)}</span>
    </div>`).join('');

  // Totals rows — only show discount lines when they are > 0
  const totalsRows = [
    hasItemDiscounts ? `<div class="t-row"><span>Precio bruto</span><span>${fmt(grossAmount)}</span></div>` : '',
    hasItemDiscounts ? `<div class="t-row disc-row"><span>Desc. por producto</span><span>-${fmt(totalItemDiscounts)}</span></div>` : '',
    (hasItemDiscounts || globalDiscount > 0) ? `<div class="t-row"><span>Subtotal</span><span>${fmt(invoice.subtotal)}</span></div>` : '',
    globalDiscount > 0 ? `<div class="t-row disc-row"><span>Desc. general</span><span>-${fmt(globalDiscount)}</span></div>` : '',
    Number(invoice.tax) > 0 ? `<div class="t-row"><span>IVA (${taxPct}%)</span><span>${fmt(invoice.tax)}</span></div>` : '',
    `<div class="t-row final"><span>TOTAL</span><span>${fmt(invoice.total)}</span></div>`,
  ].filter(Boolean).join('');

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Factura ${invoice.invoiceNumber}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Helvetica Neue',Arial,sans-serif;font-size:13px;color:#1c1917;background:#fff}
    .page{max-width:700px;margin:0 auto;padding:40px 40px 60px}
    .header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:20px;border-bottom:3px solid #6366f1;margin-bottom:24px}
    .brand h1{font-size:22px;font-weight:800;color:#6366f1;letter-spacing:-0.5px}
    .brand p{color:#78716c;font-size:12px;margin-top:3px}
    .meta{text-align:right}
    .meta .num{font-size:17px;font-weight:700}
    .meta .badge{display:inline-block;padding:3px 10px;border-radius:99px;font-size:11px;font-weight:700;color:#fff;background:${statusColor};margin:5px 0}
    .meta .sub{color:#78716c;font-size:11px;margin-top:2px}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px}
    .box{background:#f8f7ff;border:1px solid #e0e7ff;border-radius:8px;padding:14px}
    .box h4{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#6366f1;margin-bottom:8px}
    .box p{font-size:13px;font-weight:500;margin-bottom:3px}
    .box .s{color:#78716c;font-size:11px}
    table{width:100%;border-collapse:collapse;margin-bottom:20px}
    thead tr{background:#6366f1;color:#fff}
    thead th{padding:9px 12px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.4px;text-align:left}
    thead th.r,thead th.c{text-align:right}
    thead th.c{text-align:center}
    thead th.disc{color:#fca5a5}
    tbody tr{border-bottom:1px solid #f1f0ef}
    tbody tr:nth-child(even){background:#faf9f8}
    tbody td{padding:9px 12px}
    td.c{text-align:center}
    td.r{text-align:right}
    td.bold{font-weight:600}
    td.disc{text-align:right;color:#dc2626}
    .cat{color:#78716c;font-size:11px}
    td.empty{text-align:center;color:#a8a29e;padding:20px}
    .bottom{display:flex;justify-content:space-between;gap:24px;margin-top:4px}
    .pays{flex:1}
    .pays h4{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#6366f1;margin-bottom:8px}
    .pay-row{display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #f1f0ef;font-size:12px;color:#57534e}
    .totals{min-width:220px}
    .t-row{display:flex;justify-content:space-between;padding:5px 0;font-size:13px;color:#57534e}
    .t-row.disc-row{color:#dc2626;font-weight:500}
    .t-row.final{border-top:2px solid #6366f1;margin-top:6px;padding-top:9px;font-size:16px;font-weight:800;color:#4f46e5}
    .cancelled{background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px 16px;margin-top:20px;color:#dc2626;font-size:12px}
    .footer{margin-top:36px;text-align:center;color:#a8a29e;font-size:11px;border-top:1px solid #e7e5e4;padding-top:14px}
    @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.page{padding:20px}}
  </style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="brand">
      <h1>Sistema Bakery</h1>
      <p>Pastelería &amp; Panadería</p>
    </div>
    <div class="meta">
      <div class="num">FACTURA ${invoice.invoiceNumber}</div>
      <div><span class="badge">${STATUS_LABELS[invoice.status] ?? invoice.status}</span></div>
      <div class="sub">Emitida: ${fmtDT(invoice.issuedAt)}</div>
      ${invoice.sale?.saleNumber ? `<div class="sub">Venta: ${invoice.sale.saleNumber}</div>` : ''}
    </div>
  </div>

  <div class="grid">
    <div class="box">
      <h4>Cliente</h4>
      <p>${customerName}</p>
      ${customer?.phone ? `<p class="s">Tel: ${customer.phone}</p>` : ''}
      ${customer?.email ? `<p class="s">${customer.email}</p>` : ''}
      ${customer?.address ? `<p class="s">${customer.address}</p>` : ''}
    </div>
    <div class="box">
      <h4>Emisión</h4>
      <p>Por: ${issuedBy}</p>
      <p class="s">${fmtDT(invoice.issuedAt)}</p>
      ${invoice.notes ? `<p class="s">Nota: ${invoice.notes}</p>` : ''}
    </div>
  </div>

  <table>
    <thead>${tableHead}</thead>
    <tbody>${detailRows}</tbody>
  </table>

  <div class="bottom">
    ${payments.length > 0 ? `<div class="pays"><h4>Forma de pago</h4>${paymentRows}</div>` : '<div></div>'}
    <div class="totals">${totalsRows}</div>
  </div>

  ${invoice.status === 'CANCELLED' ? `
  <div class="cancelled">
    <strong>FACTURA ANULADA</strong>${invoice.cancelReason ? ` — ${invoice.cancelReason}` : ''}
    ${invoice.cancelledAt ? ` (${fmtDT(invoice.cancelledAt)})` : ''}
  </div>` : ''}

  <div class="footer">
    Documento generado el ${fmtDT(new Date())} · Sistema Bakery
  </div>
</div>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=800,height=900');
  if (!win) {
    alert('Permite ventanas emergentes para descargar la factura.');
    return;
  }
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 600);
}
