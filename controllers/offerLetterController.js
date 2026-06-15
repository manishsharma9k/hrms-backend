const nodemailer = require('nodemailer');

const createTransporter = () => nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
});

const buildOfferLetterHTML = (data) => {
  const {
    candidateName, candidateEmail, role, department, salary,
    joiningDate, workLocation, workingHours, reportingManager,
    companyName, hrName, hrDesignation, additionalBenefits, offerExpiry
  } = data;

  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
  const joining = new Date(joiningDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
  const expiry = offerExpiry ? new Date(offerExpiry).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : '';

  const gross = Number(salary);
  const annual = gross * 12;
  const basic = Math.round(gross * 0.40);
  const hra = Math.round(gross * 0.20);
  const special = Math.round(gross * 0.30);
  const other = Math.round(gross * 0.10);

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Segoe UI',Arial,sans-serif;color:#1e293b;background:#f8fafc;padding:30px}
  .wrapper{max-width:750px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.10)}
  .header{background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:36px 40px;color:#fff}
  .header h1{font-size:26px;font-weight:800;letter-spacing:-0.5px}
  .header p{font-size:13px;opacity:0.85;margin-top:4px}
  .badge{display:inline-block;background:rgba(255,255,255,0.18);border:1px solid rgba(255,255,255,0.3);border-radius:20px;padding:4px 14px;font-size:11px;font-weight:700;letter-spacing:0.5px;margin-top:10px}
  .body{padding:36px 40px}
  .date-ref{display:flex;justify-content:space-between;font-size:12px;color:#64748b;margin-bottom:24px;padding-bottom:16px;border-bottom:1px solid #f1f5f9}
  .salutation{font-size:15px;margin-bottom:18px;line-height:1.7}
  .highlight-box{background:linear-gradient(135deg,rgba(79,70,229,0.06),rgba(124,58,237,0.06));border:1px solid rgba(79,70,229,0.15);border-radius:10px;padding:20px 24px;margin:20px 0}
  .highlight-box h3{font-size:13px;font-weight:700;color:#4f46e5;text-transform:uppercase;letter-spacing:0.6px;margin-bottom:14px}
  .detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px 20px}
  .detail-item label{font-size:11px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.4px;display:block;margin-bottom:2px}
  .detail-item span{font-size:13px;color:#0f172a;font-weight:600}
  .section-title{font-size:13px;font-weight:700;color:#4f46e5;text-transform:uppercase;letter-spacing:0.6px;margin:24px 0 12px;padding-bottom:6px;border-bottom:2px solid rgba(79,70,229,0.15)}
  table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:8px}
  th{background:#f8fafc;padding:9px 12px;text-align:left;font-weight:700;color:#475569;font-size:11px;text-transform:uppercase;letter-spacing:0.4px;border:1px solid #e2e8f0}
  td{padding:9px 12px;border:1px solid #e2e8f0;color:#1e293b}
  .total-row td{background:#ede9fe;font-weight:800;color:#4f46e5}
  .net-row td{background:#d1fae5;font-weight:800;color:#065f46;font-size:14px}
  .body-text{font-size:13.5px;line-height:1.8;color:#334155;margin:12px 0}
  .benefits-list{list-style:none;padding:0;margin:8px 0}
  .benefits-list li{font-size:13px;color:#334155;padding:5px 0;padding-left:18px;position:relative;line-height:1.6}
  .benefits-list li::before{content:'✓';position:absolute;left:0;color:#10b981;font-weight:700}
  .acceptance{background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:16px 20px;margin:20px 0;font-size:13px;color:#92400e}
  .signature-section{display:grid;grid-template-columns:1fr 1fr;gap:30px;margin-top:30px;padding-top:20px;border-top:1px solid #f1f5f9}
  .sig-box{text-align:center}
  .sig-line{border-top:2px solid #cbd5e1;margin:30px 0 8px;width:80%;margin-left:auto;margin-right:auto}
  .sig-name{font-weight:700;font-size:13px;color:#0f172a}
  .sig-title{font-size:11px;color:#64748b}
  .footer{background:#f8fafc;padding:18px 40px;text-align:center;font-size:11px;color:#94a3b8;border-top:1px solid #e2e8f0}
  .confidential{background:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:10px 16px;font-size:11px;color:#991b1b;text-align:center;margin-top:16px;font-weight:600}
</style>
</head>
<body>
<div class="wrapper">
  <div class="header">
    <h1>${companyName || 'HRMS Portal'}</h1>
    <p>Human Resources Department</p>
    <div class="badge">OFFER LETTER</div>
  </div>

  <div class="body">
    <div class="date-ref">
      <span>Date: ${today}</span>
      <span>Ref: OL-${Date.now().toString().slice(-6)}</span>
    </div>

    <p class="salutation">
      <strong>To,</strong><br/>
      ${candidateName}<br/>
      ${candidateEmail}
    </p>

    <p class="body-text">Dear <strong>${candidateName}</strong>,</p>
    <p class="body-text">
      We are delighted to extend this offer of employment to you at <strong>${companyName || 'our organization'}</strong>. 
      After careful consideration of your qualifications and experience, we are pleased to offer you the position of 
      <strong>${role}</strong> in the <strong>${department}</strong> department.
    </p>

    <div class="highlight-box">
      <h3>Position Details</h3>
      <div class="detail-grid">
        <div class="detail-item"><label>Designation</label><span>${role}</span></div>
        <div class="detail-item"><label>Department</label><span>${department}</span></div>
        <div class="detail-item"><label>Date of Joining</label><span>${joining}</span></div>
        <div class="detail-item"><label>Work Location</label><span>${workLocation || 'Head Office'}</span></div>
        <div class="detail-item"><label>Working Hours</label><span>${workingHours || '9:00 AM – 6:00 PM (Mon–Sat)'}</span></div>
        <div class="detail-item"><label>Reporting To</label><span>${reportingManager || 'Department Head'}</span></div>
      </div>
    </div>

    <p class="section-title">Compensation Structure</p>
    <table>
      <thead><tr><th>Component</th><th>Monthly (₹)</th><th>Annual (₹)</th></tr></thead>
      <tbody>
        <tr><td>Basic Salary (40%)</td><td>₹${basic.toLocaleString('en-IN')}</td><td>₹${(basic * 12).toLocaleString('en-IN')}</td></tr>
        <tr><td>House Rent Allowance – HRA (20%)</td><td>₹${hra.toLocaleString('en-IN')}</td><td>₹${(hra * 12).toLocaleString('en-IN')}</td></tr>
        <tr><td>Special Allowance (30%)</td><td>₹${special.toLocaleString('en-IN')}</td><td>₹${(special * 12).toLocaleString('en-IN')}</td></tr>
        <tr><td>Other Allowances (10%)</td><td>₹${other.toLocaleString('en-IN')}</td><td>₹${(other * 12).toLocaleString('en-IN')}</td></tr>
        <tr class="total-row"><td><strong>Gross CTC</strong></td><td><strong>₹${gross.toLocaleString('en-IN')}</strong></td><td><strong>₹${annual.toLocaleString('en-IN')}</strong></td></tr>
      </tbody>
    </table>
    <p style="font-size:11px;color:#94a3b8;margin-top:4px">* Statutory deductions (PF, ESI, TDS, Professional Tax) will be applicable as per government norms.</p>

    ${additionalBenefits ? `
    <p class="section-title">Additional Benefits</p>
    <ul class="benefits-list">
      ${additionalBenefits.split('\n').filter(b => b.trim()).map(b => `<li>${b.trim()}</li>`).join('')}
    </ul>` : ''}

    <p class="section-title">Terms & Conditions</p>
    <ul class="benefits-list">
      <li>This offer is subject to successful completion of background verification and document submission.</li>
      <li>You will be on a probation period of <strong>6 months</strong> from the date of joining.</li>
      <li>During probation, either party may terminate employment with <strong>7 days' notice</strong>.</li>
      <li>Post-confirmation, the notice period will be <strong>30 days</strong> on either side.</li>
      <li>You are required to maintain strict confidentiality of all company information.</li>
      <li>This offer is non-transferable and valid only for the candidate named above.</li>
    </ul>

    ${expiry ? `<div class="acceptance">
      ⚠️ <strong>Offer Validity:</strong> This offer letter is valid until <strong>${expiry}</strong>. 
      Please confirm your acceptance by replying to this email before the expiry date.
    </div>` : ''}

    <div class="signature-section">
      <div class="sig-box">
        <div class="sig-line"></div>
        <p class="sig-name">${hrName || 'HR Manager'}</p>
        <p class="sig-title">${hrDesignation || 'Human Resources'}, ${companyName || 'HRMS Portal'}</p>
      </div>
      <div class="sig-box">
        <div class="sig-line"></div>
        <p class="sig-name">${candidateName}</p>
        <p class="sig-title">Candidate Signature & Date</p>
      </div>
    </div>

    <div class="confidential">🔒 CONFIDENTIAL — This document is intended solely for ${candidateName} and must not be shared with any third party.</div>
  </div>

  <div class="footer">
    <p>${companyName || 'HRMS Portal'} | HR Department | Generated on ${today}</p>
    <p style="margin-top:4px">This is a system-generated offer letter from the HRMS Portal.</p>
  </div>
</div>
</body>
</html>`;
};

const cleanText = (value = '') => String(value)
  .replace(/[₹]/g, 'Rs.')
  .replace(/[–—]/g, '-')
  .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, '');

const pdfEscape = (value) => cleanText(value).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

const wrapText = (text, maxChars = 92) => {
  const words = cleanText(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  words.forEach(word => {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxChars) {
      if (line) lines.push(line);
      line = word;
    } else {
      line = next;
    }
  });
  if (line) lines.push(line);
  return lines.length ? lines : [''];
};

const buildPdfBuffer = (pages) => {
  const objects = [];
  // Object 1: Catalog
  objects.push('<< /Type /Catalog /Pages 2 0 R >>');
  // Object 2: Pages placeholder (will update with children references)
  objects.push('');
  // Object 3: Font
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');

  const pageRefs = [];
  pages.forEach(lines => {
    const streamId = objects.length + 1;
    const pageId = streamId + 1;
    pageRefs.push(pageId);

    const stream = ['BT', '/F1 11 Tf', '52 790 Td', '14 TL', ...lines.map(line => `(${pdfEscape(line)}) Tj T*`), 'ET'].join('\n');
    objects.push(`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`);
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${streamId} 0 R >>`);
  });

  // Write correct Pages kids reference using final shifted indices
  objects[1] = `<< /Type /Pages /Kids [${pageRefs.map(ref => `${ref} 0 R`).join(' ')}] /Count ${pageRefs.length} >>`;

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach(offset => { pdf += `${String(offset).padStart(10, '0')} 00000 n \n`; });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, 'binary');
};

const buildOfferLetterPDF = (data) => {
  const {
    candidateName, candidateEmail, role, department, salary,
    joiningDate, workLocation, workingHours, reportingManager,
    companyName, hrName, hrDesignation, additionalBenefits, offerExpiry
  } = data;
  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
  const joining = new Date(joiningDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
  const expiry = offerExpiry ? new Date(offerExpiry).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : 'As communicated by HR';
  const gross = Number(salary);
  const annual = gross * 12;
  const basic = Math.round(gross * 0.40);
  const hra = Math.round(gross * 0.20);
  const special = Math.round(gross * 0.30);
  const other = Math.round(gross * 0.10);
  const benefits = additionalBenefits?.split('\n').map(b => b.trim()).filter(Boolean);

  const page1 = [
    `${companyName || 'HRMS Portal'}`, 'Human Resources Department', '', 'OFFER LETTER',
    `Date: ${today}`, `Reference: OL-${Date.now().toString().slice(-6)}`, '',
    'To,', candidateName, candidateEmail, '', `Dear ${candidateName},`, '',
    ...wrapText(`We are delighted to extend this offer of employment to you at ${companyName || 'our organization'}. After careful consideration of your qualifications and experience, we are pleased to offer you the position of ${role} in the ${department} department.`),
    '', 'POSITION DETAILS', `Designation      : ${role}`, `Department       : ${department}`,
    `Date of Joining  : ${joining}`, `Work Location    : ${workLocation || 'Head Office'}`,
    `Working Hours    : ${workingHours || '9:00 AM - 6:00 PM (Mon-Sat)'}`,
    `Reporting To     : ${reportingManager || 'Department Head'}`, '',
    ...wrapText('Your employment will begin on the date mentioned above, subject to successful completion of joining formalities and document verification.'),
    '', 'Page 1 of 3'
  ];

  const page2 = [
    `${companyName || 'HRMS Portal'} - Offer Letter`, '', 'COMPENSATION STRUCTURE', '',
    'Component                         Monthly          Annual',
    '------------------------------------------------------------',
    `Basic Salary (40%)                Rs.${basic.toLocaleString('en-IN').padStart(11)}   Rs.${(basic * 12).toLocaleString('en-IN')}`,
    `House Rent Allowance - HRA (20%)  Rs.${hra.toLocaleString('en-IN').padStart(11)}   Rs.${(hra * 12).toLocaleString('en-IN')}`,
    `Special Allowance (30%)           Rs.${special.toLocaleString('en-IN').padStart(11)}   Rs.${(special * 12).toLocaleString('en-IN')}`,
    `Other Allowances (10%)            Rs.${other.toLocaleString('en-IN').padStart(11)}   Rs.${(other * 12).toLocaleString('en-IN')}`,
    '------------------------------------------------------------',
    `Gross CTC                         Rs.${gross.toLocaleString('en-IN').padStart(11)}   Rs.${annual.toLocaleString('en-IN')}`,
    '', ...wrapText('Statutory deductions such as PF, ESI, TDS, Professional Tax, and any other applicable deductions will be made as per government norms and company policy.'),
    '', 'ADDITIONAL BENEFITS',
    ...(benefits?.length ? benefits.flatMap(item => wrapText(`- ${item}`, 88)) : ['- Benefits will be applicable as per company policy.']),
    '', 'Page 2 of 3'
  ];

  const page3 = [
    `${companyName || 'HRMS Portal'} - Offer Letter`, '', 'TERMS AND CONDITIONS', '',
    ...[
      'This offer is subject to successful completion of background verification and document submission.',
      'You will be on a probation period of 6 months from the date of joining.',
      'During probation, either party may terminate employment with 7 days notice.',
      'Post-confirmation, the notice period will be 30 days on either side.',
      'You are required to maintain strict confidentiality of all company information.',
      'This offer is non-transferable and valid only for the candidate named in this letter.'
    ].flatMap(item => wrapText(`- ${item}`, 88)),
    '', 'OFFER ACCEPTANCE',
    ...wrapText(`This offer is valid until ${expiry}. Please confirm your acceptance by replying to this email before the expiry date.`),
    '', '', 'For the Company,                                  Candidate Acceptance,', '', '',
    '______________________________                    ______________________________',
    `${hrName || 'HR Manager'}                         ${candidateName}`,
    `${hrDesignation || 'Human Resources'}             Signature and Date`, '',
    'CONFIDENTIAL: This document is intended solely for the candidate named above.', '',
    'Page 3 of 3'
  ];

  return buildPdfBuffer([page1, page2, page3]);
};

exports.sendOfferLetter = async (req, res) => {
  try {
    const { candidateEmail, candidateName, ...rest } = req.body;
    if (!candidateEmail || !candidateName || !rest.role || !rest.salary || !rest.joiningDate) {
      return res.status(400).json({ success: false, error: 'Required fields missing' });
    }

    const offerData = { candidateName, candidateEmail, ...rest };
    const htmlBody = buildOfferLetterHTML(offerData);
    const transporter = createTransporter();

    await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || 'HRMS Portal'}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
      to: candidateEmail,
      subject: `Offer Letter – ${rest.role} | ${rest.companyName || 'HRMS Portal'}`,
      html: htmlBody
    });

    res.status(200).json({ success: true, message: `Offer letter sent to ${candidateEmail}` });
  } catch (err) {
    console.error('Offer Letter Send Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};
