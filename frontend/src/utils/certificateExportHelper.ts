/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CertificateItem, CertificateTemplateStyle } from '../types';

/**
 * Standard CRC32 table generator for valid ZIP binary output
 */
function makeCrcTable(): number[] {
  let c: number;
  const table: number[] = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  return table;
}

const CRC_TABLE = makeCrcTable();

function calculateCrc32(bytes: Uint8Array): number {
  let crc = 0 ^ -1;
  for (let i = 0; i < bytes.length; i++) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ bytes[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

/**
 * Pure JavaScript standard uncompressed ZIP archive generator (PKZip 2.0 compliant)
 * Works client-side without third-party binary libraries.
 */
export function createZipArchive(
  files: { name: string; content: string | Uint8Array }[]
): Blob {
  const encoder = new TextEncoder();
  const fileEntries: {
    nameBytes: Uint8Array;
    contentBytes: Uint8Array;
    crc: number;
    offset: number;
  }[] = [];

  const localParts: Uint8Array[] = [];
  let currentOffset = 0;

  for (const file of files) {
    const nameBytes = encoder.encode(file.name);
    const contentBytes =
      typeof file.content === 'string'
        ? encoder.encode(file.content)
        : file.content;
    const crc = calculateCrc32(contentBytes);
    const offset = currentOffset;

    // Local file header (30 bytes + name length)
    const header = new Uint8Array(30 + nameBytes.length);
    const view = new DataView(header.buffer);
    view.setUint32(0, 0x04034b50, true); // Local file header signature
    view.setUint16(4, 20, true); // Version needed to extract (2.0)
    view.setUint16(6, 0, true); // Flags
    view.setUint16(8, 0, true); // Compression method (0 = uncompressed store)
    view.setUint16(10, 0, true); // Mod time
    view.setUint16(12, 0, true); // Mod date
    view.setUint32(14, crc, true); // CRC32
    view.setUint32(18, contentBytes.length, true); // Compressed size
    view.setUint32(22, contentBytes.length, true); // Uncompressed size
    view.setUint16(26, nameBytes.length, true); // File name length
    view.setUint16(28, 0, true); // Extra field length
    header.set(nameBytes, 30);

    localParts.push(header, contentBytes);
    currentOffset += header.length + contentBytes.length;

    fileEntries.push({
      nameBytes,
      contentBytes,
      crc,
      offset,
    });
  }

  // Central directory
  const centralDirParts: Uint8Array[] = [];
  let centralDirSize = 0;

  for (const entry of fileEntries) {
    const cdHeader = new Uint8Array(46 + entry.nameBytes.length);
    const view = new DataView(cdHeader.buffer);
    view.setUint32(0, 0x02014b50, true); // Central file header signature
    view.setUint16(4, 20, true); // Version made by
    view.setUint16(6, 20, true); // Version needed to extract
    view.setUint16(8, 0, true); // Flags
    view.setUint16(10, 0, true); // Compression method (0 = store)
    view.setUint16(12, 0, true); // Mod time
    view.setUint16(14, 0, true); // Mod date
    view.setUint32(16, entry.crc, true); // CRC32
    view.setUint32(20, entry.contentBytes.length, true); // Compressed size
    view.setUint32(24, entry.contentBytes.length, true); // Uncompressed size
    view.setUint16(28, entry.nameBytes.length, true); // File name length
    view.setUint16(30, 0, true); // Extra field length
    view.setUint16(32, 0, true); // Comment length
    view.setUint16(34, 0, true); // Disk number start
    view.setUint16(36, 0, true); // Internal file attributes
    view.setUint32(38, 0, true); // External file attributes
    view.setUint32(42, entry.offset, true); // Relative offset of local header
    cdHeader.set(entry.nameBytes, 46);

    centralDirParts.push(cdHeader);
    centralDirSize += cdHeader.length;
  }

  // End of Central Directory Record (22 bytes)
  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);
  eocdView.setUint32(0, 0x06054b50, true); // EOCD signature
  eocdView.setUint16(4, 0, true); // Disk number
  eocdView.setUint16(6, 0, true); // Disk with central directory
  eocdView.setUint16(8, fileEntries.length, true); // Number of records this disk
  eocdView.setUint16(10, fileEntries.length, true); // Total number of records
  eocdView.setUint32(12, centralDirSize, true); // Central dir size
  eocdView.setUint32(16, currentOffset, true); // Central dir start offset
  eocdView.setUint16(20, 0, true); // Comment length

  return new Blob([...localParts, ...centralDirParts, eocd] as unknown as BlobPart[], {
    type: 'application/zip',
  });
}

/**
 * Builds a valid RFC4180 CSV export of certificates
 */
export function generateBatchCsv(certificates: CertificateItem[]): string {
  const headers = [
    'Certificate_ID',
    'Recipient_Name',
    'Roll_Number',
    'Recipient_Email',
    'Session_Title',
    'Issue_Date',
    'Grade',
    'Status',
    'Verification_Code',
    'Verification_URL',
  ];

  const escapeCsv = (str: string | undefined | null) => {
    if (!str) return '""';
    const s = String(str).replace(/"/g, '""');
    return `"${s}"`;
  };

  const rows = certificates.map((c) => [
    escapeCsv(c.id),
    escapeCsv(c.recipientName),
    escapeCsv(c.recipientRoll),
    escapeCsv(c.recipientEmail || c.recipientPrimaryEmail),
    escapeCsv(c.sessionTitle),
    escapeCsv(c.issueDate),
    escapeCsv(c.grade || 'First Class Distinction'),
    escapeCsv(c.status),
    escapeCsv(c.verificationCode),
    escapeCsv(
      `https://sems.university.edu.pk/verify/${encodeURIComponent(c.verificationCode)}`
    ),
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
}

/**
 * Generates an isolated, self-contained printable HTML vector certificate file
 * Suitable for opening in any browser and printing to vector PDF
 */
export function generatePrintableCertificateHtml(
  certificate: CertificateItem,
  signatories?: {
    customTitle?: string;
    customSubtitle?: string;
    signatoryName?: string;
    signatoryTitle?: string;
    adminName?: string;
    adminTitle?: string;
  }
): string {
  const title = signatories?.customTitle || certificate.customTitle || 'CERTIFICATE OF TECHNICAL EXCELLENCE';
  const subtitle =
    signatories?.customSubtitle ||
    certificate.customSubtitle ||
    'In recognition of active participation, commendable dedication, and technical merit demonstrated during university society proceedings.';
  const sig1Name = signatories?.signatoryName || 'Alex Morgan';
  const sig1Title = signatories?.signatoryTitle || 'Lead Session Administrator';
  const sig2Name = signatories?.adminName || 'Prof. Dean Taylor';
  const sig2Title = signatories?.adminTitle || 'Faculty Advisor & Institutional Dean';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>SEMS Certificate - ${certificate.recipientName} (${certificate.verificationCode})</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@700&family=Inter:wght@400;600&family=Playfair+Display:ital,wght@1,600&display=swap');
    
    @page {
      size: landscape;
      margin: 0;
    }
    
    body {
      margin: 0;
      padding: 24px;
      background: #f1f5f9;
      font-family: 'Inter', sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      min-height: 100vh;
      box-sizing: border-box;
    }

    .no-print-bar {
      margin-bottom: 20px;
      display: flex;
      gap: 12px;
    }

    .btn-print {
      background: #2563eb;
      color: white;
      border: none;
      padding: 10px 24px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 14px;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(37,99,235,0.25);
    }

    .certificate-frame {
      width: 1000px;
      height: 650px;
      background: #faf7ee;
      border: 8px solid #b45309;
      box-shadow: 0 16px 40px rgba(0,0,0,0.15);
      position: relative;
      padding: 40px 60px;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      text-align: center;
      color: #1e293b;
    }

    .inner-border {
      position: absolute;
      inset: 12px;
      border: 2px solid #d97706;
      pointer-events: none;
    }

    .header-wing {
      font-size: 12px;
      letter-spacing: 4px;
      text-transform: uppercase;
      font-weight: 700;
      color: #92400e;
    }

    .title {
      font-family: 'Cinzel', serif;
      font-size: 34px;
      font-weight: 700;
      color: #0f172a;
      letter-spacing: 2px;
      margin: 6px 0;
    }

    .subtitle {
      font-family: 'Playfair Display', serif;
      font-style: italic;
      font-size: 15px;
      color: #78350f;
      max-width: 750px;
      margin: 0 auto;
    }

    .recipient-name {
      font-family: 'Playfair Display', serif;
      font-size: 42px;
      font-weight: 700;
      color: #0f172a;
      border-bottom: 2px solid #b45309;
      display: inline-block;
      padding-bottom: 4px;
      margin: 12px auto;
    }

    .meta-line {
      font-size: 14px;
      color: #475569;
      margin-bottom: 6px;
    }

    .session-title {
      font-size: 24px;
      font-weight: 700;
      color: #b45309;
      margin: 6px 0;
    }

    .footer-signatures {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      padding-top: 20px;
    }

    .signature-box {
      width: 240px;
      text-align: center;
    }

    .sig-line {
      border-top: 1.5px solid #0f172a;
      margin-top: 8px;
      padding-top: 4px;
      font-size: 13px;
      font-weight: 600;
      color: #0f172a;
    }

    .sig-title {
      font-size: 11px;
      color: #64748b;
    }

    .seal-box {
      width: 100px;
      height: 100px;
      border-radius: 50%;
      background: radial-gradient(circle, #fde68a, #d97706);
      border: 3px solid #78350f;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #78350f;
      font-weight: bold;
      font-size: 10px;
      letter-spacing: 1px;
      box-shadow: 0 4px 10px rgba(0,0,0,0.1);
    }

    @media print {
      body {
        padding: 0;
        background: white;
      }
      .no-print-bar {
        display: none !important;
      }
      .certificate-frame {
        box-shadow: none;
        width: 100vw;
        height: 100vh;
        border-width: 6px;
      }
    }
  </style>
</head>
<body>
  <div class="no-print-bar">
    <button class="btn-print" onclick="window.print()">Print or Save as Vector PDF</button>
  </div>

  <div class="certificate-frame">
    <div class="inner-border"></div>
    <div>
      <div class="header-wing">${(certificate.societyWing || 'SOCIETY EVENT MANAGEMENT SYSTEM').toUpperCase()}</div>
      <div class="title">${title}</div>
      <div class="subtitle">${subtitle}</div>
    </div>

    <div>
      <div style="font-size: 13px; color: #64748b; letter-spacing: 1px;">PROUDLY CONFERRED UPON</div>
      <div class="recipient-name">${certificate.recipientName}</div>
      <div class="meta-line">Roll Identifier: <strong>${certificate.recipientRoll}</strong> &bull; Grade: <strong>${certificate.grade || 'First Class Distinction'}</strong></div>
      <div style="font-size: 14px; color: #334155;">For distinguished technical excellence and exemplary achievement in</div>
      <div class="session-title">${certificate.sessionTitle}</div>
      <div style="font-size: 12px; color: #64748b;">Conferred on: ${certificate.issueDate} &bull; ID: <strong>${certificate.verificationCode}</strong></div>
    </div>

    <div class="footer-signatures">
      <div class="signature-box">
        <div style="font-family: cursive; font-size: 22px; color: #1e3a8a; height: 35px;">Alex Morgan</div>
        <div class="sig-line">${sig1Name}</div>
        <div class="sig-title">${sig1Title}</div>
      </div>

      <div class="seal-box">
        <div>SEMS</div>
        <div style="font-size: 8px;">VERIFIED</div>
        <div style="font-size: 7px; opacity: 0.8;">OFFICIAL</div>
      </div>

      <div class="signature-box">
        <div style="font-family: cursive; font-size: 22px; color: #7c3aed; height: 35px;">Dean Taylor</div>
        <div class="sig-line">${sig2Name}</div>
        <div class="sig-title">${sig2Title}</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

interface PaletteTheme {
  bgStart: string;
  bgMid: string;
  bgEnd: string;
  borderColor: string;
  innerBorderColor: string;
  textTitle: string;
  textSubtitle: string;
  textName: string;
  textDetails: string;
  accentTitle: string;
  sealBg: string;
  sealBorder: string;
  sealText: string;
  isLight: boolean;
}

function getPaletteForStyle(style?: CertificateTemplateStyle): PaletteTheme {
  switch (style) {
    case 'classic_ivory':
      return {
        bgStart: '#FAF7EE',
        bgMid: '#F5EEDC',
        bgEnd: '#EFE5CE',
        borderColor: '#B45309',
        innerBorderColor: 'rgba(217, 119, 6, 0.5)',
        textTitle: '#0F172A',
        textSubtitle: '#78350F',
        textName: '#0F172A',
        textDetails: '#475569',
        accentTitle: '#B45309',
        sealBg: '#F59E0B',
        sealBorder: '#FDE68A',
        sealText: '#78350F',
        isLight: true,
      };

    case 'emerald_executive':
      return {
        bgStart: '#041D14',
        bgMid: '#062E20',
        bgEnd: '#0D4733',
        borderColor: '#10B981',
        innerBorderColor: 'rgba(52, 211, 153, 0.4)',
        textTitle: '#FFFFFF',
        textSubtitle: '#6EE7B7',
        textName: '#ECFDF5',
        textDetails: '#A7F3D0',
        accentTitle: '#34D399',
        sealBg: '#10B981',
        sealBorder: '#A7F3D0',
        sealText: '#064E3B',
        isLight: false,
      };

    case 'crimson_heritage':
      return {
        bgStart: '#2A0808',
        bgMid: '#3F0C0C',
        bgEnd: '#591212',
        borderColor: '#F59E0B',
        innerBorderColor: 'rgba(245, 158, 11, 0.4)',
        textTitle: '#FFFFFF',
        textSubtitle: '#FDE68A',
        textName: '#FEF2F2',
        textDetails: '#FCA5A5',
        accentTitle: '#FBBF24',
        sealBg: '#F59E0B',
        sealBorder: '#FDE68A',
        sealText: '#7F1D1D',
        isLight: false,
      };

    case 'sapphire_vector':
      return {
        bgStart: '#081636',
        bgMid: '#0C2356',
        bgEnd: '#13357B',
        borderColor: '#38BDF8',
        innerBorderColor: 'rgba(56, 189, 248, 0.4)',
        textTitle: '#FFFFFF',
        textSubtitle: '#7DD3FC',
        textName: '#F0F9FF',
        textDetails: '#93C5FD',
        accentTitle: '#38BDF8',
        sealBg: '#0284C7',
        sealBorder: '#BAE6FD',
        sealText: '#082F49',
        isLight: false,
      };

    case 'minimal_monochrome':
      return {
        bgStart: '#FFFFFF',
        bgMid: '#F8FAFC',
        bgEnd: '#F1F5F9',
        borderColor: '#0F172A',
        innerBorderColor: 'rgba(15, 23, 42, 0.25)',
        textTitle: '#0F172A',
        textSubtitle: '#334155',
        textName: '#000000',
        textDetails: '#64748B',
        accentTitle: '#0F172A',
        sealBg: '#0F172A',
        sealBorder: '#94A3B8',
        sealText: '#FFFFFF',
        isLight: true,
      };

    case 'royal_navy':
    default:
      return {
        bgStart: '#09171F',
        bgMid: '#0E2330',
        bgEnd: '#1A3344',
        borderColor: '#CEA17A',
        innerBorderColor: 'rgba(206, 161, 122, 0.4)',
        textTitle: '#FFFFFF',
        textSubtitle: 'rgba(206, 161, 122, 0.9)',
        textName: '#FFFFFF',
        textDetails: '#94A3B8',
        accentTitle: '#F59E0B',
        sealBg: '#F59E0B',
        sealBorder: '#FDE68A',
        sealText: '#78350F',
        isLight: false,
      };
  }
}

/**
 * Renders an ultra high-resolution 1920x1080 canvas certificate and triggers direct PNG download
 * Adapts dynamically to the selected template style, signatures, and titles
 */
export async function downloadCertificateAsHighResPng(
  certificate: CertificateItem,
  signatories?: {
    customTitle?: string;
    customSubtitle?: string;
    templateStyle?: CertificateTemplateStyle;
    signatoryName?: string;
    signatoryTitle?: string;
    officerName?: string;
    officerTitle?: string;
    adminName?: string;
    adminTitle?: string;
    customSignature1?: string;
    customSignature2?: string;
  }
): Promise<void> {
  // Pre-load fonts so vector canvas export doesn't suffer layout distortion
  if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // safe fallback
    }
  }

  const width = 1920;
  const height = 1080;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const activeStyle = signatories?.templateStyle || certificate.templateStyle || 'royal_navy';
  const palette = getPaletteForStyle(activeStyle);

  // 1. Background gradient
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, palette.bgStart);
  bgGrad.addColorStop(0.5, palette.bgMid);
  bgGrad.addColorStop(1, palette.bgEnd);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // 2. Corner Decorative Accents & Borders
  ctx.strokeStyle = palette.borderColor;
  ctx.lineWidth = 4;
  ctx.strokeRect(40, 40, width - 80, height - 80);

  ctx.strokeStyle = palette.innerBorderColor;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(52, 52, width - 104, height - 104);

  // Corner rosettes
  const corners = [
    [40, 40],
    [width - 40, 40],
    [40, height - 40],
    [width - 40, height - 40],
  ];
  corners.forEach(([x, y]) => {
    ctx.fillStyle = palette.borderColor;
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fill();
  });

  // 3. Institution / Society Header
  ctx.textAlign = 'center';
  ctx.fillStyle = palette.borderColor;
  ctx.font = 'bold 20px "Inter", sans-serif';
  ctx.letterSpacing = '6px';
  ctx.fillText(
    (certificate.societyWing || 'SOCIETY EVENT MANAGEMENT SYSTEM').toUpperCase(),
    width / 2,
    130
  );

  // 4. Main Certificate Title
  const mainTitle = (signatories?.customTitle || certificate.customTitle || 'CERTIFICATE OF TECHNICAL EXCELLENCE').toUpperCase();
  ctx.fillStyle = palette.textTitle;
  ctx.font = 'bold 50px "Poppins", "Georgia", serif';
  ctx.letterSpacing = '2px';
  ctx.fillText(mainTitle, width / 2, 210);

  const mainSubtitle =
    signatories?.customSubtitle ||
    certificate.customSubtitle ||
    'In recognition of active participation, commendable dedication, and technical merit demonstrated during university society proceedings.';
  ctx.fillStyle = palette.textSubtitle;
  ctx.font = 'italic 21px "Georgia", serif';
  ctx.letterSpacing = '1px';
  ctx.fillText(mainSubtitle, width / 2, 275);

  // 5. Recipient Name
  ctx.fillStyle = palette.textName;
  ctx.font = 'bold 64px "Poppins", sans-serif';
  ctx.fillText(certificate.recipientName, width / 2, 380);

  // Decorative gold underline under recipient name
  const nameWidth = ctx.measureText(certificate.recipientName).width;
  ctx.strokeStyle = palette.borderColor;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(width / 2 - nameWidth / 2 - 40, 410);
  ctx.lineTo(width / 2 + nameWidth / 2 + 40, 410);
  ctx.stroke();

  // 6. Roll Number & Distinction
  ctx.fillStyle = palette.textDetails;
  ctx.font = 'bold 22px "Inter", monospace';
  ctx.letterSpacing = '1px';
  ctx.fillText(
    `Roll Identifier: ${certificate.recipientRoll}   •   ${certificate.grade || 'First Class Distinction'}`,
    width / 2,
    460
  );

  // 7. Session accomplishment text
  ctx.fillStyle = palette.isLight ? '#334155' : 'rgba(255, 255, 255, 0.85)';
  ctx.font = '22px "Inter", sans-serif';
  ctx.letterSpacing = '0px';
  ctx.fillText(
    'for exemplary dedication, technical engagement, and successful completion of',
    width / 2,
    530
  );

  // Session Title
  ctx.fillStyle = palette.accentTitle;
  ctx.font = 'bold 38px "Poppins", sans-serif';
  ctx.fillText(certificate.sessionTitle, width / 2, 590);

  // Date
  ctx.fillStyle = palette.textDetails;
  ctx.font = '20px "Inter", sans-serif';
  ctx.fillText(`Conferred on: ${certificate.issueDate}`, width / 2, 650);

  // 8. Seal and Verification ID Box (Center Bottom)
  const boxW = 380;
  const boxH = 50;
  const boxX = width / 2 - boxW / 2;
  const boxY = 720;
  ctx.fillStyle = palette.isLight ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.06)';
  ctx.strokeStyle = palette.innerBorderColor;
  ctx.lineWidth = 1.5;
  ctx.fillRect(boxX, boxY, boxW, boxH);
  ctx.strokeRect(boxX, boxY, boxW, boxH);

  ctx.fillStyle = palette.borderColor;
  ctx.font = 'bold 20px "Inter", monospace';
  ctx.fillText(`ID: ${certificate.verificationCode}`, width / 2, boxY + 32);

  // 9. Signatures Area
  const officerName = signatories?.signatoryName || signatories?.officerName || 'Alex Morgan';
  const officerTitle = signatories?.signatoryTitle || signatories?.officerTitle || 'Dean of Student Affairs';
  const adminName = signatories?.adminName || 'Prof. Dean Taylor';
  const adminTitle = signatories?.adminTitle || 'Faculty Advisor & Institutional Dean';

  // Left Signature (Dean/Officer)
  const leftX = 360;
  const sigY = 880;

  if (signatories?.customSignature1) {
    try {
      const sigImg1 = new Image();
      await new Promise<void>((res) => {
        sigImg1.onload = () => res();
        sigImg1.onerror = () => res();
        sigImg1.src = signatories.customSignature1!;
      });
      ctx.drawImage(sigImg1, leftX - 100, sigY - 65, 200, 55);
    } catch {
      // fallback
    }
  } else {
    // Simulated cursive signature curve
    ctx.strokeStyle = palette.isLight ? '#1E3A8A' : '#60A5FA';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(leftX - 80, sigY - 25);
    ctx.bezierCurveTo(leftX - 30, sigY - 60, leftX + 10, sigY - 10, leftX + 60, sigY - 35);
    ctx.bezierCurveTo(leftX + 80, sigY - 5, leftX + 20, sigY + 5, leftX + 90, sigY - 10);
    ctx.stroke();
  }

  ctx.strokeStyle = palette.isLight ? 'rgba(0, 0, 0, 0.25)' : 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(leftX - 110, sigY);
  ctx.lineTo(leftX + 110, sigY);
  ctx.stroke();

  ctx.fillStyle = palette.textTitle;
  ctx.font = 'bold 22px "Inter", sans-serif';
  ctx.fillText(officerName, leftX, sigY + 30);
  ctx.fillStyle = palette.textDetails;
  ctx.font = '16px "Inter", sans-serif';
  ctx.fillText(officerTitle, leftX, sigY + 54);

  // Right Signature (Academic Council Director / Admin)
  const rightX = width - 360;

  if (signatories?.customSignature2) {
    try {
      const sigImg2 = new Image();
      await new Promise<void>((res) => {
        sigImg2.onload = () => res();
        sigImg2.onerror = () => res();
        sigImg2.src = signatories.customSignature2!;
      });
      ctx.drawImage(sigImg2, rightX - 100, sigY - 65, 200, 55);
    } catch {
      // fallback
    }
  } else {
    ctx.strokeStyle = palette.isLight ? '#581C87' : '#A78BFA';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(rightX - 80, sigY - 20);
    ctx.bezierCurveTo(rightX - 40, sigY - 55, rightX + 15, sigY - 15, rightX + 70, sigY - 40);
    ctx.bezierCurveTo(rightX + 85, sigY - 10, rightX + 30, sigY + 10, rightX + 95, sigY - 15);
    ctx.stroke();
  }

  ctx.strokeStyle = palette.isLight ? 'rgba(0, 0, 0, 0.25)' : 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(rightX - 110, sigY);
  ctx.lineTo(rightX + 110, sigY);
  ctx.stroke();

  ctx.fillStyle = palette.textTitle;
  ctx.font = 'bold 22px "Inter", sans-serif';
  ctx.fillText(adminName, rightX, sigY + 30);
  ctx.fillStyle = palette.textDetails;
  ctx.font = '16px "Inter", sans-serif';
  ctx.fillText(adminTitle, rightX, sigY + 54);

  // 10. Center Medallion Stamp
  const centerX = width / 2;
  const centerY = 900;
  ctx.fillStyle = palette.sealBg;
  ctx.beginPath();
  ctx.arc(centerX, centerY, 42, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = palette.sealBorder;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(centerX, centerY, 38, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = palette.sealText;
  ctx.font = 'bold 12px "Inter", sans-serif';
  ctx.fillText('SEMS SEAL', centerX, centerY - 6);
  ctx.font = 'bold 11px "Inter", sans-serif';
  ctx.fillText('OFFICIAL', centerX, centerY + 10);
  ctx.fillText('VERIFIED', centerX, centerY + 24);

  // Export to Blob and download
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const sanitizedRecipient = certificate.recipientName.replace(/[^a-zA-Z0-9_-]/g, '_');
        a.download = `SEMS_Certificate_${sanitizedRecipient}_${certificate.verificationCode}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
      resolve();
    }, 'image/png');
  });
}

/**
 * Robust RFC 4180 CSV parser
 * Correctly handles quotes, commas inside quoted strings, multiline cells, blank rows, and uneven columns.
 */
export interface ParsedCsvResult {
  headers: string[];
  rawRows: {
    rowNumber: number; // 1-based original line index (Row 1 = headers)
    cells: string[];
    rawText: string;
    isBlank: boolean;
    syntaxErrors: string[];
  }[];
}

export function parseCsvContent(text: string): ParsedCsvResult {
  const records: string[][] = [];
  let currentRecord: string[] = [];
  let currentField = '';
  let inQuotes = false;
  let lineNum = 1;
  const rowLineNumbers: number[] = [1];
  const syntaxErrorsMap = new Map<number, string[]>();

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote: ""
          currentField += '"';
          i++; // Skip next quote
        } else {
          // Closing quote
          inQuotes = false;
        }
      } else {
        currentField += char;
        if (char === '\n') {
          lineNum++;
        }
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentRecord.push(currentField.trim());
        currentField = '';
      } else if (char === '\r') {
        if (nextChar === '\n') {
          i++;
        }
        currentRecord.push(currentField.trim());
        records.push(currentRecord);
        currentRecord = [];
        currentField = '';
        lineNum++;
        rowLineNumbers.push(lineNum);
      } else if (char === '\n') {
        currentRecord.push(currentField.trim());
        records.push(currentRecord);
        currentRecord = [];
        currentField = '';
        lineNum++;
        rowLineNumbers.push(lineNum);
      } else {
        currentField += char;
      }
    }
  }

  // Push final field/record
  if (currentField.length > 0 || currentRecord.length > 0) {
    currentRecord.push(currentField.trim());
    records.push(currentRecord);
  }

  if (inQuotes) {
    const lastRow = rowLineNumbers[rowLineNumbers.length - 1] || lineNum;
    const errors = syntaxErrorsMap.get(lastRow) || [];
    errors.push('Unclosed quotation mark detected in CSV row');
    syntaxErrorsMap.set(lastRow, errors);
  }

  if (records.length === 0) {
    return { headers: [], rawRows: [] };
  }

  const rawHeaders = records[0].map((h) => h.replace(/^["']|["']$/g, '').trim());
  const headerCount = rawHeaders.length;

  const rawRows = records.slice(1).map((cells, idx) => {
    const rowNum = idx + 2; // Row 1 is header
    const cleanCells = cells.map((c) => c.replace(/^["']|["']$/g, '').trim());
    const isBlank = cleanCells.every((c) => c === '');
    const syntaxErrors = [...(syntaxErrorsMap.get(rowNum) || [])];

    if (!isBlank && cleanCells.length > headerCount) {
      syntaxErrors.push(`Extra commas detected: found ${cleanCells.length} values, header defines ${headerCount} columns`);
    }

    return {
      rowNumber: rowNum,
      cells: cleanCells,
      rawText: cells.join(','),
      isBlank,
      syntaxErrors,
    };
  });

  return { headers: rawHeaders, rawRows };
}

export interface ColumnMappingConfig {
  name: string;
  roll: string;
  email: string;
  session: string;
  grade: string;
}

export interface CsvValidationRow {
  rowNumber: number; // 1-based original line index
  cells: string[];
  name: string;
  roll: string;
  email: string;
  session: string;
  grade: string;
  errors: string[];
  warnings: string[];
  isValid: boolean;
  isBlank: boolean;
}

export interface CsvValidationSummary {
  totalRows: number;
  validCount: number;
  invalidCount: number;
  blankCount: number;
  duplicateEmails: string[];
  hasErrors: boolean;
  rows: CsvValidationRow[];
}

/**
 * Row-by-row comprehensive validator for uploaded CSV participant datasets
 */
export function validateCsvRows(
  parsedRows: ParsedCsvResult['rawRows'],
  headers: string[],
  mapping: ColumnMappingConfig
): CsvValidationSummary {
  const nameIdx = headers.indexOf(mapping.name);
  const rollIdx = headers.indexOf(mapping.roll);
  const emailIdx = headers.indexOf(mapping.email);
  const sessionIdx = headers.indexOf(mapping.session);
  const gradeIdx = headers.indexOf(mapping.grade);

  const emailSeenMap = new Map<string, number>(); // lowercase email -> first row
  const duplicateEmails: string[] = [];
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const rows: CsvValidationRow[] = [];
  let validCount = 0;
  let invalidCount = 0;
  let blankCount = 0;

  parsedRows.forEach((r) => {
    const errors: string[] = [...r.syntaxErrors];
    const warnings: string[] = [];

    if (r.isBlank) {
      errors.push(`Row ${r.rowNumber}: Blank or empty row (no data provided)`);
      blankCount++;
    }

    const name = (nameIdx >= 0 ? r.cells[nameIdx] : '')?.trim() || '';
    const roll = (rollIdx >= 0 ? r.cells[rollIdx] : '')?.trim() || '';
    const email = (emailIdx >= 0 ? r.cells[emailIdx] : '')?.trim() || '';
    const session = (sessionIdx >= 0 ? r.cells[sessionIdx] : '')?.trim() || '';
    const grade = (gradeIdx >= 0 ? r.cells[gradeIdx] : '')?.trim() || 'Distinction';

    if (!r.isBlank) {
      // 1. Missing Full Name check
      if (!name) {
        errors.push(`Row ${r.rowNumber}: Missing Full Name`);
      }

      // 2. Email format & Duplicate Email check
      if (email) {
        const cleanEmail = email.toLowerCase().trim();
        if (!emailRegex.test(cleanEmail)) {
          errors.push(`Row ${r.rowNumber}: Invalid Email Format ("${email}")`);
        } else {
          if (emailSeenMap.has(cleanEmail)) {
            const firstSeenRow = emailSeenMap.get(cleanEmail)!;
            errors.push(`Row ${r.rowNumber}: Duplicate Email ("${email}" - first defined at Row ${firstSeenRow})`);
            if (!duplicateEmails.includes(cleanEmail)) {
              duplicateEmails.push(cleanEmail);
            }
          } else {
            emailSeenMap.set(cleanEmail, r.rowNumber);
          }
        }
      }

      // Optional: warning if session is missing
      if (!session) {
        warnings.push(`Row ${r.rowNumber}: Session Title not provided (will fall back to active event session)`);
      }
    }

    const isValid = errors.length === 0;
    if (isValid) {
      validCount++;
    } else {
      invalidCount++;
    }

    rows.push({
      rowNumber: r.rowNumber,
      cells: r.cells,
      name,
      roll,
      email,
      session,
      grade,
      errors,
      warnings,
      isValid,
      isBlank: r.isBlank,
    });
  });

  return {
    totalRows: parsedRows.length,
    validCount,
    invalidCount,
    blankCount,
    duplicateEmails,
    hasErrors: invalidCount > 0,
    rows,
  };
}

/**
 * Downloads a cleanly formatted RFC 4180 CSV template for administrators
 */
export function downloadSampleCertificateCsvTemplate(): void {
  const sampleHeaders = 'Full Name,Roll Number,Email,Session Title,Grade';
  const sampleData = [
    'Muhammad Hamza,2024-CS-101,hamza.cs@university.edu.pk,Annual Robotics & AI Symposium 2026,Distinction',
    'Ayesha Malik,2024-SE-204,ayesha.se@university.edu.pk,UI/UX Design Sprint & Product Critique,Merit',
    'Bilal Ahmed,2024-EE-315,bilal.ee@university.edu.pk,Introductory Cloud Architecture & DevOps,Distinction',
    'Zainab Fatima,2024-AI-409,zainab.fatima@university.edu.pk,Annual Robotics & AI Symposium 2026,High Distinction',
    'Usman Tariq,2024-CS-520,usman.tariq@university.edu.pk,Annual Robotics & AI Symposium 2026,Distinction',
  ];

  const content = [sampleHeaders, ...sampleData].join('\r\n');
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'sems_sample_certificate_attendees_template.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
