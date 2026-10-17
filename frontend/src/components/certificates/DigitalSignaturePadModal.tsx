/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from 'react';
import {
  PenTool,
  RotateCcw,
  Check,
  X,
  UploadCloud,
  FileCheck,
  Sparkles,
  Eraser,
  Type,
  FileText,
  BadgeCheck,
} from 'lucide-react';
import { useModalDismiss } from '../../hooks/useModalDismiss';

interface DigitalSignaturePadModalProps {
  isOpen: boolean;
  signatoryRoleTitle: string;
  initialSignatureDataUrl?: string;
  onClose: () => void;
  onSave: (signatureDataUrl: string) => void;
}

const PEN_COLORS = [
  { id: 'blue', label: 'Classic Blue', hex: '#1E3A8A' },
  { id: 'teal', label: 'Dark Teal', hex: '#0F766E' },
  { id: 'charcoal', label: 'Charcoal Black', hex: '#111827' },
  { id: 'purple', label: 'Royal Purple', hex: '#581C87' },
  { id: 'gold', label: 'Imperial Gold', hex: '#B45309' },
];

const PEN_WIDTHS = [
  { id: 'fine', label: 'Fine (2px)', width: 2 },
  { id: 'standard', label: 'Standard (3px)', width: 3 },
  { id: 'bold', label: 'Bold (4.5px)', width: 4.5 },
];

const SCRIPT_FONTS = [
  { id: 'dancing', name: 'Executive Script', font: 'italic bold 38px "Dancing Script", "Brush Script MT", cursive' },
  { id: 'calligraphy', name: 'Classic Calligraphy', font: 'italic 34px "Georgia", "Great Vibes", serif' },
  { id: 'freehand', name: 'Modern Freehand', font: 'italic 36px "Segoe Script", "Lucida Handwriting", cursive' },
];

export const DigitalSignaturePadModal: React.FC<DigitalSignaturePadModalProps> = ({
  isOpen,
  signatoryRoleTitle,
  initialSignatureDataUrl,
  onClose,
  onSave,
}) => {
  const { handleBackdropClick } = useModalDismiss({
    isOpen,
    onClose,
  });

  const [activeTab, setActiveTab] = useState<'draw' | 'type' | 'upload' | 'preset'>('draw');
  const [penColor, setPenColor] = useState('#1E3A8A');
  const [penWidth, setPenWidth] = useState(3);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [typedName, setTypedName] = useState(() => {
    // extract initial name from title if possible
    const clean = signatoryRoleTitle.split('(')[0].trim();
    return clean || 'Authorized Signatory';
  });
  const [selectedFont, setSelectedFont] = useState(SCRIPT_FONTS[0].id);
  const [uploadedPreview, setUploadedPreview] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const strokesHistoryRef = useRef<ImageData[]>([]);

  // Setup canvas for drawing
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);

      ctx.clearRect(0, 0, rect.width, rect.height);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = penColor;
      ctx.lineWidth = penWidth;

      if (initialSignatureDataUrl && activeTab === 'draw') {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0, rect.width, rect.height);
          setHasDrawn(true);
        };
        img.src = initialSignatureDataUrl;
      }
    }, 80);

    return () => clearTimeout(timer);
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if ('touches' in e && e.cancelable) {
      e.preventDefault();
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    try {
      const state = ctx.getImageData(0, 0, canvas.width, canvas.height);
      strokesHistoryRef.current.push(state);
    } catch {
      // safe fallback
    }

    isDrawingRef.current = true;
    const coords = getCanvasCoords(e);
    lastPointRef.current = coords;

    ctx.beginPath();
    ctx.arc(coords.x, coords.y, penWidth / 2, 0, Math.PI * 2);
    ctx.fillStyle = penColor;
    ctx.fill();

    setHasDrawn(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if ('touches' in e && e.cancelable) {
      e.preventDefault();
    }
    if (!isDrawingRef.current || !lastPointRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const coords = getCanvasCoords(e);

    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(coords.x, coords.y);
    ctx.strokeStyle = penColor;
    ctx.lineWidth = penWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    lastPointRef.current = coords;
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
    lastPointRef.current = null;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    strokesHistoryRef.current = [];
    setHasDrawn(false);
  };

  const undoStroke = () => {
    const canvas = canvasRef.current;
    if (!canvas || strokesHistoryRef.current.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const lastState = strokesHistoryRef.current.pop();
    if (lastState) {
      ctx.putImageData(lastState, 0, 0);
      if (strokesHistoryRef.current.length === 0) {
        setHasDrawn(false);
      }
    }
  };

  // Upload image handler with auto-contrast for paper backgrounds
  const handleImageUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const offscreen = document.createElement('canvas');
        offscreen.width = img.width;
        offscreen.height = img.height;
        const ctx = offscreen.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, img.width, img.height);
        const d = imgData.data;

        // Auto make light paper pixels transparent
        for (let i = 0; i < d.length; i += 4) {
          const r = d[i];
          const g = d[i + 1];
          const b = d[i + 2];
          if (r > 200 && g > 200 && b > 200) {
            d[i + 3] = 0; // Transparent
          }
        }
        ctx.putImageData(imgData, 0, 0);
        const processedUrl = offscreen.toDataURL('image/png');
        setUploadedPreview(processedUrl);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Generate typed signature canvas data URL
  const generateTypedSignatureDataUrl = (): string => {
    const offscreen = document.createElement('canvas');
    offscreen.width = 600;
    offscreen.height = 180;
    const ctx = offscreen.getContext('2d');
    if (!ctx) return '';

    const fontConfig = SCRIPT_FONTS.find((f) => f.id === selectedFont) || SCRIPT_FONTS[0];

    ctx.clearRect(0, 0, 600, 180);
    ctx.font = fontConfig.font;
    ctx.fillStyle = penColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(typedName, 300, 85);

    // Decorative cursive flourish underline
    ctx.strokeStyle = penColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(140, 130);
    ctx.bezierCurveTo(240, 150, 360, 110, 460, 135);
    ctx.stroke();

    return offscreen.toDataURL('image/png');
  };

  // Generate preset signature data URL
  const generatePresetSignatureDataUrl = (type: 'dean' | 'officer'): string => {
    const offscreen = document.createElement('canvas');
    offscreen.width = 600;
    offscreen.height = 180;
    const ctx = offscreen.getContext('2d');
    if (!ctx) return '';

    ctx.clearRect(0, 0, 600, 180);
    ctx.strokeStyle = type === 'dean' ? '#7C3AED' : '#1E3A8A';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (type === 'dean') {
      // Flowing dean cursive
      ctx.beginPath();
      ctx.moveTo(60, 50);
      ctx.bezierCurveTo(90, 120, 120, 30, 170, 70);
      ctx.bezierCurveTo(210, 110, 240, 40, 300, 85);
      ctx.bezierCurveTo(360, 120, 420, 50, 480, 80);
      ctx.bezierCurveTo(510, 95, 540, 60, 550, 75);
      ctx.stroke();

      // underline
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(120, 130);
      ctx.bezierCurveTo(250, 125, 400, 120, 520, 115);
      ctx.stroke();
    } else {
      // Alex Morgan style flowing executive signature
      ctx.beginPath();
      ctx.moveTo(50, 120);
      ctx.bezierCurveTo(80, 60, 130, 30, 160, 50);
      ctx.bezierCurveTo(180, 70, 160, 120, 140, 130);
      ctx.bezierCurveTo(120, 140, 110, 110, 150, 80);
      ctx.bezierCurveTo(200, 40, 260, 50, 300, 90);
      ctx.bezierCurveTo(340, 120, 400, 60, 450, 80);
      ctx.bezierCurveTo(490, 100, 530, 70, 550, 85);
      ctx.stroke();

      // underline
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(90, 140);
      ctx.lineTo(520, 130);
      ctx.stroke();
    }

    return offscreen.toDataURL('image/png');
  };

  const handleSave = () => {
    if (activeTab === 'upload') {
      if (uploadedPreview) {
        onSave(uploadedPreview);
        onClose();
      }
      return;
    }

    if (activeTab === 'type') {
      const typedUrl = generateTypedSignatureDataUrl();
      onSave(typedUrl);
      onClose();
      return;
    }

    if (activeTab === 'preset') {
      const isDean = signatoryRoleTitle.toLowerCase().includes('dean');
      const presetUrl = generatePresetSignatureDataUrl(isDean ? 'dean' : 'officer');
      onSave(presetUrl);
      onClose();
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Export transparent PNG
    const dataUrl = canvas.toDataURL('image/png');
    onSave(dataUrl);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
    >
      <div
        className="w-full max-w-xl p-6 rounded-3xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-[#111C2D] shadow-2xl space-y-4 relative"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950/50 text-[#0F766E] dark:text-[#2DD4BF] flex items-center justify-center border border-teal-200 dark:border-teal-800">
              <PenTool className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-poppins font-semibold text-base text-[#172B3A] dark:text-[#F1F5F9]">Digital Signature Studio</h3>
              <p className="text-[11px] text-[#64748B] dark:text-[#A8B5C7] font-inter">
                Configure official signature for: <span className="text-[#172B3A] dark:text-[#F1F5F9] font-medium">{signatoryRoleTitle}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#64748B] dark:text-[#A8B5C7] hover:text-[#172B3A] dark:hover:text-[#F1F5F9] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher: Draw vs Type vs Upload vs Preset */}
        <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('draw')}
            className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'draw'
                ? 'bg-white dark:bg-slate-800 text-[#172B3A] dark:text-[#F1F5F9] shadow-xs font-semibold'
                : 'text-[#64748B] dark:text-[#A8B5C7] hover:text-[#172B3A] dark:hover:text-[#F1F5F9]'
            }`}
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>Draw</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('type')}
            className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'type'
                ? 'bg-white dark:bg-slate-800 text-[#172B3A] dark:text-[#F1F5F9] shadow-xs font-semibold'
                : 'text-[#64748B] dark:text-[#A8B5C7] hover:text-[#172B3A] dark:hover:text-[#F1F5F9]'
            }`}
          >
            <Type className="w-3.5 h-3.5" />
            <span>Type Script</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'upload'
                ? 'bg-white dark:bg-slate-800 text-[#172B3A] dark:text-[#F1F5F9] shadow-xs font-semibold'
                : 'text-[#64748B] dark:text-[#A8B5C7] hover:text-[#172B3A] dark:hover:text-[#F1F5F9]'
            }`}
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Upload</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preset')}
            className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'preset'
                ? 'bg-white dark:bg-slate-800 text-[#172B3A] dark:text-[#F1F5F9] shadow-xs font-semibold'
                : 'text-[#64748B] dark:text-[#A8B5C7] hover:text-[#172B3A] dark:hover:text-[#F1F5F9]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Presets</span>
          </button>
        </div>

        {activeTab === 'draw' && (
          /* DRAWING CANVAS SECTION */
          <div className="space-y-3">
            {/* Toolbar: Color & Width */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              {/* Color picker */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-white/60 mr-1">Ink:</span>
                {PEN_COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setPenColor(c.hex)}
                    style={{ backgroundColor: c.hex }}
                    className={`w-5 h-5 rounded-full border transition-transform cursor-pointer ${
                      penColor === c.hex ? 'scale-125 border-white ring-2 ring-[var(--primary-accent)]' : 'border-white/40'
                    }`}
                    title={c.label}
                  />
                ))}
              </div>

              {/* Stroke width */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-white/60 mr-1">Width:</span>
                {PEN_WIDTHS.map((w) => (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => setPenWidth(w.width)}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono border cursor-pointer ${
                      penWidth === w.width
                        ? 'bg-[var(--accent-20)] border-[var(--primary-accent)] text-white'
                        : 'border-white/10 text-white/60 hover:text-white'
                    }`}
                  >
                    {w.label}
                  </button>
                ))}
              </div>

              {/* Undo & Clear */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={undoStroke}
                  disabled={!hasDrawn}
                  className="p-1.5 rounded-lg border border-white/10 hover:bg-white/10 text-white/80 hover:text-white disabled:opacity-30 cursor-pointer"
                  title="Undo last stroke"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={clearCanvas}
                  className="p-1.5 rounded-lg border border-white/10 hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 cursor-pointer"
                  title="Clear pad"
                >
                  <Eraser className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Canvas Box */}
            <div className="relative rounded-2xl border-2 border-dashed border-white/20 bg-white/[0.04] p-1 overflow-hidden select-none">
              <canvas
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full h-44 rounded-xl cursor-crosshair touch-none bg-white/[0.02]"
              />

              {!hasDrawn && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-white/40 space-y-1">
                  <PenTool className="w-6 h-6 stroke-[1.5]" />
                  <span className="text-xs font-inter">Sign with finger, stylus, or mouse above</span>
                </div>
              )}

              {/* Guideline line */}
              <div className="absolute bottom-6 left-8 right-8 border-b border-white/10 pointer-events-none" />
            </div>
          </div>
        )}

        {activeTab === 'type' && (
          /* TYPE SCRIPT SECTION */
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs text-white/70 block">Signatory Full Name:</label>
              <input
                type="text"
                value={typedName}
                onChange={(e) => setTypedName(e.target.value)}
                placeholder="Enter signatory name..."
                className="w-full h-9 px-3 rounded-xl bg-white/[0.06] border border-white/[0.12] text-sm text-white placeholder-white/30 focus:outline-none focus:border-[var(--primary-accent)]"
              />
            </div>

            {/* Font Style Selection */}
            <div className="grid grid-cols-3 gap-2">
              {SCRIPT_FONTS.map((font) => (
                <button
                  key={font.id}
                  type="button"
                  onClick={() => setSelectedFont(font.id)}
                  className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                    selectedFont === font.id
                      ? 'bg-[var(--accent-20)] border-[var(--primary-accent)] text-white shadow'
                      : 'border-white/10 text-white/60 hover:text-white bg-white/[0.02]'
                  }`}
                >
                  <span className="block text-[11px] font-medium">{font.name}</span>
                </button>
              ))}
            </div>

            {/* Live Calligraphy Preview Box */}
            <div className="p-4 rounded-2xl border border-white/15 bg-white/[0.05] text-center min-h-[110px] flex flex-col items-center justify-center relative overflow-hidden">
              <div
                style={{
                  color: penColor,
                  fontFamily:
                    selectedFont === 'dancing'
                      ? '"Dancing Script", "Brush Script MT", cursive'
                      : selectedFont === 'calligraphy'
                      ? '"Great Vibes", "Georgia", serif'
                      : '"Segoe Script", "Lucida Handwriting", cursive',
                }}
                className="text-3xl italic tracking-wide select-none"
              >
                {typedName || 'Signatory Name'}
              </div>
              <div
                style={{ backgroundColor: penColor }}
                className="w-48 h-0.5 rounded-full mt-2 opacity-60"
              />
              <span className="text-[10px] text-white/40 mt-2 block">
                Official calligraphic signature rendered with transparent vector backing
              </span>
            </div>
          </div>
        )}

        {activeTab === 'upload' && (
          /* UPLOAD IMAGE SECTION */
          <div className="space-y-3">
            <div
              onClick={() => {
                const input = document.getElementById('sig-file-input');
                if (input) input.click();
              }}
              className="p-6 rounded-2xl border-2 border-dashed border-white/20 bg-white/[0.03] hover:border-white/35 text-center cursor-pointer transition-colors"
            >
              <input
                id="sig-file-input"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => {
                  if (e.target.files?.[0]) handleImageUpload(e.target.files[0]);
                }}
                className="hidden"
              />

              {uploadedPreview ? (
                <div className="space-y-3">
                  <div className="p-3 bg-white/[0.06] rounded-xl inline-block border border-white/10">
                    <img src={uploadedPreview} alt="Uploaded Signature" className="max-h-20 w-auto object-contain mx-auto" />
                  </div>
                  <p className="text-xs text-emerald-400 font-medium">Signature loaded with transparent background</p>
                  <p className="text-[11px] text-white/50">Click to replace file</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <UploadCloud className="w-8 h-8 text-[var(--primary-accent)] mx-auto" />
                  <p className="text-xs text-white font-medium">Click to upload signature photo or PNG</p>
                  <p className="text-[11px] text-white/60">
                    White paper background is automatically filtered to transparent
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'preset' && (
          /* PRESET OFFICIAL SIGNATURES */
          <div className="space-y-3">
            <p className="text-xs text-white/70">
              Select an authentic pre-rendered vector signature for official society administration:
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  const url = generatePresetSignatureDataUrl('officer');
                  onSave(url);
                  onClose();
                }}
                className="p-3.5 rounded-2xl border border-white/15 bg-white/[0.04] hover:bg-white/[0.08] hover:border-[var(--primary-accent)] text-left transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <span className="text-xs font-semibold text-white">Alex Morgan</span>
                  <BadgeCheck className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="h-12 flex items-center justify-center my-1 text-cyan-400 font-serif italic text-lg group-hover:scale-105 transition-transform">
                  Alex Morgan
                </div>
                <span className="text-[10px] text-white/50 block">Lead Administrator</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const url = generatePresetSignatureDataUrl('dean');
                  onSave(url);
                  onClose();
                }}
                className="p-3.5 rounded-2xl border border-white/15 bg-white/[0.04] hover:bg-white/[0.08] hover:border-[var(--primary-accent)] text-left transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <span className="text-xs font-semibold text-white">Prof. Dean Taylor</span>
                  <BadgeCheck className="w-4 h-4 text-purple-400" />
                </div>
                <div className="h-12 flex items-center justify-center my-1 text-purple-400 font-serif italic text-lg group-hover:scale-105 transition-transform">
                  Prof. Dean Taylor
                </div>
                <span className="text-[10px] text-white/50 block">Faculty Advisor & Dean</span>
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
          <span className="text-[11px] text-[#64748B] dark:text-[#A8B5C7]">
            {activeTab === 'draw'
              ? 'Transparent vector signature'
              : activeTab === 'type'
              ? 'Calligraphic vector script'
              : activeTab === 'preset'
              ? 'Verified institutional signature'
              : 'High-contrast transparent PNG'}
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs text-[#172B3A] dark:text-[#F1F5F9] cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-[#0F766E] hover:bg-[#115E59] text-xs font-semibold text-white shadow-xs cursor-pointer flex items-center gap-1.5 transition-all"
            >
              <Check className="w-4 h-4" />
              <span>Apply Signature</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
