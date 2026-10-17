/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Award,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check,
  Search,
  Printer,
  X,
  FileCheck,
  RefreshCw,
  Palette,
  XCircle,
  Lock,
  Clock,
  Upload,
  Download,
  FileSpreadsheet,
  AlertTriangle,
  FolderArchive,
  Info,
  UserCheck,
  PenTool,
  QrCode,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import {
  CertificateItem,
  CertificateTemplateStyle,
  CertificateTemplateFormat,
  DashboardRole,
  RegistrantItem,
  UserRole,
} from '../../types';
import { CertificateRenderer } from './CertificateRenderer';
import { TemplateComboBox, TemplateOption } from './TemplateComboBox';
import { DigitalSignaturePadModal } from './DigitalSignaturePadModal';
import { auditService } from '../../services/userService';
import { eligibilityService } from '../../services/eligibilityService';
import { notificationService } from '../../services/notificationService';
import {
  createZipArchive,
  generateBatchCsv,
  downloadCertificateAsHighResPng,
  generatePrintableCertificateHtml,
  parseCsvContent,
  validateCsvRows,
  downloadSampleCertificateCsvTemplate,
  ParsedCsvResult,
  CsvValidationSummary,
  ColumnMappingConfig,
} from '../../utils/certificateExportHelper';

interface CertificatesPageProps {
  currentRole: DashboardRole;
  currentUser?: { name: string; email: string; role: UserRole; isLoggedIn?: boolean } | null;
  certificates: CertificateItem[];
  registrants: RegistrantItem[];
  targetCertificateId?: string | null;
  isVerifyMode?: boolean;
  onIssueNewCertificates?: (newCerts: CertificateItem[]) => void;
  onUpdateCertificates?: (updated: CertificateItem[]) => void;
  onUpdateRegistrants?: (updated: RegistrantItem[]) => void;
  onBack: () => void;
  onNotify: (msg: string) => void;
  isLoading?: boolean;
}

import { EmptyState } from '../EmptyState';
import { SkeletonState } from '../SkeletonState';

export const CertificatesPage: React.FC<CertificatesPageProps> = ({
  currentRole,
  currentUser,
  certificates,
  registrants,
  targetCertificateId,
  isVerifyMode = false,
  onIssueNewCertificates,
  onUpdateCertificates,
  onUpdateRegistrants,
  onBack,
  onNotify,
  isLoading = false,
}) => {
  const [certList, setCertList] = useState<CertificateItem[]>(certificates);

  useEffect(() => {
    setCertList(certificates);
  }, [certificates]);

  const updateCertificateList = (updated: CertificateItem[]) => {
    setCertList(updated);
    if (onUpdateCertificates) {
      onUpdateCertificates(updated);
    }
  };

  // Authority checks: strictly Super Admin & Admin
  const isSuperAdmin = currentRole === 'super_admin';
  const isAdmin = currentRole === 'admin' || isSuperAdmin;
  const isStudent = currentRole === 'student';
  const isGuest = currentRole === 'guest';
  const canApprove = isAdmin;

  // Admin-Governed Template Settings
  const [templateCustomizerOpen, setTemplateCustomizerOpen] = useState(false);
  const [customTitle, setCustomTitle] = useState('Certificate of Technical Excellence');
  const [customSubtitle, setCustomSubtitle] = useState(
    'In recognition of active participation, commendable dedication, and technical merit demonstrated during university society proceedings.'
  );
  const [signatoryName, setSignatoryName] = useState('Alex Morgan');
  const [signatoryTitle, setSignatoryTitle] = useState('Lead Session Administrator');
  const [adminSignatoryName, setAdminSignatoryName] = useState('Prof. Dean Taylor');
  const [adminSignatoryTitle, setAdminSignatoryTitle] = useState('Faculty Advisor & Institutional Dean');
  const [activeTemplateStyle, setActiveTemplateStyle] = useState<CertificateTemplateStyle>('classic_ivory');
  const [activeTemplateFormat, setActiveTemplateFormat] = useState<CertificateTemplateFormat>('html');

  // Digital Signature Pad state (survives page refresh via local cache)
  const [customSignature1, setCustomSignature1] = useState<string | null>(() => {
    try {
      return localStorage.getItem('sems_custom_sig_1');
    } catch {
      return null;
    }
  });
  const [customSignature2, setCustomSignature2] = useState<string | null>(() => {
    try {
      return localStorage.getItem('sems_custom_sig_2');
    } catch {
      return null;
    }
  });
  const [signaturePadTarget, setSignaturePadTarget] = useState<'admin' | 'dean' | null>(null);
  const [inspectingPublicQrCert, setInspectingPublicQrCert] = useState<CertificateItem | null>(null);

  // Revocation Modal state
  const [revokingCert, setRevokingCert] = useState<CertificateItem | null>(null);
  const [revocationReasonInput, setRevocationReasonInput] = useState('');

  // Bulk CSV Generator Modal state (9 steps)
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkStep, setBulkStep] = useState<1 | 2 | 3 | 4 | 5>(1); // 1: Upload, 2: Map & Preview, 3: Confirm, 4: Results, 5: Export ZIP
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvRawData, setCsvRawData] = useState<string[][]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [parsedCsvResult, setParsedCsvResult] = useState<ParsedCsvResult | null>(null);
  const [csvValidationSummary, setCsvValidationSummary] = useState<CsvValidationSummary | null>(null);
  const [previewFilter, setPreviewFilter] = useState<'all' | 'invalid' | 'valid'>('all');
  const [csvParseError, setCsvParseError] = useState<string | null>(null);
  const [columnMapping, setColumnMapping] = useState<ColumnMappingConfig>({
    name: '',
    roll: '',
    email: '',
    session: '',
    grade: '',
  });
  const [bulkResults, setBulkResults] = useState<{
    successful: CertificateItem[];
    failed: { row: number; reason: string; data: string[] }[];
  }>({ successful: [], failed: [] });
  const csvFileInputRef = useRef<HTMLInputElement>(null);

  // Student & Guest certificate resolution: strictly authentic credentials only matching their own name or email
  const displayCertificates = useMemo(() => {
    if (isAdmin) {
      return certList;
    }

    const normalizedUserEmail = currentUser?.email?.toLowerCase().trim() || '';
    const normalizedUserName = currentUser?.name?.toLowerCase().trim() || '';

    // Match certificate strictly to the user/guest's own name or email
    if (normalizedUserEmail || normalizedUserName) {
      const userCerts = certList.filter((c) => {
        const matchEmail =
          Boolean(normalizedUserEmail) &&
          (c.recipientEmail?.toLowerCase().trim() === normalizedUserEmail ||
            c.recipientPrimaryEmail?.toLowerCase().trim() === normalizedUserEmail ||
            c.recipientSecondaryEmail?.toLowerCase().trim() === normalizedUserEmail);
        const matchName =
          Boolean(normalizedUserName) &&
          c.recipientName.toLowerCase().trim() === normalizedUserName;
        return matchEmail || matchName;
      });

      return userCerts;
    }

    // Guest without username/email login: do not expose all students' certificates
    return [];
  }, [certList, currentUser, isAdmin]);

  const [activeCert, setActiveCert] = useState<CertificateItem>(
    () => displayCertificates[0] || certList[0]
  );

  useEffect(() => {
    if (displayCertificates.length > 0 && !displayCertificates.some((c) => c.id === activeCert?.id)) {
      setActiveCert(displayCertificates[0]);
    }
  }, [displayCertificates]);

  // Synchronize target certificate when opened from pasted link or verify route
  useEffect(() => {
    if (targetCertificateId) {
      const cleanTarget = targetCertificateId.trim().toUpperCase();
      const matched = certList.find(
        (c) =>
          c.id === targetCertificateId ||
          c.verificationCode.toUpperCase() === cleanTarget
      );
      if (matched) {
        setActiveCert(matched);
        if (isVerifyMode) {
          setShowVerificationCard(true);
          setInputCode(matched.verificationCode);
          setVerificationResult({
            status: matched.status === 'revoked' ? 'revoked' : 'valid',
            cert: matched,
            message:
              matched.status === 'revoked'
                ? `THIS CERTIFICATE HAS BEEN OFFICIALLY REVOKED. Reason: ${matched.revocationReason || 'Administrative revocation.'}`
                : 'Certificate is authentic, digitally verified, and anchored on SEMS credential ledger.',
          });
        }
      } else if (isVerifyMode) {
        setShowVerificationCard(true);
        setInputCode(targetCertificateId);
        setVerificationResult({
          status: 'invalid',
          message: `No active credential record exists for code "${targetCertificateId}". Please inspect the code printed on the physical/digital document.`,
        });
      }
    }
  }, [targetCertificateId, isVerifyMode, certList]);

  // Public verifier
  const [showVerificationCard, setShowVerificationCard] = useState(isGuest);
  const [inputCode, setInputCode] = useState('');
  const [verificationResult, setVerificationResult] = useState<{
    status: 'idle' | 'valid' | 'invalid' | 'revoked';
    cert?: CertificateItem;
    message?: string;
  }>({ status: 'idle' });

  const [isRegenerating, setIsRegenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const [activeViewTab, setActiveViewTab] = useState<'certificates' | 'eligibility'>('certificates');
  const [eligibilitySearch, setEligibilitySearch] = useState('');
  const [inspectingEligibilityReg, setInspectingEligibilityReg] = useState<{
    registrant: RegistrantItem;
    result: ReturnType<typeof eligibilityService.evaluateCertificateEligibility>;
  } | null>(null);

  // Escape key listener for all CertificatesPage modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        if (revokingCert) setRevokingCert(null);
        else if (showBulkModal) setShowBulkModal(false);
        else if (templateCustomizerOpen) setTemplateCustomizerOpen(false);
        else if (inspectingEligibilityReg) setInspectingEligibilityReg(null);
        else if (inspectingPublicQrCert) setInspectingPublicQrCert(null);
        else if (signaturePadTarget) setSignaturePadTarget(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    revokingCert,
    showBulkModal,
    templateCustomizerOpen,
    inspectingEligibilityReg,
    inspectingPublicQrCert,
    signaturePadTarget,
  ]);

  // Authoritative SEMS Evaluation for all attendees
  const evaluatedRegistrants = useMemo(() => {
    return registrants.map((reg) => {
      const eligibility = eligibilityService.evaluateCertificateEligibility(reg);
      const existingCert = certList.find((c) => {
        const matchRoll = reg.rollNumber && c.recipientRoll?.toLowerCase() === reg.rollNumber.toLowerCase();
        const matchEmail =
          reg.email &&
          (c.recipientEmail?.toLowerCase() === reg.email.toLowerCase() ||
            c.recipientPrimaryEmail?.toLowerCase() === reg.email.toLowerCase());
        const matchSession = c.sessionTitle?.toLowerCase() === reg.sessionTitle?.toLowerCase();
        return (matchRoll || matchEmail) && matchSession && c.status !== 'revoked';
      });

      return {
        registrant: reg,
        eligibility,
        existingCert,
        isIssued: !!existingCert,
      };
    });
  }, [registrants, certList]);

  const eligibleCount = useMemo(() => {
    return evaluatedRegistrants.filter((item) => item.eligibility.eligible && !item.isIssued).length;
  }, [evaluatedRegistrants]);

  const myStudentRegistrations = useMemo(() => {
    if (!currentUser) return [];
    return evaluatedRegistrants.filter((item) => {
      const matchEmail =
        currentUser.email &&
        (item.registrant.email?.toLowerCase() === currentUser.email.toLowerCase() ||
          item.registrant.primaryEmail?.toLowerCase() === currentUser.email.toLowerCase());
      const matchName =
        currentUser.name &&
        item.registrant.name.toLowerCase().trim() === currentUser.name.toLowerCase().trim();
      return matchEmail || matchName;
    });
  }, [evaluatedRegistrants, currentUser]);

  const handleIssueCertificateForRegistrant = (registrant: RegistrantItem) => {
    const gate = eligibilityService.canIssueCertificate(registrant, certList);
    if (!gate.allowed) {
      onNotify(`Issuance blocked: ${gate.reason}`);
      return;
    }

    const randomHex = Math.random().toString(36).substring(2, 8).toUpperCase();
    const newCode = `SEMS-2026-${randomHex}`;

    const newCert: CertificateItem = {
      id: `cert-issued-${Date.now()}-${registrant.id}`,
      verificationCode: newCode,
      title: customTitle,
      sessionTitle: registrant.sessionTitle,
      recipientName: registrant.name,
      recipientRoll: registrant.rollNumber,
      recipientEmail: registrant.email,
      recipientPrimaryEmail: registrant.primaryEmail || registrant.email,
      recipientSecondaryEmail: registrant.secondaryEmail || undefined,
      issueDate: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      societyWing: 'Society Executive Council',
      isValid: true,
      status: 'approved',
      templateStyle: activeTemplateStyle,
      templateFormat: activeTemplateFormat,
      grade: 'Distinction',
      generatedAutomatically: false,
      approvedBy: adminSignatoryName,
      approvedAt: new Date().toISOString().split('T')[0],
      signatories: [
        { name: signatoryName, title: signatoryTitle, role: 'admin', approved: true },
        { name: adminSignatoryName, title: adminSignatoryTitle, role: 'super_admin', approved: true },
      ],
    };

    const updatedList = [newCert, ...certList];
    updateCertificateList(updatedList);
    if (onIssueNewCertificates) {
      onIssueNewCertificates([newCert]);
    }
    if (onUpdateRegistrants) {
      const updatedRegs = registrants.map((r) =>
        r.id === registrant.id
          ? {
              ...r,
              lifecycleStatus: 'CERTIFICATE_ISSUED' as const,
              certificateId: newCert.id,
            }
          : r
      );
      onUpdateRegistrants(updatedRegs);
    }
    setActiveCert(newCert);

    auditService.log({
      action: 'CERTIFICATE_ISSUED',
      actor: currentRole.toUpperCase(),
      actorRole: currentRole.toUpperCase(),
      target: `${newCode} (${registrant.name})`,
      details: `Official certificate issued following 4-point eligibility validation.`,
      result: 'SUCCESS',
    });

    // Synchronize persistent notification for recipient
    const recipientEmail = registrant.email || registrant.primaryEmail;
    if (recipientEmail) {
      notificationService.addNotification({
        recipientEmail,
        type: 'certificate_issued',
        title: 'SEMS Certificate Issued',
        message: `Your verified certificate (${newCode}) for "${registrant.sessionTitle}" is ready for download.`,
        linkTab: 'certificates',
        entityId: `cert-${newCert.id}`,
      });
    }

    onNotify(`Official certificate ${newCode} issued for ${registrant.name}!`);
  };

  const approvedRegistrants = registrants.filter((r) => r.status === 'approved');
  const hasApprovedRegistrants = approvedRegistrants.length > 0;
  const pendingCertificates = certList.filter((c) => c.status === 'pending_approval');

  const handleCopyCode = (code: string) => {
    navigator.clipboard?.writeText(code);
    setCopied(true);
    onNotify(`Copied code ${code} to clipboard.`);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerateCertificate = (certToRegen: CertificateItem) => {
    setIsRegenerating(true);
    setTimeout(() => {
      const randomHex = Math.random().toString(36).substring(2, 8).toUpperCase();
      const newCode = `SEMS-2026-${randomHex}`;

      const regenerated: CertificateItem = {
        ...certToRegen,
        verificationCode: newCode,
        issueDate: 'October 24, 2026 (Regenerated)',
        isValid: true,
        status: 'approved',
        templateStyle: activeTemplateStyle,
        templateFormat: activeTemplateFormat,
      };

      const updatedList = certList.map((c) => (c.id === certToRegen.id ? regenerated : c));
      updateCertificateList(updatedList);
      setActiveCert(regenerated);
      setIsRegenerating(false);
      auditService.log({
        action: 'CERTIFICATE_REGENERATED',
        actor: currentRole.toUpperCase(),
        actorRole: currentRole.toUpperCase(),
        target: `${newCode} (${certToRegen.recipientName})`,
        details: `Regenerated credential with new hash.`,
        result: 'SUCCESS',
      });
      onNotify(`Certificate regenerated with unique ID ${newCode}!`);
    }, 1200);
  };

  const handleApproveCertificate = (certToApprove: CertificateItem) => {
    if (!canApprove) return;
    const approvedCert: CertificateItem = {
      ...certToApprove,
      status: 'approved',
      isValid: true,
      approvedBy: `${adminSignatoryName} (${currentRole.toUpperCase()})`,
      approvedAt: new Date().toISOString().split('T')[0],
    };
    const updated = certList.map((c) => (c.id === certToApprove.id ? approvedCert : c));
    updateCertificateList(updated);
    setActiveCert(approvedCert);
    auditService.log({
      action: 'CERTIFICATE_APPROVED',
      actor: currentRole.toUpperCase(),
      actorRole: currentRole.toUpperCase(),
      target: `${certToApprove.verificationCode} (${certToApprove.recipientName})`,
      details: 'Certificate approved and verified.',
      result: 'SUCCESS',
    });

    // Synchronize persistent notification for recipient
    const apprRecipientEmail = certToApprove.recipientEmail || certToApprove.recipientPrimaryEmail;
    if (apprRecipientEmail) {
      notificationService.addNotification({
        recipientEmail: apprRecipientEmail,
        type: 'certificate_issued',
        title: 'Certificate Approved & Ready',
        message: `Your verified certificate ${certToApprove.verificationCode} has been approved by ${adminSignatoryName}.`,
        linkTab: 'certificates',
        entityId: `cert-appr-${certToApprove.id}`,
      });
    }

    onNotify(`Certificate for ${certToApprove.recipientName} approved.`);
  };

  const handleConfirmRevoke = () => {
    if (!revokingCert || !revocationReasonInput.trim()) {
      onNotify('Revocation reason is required.');
      return;
    }

    const revokedCert: CertificateItem = {
      ...revokingCert,
      status: 'revoked',
      isValid: false,
      revocationReason: revocationReasonInput.trim(),
      revokedAt: new Date().toISOString().split('T')[0],
      revokedBy: currentRole.toUpperCase(),
    };

    const updated = certList.map((c) => (c.id === revokingCert.id ? revokedCert : c));
    updateCertificateList(updated);
    setActiveCert(revokedCert);
    auditService.log({
      action: 'CERTIFICATE_REVOKED',
      actor: currentRole.toUpperCase(),
      actorRole: currentRole.toUpperCase(),
      target: `${revokingCert.verificationCode} (${revokingCert.recipientName})`,
      details: `Revocation reason: ${revocationReasonInput.trim()}`,
      result: 'SUCCESS',
    });

    // Synchronize persistent notification for recipient
    const revokedRecipientEmail = revokingCert.recipientEmail || revokingCert.recipientPrimaryEmail;
    if (revokedRecipientEmail) {
      notificationService.addNotification({
        recipientEmail: revokedRecipientEmail,
        type: 'certificate_revoked',
        title: 'Certificate Revoked',
        message: `Your certificate ${revokingCert.verificationCode} has been revoked. Reason: ${revocationReasonInput.trim()}.`,
        linkTab: 'certificates',
        entityId: `cert-revoked-${revokingCert.id}-${Date.now()}`,
      });
    }

    onNotify(`Certificate ${revokingCert.verificationCode} has been revoked.`);
    setRevokingCert(null);
    setRevocationReasonInput('');
  };

  // Public verifier: strictly conceals email & payment data
  const handleVerify = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = inputCode.trim().toUpperCase();
    if (!clean) {
      setVerificationResult({ status: 'invalid', message: 'Enter a valid SEMS certificate ID.' });
      return;
    }

    const matched = certList.find((c) => c.verificationCode.toUpperCase() === clean);

    if (matched) {
      if (matched.status === 'revoked') {
        setVerificationResult({
          status: 'revoked',
          cert: matched,
          message: `THIS CERTIFICATE HAS BEEN OFFICIALLY REVOKED. Reason: ${matched.revocationReason || 'Administrative revocation.'}`,
        });
        onNotify('Warning: Scanned certificate is revoked.');
      } else {
        setVerificationResult({
          status: 'valid',
          cert: matched,
          message: 'Certificate is authentic, digitally verified, and anchored on SEMS credential ledger.',
        });
        onNotify(`Certificate verified for ${matched.recipientName}`);
      }
      setActiveCert(matched);
    } else {
      setVerificationResult({
        status: 'invalid',
        message: `No active credential record exists for code "${clean}". Please inspect the code printed on the physical/digital document.`,
      });
      onNotify('Verification failed: Code not found.');
    }
  };

  // Dynamic column mapping updater that immediately re-evaluates all CSV rows
  const handleUpdateColumnMapping = (newMapping: ColumnMappingConfig) => {
    setColumnMapping(newMapping);
    if (parsedCsvResult && parsedCsvResult.rawRows.length > 0) {
      const summary = validateCsvRows(parsedCsvResult.rawRows, parsedCsvResult.headers, newMapping);
      setCsvValidationSummary(summary);
    }
  };

  // CSV Bulk Generator Parsing, RFC 4180 Ingestion & Real-time Validation
  const handleCsvFileUpload = (file: File) => {
    setCsvFile(file);
    setCsvParseError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        if (!text || !text.trim()) {
          setCsvParseError('The selected file is completely empty. Please select a valid CSV with attendee records.');
          onNotify('Uploaded CSV file is empty.');
          return;
        }

        const parsed = parseCsvContent(text);
        if (parsed.headers.length === 0) {
          setCsvParseError('Could not identify a valid header row in the CSV file.');
          onNotify('Missing header row in CSV.');
          return;
        }

        if (parsed.rawRows.length === 0) {
          setCsvParseError('CSV contains headers but no participant attendee records.');
          onNotify('CSV contains no data rows.');
          return;
        }

        setCsvHeaders(parsed.headers);
        setParsedCsvResult(parsed);
        setCsvRawData(parsed.rawRows.map((r) => r.cells));

        // Auto-map candidate columns intelligently based on header names
        const autoMap: ColumnMappingConfig = { name: '', roll: '', email: '', session: '', grade: '' };
        parsed.headers.forEach((h) => {
          const lower = h.toLowerCase().trim();
          if (lower.includes('full name') || lower.includes('recipient') || lower.includes('student name') || lower === 'name') {
            autoMap.name = h;
          } else if (lower.includes('roll') || lower.includes('id') || lower.includes('reg')) {
            autoMap.roll = h;
          } else if (lower.includes('email') || lower.includes('mail')) {
            autoMap.email = h;
          } else if (lower.includes('session') || lower.includes('event') || lower.includes('topic') || lower.includes('workshop')) {
            autoMap.session = h;
          } else if (lower.includes('grade') || lower.includes('distinction') || lower.includes('merit')) {
            autoMap.grade = h;
          }
        });

        // Fallbacks if not detected by compound phrases
        if (!autoMap.name) {
          const fallbackName = parsed.headers.find((h) => h.toLowerCase().includes('name'));
          if (fallbackName) autoMap.name = fallbackName;
        }

        setColumnMapping(autoMap);

        // Run comprehensive validation immediately upon upload!
        const summary = validateCsvRows(parsed.rawRows, parsed.headers, autoMap);
        setCsvValidationSummary(summary);
        setPreviewFilter('all');
        setBulkStep(2);

        if (summary.hasErrors) {
          onNotify(`CSV uploaded: ${summary.invalidCount} invalid rows detected (highlighted in red).`);
        } else {
          onNotify(`CSV uploaded successfully: All ${summary.validCount} rows passed validation!`);
        }
      } catch (err: any) {
        console.error('Error parsing CSV:', err);
        setCsvParseError(`Corrupt CSV format: ${err?.message || 'Unable to parse structure'}`);
        onNotify('Corrupt CSV file could not be parsed.');
      }
    };
    reader.onerror = () => {
      setCsvParseError('Failed to read file from disk. Please re-select the file.');
      onNotify('File read error.');
    };
    reader.readAsText(file);
  };

  const executeBulkGeneration = () => {
    if (!csvValidationSummary) return;

    const successful: CertificateItem[] = [];
    const failed: { row: number; reason: string; data: string[] }[] = [];
    const updatedCertList = [...certList];
    const newlyIssuedRegistrantIds: string[] = [];

    csvValidationSummary.rows.forEach((vRow) => {
      // 1. If row failed CSV format validation (missing name, invalid email, duplicate email, extra commas, blank row)
      if (!vRow.isValid) {
        failed.push({
          row: vRow.rowNumber,
          reason: vRow.errors.join('; '),
          data: vRow.cells,
        });
        return;
      }

      const name = vRow.name;
      const roll = vRow.roll;
      const email = vRow.email;
      const sessionTitle = vRow.session;
      const grade = vRow.grade || 'Distinction';

      // 2. Match against official registrants roster
      const matchingRegistrant = registrants.find((r) => {
        const matchRoll = Boolean(roll) && Boolean(r.rollNumber) && r.rollNumber.toLowerCase() === roll.toLowerCase();
        const matchEmail =
          Boolean(email) &&
          ((Boolean(r.email) && r.email!.toLowerCase() === email.toLowerCase()) ||
            (Boolean(r.primaryEmail) && r.primaryEmail!.toLowerCase() === email.toLowerCase()));
        const matchName = Boolean(name) && Boolean(r.name) && r.name.toLowerCase() === name.toLowerCase();
        const matchSession = !sessionTitle || (Boolean(r.sessionTitle) && r.sessionTitle.toLowerCase().includes(sessionTitle.toLowerCase()));

        return (matchRoll || matchEmail || matchName) && matchSession;
      });

      if (!matchingRegistrant) {
        failed.push({
          row: vRow.rowNumber,
          reason: `Participant "${name}" (${roll || email || 'No ID'}) not found in confirmed session registration roster.`,
          data: vRow.cells,
        });
        return;
      }

      // 3. Authoritative SEMS Eligibility & Idempotency Gate
      const gate = eligibilityService.canIssueCertificate(matchingRegistrant, updatedCertList);
      if (!gate.allowed) {
        failed.push({
          row: vRow.rowNumber,
          reason: gate.reason || `Ineligible: ${gate.eligibility.reasons.join('; ')}`,
          data: vRow.cells,
        });
        return;
      }

      // 4. Eligible: generate official certificate
      const randomHex = Math.random().toString(36).substring(2, 8).toUpperCase();
      const newCert: CertificateItem = {
        id: `cert-bulk-${Date.now()}-${vRow.rowNumber}`,
        verificationCode: `SEMS-2026-${randomHex}`,
        title: customTitle,
        sessionTitle: matchingRegistrant.sessionTitle || sessionTitle || 'Annual Society Symposium',
        recipientName: matchingRegistrant.name,
        recipientRoll: matchingRegistrant.rollNumber || roll || '2024-NIL',
        recipientEmail: matchingRegistrant.email || email,
        recipientPrimaryEmail: matchingRegistrant.primaryEmail || matchingRegistrant.email || email,
        recipientSecondaryEmail: matchingRegistrant.secondaryEmail || undefined,
        issueDate: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
        isValid: true,
        status: 'approved',
        templateStyle: activeTemplateStyle,
        templateFormat: activeTemplateFormat,
        grade,
        approvedBy: adminSignatoryName,
        approvedAt: new Date().toISOString().split('T')[0],
        signatories: [
          { name: signatoryName, title: signatoryTitle, role: 'admin', approved: true },
          { name: adminSignatoryName, title: adminSignatoryTitle, role: 'super_admin', approved: true },
        ],
      };

      successful.push(newCert);
      updatedCertList.push(newCert);
      newlyIssuedRegistrantIds.push(matchingRegistrant.id);
    });

    setBulkResults({ successful, failed });
    updateCertificateList(updatedCertList);
    if (onIssueNewCertificates && successful.length > 0) {
      onIssueNewCertificates(successful);
    }
    if (onUpdateRegistrants && newlyIssuedRegistrantIds.length > 0) {
      const updatedRegs = registrants.map((r) =>
        newlyIssuedRegistrantIds.includes(r.id)
          ? { ...r, lifecycleStatus: 'CERTIFICATE_ISSUED' as const }
          : r
      );
      onUpdateRegistrants(updatedRegs);
    }

    // Synchronize persistent notifications for all successful bulk recipients
    successful.forEach((c) => {
      const email = c.recipientEmail || c.recipientPrimaryEmail;
      if (email) {
        notificationService.addNotification({
          recipientEmail: email,
          type: 'certificate_issued',
          title: 'SEMS Certificate Available',
          message: `Your verified certificate (${c.verificationCode}) for "${c.sessionTitle}" is ready for download.`,
          linkTab: 'certificates',
          entityId: `cert-${c.id}`,
        });
      }
    });

    setBulkStep(4);
    auditService.log({
      action: 'BULK_CSV_GENERATED',
      actor: currentRole.toUpperCase(),
      actorRole: currentRole.toUpperCase(),
      target: `${successful.length} Certificates (${csvFile?.name})`,
      details: `Generated ${successful.length} credentials; ${failed.length} invalid/ineligible rows rejected or skipped.`,
      result: 'SUCCESS',
    });
    onNotify(`Generated ${successful.length} certificates! (${failed.length} failed/ineligible rows).`);
  };

  const handleRetryFailedBulkRows = () => {
    if (bulkResults.failed.length === 0) return;

    const nameIdx = csvHeaders.indexOf(columnMapping.name);
    const rollIdx = csvHeaders.indexOf(columnMapping.roll);
    const emailIdx = csvHeaders.indexOf(columnMapping.email);
    const sessionIdx = csvHeaders.indexOf(columnMapping.session);
    const gradeIdx = csvHeaders.indexOf(columnMapping.grade);

    const newlySuccessful: CertificateItem[] = [];
    const stillFailed: { row: number; reason: string; data: string[] }[] = [];
    const updatedCertList = [...certList];
    const newlyIssuedIds: string[] = [];

    bulkResults.failed.forEach((failedItem) => {
      const row = failedItem.data;
      const name = row[nameIdx]?.trim();
      const roll = row[rollIdx]?.trim() || '';
      const email = row[emailIdx]?.trim() || '';
      const sessionTitle = row[sessionIdx]?.trim() || '';
      const grade = gradeIdx >= 0 ? row[gradeIdx]?.trim() || 'Distinction' : 'Distinction';

      if (!name) {
        stillFailed.push(failedItem);
        return;
      }

      const matchingRegistrant = registrants.find((r) => {
        const matchRoll = Boolean(roll) && Boolean(r.rollNumber) && r.rollNumber.toLowerCase() === roll.toLowerCase();
        const matchEmail =
          Boolean(email) &&
          ((Boolean(r.email) && r.email!.toLowerCase() === email.toLowerCase()) ||
            (Boolean(r.primaryEmail) && r.primaryEmail!.toLowerCase() === email.toLowerCase()));
        const matchName = Boolean(name) && Boolean(r.name) && r.name.toLowerCase() === name.toLowerCase();
        const matchSession = !sessionTitle || (Boolean(r.sessionTitle) && r.sessionTitle.toLowerCase().includes(sessionTitle.toLowerCase()));
        return (matchRoll || matchEmail || matchName) && matchSession;
      });

      if (!matchingRegistrant) {
        stillFailed.push({
          ...failedItem,
          reason: `Participant "${name}" not found on registered roster / unconfirmed registration.`,
        });
        return;
      }

      // Re-evaluate eligibility & idempotency
      const gate = eligibilityService.canIssueCertificate(matchingRegistrant, updatedCertList);
      if (!gate.allowed) {
        stillFailed.push({
          ...failedItem,
          reason: gate.reason || `Ineligible: ${gate.eligibility.reasons.join('; ')}`,
        });
        return;
      }

      // Qualified upon retry!
      const randomHex = Math.random().toString(36).substring(2, 8).toUpperCase();
      const newCert: CertificateItem = {
        id: `cert-bulk-${Date.now()}-${failedItem.row}`,
        verificationCode: `SEMS-2026-${randomHex}`,
        title: customTitle,
        sessionTitle: matchingRegistrant.sessionTitle || sessionTitle || 'Annual Society Symposium',
        recipientName: matchingRegistrant.name,
        recipientRoll: matchingRegistrant.rollNumber || roll || '2024-NIL',
        recipientEmail: matchingRegistrant.email || email,
        recipientPrimaryEmail: matchingRegistrant.primaryEmail || matchingRegistrant.email || email,
        recipientSecondaryEmail: matchingRegistrant.secondaryEmail || undefined,
        issueDate: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
        isValid: true,
        status: 'approved',
        templateStyle: activeTemplateStyle,
        templateFormat: activeTemplateFormat,
        grade,
        approvedBy: adminSignatoryName,
        approvedAt: new Date().toISOString().split('T')[0],
      };

      newlySuccessful.push(newCert);
      updatedCertList.push(newCert);
      newlyIssuedIds.push(matchingRegistrant.id);
    });

    const combinedSuccessful = [...bulkResults.successful, ...newlySuccessful];
    setBulkResults({ successful: combinedSuccessful, failed: stillFailed });
    updateCertificateList(updatedCertList);
    if (onIssueNewCertificates && newlySuccessful.length > 0) {
      onIssueNewCertificates(newlySuccessful);
    }
    if (onUpdateRegistrants && newlyIssuedIds.length > 0) {
      const updatedRegs = registrants.map((r) =>
        newlyIssuedIds.includes(r.id) ? { ...r, lifecycleStatus: 'CERTIFICATE_ISSUED' as const } : r
      );
      onUpdateRegistrants(updatedRegs);
    }

    // Synchronize notifications for newly successful retry certificates
    newlySuccessful.forEach((c) => {
      const email = c.recipientEmail || c.recipientPrimaryEmail;
      if (email) {
        notificationService.addNotification({
          recipientEmail: email,
          type: 'certificate_issued',
          title: 'SEMS Certificate Available',
          message: `Your verified certificate (${c.verificationCode}) for "${c.sessionTitle}" is ready for download.`,
          linkTab: 'certificates',
          entityId: `cert-${c.id}`,
        });
      }
    });

    if (newlySuccessful.length > 0) {
      onNotify(`Retry completed: ${newlySuccessful.length} newly qualified certificates issued! (${stillFailed.length} still ineligible).`);
    } else {
      onNotify(`Retry evaluated: All ${stillFailed.length} participants remain ineligible.`);
    }
  };

  const [isExportingPng, setIsExportingPng] = useState(false);
  const [isExportingZip, setIsExportingZip] = useState(false);

  const handleDownloadZipPackage = () => {
    if (bulkResults.successful.length === 0) {
      onNotify('No generated certificates to package. Please run bulk issuance first.');
      return;
    }
    setIsExportingZip(true);
    onNotify('Packaging batch certificates as a verified binary ZIP archive...');

    setTimeout(() => {
      try {
        const csvContent = generateBatchCsv(bulkResults.successful);
        const jsonContent = JSON.stringify(
          {
            generatedAt: new Date().toISOString(),
            totalCredentials: bulkResults.successful.length,
            issuer: adminSignatoryName,
            council: 'SEMS Academic Verification Authority',
            certificates: bulkResults.successful,
          },
          null,
          2
        );

        const individualCards = bulkResults.successful.flatMap((c) => {
          const sanitizedName = c.recipientName.replace(/[^a-zA-Z0-9_-]/g, '_');
          const printableHtml = generatePrintableCertificateHtml(c, {
            customTitle,
            customSubtitle,
            signatoryName,
            signatoryTitle,
            adminName: adminSignatoryName,
            adminTitle: adminSignatoryTitle,
          });

          return [
            {
              name: `credentials/Certificate_${c.verificationCode}_${sanitizedName}.html`,
              content: printableHtml,
            },
            {
              name: `credentials/Attestation_${c.verificationCode}_${sanitizedName}.txt`,
              content: `========================================================\nSEMS VERIFIED CREDENTIAL ATTESTATION RECORD\n========================================================\nCertificate ID : ${c.verificationCode}\nRecipient      : ${c.recipientName}\nRoll Number    : ${c.recipientRoll}\nSession Title  : ${c.sessionTitle}\nIssue Date     : ${c.issueDate}\nGrade / Merit  : ${c.grade || 'First Class Distinction'}\nStatus         : ${c.status.toUpperCase()}\nVerification   : https://sems.university.edu.pk/verify/${c.verificationCode}\nAttested By    : ${adminSignatoryName} (${adminSignatoryTitle})\n========================================================\n`,
            },
          ];
        });

        const zipBlob = createZipArchive([
          { name: 'SEMS_Batch_Credentials_Ledger.csv', content: csvContent },
          { name: 'SEMS_Batch_Manifest.json', content: jsonContent },
          ...individualCards,
        ]);

        const url = URL.createObjectURL(zipBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `SEMS_Batch_Certificates_${Date.now()}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 1000);

        onNotify(`Successfully downloaded verified ZIP archive (${bulkResults.successful.length} credentials with printable HTML & CSV)!`);
      } catch (err: any) {
        console.error('ZIP generation error:', err);
        onNotify('Failed to generate ZIP archive. Please retry.');
      } finally {
        setIsExportingZip(false);
      }
    }, 500);
  };

  const handleDownloadBatchCsvOnly = () => {
    if (bulkResults.successful.length === 0) {
      onNotify('No generated certificates to export.');
      return;
    }
    const csvContent = generateBatchCsv(bulkResults.successful);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SEMS_Batch_Credentials_Ledger_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    onNotify('Batch CSV ledger downloaded successfully.');
  };

  const handleDownloadActiveCertPng = async () => {
    if (!activeCert) return;
    setIsExportingPng(true);
    onNotify(`Rendering crystal-clear 1080p credential image for ${activeCert.recipientName}...`);
    try {
      await downloadCertificateAsHighResPng(activeCert, {
        customTitle: customTitle,
        customSubtitle: customSubtitle,
        templateStyle: activeCert.templateStyle || activeTemplateStyle,
        signatoryName: signatoryName,
        signatoryTitle: signatoryTitle,
        adminName: adminSignatoryName,
        adminTitle: adminSignatoryTitle,
        customSignature1: customSignature1 || undefined,
        customSignature2: customSignature2 || undefined,
      });
      onNotify(`High-res certificate PNG downloaded! Ready for LinkedIn & CV.`);
    } catch (err) {
      console.error(err);
      onNotify('Failed to export certificate image. Please retry.');
    } finally {
      setIsExportingPng(false);
    }
  };

  return (
    <div id="certificates-page" className="w-full space-y-6 animate-fadeIn pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-white/[0.10]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="font-poppins font-semibold text-2xl text-white">
              {isGuest
                ? currentUser?.isLoggedIn
                  ? 'My Guest Certificates'
                  : 'Verify Credential'
                : isStudent
                ? 'My Certificates'
                : 'Certificates & Credential Governance'}
            </h2>
            <span className="text-xs font-inter text-[var(--text-sec-70)]">
              {isGuest
                ? 'Verify authentic society credentials via QR code or Credential ID'
                : isStudent
                ? 'Your verified credentials with permanent lifetime graduation recovery'
                : 'Admin-governed templates, PNG/PDF vector exports, CSV bulk batches & QR verification'}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Admin & Super Admin Only: Template Designer Button */}
          {isAdmin && (
            <button
              type="button"
              onClick={() => setTemplateCustomizerOpen(true)}
              className="h-10 px-3.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.14] text-xs font-medium text-white transition-all flex items-center gap-2 cursor-pointer shadow-sm"
              title="Admin Only: Configure Certificate Layout, Template & Signatures"
            >
              <Palette className="w-4 h-4 text-amber-300" />
              <span>Template & Signatures</span>
            </button>
          )}

          {/* Admin & Super Admin Only: Bulk CSV Generator */}
          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                setBulkStep(1);
                setShowBulkModal(true);
              }}
              className="h-10 px-3.5 rounded-xl bg-[var(--accent-20)] hover:bg-[var(--accent-30)] border border-[var(--primary-accent)]/50 text-xs font-medium text-white transition-all flex items-center gap-2 cursor-pointer shadow-sm"
              title="Bulk issue certificates via CSV upload with ZIP export"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Bulk CSV Generator</span>
            </button>
          )}

          {/* Public Verifier Toggle */}
          <button
            type="button"
            onClick={() => setShowVerificationCard((prev) => !prev)}
            className={`h-10 px-3.5 rounded-xl text-xs font-medium transition-all flex items-center gap-2 border cursor-pointer ${
              showVerificationCard
                ? 'bg-white/[0.14] text-white border-white/[0.22]'
                : 'bg-white/[0.06] hover:bg-white/[0.12] text-white/80 border-white/[0.12]'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-[var(--primary-accent)]" />
            <span>{showVerificationCard ? 'Hide Verifier' : 'Verify QR / ID'}</span>
          </button>
        </div>
      </div>

      {/* SEMS Phase 3: View Switcher (Only shown if user has multiple accessible tabs) */}
      {!isGuest ? (
        <div className="flex items-center gap-2 border-b border-white/[0.10] pb-2">
          <button
            type="button"
            onClick={() => setActiveViewTab('certificates')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer ${
              activeViewTab === 'certificates'
                ? 'bg-[var(--accent-20)] text-[var(--primary-accent)] border border-[var(--accent-40)]'
                : 'text-[var(--text-secondary)] hover:text-white hover:bg-white/[0.05]'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>{isStudent ? 'My Earned Certificates' : `Active Certificates (${displayCertificates.length})`}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveViewTab('eligibility')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer ${
              activeViewTab === 'eligibility'
                ? 'bg-[var(--accent-20)] text-[var(--primary-accent)] border border-[var(--accent-40)]'
                : 'text-[var(--text-secondary)] hover:text-white hover:bg-white/[0.05]'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>{isStudent ? 'Certificate Eligibility Tracker' : 'Attendee Eligibility & Issuance Roster'}</span>
            {isAdmin && eligibleCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                {eligibleCount} Ready
              </span>
            )}
          </button>
        </div>
      ) : null}

      {activeViewTab === 'certificates' ? (
        /* Main Grid: Certificate View + Optional Verifier */
        <div className={showVerificationCard ? 'grid grid-cols-1 lg:grid-cols-12 gap-6 items-start' : 'w-full max-w-5xl xl:max-w-6xl mx-auto space-y-6'}>
        {/* Certificate Display Column */}
        <div className={showVerificationCard ? 'lg:col-span-7 space-y-4' : 'space-y-4'}>
          {isLoading ? (
            <SkeletonState variant="cards" count={2} />
          ) : activeCert ? (
            <div className="space-y-4">
              {/* Action Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-white/[0.04] border border-white/[0.08]">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                      activeCert.status === 'approved'
                        ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-500/50'
                        : activeCert.status === 'revoked'
                        ? 'bg-rose-950/80 text-rose-300 border border-rose-500/60 font-bold'
                        : 'bg-amber-950/70 text-amber-300 border border-amber-500/50'
                    }`}
                  >
                    {activeCert.status === 'approved' && <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />}
                    {activeCert.status === 'revoked' && <XCircle className="w-3.5 h-3.5 text-rose-400" />}
                    {activeCert.status === 'pending_approval' && <Clock className="w-3.5 h-3.5 text-amber-400" />}
                    <span className="uppercase tracking-wider">
                      {activeCert.status === 'revoked' ? 'REVOKED' : activeCert.status}
                    </span>
                  </span>

                  <span className="text-[11px] font-mono text-white/70">
                    ID: {activeCert.verificationCode}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isRegenerating}
                    onClick={() => handleRegenerateCertificate(activeCert)}
                    className="px-3 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-xs text-white transition-colors cursor-pointer flex items-center gap-1.5"
                    title="Regenerate unique certificate ID and refresh credentials"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-cyan-300 ${isRegenerating ? 'animate-spin' : ''}`} />
                    <span>Regenerate</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCopyCode(activeCert.verificationCode)}
                    className="px-3 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-xs text-white transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[var(--primary-accent)]" />}
                    <span>{copied ? 'Copied' : 'Copy ID'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setInspectingPublicQrCert(activeCert)}
                    className="px-3 py-1.5 rounded-xl bg-cyan-950/70 border border-cyan-500/40 text-cyan-300 hover:text-white hover:bg-cyan-900/80 text-xs transition-colors cursor-pointer flex items-center gap-1.5"
                    title="Inspect Official Public QR Verification Credential Card"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Public QR Card</span>
                  </button>

                  <button
                    type="button"
                    disabled={isExportingPng}
                    onClick={handleDownloadActiveCertPng}
                    className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-xs text-white transition-all cursor-pointer flex items-center gap-1.5 shadow"
                    title="Download crystal-clear 1080p PNG image for LinkedIn & CV"
                  >
                    <Download className="w-3.5 h-3.5 text-white" />
                    <span>{isExportingPng ? 'Rendering...' : 'Download PNG'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-3 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-xs text-white transition-colors cursor-pointer flex items-center gap-1.5"
                    title="Print or Save as PDF (Isolated Certificate Layout)"
                  >
                    <Printer className="w-3.5 h-3.5 text-amber-300" />
                    <span>Print / PDF</span>
                  </button>

                </div>
              </div>

              {/* Admin Governed Format Notice (NO REDUNDANT STYLE CARDS) */}
              <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-white/[0.03] border border-white/[0.07] text-xs">
                <div className="flex items-center gap-1.5 text-amber-300">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Admin-Designated Format Locked</span>
                </div>
                <span className="text-[11px] font-mono text-cyan-300">
                  Lifetime Recovery: {activeCert.recipientSecondaryEmail || 'Not provided'}
                </span>
              </div>

              {/* Rendered Certificate Card */}
              <div id="printable-certificate" className="relative transition-all">
                <CertificateRenderer
                  certificate={activeCert}
                  style={activeCert.templateStyle || activeTemplateStyle}
                  format={activeCert.templateFormat || activeTemplateFormat}
                  customTitle={customTitle}
                  customSubtitle={customSubtitle}
                  signatoryName={signatoryName}
                  signatoryTitle={signatoryTitle}
                  adminSignatoryName={adminSignatoryName}
                  adminSignatoryTitle={adminSignatoryTitle}
                  customSignatureDataUrl={customSignature1 || undefined}
                  customAdminSignatureDataUrl={customSignature2 || undefined}
                  watermarkPending={activeCert.status === 'pending_approval'}
                />
              </div>

              {/* Revoke Controls for Admins */}
              {canApprove && (
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-between gap-3">
                  <div>
                    <span className="font-poppins font-medium text-xs text-white block">
                      Authority Operations: {currentRole.toUpperCase()}
                    </span>
                    <span className="text-[11px] text-[var(--text-sec-70)] block">
                      {activeCert.status === 'revoked'
                        ? `Revoked on ${activeCert.revokedAt || 'recently'} by ${activeCert.revokedBy || 'Admin'}. Reason: ${activeCert.revocationReason}`
                        : 'Certificates can be permanently revoked with an audit-logged justification.'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {activeCert.status !== 'approved' && activeCert.status !== 'revoked' && (
                      <button
                        type="button"
                        onClick={() => handleApproveCertificate(activeCert)}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs cursor-pointer flex items-center gap-1.5 shadow"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Sign & Approve</span>
                      </button>
                    )}
                    {activeCert.status !== 'revoked' && (
                      <button
                        type="button"
                        onClick={() => {
                          setRevokingCert(activeCert);
                          setRevocationReasonInput('');
                        }}
                        className="px-3.5 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900/60 border border-rose-500/40 text-rose-300 text-xs cursor-pointer flex items-center gap-1.5"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Revoke Certificate</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Multi-Attendee Switcher */}
              {displayCertificates.length > 1 && (
                <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-between gap-2 text-xs">
                  <span className="text-white/60">Switch Certificate:</span>
                  <div className="flex gap-1.5 overflow-x-auto">
                    {displayCertificates.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setActiveCert(c);
                          if (window.location.hash !== `#/certificates/${c.id}`) {
                            window.location.hash = `#/certificates/${c.id}`;
                          }
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs transition-colors cursor-pointer ${
                          activeCert.id === c.id
                            ? 'bg-[var(--primary-accent)] text-white font-medium shadow'
                            : 'bg-white/[0.05] hover:bg-white/[0.10] text-white/70'
                        }`}
                      >
                        {c.recipientName}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <EmptyState
              icon={Award}
              title={isGuest ? 'No personal certificates issued' : 'No certificates found'}
              description={
                isGuest
                  ? 'If you registered for an open session using your email, your certificate will appear here once issued. You can also verify any official certificate code using the verifier panel.'
                  : 'Participate in upcoming society sessions to automatically earn official verified credentials.'
              }
              actionLabel={isGuest ? 'Open QR / ID Verifier' : 'Check Eligibility'}
              onAction={() => {
                if (isGuest) {
                  setShowVerificationCard(true);
                } else {
                  setActiveViewTab('eligibility');
                }
              }}
            />
          )}
        </div>

        {/* Public Verifier Panel: Minimal info, strictly hides emails & payments */}
        {showVerificationCard && (
          <div className="lg:col-span-5 space-y-4 animate-fadeIn">
            <div className="glass-panel p-6 rounded-2xl space-y-4 border border-white/[0.12]">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-[var(--primary-accent)]" />
                    <h3 className="font-poppins font-semibold text-lg text-white">Public QR / ID Verification</h3>
                  </div>
                  <p className="text-xs text-[var(--text-sec-70)] mt-0.5">
                    Server-side verification portal for employers and institutions.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowVerificationCard(false)}
                  className="p-1 rounded-lg text-white/60 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleVerify} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-white mb-1">
                    SEMS Certificate ID
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={inputCode}
                      onChange={(e) => setInputCode(e.target.value)}
                      placeholder="e.g. SEMS-2026-849201"
                      className="w-full h-11 px-3.5 rounded-xl bg-white/[0.06] border border-white/[0.15] text-xs font-mono text-white placeholder-white/35 focus:outline-none focus:border-[var(--primary-accent)] uppercase"
                    />
                    <Search className="w-4 h-4 text-white/40 absolute right-3.5 top-3.5 pointer-events-none" />
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-white/50">Possess active ID?</span>
                  <button
                    type="button"
                    onClick={() => setInputCode(activeCert?.verificationCode || 'SEMS-2026-849201')}
                    className="text-[var(--primary-accent)] hover:underline font-medium cursor-pointer"
                  >
                    Paste Active ID
                  </button>
                </div>

                <button
                  type="submit"
                  className="w-full h-11 rounded-xl bg-[var(--primary-accent)] hover:brightness-110 text-white font-medium text-xs shadow-lg cursor-pointer flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Verify Credential Authenticity</span>
                </button>
              </form>

              {/* Minimal Public Verification Result */}
              {verificationResult.status === 'valid' && verificationResult.cert && (
                <div className="p-4 rounded-xl bg-emerald-950/50 border border-emerald-500/50 space-y-2 animate-fadeIn text-xs">
                  <div className="flex items-center gap-2 text-emerald-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="font-poppins font-semibold">Verified Official Credential</span>
                  </div>
                  <div className="space-y-1 pl-6 text-white/90">
                    <p><strong className="text-emerald-300">Certificate ID:</strong> {verificationResult.cert.verificationCode}</p>
                    <p><strong className="text-emerald-300">Recipient:</strong> {verificationResult.cert.recipientName}</p>
                    <p><strong className="text-emerald-300">Event Session:</strong> {verificationResult.cert.sessionTitle}</p>
                    <p><strong className="text-emerald-300">Issue Date:</strong> {verificationResult.cert.issueDate}</p>
                    <p><strong className="text-emerald-300">Status:</strong> <span className="uppercase text-emerald-300 font-bold">Active & Verified</span></p>
                  </div>
                  <p className="text-[10px] text-emerald-300/70 pt-1 italic border-t border-emerald-500/20">
                    * Privacy Guaranteed: Private emails, contact numbers, and payment details are strictly concealed from public scanners.
                  </p>
                </div>
              )}

              {verificationResult.status === 'revoked' && verificationResult.cert && (
                <div className="p-4 rounded-xl bg-rose-950/70 border border-rose-500/60 space-y-2 animate-fadeIn text-xs">
                  <div className="flex items-center gap-2 text-rose-300">
                    <XCircle className="w-5 h-5 text-rose-400" />
                    <span className="font-poppins font-bold text-sm">OFFICIALLY REVOKED CREDENTIAL</span>
                  </div>
                  <div className="space-y-1 pl-7 text-white/90">
                    <p><strong className="text-rose-300">Certificate ID:</strong> {verificationResult.cert.verificationCode}</p>
                    <p><strong className="text-rose-300">Recipient:</strong> {verificationResult.cert.recipientName}</p>
                    <p><strong className="text-rose-300">Revocation Reason:</strong> {verificationResult.cert.revocationReason}</p>
                    <p><strong className="text-rose-300">Revoked Date:</strong> {verificationResult.cert.revokedAt || 'Recent'}</p>
                  </div>
                </div>
              )}

              {verificationResult.status === 'invalid' && (
                <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 text-xs text-rose-300 space-y-1">
                  <p className="font-semibold text-rose-200">Invalid Credential Code</p>
                  <p className="text-[11px] leading-relaxed">{verificationResult.message}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    ) : isGuest ? (
      /* Guest Access Restricted Panel */
      <div className="glass-panel p-8 rounded-2xl text-center space-y-4 border border-white/[0.12] max-w-lg mx-auto my-8 animate-fadeIn shadow-xl">
        <ShieldAlert className="w-12 h-12 text-amber-400 mx-auto" />
        <h3 className="text-white font-poppins font-semibold text-lg">Administrative Roster Restricted</h3>
        <p className="text-xs text-[var(--text-sec-70)] leading-relaxed">
          The participant eligibility roster and administrative issuance engine are restricted to university administrators and enrolled students. Guests can verify credentials using the public QR and ID verifier.
        </p>
        <button
          type="button"
          onClick={() => {
            setActiveViewTab('certificates');
            setShowVerificationCard(true);
          }}
          className="px-5 py-2.5 rounded-xl bg-[var(--primary-accent)] hover:brightness-110 text-white font-medium text-xs cursor-pointer shadow-lg inline-flex items-center gap-2"
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Return to Credential Verification</span>
        </button>
      </div>
    ) : (
      /* Attendee Eligibility & Issuance Roster View */
        <div className="space-y-6 animate-fadeIn">
          {/* Rule Explanatory Banner */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-950/40 via-purple-950/30 to-emerald-950/40 border border-white/[0.12] space-y-2">
            <div className="flex items-center gap-2 text-white font-poppins font-medium text-sm">
              <Award className="w-4 h-4 text-[var(--primary-accent)]" />
              <span>{isStudent ? 'SEMS Certificate Eligibility Tracker' : 'SEMS Centralized Credential Eligibility Engine'}</span>
            </div>
            <p className="text-xs text-[var(--text-sec-80)] leading-relaxed">
              Certificate eligibility is authoritative and requires all four criteria to pass:
              <strong className="text-white ml-1">
                1. Confirmed Registration + 2. Approved Fee Payment (if paid) + 3. Verified Attendance + 4. Practical Assignment Completed On Time
              </strong>
              . {isStudent
                ? 'Once all 4 checks turn green, session administrators will issue your official verified credential.'
                : 'Super Admin and Admin can issue official signed credentials to eligible participants with one click.'}
            </p>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08]">
              <span className="text-[11px] uppercase tracking-wider text-[var(--text-sec-70)] block">
                {isStudent ? 'My Enrolled Sessions' : 'Total Registrants'}
              </span>
              <span className="font-poppins font-semibold text-xl text-white">
                {isStudent ? myStudentRegistrations.length : evaluatedRegistrants.length}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/30">
              <span className="text-[11px] uppercase tracking-wider text-emerald-300 block">
                {isStudent ? 'Eligible for Issue' : 'Ready to Issue'}
              </span>
              <span className="font-poppins font-semibold text-xl text-emerald-400">
                {isStudent
                  ? myStudentRegistrations.filter((item) => item.eligibility.eligible && !item.isIssued).length
                  : eligibleCount}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-cyan-950/30 border border-cyan-500/30">
              <span className="text-[11px] uppercase tracking-wider text-cyan-300 block">
                {isStudent ? 'My Issued Certs' : 'Already Issued'}
              </span>
              <span className="font-poppins font-semibold text-xl text-cyan-400">
                {isStudent
                  ? myStudentRegistrations.filter((i) => i.isIssued).length
                  : evaluatedRegistrants.filter((i) => i.isIssued).length}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/30">
              <span className="text-[11px] uppercase tracking-wider text-amber-300 block">
                {isStudent ? 'In Progress' : 'Requirements Incomplete'}
              </span>
              <span className="font-poppins font-semibold text-xl text-amber-400">
                {isStudent
                  ? myStudentRegistrations.filter((i) => !i.eligibility.eligible).length
                  : evaluatedRegistrants.filter((i) => !i.eligibility.eligible).length}
              </span>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-3 pointer-events-none" />
            <input
              type="text"
              value={eligibilitySearch}
              onChange={(e) => setEligibilitySearch(e.target.value)}
              placeholder="Search participant name, roll number, or session title..."
              className="w-full h-10 pl-10 pr-4 rounded-xl bg-white/[0.05] border border-white/[0.12] text-xs text-white placeholder-white/40 focus:outline-none focus:border-[var(--primary-accent)]"
            />
          </div>

          {/* Roster Section with Mobile Cards & Desktop Table */}
          {isLoading ? (
            <SkeletonState variant="table" count={5} />
          ) : (
            <div className="space-y-4">
              {/* Mobile Screens (sm:hidden): Rich Card-based View */}
              <div className="sm:hidden space-y-3">
                {evaluatedRegistrants
                  .filter((item) => {
                    if ((isStudent || isGuest) && currentUser) {
                      const matchEmail =
                        currentUser.email &&
                        (item.registrant.email?.toLowerCase() === currentUser.email.toLowerCase() ||
                          item.registrant.primaryEmail?.toLowerCase() === currentUser.email.toLowerCase());
                      const matchName =
                        currentUser.name &&
                        item.registrant.name.toLowerCase().trim() === currentUser.name.toLowerCase().trim();
                      if (!matchEmail && !matchName) return false;
                    }
                    if (!eligibilitySearch) return true;
                    const q = eligibilitySearch.toLowerCase();
                    return (
                      item.registrant.name.toLowerCase().includes(q) ||
                      item.registrant.rollNumber?.toLowerCase().includes(q) ||
                      item.registrant.sessionTitle?.toLowerCase().includes(q) ||
                      item.registrant.email?.toLowerCase().includes(q)
                    );
                  })
                  .map((item) => {
                    const reg = item.registrant;
                    const elig = item.eligibility;
                    return (
                      <div
                        key={reg.id}
                        className="p-4 rounded-2xl glass-panel border border-white/[0.12] space-y-3 shadow-md"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-poppins font-medium text-white flex items-center gap-1.5 truncate">
                              <span>{reg.name}</span>
                              {reg.isGuest && (
                                <span className="text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-500/30 px-1.5 py-0.2 rounded font-mono shrink-0">
                                  Guest
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] font-mono text-[var(--text-sec-70)] truncate">
                              {reg.rollNumber} • {reg.primaryEmail || reg.email}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-xs text-white font-medium block truncate max-w-[130px]">
                              {reg.sessionTitle}
                            </span>
                            <span className="text-[11px] text-amber-300 font-mono">
                              PKR {reg.amount}
                            </span>
                          </div>
                        </div>

                        {/* 4-Step Checklist Grid */}
                        <div className="grid grid-cols-2 gap-2 text-[11px] p-2.5 rounded-xl bg-black/30 border border-white/[0.06]">
                          <div className="flex items-center justify-between">
                            <span className="text-white/60">1. Reg:</span>
                            {elig.checks.registrationConfirmed ? (
                              <span className="text-emerald-400 font-medium flex items-center gap-0.5">
                                <Check className="w-3 h-3" /> Confirmed
                              </span>
                            ) : (
                              <span className="text-amber-400 font-medium flex items-center gap-0.5">
                                <Clock className="w-3 h-3" /> Pending
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-white/60">2. Fee:</span>
                            {elig.checks.paymentApproved ? (
                              <span className="text-emerald-400 font-medium flex items-center gap-0.5">
                                <Check className="w-3 h-3" /> Paid
                              </span>
                            ) : (
                              <span className="text-rose-400 font-medium flex items-center gap-0.5">
                                <X className="w-3 h-3" /> Due
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-white/60">3. Attended:</span>
                            {elig.checks.attendanceCompleted ? (
                              <span className="text-emerald-400 font-medium flex items-center gap-0.5">
                                <Check className="w-3 h-3" /> Yes
                              </span>
                            ) : (
                              <span className="text-rose-400 font-medium flex items-center gap-0.5">
                                <X className="w-3 h-3" /> No
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-white/60">4. Task:</span>
                            {elig.checks.assignmentCompleted ? (
                              <span className="text-emerald-400 font-medium flex items-center gap-0.5">
                                <Check className="w-3 h-3" /> Done
                              </span>
                            ) : (
                              <span className="text-rose-400 font-medium flex items-center gap-0.5">
                                <X className="w-3 h-3" /> Incomplete
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Overall Status & Action */}
                        <div className="flex items-center justify-between pt-2 border-t border-white/[0.08]">
                          <div>
                            {item.isIssued ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono bg-cyan-950/80 text-cyan-300 border border-cyan-500/50">
                                <ShieldCheck className="w-3 h-3" />
                                <span>Issued ({item.existingCert?.verificationCode})</span>
                              </span>
                            ) : elig.eligible ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-950/80 text-emerald-300 border border-emerald-500/50">
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                <span>Eligible</span>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setInspectingEligibilityReg({ registrant: reg, result: elig })}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-950/80 text-amber-300 border border-amber-500/50 cursor-pointer"
                              >
                                <AlertTriangle className="w-3 h-3 text-amber-400" />
                                <span>Missing Req</span>
                              </button>
                            )}
                          </div>

                          <div>
                            {item.isIssued ? (
                              <button
                                type="button"
                                onClick={() => {
                                  if (item.existingCert) {
                                    setActiveCert(item.existingCert);
                                    setActiveViewTab('certificates');
                                  }
                                }}
                                className="px-3 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-xs text-white cursor-pointer"
                              >
                                View →
                              </button>
                            ) : elig.eligible ? (
                              isAdmin ? (
                                <button
                                  type="button"
                                  onClick={() => handleIssueCertificateForRegistrant(reg)}
                                  className="px-3 py-1.5 rounded-xl bg-[var(--primary-accent)] hover:brightness-110 text-white font-medium text-xs cursor-pointer shadow flex items-center gap-1"
                                >
                                  <Award className="w-3.5 h-3.5" />
                                  <span>Issue</span>
                                </button>
                              ) : (
                                <span className="text-[10px] text-emerald-400">Ready</span>
                              )
                            ) : (
                              <button
                                type="button"
                                onClick={() => setInspectingEligibilityReg({ registrant: reg, result: elig })}
                                className="px-2.5 py-1 rounded-xl bg-white/[0.05] hover:bg-white/[0.10] text-[11px] text-[var(--text-sec-70)] cursor-pointer"
                              >
                                Details
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Desktop & Tablet Screens (hidden sm:block): Full Tabular Format */}
              <div className="hidden sm:block glass-panel rounded-2xl overflow-hidden border border-white/[0.08]">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                  <thead className="bg-white/[0.04] border-b border-white/[0.08] text-[var(--text-sec-70)] font-medium">
                    <tr>
                      <th className="py-3 px-4">Attendee</th>
                      <th className="py-3 px-4">Session & Fee</th>
                      <th className="py-3 px-3 text-center">1. Reg Confirmed</th>
                      <th className="py-3 px-3 text-center">2. Payment</th>
                      <th className="py-3 px-3 text-center">3. Attendance</th>
                      <th className="py-3 px-3 text-center">4. Assignment</th>
                      <th className="py-3 px-4">Overall Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06]">
                    {(() => {
                      const filteredList = evaluatedRegistrants.filter((item) => {
                        if ((isStudent || isGuest) && currentUser) {
                          const matchEmail =
                            currentUser.email &&
                            (item.registrant.email?.toLowerCase() === currentUser.email.toLowerCase() ||
                              item.registrant.primaryEmail?.toLowerCase() === currentUser.email.toLowerCase());
                          const matchName =
                            currentUser.name &&
                            item.registrant.name.toLowerCase().trim() === currentUser.name.toLowerCase().trim();
                          if (!matchEmail && !matchName) return false;
                        }
                        if (!eligibilitySearch) return true;
                        const q = eligibilitySearch.toLowerCase();
                        return (
                          item.registrant.name.toLowerCase().includes(q) ||
                          item.registrant.rollNumber?.toLowerCase().includes(q) ||
                          item.registrant.sessionTitle?.toLowerCase().includes(q) ||
                          item.registrant.email?.toLowerCase().includes(q)
                        );
                      });

                      if (filteredList.length === 0) {
                        return (
                          <tr>
                            <td colSpan={8} className="py-8 text-center">
                              <EmptyState
                                icon={Award}
                                title="No audit records found"
                                description={
                                  eligibilitySearch
                                    ? `No participant matches the query "${eligibilitySearch}".`
                                    : 'No registrations found for certificate evaluation.'
                                }
                                actionLabel={eligibilitySearch ? 'Clear Search' : undefined}
                                onAction={() => setEligibilitySearch('')}
                              />
                            </td>
                          </tr>
                        );
                      }

                      return filteredList.map((item) => {
                        const reg = item.registrant;
                        const elig = item.eligibility;

                      return (
                        <tr key={reg.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-poppins font-medium text-white flex items-center gap-1.5">
                              <span>{reg.name}</span>
                              {reg.isGuest && (
                                <span className="text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-500/30 px-1.5 py-0.2 rounded font-mono">
                                  Guest
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] font-mono text-[var(--text-sec-70)]">
                              {reg.rollNumber} • {reg.primaryEmail || reg.email}
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="text-white font-medium truncate max-w-[180px]">{reg.sessionTitle}</div>
                            <div className="text-[11px] text-amber-300 font-mono">
                              PKR {reg.amount}
                            </div>
                          </td>

                          {/* Check 1: Reg Confirmed */}
                          <td className="py-3.5 px-3 text-center">
                            {elig.checks.registrationConfirmed ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-950/70 text-emerald-300 border border-emerald-500/40">
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span>Confirmed</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-950/70 text-amber-300 border border-amber-500/40">
                                <Clock className="w-3 h-3 text-amber-400" />
                                <span>Pending</span>
                              </span>
                            )}
                          </td>

                          {/* Check 2: Payment */}
                          <td className="py-3.5 px-3 text-center">
                            {elig.checks.paymentApproved ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-950/70 text-emerald-300 border border-emerald-500/40">
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span>Approved</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-rose-950/70 text-rose-300 border border-rose-500/40">
                                <X className="w-3 h-3 text-rose-400" />
                                <span>Unverified</span>
                              </span>
                            )}
                          </td>

                          {/* Check 3: Attendance */}
                          <td className="py-3.5 px-3 text-center">
                            {elig.checks.attendanceCompleted ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-950/70 text-emerald-300 border border-emerald-500/40">
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span>Completed</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-rose-950/70 text-rose-300 border border-rose-500/40">
                                <X className="w-3 h-3 text-rose-400" />
                                <span>Incomplete</span>
                              </span>
                            )}
                          </td>

                          {/* Check 4: Assignment */}
                          <td className="py-3.5 px-3 text-center">
                            {elig.checks.assignmentCompleted ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-950/70 text-emerald-300 border border-emerald-500/40">
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span>On Time</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-rose-950/70 text-rose-300 border border-rose-500/40">
                                <X className="w-3 h-3 text-rose-400" />
                                <span>Missing/Late</span>
                              </span>
                            )}
                          </td>

                          {/* Overall Status */}
                          <td className="py-3.5 px-4">
                            {item.isIssued ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-cyan-950/80 text-cyan-300 border border-cyan-500/50">
                                <ShieldCheck className="w-3.5 h-3.5" />
                                <span>Issued ({item.existingCert?.verificationCode})</span>
                              </span>
                            ) : elig.eligible ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-950/80 text-emerald-300 border border-emerald-500/50">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Eligible for Issuance</span>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setInspectingEligibilityReg({ registrant: reg, result: elig })}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-950/80 text-amber-300 border border-amber-500/50 hover:bg-amber-900/80 cursor-pointer"
                              >
                                <AlertTriangle className="w-3 h-3 text-amber-400" />
                                <span>Requirements Missing</span>
                                <Info className="w-3 h-3 opacity-60" />
                              </button>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right">
                            {item.isIssued ? (
                              <button
                                type="button"
                                onClick={() => {
                                  if (item.existingCert) {
                                    setActiveCert(item.existingCert);
                                    setActiveViewTab('certificates');
                                  }
                                }}
                                className="px-3 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-xs text-white cursor-pointer"
                              >
                                View Credential →
                              </button>
                            ) : elig.eligible ? (
                              isAdmin ? (
                                <button
                                  type="button"
                                  onClick={() => handleIssueCertificateForRegistrant(reg)}
                                  className="px-3.5 py-1.5 rounded-xl bg-[var(--primary-accent)] hover:brightness-110 active:scale-95 text-white font-medium text-xs cursor-pointer shadow-md flex items-center gap-1.5 ml-auto"
                                >
                                  <Award className="w-3.5 h-3.5" />
                                  <span>Issue Certificate</span>
                                </button>
                              ) : (
                                <span className="text-[11px] text-emerald-400">Ready for admin issuance</span>
                              )
                            ) : (
                              <button
                                type="button"
                                onClick={() => setInspectingEligibilityReg({ registrant: reg, result: elig })}
                                className="px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.10] text-[11px] text-[var(--text-sec-70)] cursor-pointer"
                              >
                                Details
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )}

      {/* Revocation Confirmation Modal */}
      {revokingCert && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setRevokingCert(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
        >
          <div className="glass-panel w-full max-w-md rounded-2xl p-6 space-y-4 border border-rose-500/40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-300 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-poppins font-medium text-base text-white">Confirm Certificate Revocation</h3>
                <p className="text-xs text-[var(--text-sec-70)]">
                  {revokingCert.verificationCode} • {revokingCert.recipientName}
                </p>
              </div>
            </div>

            <div className="space-y-1.5 text-xs">
              <label className="block text-white font-medium">Revocation Justification Reason <span className="text-rose-400">*</span></label>
              <textarea
                rows={3}
                value={revocationReasonInput}
                onChange={(e) => setRevocationReasonInput(e.target.value)}
                placeholder="e.g. Session attendance threshold not satisfied upon post-event audit; academic misconduct."
                className="w-full p-3 rounded-xl bg-white/[0.06] border border-white/[0.15] text-white focus:outline-none focus:border-rose-400 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.10]">
              <button
                type="button"
                onClick={() => setRevokingCert(null)}
                className="px-4 py-2 rounded-xl bg-white/[0.08] text-xs text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRevoke}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white cursor-pointer shadow"
              >
                Confirm Revoke
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk CSV Generator Modal (9-Step Workflow) */}
      {showBulkModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowBulkModal(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
        >
          <div className="glass-panel w-full max-w-4xl xl:max-w-5xl max-h-[92vh] overflow-y-auto rounded-3xl p-6 sm:p-8 space-y-6 border border-white/[0.15]">
            <div className="flex items-center justify-between border-b border-white/[0.10] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-poppins font-semibold text-lg text-white">CSV Bulk Certificate Batch Engine</h3>
                  <span className="text-xs text-[var(--text-sec-70)]">
                    Upload attendee CSV $\rightarrow$ Table Preview & Validation $\rightarrow$ Batch Generate $\rightarrow$ Export ZIP Package
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    downloadSampleCertificateCsvTemplate();
                    onNotify('Sample attendee CSV template downloaded successfully!');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] border border-white/[0.12] text-xs font-medium text-white flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                  title="Download clean RFC 4180 CSV sample template"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">Sample CSV Template</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowBulkModal(false);
                    setCsvParseError(null);
                  }}
                  className="p-1.5 rounded-xl text-white/60 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {bulkStep === 1 && (
              <div className="space-y-5">
                {/* Sample Template Guidance Card */}
                <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/[0.10] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[var(--primary-accent)]/20 text-[var(--primary-accent)] flex items-center justify-center shrink-0 mt-0.5">
                      <FileSpreadsheet className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-poppins font-medium text-xs text-white block">
                        Recommended CSV Structure & Headers
                      </span>
                      <p className="text-[11px] text-[var(--text-sec-70)]">
                        Format: <code className="text-emerald-300 font-mono">Full Name, Roll Number, Email, Session Title, Grade</code>. Quotes & commas are fully supported.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      downloadSampleCertificateCsvTemplate();
                      onNotify('Sample attendee CSV template downloaded successfully!');
                    }}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center gap-2 shrink-0 cursor-pointer shadow transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Sample .CSV Template</span>
                  </button>
                </div>

                {/* Parsing Error Banner */}
                {csvParseError && (
                  <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-200 flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <strong className="text-rose-300 block font-semibold">CSV Ingestion Failed</strong>
                      <p>{csvParseError}</p>
                      <p className="text-[11px] text-rose-300/80 mt-1">
                        Tip: Download the sample CSV template above to ensure your spreadsheet column headers and rows match the required format.
                      </p>
                    </div>
                  </div>
                )}

                {/* File Dropzone */}
                <div
                  onClick={() => csvFileInputRef.current?.click()}
                  className="p-8 rounded-2xl border-2 border-dashed border-white/20 hover:border-white/40 text-center cursor-pointer space-y-2 transition-colors bg-white/[0.02]"
                >
                  <input
                    type="file"
                    ref={csvFileInputRef}
                    accept=".csv"
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleCsvFileUpload(e.target.files[0]);
                    }}
                    className="hidden"
                  />
                  <Upload className="w-8 h-8 mx-auto text-[var(--primary-accent)]" />
                  <p className="text-xs text-white font-medium">Click to select CSV attendee file</p>
                  <p className="text-[11px] text-[var(--text-sec-60)]">
                    Supports RFC 4180 format, UTF-8 encoded files, extra commas handling & live duplicate detection
                  </p>
                </div>
              </div>
            )}

            {bulkStep === 2 && (
              <div className="space-y-5 text-xs">
                {/* Upload Metrics Summary */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.10]">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                    <span className="font-semibold text-white truncate max-w-[200px] sm:max-w-xs">
                      {csvFile?.name || 'Uploaded CSV'}
                    </span>
                    <span className="text-[11px] text-[var(--text-sec-70)]">
                      ({csvValidationSummary?.totalRows || 0} rows parsed)
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-semibold text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{csvValidationSummary?.validCount || 0} Valid</span>
                    </span>

                    {(csvValidationSummary?.invalidCount || 0) > 0 && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 font-semibold text-[11px]">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                        <span>{csvValidationSummary?.invalidCount || 0} Invalid</span>
                      </span>
                    )}

                    {(csvValidationSummary?.blankCount || 0) > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white/[0.06] border border-white/[0.12] text-white/70 text-[11px]">
                        <span>{csvValidationSummary?.blankCount} Blank</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Prominent Red Callout if invalid rows exist */}
                {(csvValidationSummary?.invalidCount || 0) > 0 && (
                  <div className="p-3.5 rounded-2xl bg-rose-950/50 border border-rose-500/40 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <strong className="text-rose-200 block text-xs font-semibold">
                        {csvValidationSummary?.invalidCount} Invalid Rows Highlighted in Red Below
                      </strong>
                      <p className="text-[11px] text-rose-300/85 leading-relaxed">
                        The CSV table preview highlights rows with missing full names, corrupt syntax, duplicate emails, invalid email formats, or extra commas. Invalid rows will be automatically skipped during issuance, while valid records proceed seamlessly.
                      </p>
                    </div>
                  </div>
                )}

                {/* Column Mapping Section */}
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-poppins font-medium text-white block">
                      Map CSV Headers to Certificate Credential Fields:
                    </span>
                    <span className="text-[11px] text-[var(--text-sec-70)]">
                      Auto-detected from column names
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-white mb-1 font-medium">
                        Recipient Name Column <span className="text-rose-400">*</span>
                      </label>
                      <select
                        value={columnMapping.name}
                        onChange={(e) => handleUpdateColumnMapping({ ...columnMapping, name: e.target.value })}
                        className="w-full h-9 px-3 rounded-xl bg-white/[0.06] border border-white/[0.15] text-white text-xs focus:outline-none focus:border-[var(--primary-accent)]"
                      >
                        <option value="">Select column...</option>
                        {csvHeaders.map((h) => (
                          <option key={h} value={h} className="bg-slate-900">{h}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-white mb-1">Roll / ID Number Column</label>
                      <select
                        value={columnMapping.roll}
                        onChange={(e) => handleUpdateColumnMapping({ ...columnMapping, roll: e.target.value })}
                        className="w-full h-9 px-3 rounded-xl bg-white/[0.06] border border-white/[0.15] text-white text-xs focus:outline-none focus:border-[var(--primary-accent)]"
                      >
                        <option value="">Select column...</option>
                        {csvHeaders.map((h) => (
                          <option key={h} value={h} className="bg-slate-900">{h}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-white mb-1">Primary Email Column</label>
                      <select
                        value={columnMapping.email}
                        onChange={(e) => handleUpdateColumnMapping({ ...columnMapping, email: e.target.value })}
                        className="w-full h-9 px-3 rounded-xl bg-white/[0.06] border border-white/[0.15] text-white text-xs focus:outline-none focus:border-[var(--primary-accent)]"
                      >
                        <option value="">Select column...</option>
                        {csvHeaders.map((h) => (
                          <option key={h} value={h} className="bg-slate-900">{h}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-white mb-1">Event / Session Title Column</label>
                      <select
                        value={columnMapping.session}
                        onChange={(e) => handleUpdateColumnMapping({ ...columnMapping, session: e.target.value })}
                        className="w-full h-9 px-3 rounded-xl bg-white/[0.06] border border-white/[0.15] text-white text-xs focus:outline-none focus:border-[var(--primary-accent)]"
                      >
                        <option value="">Select column...</option>
                        {csvHeaders.map((h) => (
                          <option key={h} value={h} className="bg-slate-900">{h}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-white mb-1">Merit / Grade Column</label>
                      <select
                        value={columnMapping.grade}
                        onChange={(e) => handleUpdateColumnMapping({ ...columnMapping, grade: e.target.value })}
                        className="w-full h-9 px-3 rounded-xl bg-white/[0.06] border border-white/[0.15] text-white text-xs focus:outline-none focus:border-[var(--primary-accent)]"
                      >
                        <option value="">Select column (Default: Distinction)...</option>
                        {csvHeaders.map((h) => (
                          <option key={h} value={h} className="bg-slate-900">{h}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Table Preview Filter Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">CSV Table Preview:</span>
                    <span className="text-[11px] text-[var(--text-sec-70)]">
                      Showing {csvValidationSummary?.rows.filter((r) => {
                        if (previewFilter === 'invalid') return !r.isValid;
                        if (previewFilter === 'valid') return r.isValid;
                        return true;
                      }).length || 0} of {csvValidationSummary?.totalRows || 0} rows
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/[0.05] border border-white/[0.10]">
                    <button
                      type="button"
                      onClick={() => setPreviewFilter('all')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
                        previewFilter === 'all'
                          ? 'bg-white/[0.15] text-white'
                          : 'text-white/60 hover:text-white'
                      }`}
                    >
                      All ({csvValidationSummary?.totalRows || 0})
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewFilter('invalid')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors flex items-center gap-1 cursor-pointer ${
                        previewFilter === 'invalid'
                          ? 'bg-rose-600/40 text-rose-200 border border-rose-500/40'
                          : 'text-rose-400 hover:text-rose-300'
                      }`}
                    >
                      <AlertTriangle className="w-3 h-3 text-rose-400" />
                      <span>Invalid ({csvValidationSummary?.invalidCount || 0})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewFilter('valid')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors flex items-center gap-1 cursor-pointer ${
                        previewFilter === 'valid'
                          ? 'bg-emerald-600/40 text-emerald-200 border border-emerald-500/40'
                          : 'text-emerald-400 hover:text-emerald-300'
                      }`}
                    >
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      <span>Valid ({csvValidationSummary?.validCount || 0})</span>
                    </button>
                  </div>
                </div>

                {/* Comprehensive CSV Table Preview with Red Highlighting */}
                <div className="max-h-72 overflow-y-auto overflow-x-auto rounded-2xl border border-white/[0.12] bg-black/40">
                  <table className="w-full text-left text-xs border-collapse min-w-[700px]">
                    <thead className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur border-b border-white/[0.14] text-[11px] uppercase tracking-wider text-white/70">
                      <tr>
                        <th className="py-2.5 px-3 font-semibold w-16">Row #</th>
                        <th className="py-2.5 px-3 font-semibold w-24">Status</th>
                        <th className="py-2.5 px-3 font-semibold">Full Name</th>
                        <th className="py-2.5 px-3 font-semibold">Roll / ID</th>
                        <th className="py-2.5 px-3 font-semibold">Email</th>
                        <th className="py-2.5 px-3 font-semibold">Session Title</th>
                        <th className="py-2.5 px-3 font-semibold">Grade</th>
                        <th className="py-2.5 px-3 font-semibold min-w-[200px]">Validation Notes & Errors</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.06]">
                      {csvValidationSummary?.rows
                        .filter((r) => {
                          if (previewFilter === 'invalid') return !r.isValid;
                          if (previewFilter === 'valid') return r.isValid;
                          return true;
                        })
                        .map((row) => (
                          <tr
                            key={row.rowNumber}
                            className={`transition-colors ${
                              !row.isValid
                                ? 'bg-rose-950/45 hover:bg-rose-900/45 border-l-4 border-l-rose-500 text-rose-100'
                                : 'hover:bg-white/[0.04] text-white/90'
                            }`}
                          >
                            <td className="py-2.5 px-3 font-mono font-bold text-[11px]">
                              <span className={!row.isValid ? 'text-rose-300' : 'text-white/60'}>
                                #{row.rowNumber}
                              </span>
                            </td>

                            <td className="py-2.5 px-3">
                              {!row.isValid ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/25 border border-rose-500/50 text-rose-200 font-semibold text-[10px] whitespace-nowrap">
                                  <XCircle className="w-3 h-3 text-rose-400 shrink-0" />
                                  <span>Invalid</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-semibold text-[10px] whitespace-nowrap">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                                  <span>Valid</span>
                                </span>
                              )}
                            </td>

                            <td className="py-2.5 px-3 font-medium">
                              {row.name ? (
                                <span>{row.name}</span>
                              ) : (
                                <span className="text-rose-400 font-semibold italic text-[11px]">
                                  (Missing Name)
                                </span>
                              )}
                            </td>

                            <td className="py-2.5 px-3 font-mono text-[11px] text-white/80">
                              {row.roll || '—'}
                            </td>

                            <td className="py-2.5 px-3 font-mono text-[11px]">
                              {row.email ? (
                                <span
                                  className={
                                    row.errors.some((e) => e.includes('Email'))
                                      ? 'text-rose-300 font-semibold underline decoration-rose-500'
                                      : 'text-white/80'
                                  }
                                >
                                  {row.email}
                                </span>
                              ) : (
                                <span className="text-white/40">—</span>
                              )}
                            </td>

                            <td className="py-2.5 px-3 text-white/80">
                              {row.session || (
                                <span className="text-white/40 italic">(Active Default)</span>
                              )}
                            </td>

                            <td className="py-2.5 px-3 text-white/80">
                              {row.grade || 'Distinction'}
                            </td>

                            <td className="py-2.5 px-3">
                              {!row.isValid ? (
                                <div className="space-y-1">
                                  {row.errors.map((err, errIdx) => (
                                    <div
                                      key={errIdx}
                                      className="text-rose-200 bg-rose-950/80 border border-rose-500/40 px-2 py-0.5 rounded text-[10px] font-mono flex items-center gap-1.5"
                                    >
                                      <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />
                                      <span>{err}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="space-y-0.5">
                                  <span className="text-emerald-400 text-[10px] font-mono flex items-center gap-1">
                                    <Check className="w-3 h-3 text-emerald-400" />
                                    <span>Passed CSV format validation</span>
                                  </span>
                                  {row.warnings.map((warn, wIdx) => (
                                    <span key={wIdx} className="text-amber-300 text-[10px] block">
                                      {warn}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>

                {/* Footer Controls */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-white/[0.10]">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setBulkStep(1)}
                      className="px-4 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-white flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Re-upload CSV</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        downloadSampleCertificateCsvTemplate();
                        onNotify('Sample attendee CSV template downloaded successfully!');
                      }}
                      className="px-3.5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.12] text-white/80 hover:text-white flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Sample Template</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    disabled={!columnMapping.name || (csvValidationSummary?.validCount || 0) === 0}
                    onClick={executeBulkGeneration}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[var(--primary-accent)] hover:brightness-110 disabled:opacity-40 font-semibold text-white shadow flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    <Award className="w-4 h-4" />
                    <span>
                      {(csvValidationSummary?.validCount || 0) === 0
                        ? 'Cannot Generate (0 Valid Records)'
                        : (csvValidationSummary?.invalidCount || 0) > 0
                        ? `Execute Batch (${csvValidationSummary?.validCount} Valid Records, Skip ${csvValidationSummary?.invalidCount} Invalid)`
                        : `Execute Batch Generation (${csvValidationSummary?.validCount} Records)`}
                    </span>
                  </button>
                </div>
              </div>
            )}

            {bulkStep === 4 && (
              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                    <div>
                      <span className="font-poppins font-semibold text-white text-sm block">
                        Batch Generation Complete
                      </span>
                      <span className="text-[11px] text-emerald-300">
                        {bulkResults.successful.length} credentials successfully generated with unique IDs & QRs.
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleDownloadBatchCsvOnly}
                      className="px-3 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-xs font-semibold text-white flex items-center gap-1.5 cursor-pointer border border-white/[0.15] transition-colors"
                      title="Export spreadsheet CSV of all generated credentials"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-emerald-300" />
                      <span>Export CSV</span>
                    </button>
                    <button
                      type="button"
                      disabled={isExportingZip}
                      onClick={handleDownloadZipPackage}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold flex items-center gap-1.5 shadow cursor-pointer transition-colors"
                    >
                      <FolderArchive className="w-4 h-4" />
                      <span>{isExportingZip ? 'Packaging ZIP...' : 'Download ZIP Package'}</span>
                    </button>
                  </div>

                </div>

                {bulkResults.failed.length > 0 && (
                  <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-rose-300 font-semibold block">
                        Ineligible / Failed Rows ({bulkResults.failed.length}):
                      </span>
                      <button
                        type="button"
                        onClick={handleRetryFailedBulkRows}
                        className="px-3 py-1 rounded-lg bg-rose-900/60 hover:bg-rose-800/60 border border-rose-400/40 text-xs font-medium text-white flex items-center gap-1.5 cursor-pointer shadow-sm transition-colors"
                        title="Re-evaluate eligibility and retry issuing for failed participants"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-cyan-300" />
                        <span>Retry Failed Rows</span>
                      </button>
                    </div>
                    <div className="space-y-1 font-mono text-[11px] max-h-48 overflow-y-auto pr-1">
                      {bulkResults.failed.map((f, i) => (
                        <div key={i} className="text-rose-200 bg-black/20 p-1.5 rounded">
                          <strong className="text-rose-300">Row {f.row}:</strong> {f.reason}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.10]">
                  <button
                    type="button"
                    onClick={() => setShowBulkModal(false)}
                    className="px-5 py-2 rounded-xl bg-white/[0.08] text-white"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Admin Template Customizer Modal */}
      {templateCustomizerOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setTemplateCustomizerOpen(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn"
        >
          <div className="glass-panel w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 sm:p-8 space-y-6 border border-white/[0.15]">
            <div className="flex items-center justify-between border-b border-white/[0.10] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--primary-accent)]/20 border border-[var(--primary-accent)]/40 flex items-center justify-center text-[var(--primary-accent)]">
                  <Palette className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-poppins font-medium text-lg text-white">
                    Certificate Template & Signatures Settings
                  </h3>
                  <span className="text-xs font-inter text-[var(--text-sec-70)]">
                    Admin Only: Designate locked layout for all attendees
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTemplateCustomizerOpen(false)}
                className="p-1.5 rounded-xl text-white/60 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-white font-medium mb-1">Certificate Header Title</label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-white/[0.06] border border-white/[0.15] text-white"
                />
              </div>

              <div>
                <label className="block text-white font-medium mb-1">Commendation Subtitle Text</label>
                <textarea
                  rows={2}
                  value={customSubtitle}
                  onChange={(e) => setCustomSubtitle(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-white/[0.06] border border-white/[0.15] text-white resize-none"
                />
              </div>

              <div>
                <label className="block text-white font-medium mb-1">Template Style Selection</label>
                <TemplateComboBox
                  label="Active Template"
                  activeStyle={activeTemplateStyle}
                  onSelectTemplate={(tpl: TemplateOption) => {
                    setActiveTemplateStyle(tpl.id);
                    setActiveTemplateFormat(tpl.format);
                    onNotify(`Designated template set to ${tpl.name}`);
                  }}
                />
              </div>

              {/* Official Signatories Configuration */}
              <div className="space-y-3 pt-2 border-t border-white/[0.10]">
                <span className="font-poppins font-medium text-white block">Official Institutional Signatories</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2 p-3 rounded-xl bg-white/[0.04] border border-white/[0.08]">
                    <span className="text-[11px] font-semibold text-emerald-300 block uppercase">Signatory 1 (Admin)</span>
                    <input
                      type="text"
                      value={signatoryName}
                      onChange={(e) => setSignatoryName(e.target.value)}
                      placeholder="Admin Name"
                      className="w-full h-8 px-2.5 rounded-lg bg-white/[0.06] border border-white/[0.12] text-xs text-white"
                    />
                    <input
                      type="text"
                      value={signatoryTitle}
                      onChange={(e) => setSignatoryTitle(e.target.value)}
                      placeholder="Designation"
                      className="w-full h-8 px-2.5 rounded-lg bg-white/[0.06] border border-white/[0.12] text-xs text-white"
                    />

                    <div className="pt-1 flex items-center justify-between">
                      <span className="text-[11px] text-white/60">Digital Signature:</span>
                      <button
                        type="button"
                        onClick={() => setSignaturePadTarget('admin')}
                        className="px-2.5 py-1 rounded-lg bg-[var(--accent-15)] hover:bg-[var(--accent-25)] border border-[var(--accent-30)] text-[var(--primary-accent)] text-[11px] font-medium flex items-center gap-1.5 cursor-pointer"
                      >
                        <PenTool className="w-3 h-3" />
                        <span>{customSignature1 ? 'Change Signature' : 'Draw / Upload'}</span>
                      </button>
                    </div>

                    {customSignature1 && (
                      <div className="flex items-center justify-between p-2 rounded-lg bg-black/40 border border-white/10 mt-1">
                        <img src={customSignature1} alt="Signature Preview" className="h-6 w-auto object-contain" />
                        <button
                          type="button"
                          onClick={() => {
                            setCustomSignature1(null);
                            try {
                              localStorage.removeItem('sems_custom_sig_1');
                            } catch {}
                            onNotify('Signatory 1 reset to default official signature.');
                          }}
                          className="text-[10px] text-rose-400 hover:underline cursor-pointer"
                        >
                          Reset to Preset
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 p-3 rounded-xl bg-white/[0.04] border border-white/[0.08]">
                    <span className="text-[11px] font-semibold text-amber-300 block uppercase">Signatory 2 (Institutional Dean)</span>
                    <input
                      type="text"
                      value={adminSignatoryName}
                      onChange={(e) => setAdminSignatoryName(e.target.value)}
                      placeholder="Dean Name"
                      className="w-full h-8 px-2.5 rounded-lg bg-white/[0.06] border border-white/[0.12] text-xs text-white"
                    />
                    <input
                      type="text"
                      value={adminSignatoryTitle}
                      onChange={(e) => setAdminSignatoryTitle(e.target.value)}
                      placeholder="Institutional Title"
                      className="w-full h-8 px-2.5 rounded-lg bg-white/[0.06] border border-white/[0.12] text-xs text-white"
                    />

                    <div className="pt-1 flex items-center justify-between">
                      <span className="text-[11px] text-white/60">Digital Signature:</span>
                      <button
                        type="button"
                        onClick={() => setSignaturePadTarget('dean')}
                        className="px-2.5 py-1 rounded-lg bg-[var(--accent-15)] hover:bg-[var(--accent-25)] border border-[var(--accent-30)] text-[var(--primary-accent)] text-[11px] font-medium flex items-center gap-1.5 cursor-pointer"
                      >
                        <PenTool className="w-3 h-3" />
                        <span>{customSignature2 ? 'Change Signature' : 'Draw / Upload'}</span>
                      </button>
                    </div>

                    {customSignature2 && (
                      <div className="flex items-center justify-between p-2 rounded-lg bg-black/40 border border-white/10 mt-1">
                        <img src={customSignature2} alt="Dean Signature Preview" className="h-6 w-auto object-contain" />
                        <button
                          type="button"
                          onClick={() => {
                            setCustomSignature2(null);
                            try {
                              localStorage.removeItem('sems_custom_sig_2');
                            } catch {}
                            onNotify('Signatory 2 reset to default official signature.');
                          }}
                          className="text-[10px] text-rose-400 hover:underline cursor-pointer"
                        >
                          Reset to Preset
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-white/[0.10] flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setTemplateCustomizerOpen(false)}
                className="px-4 py-2 rounded-xl bg-white/[0.08] text-xs text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const updatedList = certList.map((c) => ({
                    ...c,
                    templateStyle: activeTemplateStyle,
                    templateFormat: activeTemplateFormat,
                  }));
                  updateCertificateList(updatedList);
                  setActiveCert((prev) => ({
                    ...prev,
                    templateStyle: activeTemplateStyle,
                    templateFormat: activeTemplateFormat,
                  }));
                  setTemplateCustomizerOpen(false);
                  onNotify('Administrator layout configuration saved for all attendees.');
                }}
                className="px-5 py-2 rounded-xl bg-[var(--primary-accent)] hover:brightness-110 text-xs font-semibold text-white shadow"
              >
                Save Layout Configuration
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SEMS Phase 3: Eligibility Inspection Modal */}
      {inspectingEligibilityReg && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setInspectingEligibilityReg(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
        >
          <div className="glass-panel w-full max-w-lg rounded-2xl p-6 space-y-4 border border-white/[0.15]">
            <div className="flex items-center justify-between border-b border-white/[0.10] pb-3">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    inspectingEligibilityReg.result.eligible
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-amber-500/20 text-amber-400'
                  }`}
                >
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-poppins font-semibold text-white text-base">
                    SEMS Certificate Eligibility Breakdown
                  </h3>
                  <p className="text-xs text-[var(--text-sec-70)]">
                    {inspectingEligibilityReg.registrant.name} • {inspectingEligibilityReg.registrant.rollNumber}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectingEligibilityReg(null)}
                className="p-1.5 rounded-lg text-white/60 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs space-y-1">
              <div className="font-medium text-white">
                Session: {inspectingEligibilityReg.registrant.sessionTitle}
              </div>
              <div className="text-[11px] text-[var(--text-sec-70)]">
                Authoritative Rule: Confirmed Registration + Approved Payment + Attendance Logged + On-Time Practical Assignment
              </div>
            </div>

            {/* 4 Checklist Items */}
            <div className="space-y-2 text-xs">
              {/* Check 1 */}
              <div
                className={`p-3 rounded-xl border flex items-start gap-3 ${
                  inspectingEligibilityReg.result.checks.registrationConfirmed
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                    : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                }`}
              >
                {inspectingEligibilityReg.result.checks.registrationConfirmed ? (
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <X className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-semibold text-white">1. Confirmed Registration</div>
                  <div className="text-[11px] opacity-80">
                    {inspectingEligibilityReg.result.details.registration.message}
                  </div>
                </div>
              </div>

              {/* Check 2 */}
              <div
                className={`p-3 rounded-xl border flex items-start gap-3 ${
                  inspectingEligibilityReg.result.checks.paymentApproved
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                    : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                }`}
              >
                {inspectingEligibilityReg.result.checks.paymentApproved ? (
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <X className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-semibold text-white">2. Fee Payment Approval</div>
                  <div className="text-[11px] opacity-80">
                    {inspectingEligibilityReg.result.details.payment.message}
                  </div>
                </div>
              </div>

              {/* Check 3 */}
              <div
                className={`p-3 rounded-xl border flex items-start gap-3 ${
                  inspectingEligibilityReg.result.checks.attendanceCompleted
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                    : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                }`}
              >
                {inspectingEligibilityReg.result.checks.attendanceCompleted ? (
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <X className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-semibold text-white">3. Attendance & Participation</div>
                  <div className="text-[11px] opacity-80">
                    {inspectingEligibilityReg.result.details.attendance.message}
                  </div>
                </div>
              </div>

              {/* Check 4 */}
              <div
                className={`p-3 rounded-xl border flex items-start gap-3 ${
                  inspectingEligibilityReg.result.checks.assignmentCompleted
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                    : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                }`}
              >
                {inspectingEligibilityReg.result.checks.assignmentCompleted ? (
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <X className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-semibold text-white">4. Required Practical Assignment</div>
                  <div className="text-[11px] opacity-80">
                    {inspectingEligibilityReg.result.details.assignment.message}
                  </div>
                </div>
              </div>
            </div>

            {/* Verdict Banner matching SEMS Phase 3 specification */}
            <div
              className={`p-3.5 rounded-xl border text-xs ${
                inspectingEligibilityReg.result.eligible
                  ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-300'
                  : 'bg-rose-950/60 border-rose-500/60 text-rose-300'
              }`}
            >
              <div className="flex items-center justify-between font-semibold">
                <span className="text-white">Certificate Eligibility Status:</span>
                <span
                  className={`px-2.5 py-0.5 rounded font-mono font-bold uppercase tracking-wider ${
                    inspectingEligibilityReg.result.eligible
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  }`}
                >
                  {inspectingEligibilityReg.result.eligible ? 'Status: ELIGIBLE' : 'Status: NOT ELIGIBLE'}
                </span>
              </div>
              <div className="text-[11px] opacity-90 mt-1.5 leading-relaxed">
                {inspectingEligibilityReg.result.eligible
                  ? 'Candidate satisfies all 4 verified criteria and is fully eligible for official credential issuance.'
                  : `Ineligibility Reasons: ${inspectingEligibilityReg.result.reasons.join('; ')}`}
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-white/[0.10]">
              <button
                type="button"
                onClick={() => setInspectingEligibilityReg(null)}
                className="px-4 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-xs font-medium text-white cursor-pointer"
              >
                Close
              </button>

              {isAdmin && inspectingEligibilityReg.result.eligible && (
                <button
                  type="button"
                  onClick={() => {
                    const reg = inspectingEligibilityReg.registrant;
                    setInspectingEligibilityReg(null);
                    handleIssueCertificateForRegistrant(reg);
                  }}
                  className="px-4 py-2 rounded-xl bg-[var(--primary-accent)] hover:brightness-110 text-xs font-semibold text-white cursor-pointer shadow flex items-center gap-1.5"
                >
                  <Award className="w-3.5 h-3.5" />
                  <span>Issue Certificate Now</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Official Digital Signature Studio Modal */}
      {signaturePadTarget && (
        <DigitalSignaturePadModal
          isOpen={true}
          signatoryRoleTitle={
            signaturePadTarget === 'admin'
              ? `${signatoryName} (${signatoryTitle})`
              : `${adminSignatoryName} (${adminSignatoryTitle})`
          }
          initialSignatureDataUrl={
            signaturePadTarget === 'admin'
              ? customSignature1 || undefined
              : customSignature2 || undefined
          }
          onClose={() => setSignaturePadTarget(null)}
          onSave={(sigDataUrl) => {
            if (signaturePadTarget === 'admin') {
              setCustomSignature1(sigDataUrl);
              try {
                localStorage.setItem('sems_custom_sig_1', sigDataUrl);
              } catch {}
            } else {
              setCustomSignature2(sigDataUrl);
              try {
                localStorage.setItem('sems_custom_sig_2', sigDataUrl);
              } catch {}
            }
            setSignaturePadTarget(null);
            onNotify('Official signature saved and applied to certificates!');
          }}
        />
      )}
    </div>
  );
};
