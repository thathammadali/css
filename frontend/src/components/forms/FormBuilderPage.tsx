/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  FileCode2,
  Plus,
  Trash2,
  Save,
  Eye,
  CheckCircle2,
  ArrowLeft,
  MoveDown,
  MoveUp,
  History,
  Copy,
  X,
  Pencil,
  Smartphone,
  Monitor,
  ShieldCheck,
  AlertCircle,
  SlidersHorizontal,
  Wifi,
  Battery,
} from 'lucide-react';
import { FormField, FormFieldType, RegistrationFormConfig, DashboardRole, FormFieldValidation } from '../../types';
import { formService } from '../../services/formService';

interface FormBuilderPageProps {
  currentRole?: DashboardRole;
  initialForm: RegistrationFormConfig;
  onSaveForm: (updatedForm: RegistrationFormConfig) => void;
  onBack?: () => void;
  onNotify: (msg: string) => void;
}

export const FIELD_TYPES: { type: FormFieldType; label: string; icon: string }[] = [
  { type: 'text', label: 'Short Text', icon: 'Aa' },
  { type: 'textarea', label: 'Long Paragraph / Statement', icon: '¶' },
  { type: 'email', label: 'Email Address', icon: '@' },
  { type: 'number', label: 'Numeric Value', icon: '#' },
  { type: 'phone', label: 'Phone Number', icon: '📞' },
  { type: 'dropdown', label: 'Dropdown Select', icon: '▾' },
  { type: 'radio', label: 'Single Choice Radio', icon: '◉' },
  { type: 'checkbox', label: 'Multi-Select Checkbox', icon: '☑' },
  { type: 'date', label: 'Date Picker', icon: '📅' },
  { type: 'file', label: 'File Upload (PDF/Image <= 5MB)', icon: '📎' },
];

export const VALIDATION_PRESETS = [
  {
    id: 'none',
    label: 'None (Standard)',
    pattern: '',
    error: '',
    hint: 'No special pattern restriction',
  },
  {
    id: 'phone_pk',
    label: 'Pakistan Mobile Phone (03xx-xxxxxxx)',
    pattern: '^(\\+92|0)?3[0-9]{9}$',
    error: 'Must be a valid 11-digit Pakistani mobile number (e.g. 03001234567 or +923001234567)',
    hint: 'Validates 11-digit Pakistani mobile numbers',
  },
  {
    id: 'roll_number',
    label: 'Student University Roll No (202x-DEPT-xxxx)',
    pattern: '^[0-9]{4}-[A-Za-z]{2,5}-[0-9]{1,5}$',
    error: 'Must match standard Roll Number format (e.g. 2024-CS-042)',
    hint: 'Validates university student roll numbers',
  },
  {
    id: 'cnic',
    label: 'CNIC / National ID (xxxxx-xxxxxxx-x)',
    pattern: '^[0-9]{5}-[0-9]{7}-[0-9]$',
    error: 'Must be a valid 13-digit CNIC format (e.g. 42101-1234567-1)',
    hint: 'Validates 13-digit Pakistani CNIC format',
  },
  {
    id: 'digits_only',
    label: 'Numbers Only (Positive Integer)',
    pattern: '^[0-9]+$',
    error: 'Only numeric digits (0-9) are allowed',
    hint: 'Only accepts numeric digits',
  },
  {
    id: 'alpha_only',
    label: 'Alphabets Only (No Numbers)',
    pattern: '^[a-zA-Z\\s]+$',
    error: 'Only letters and spaces are allowed',
    hint: 'Only accepts alphabet characters and spaces',
  },
  {
    id: 'custom',
    label: 'Custom Regular Expression (RegEx)',
    pattern: '',
    error: 'Value does not match required pattern',
    hint: 'Specify your own custom regex pattern',
  },
];

export const FormBuilderPage: React.FC<FormBuilderPageProps> = ({
  currentRole = 'admin',
  initialForm,
  onSaveForm,
  onBack,
  onNotify,
}) => {
  const [formConfig, setFormConfig] = useState<RegistrationFormConfig>(() => {
    const active = formService.getActiveForm();
    return active || { ...initialForm, version: initialForm.version || 1 };
  });

  const [historicalVersions, setHistoricalVersions] = useState<RegistrationFormConfig[]>(() =>
    formService.getHistoricalVersions()
  );

  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [testFormValues, setTestFormValues] = useState<Record<string, string>>({});
  const [testErrors, setTestErrors] = useState<Record<string, string>>({});
  const [showVersionHistoryModal, setShowVersionHistoryModal] = useState(false);
  const [inspectingSnapshot, setInspectingSnapshot] = useState<RegistrationFormConfig | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  // Add field draft state
  const [showAddField, setShowAddField] = useState(false);
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldType, setNewFieldType] = useState<FormFieldType>('text');
  const [newFieldRequired, setNewFieldRequired] = useState(false);
  const [newFieldPlaceholder, setNewFieldPlaceholder] = useState('');
  const [newFieldHelpText, setNewFieldHelpText] = useState('');
  const [newFieldOptions, setNewFieldOptions] = useState('');
  const [newPresetId, setNewPresetId] = useState('none');
  const [newCustomPattern, setNewCustomPattern] = useState('');
  const [newPatternError, setNewPatternError] = useState('');
  const [newMinLength, setNewMinLength] = useState<string>('');
  const [newMaxLength, setNewMaxLength] = useState<string>('');
  const [newMinVal, setNewMinVal] = useState<string>('');
  const [newMaxVal, setNewMaxVal] = useState<string>('');
  const [fieldError, setFieldError] = useState('');

  // Edit field state
  const [editingField, setEditingField] = useState<FormField | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editType, setEditType] = useState<FormFieldType>('text');
  const [editRequired, setEditRequired] = useState(false);
  const [editPlaceholder, setEditPlaceholder] = useState('');
  const [editHelpText, setEditHelpText] = useState('');
  const [editOptions, setEditOptions] = useState('');
  const [editPresetId, setEditPresetId] = useState('none');
  const [editCustomPattern, setEditCustomPattern] = useState('');
  const [editPatternError, setEditPatternError] = useState('');
  const [editMinLength, setEditMinLength] = useState<string>('');
  const [editMaxLength, setEditMaxLength] = useState<string>('');
  const [editMinVal, setEditMinVal] = useState<string>('');
  const [editMaxVal, setEditMaxVal] = useState<string>('');
  const [editError, setEditError] = useState('');

  // Sync historical versions
  const refreshHistory = () => {
    setHistoricalVersions(formService.getHistoricalVersions());
  };

  useEffect(() => {
    const handleUpdate = () => refreshHistory();
    window.addEventListener('sems_forms_updated', handleUpdate);
    return () => window.removeEventListener('sems_forms_updated', handleUpdate);
  }, []);

  // Escape key handler for all FormBuilderPage modals
  useEffect(() => {
    if (!showAddField && !editingField && !showVersionHistoryModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        setShowAddField(false);
        setEditingField(null);
        setShowVersionHistoryModal(false);
        setInspectingSnapshot(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAddField, editingField, showVersionHistoryModal]);

  const handlePresetChange = (presetId: string, isEdit: boolean = false) => {
    const preset = VALIDATION_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    if (isEdit) {
      setEditPresetId(presetId);
      if (presetId !== 'custom' && presetId !== 'none') {
        setEditCustomPattern(preset.pattern);
        setEditPatternError(preset.error);
      } else if (presetId === 'none') {
        setEditCustomPattern('');
        setEditPatternError('');
      }
    } else {
      setNewPresetId(presetId);
      if (presetId !== 'custom' && presetId !== 'none') {
        setNewCustomPattern(preset.pattern);
        setNewPatternError(preset.error);
      } else if (presetId === 'none') {
        setNewCustomPattern('');
        setNewPatternError('');
      }
    }
  };

  const handleAddField = () => {
    if (!newFieldLabel.trim()) {
      setFieldError('Field title / question label is required.');
      return;
    }
    setFieldError('');

    const optionsArray =
      ['dropdown', 'radio', 'checkbox'].includes(newFieldType) && newFieldOptions.trim()
        ? newFieldOptions.split(',').map((o) => o.trim()).filter(Boolean)
        : undefined;

    let validationObj: FormFieldValidation | undefined = undefined;
    const effectivePattern = newPresetId === 'custom' ? newCustomPattern.trim() : newCustomPattern;

    if (
      effectivePattern ||
      newMinLength ||
      newMaxLength ||
      newMinVal ||
      newMaxVal
    ) {
      validationObj = {
        pattern: effectivePattern || undefined,
        patternErrorMessage: newPatternError.trim() || undefined,
        minLength: newMinLength ? parseInt(newMinLength, 10) : undefined,
        maxLength: newMaxLength ? parseInt(newMaxLength, 10) : undefined,
        minVal: newMinVal ? parseFloat(newMinVal) : undefined,
        maxVal: newMaxVal ? parseFloat(newMaxVal) : undefined,
      };
    }

    const newField: FormField = {
      id: `field-${Date.now()}`,
      label: newFieldLabel.trim(),
      type: newFieldType,
      required: newFieldRequired,
      placeholder: newFieldPlaceholder.trim() || undefined,
      helpText: newFieldHelpText.trim() || undefined,
      options: optionsArray,
      validation: validationObj,
    };

    setFormConfig((prev) => ({
      ...prev,
      fields: [...prev.fields, newField],
      updatedAt: new Date().toISOString().split('T')[0],
    }));

    // Reset draft
    setNewFieldLabel('');
    setNewFieldPlaceholder('');
    setNewFieldHelpText('');
    setNewFieldOptions('');
    setNewFieldRequired(false);
    setNewFieldType('text');
    setNewPresetId('none');
    setNewCustomPattern('');
    setNewPatternError('');
    setNewMinLength('');
    setNewMaxLength('');
    setNewMinVal('');
    setNewMaxVal('');
    setShowAddField(false);
    setIsSaved(false);
    onNotify(`Added question: "${newField.label}"`);
  };

  const handleStartEditField = (field: FormField) => {
    setEditingField(field);
    setEditLabel(field.label);
    setEditType(field.type);
    setEditRequired(field.required);
    setEditPlaceholder(field.placeholder || '');
    setEditHelpText(field.helpText || '');
    setEditOptions(field.options ? field.options.join(', ') : '');

    // Match preset
    const currentPattern = field.validation?.pattern || '';
    const matchedPreset = VALIDATION_PRESETS.find((p) => p.pattern === currentPattern && p.id !== 'custom');
    if (matchedPreset) {
      setEditPresetId(matchedPreset.id);
    } else if (currentPattern) {
      setEditPresetId('custom');
    } else {
      setEditPresetId('none');
    }

    setEditCustomPattern(currentPattern);
    setEditPatternError(field.validation?.patternErrorMessage || '');
    setEditMinLength(field.validation?.minLength !== undefined ? String(field.validation.minLength) : '');
    setEditMaxLength(field.validation?.maxLength !== undefined ? String(field.validation.maxLength) : '');
    setEditMinVal(field.validation?.minVal !== undefined ? String(field.validation.minVal) : '');
    setEditMaxVal(field.validation?.maxVal !== undefined ? String(field.validation.maxVal) : '');
    setEditError('');
  };

  const handleSaveEditedField = () => {
    if (!editingField) return;
    if (!editLabel.trim()) {
      setEditError('Field label is required.');
      return;
    }

    const optionsArray =
      ['dropdown', 'radio', 'checkbox'].includes(editType) && editOptions.trim()
        ? editOptions.split(',').map((o) => o.trim()).filter(Boolean)
        : undefined;

    let validationObj: FormFieldValidation | undefined = undefined;
    const effectivePattern = editPresetId === 'custom' ? editCustomPattern.trim() : editCustomPattern;

    if (
      effectivePattern ||
      editMinLength ||
      editMaxLength ||
      editMinVal ||
      editMaxVal
    ) {
      validationObj = {
        pattern: effectivePattern || undefined,
        patternErrorMessage: editPatternError.trim() || undefined,
        minLength: editMinLength ? parseInt(editMinLength, 10) : undefined,
        maxLength: editMaxLength ? parseInt(editMaxLength, 10) : undefined,
        minVal: editMinVal ? parseFloat(editMinVal) : undefined,
        maxVal: editMaxVal ? parseFloat(editMaxVal) : undefined,
      };
    }

    setFormConfig((prev) => ({
      ...prev,
      fields: prev.fields.map((f) =>
        f.id === editingField.id
          ? {
              ...f,
              label: editLabel.trim(),
              type: editType,
              required: editRequired,
              placeholder: editPlaceholder.trim() || undefined,
              helpText: editHelpText.trim() || undefined,
              options: optionsArray,
              validation: validationObj,
            }
          : f
      ),
      updatedAt: new Date().toISOString().split('T')[0],
    }));

    setEditingField(null);
    setIsSaved(false);
    onNotify(`Updated field: "${editLabel.trim()}"`);
  };

  const handleDuplicateField = (field: FormField, index: number) => {
    const cloned: FormField = {
      ...field,
      id: `field-${Date.now()}`,
      label: `${field.label} (Copy)`,
      options: field.options ? [...field.options] : undefined,
      validation: field.validation ? { ...field.validation } : undefined,
    };

    const newFields = [...formConfig.fields];
    newFields.splice(index + 1, 0, cloned);

    setFormConfig((prev) => ({
      ...prev,
      fields: newFields,
      updatedAt: new Date().toISOString().split('T')[0],
    }));
    setIsSaved(false);
    onNotify(`Duplicated field as "${cloned.label}"`);
  };

  const handleRemoveField = (fieldId: string, label: string) => {
    setFormConfig((prev) => ({
      ...prev,
      fields: prev.fields.filter((f) => f.id !== fieldId),
      updatedAt: new Date().toISOString().split('T')[0],
    }));
    setIsSaved(false);
    onNotify(`Removed field: "${label}"`);
  };

  const handleToggleRequired = (fieldId: string) => {
    setFormConfig((prev) => ({
      ...prev,
      fields: prev.fields.map((f) =>
        f.id === fieldId ? { ...f, required: !f.required } : f
      ),
    }));
    setIsSaved(false);
  };

  const handleMoveField = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= formConfig.fields.length) return;

    const newFields = [...formConfig.fields];
    const [moved] = newFields.splice(index, 1);
    newFields.splice(targetIndex, 0, moved);

    setFormConfig((prev) => ({ ...prev, fields: newFields }));
    setIsSaved(false);
  };

  const handlePublishNewVersion = () => {
    const sanitizedFields = formConfig.fields.map((field) => ({
      ...field,
      label: field.label.trim(),
      placeholder: field.placeholder?.trim() || undefined,
      helpText: field.helpText?.trim() || undefined,
      options: field.options
        ? field.options.map((opt) => opt.trim()).filter(Boolean)
        : undefined,
    }));

    const newVersionConfig = formService.publishNewVersion(
      {
        id: formConfig.id,
        formName: formConfig.formName.trim(),
        description: formConfig.description?.trim(),
        fields: sanitizedFields,
        updatedAt: new Date().toISOString().split('T')[0],
      },
      currentRole ? currentRole.toUpperCase() : 'ADMIN'
    );

    setFormConfig(newVersionConfig);
    refreshHistory();
    onSaveForm(newVersionConfig);
    setIsSaved(true);

    onNotify(
      `Published Version V${newVersionConfig.version}! All prior versions remain preserved. Historical registrations stay linked to their submission version.`
    );
    setTimeout(() => setIsSaved(false), 3500);
  };

  const handleLoadVersionAsDraft = (snapshot: RegistrationFormConfig) => {
    setFormConfig({
      ...snapshot,
      updatedAt: new Date().toISOString().split('T')[0],
    });
    setInspectingSnapshot(null);
    setShowVersionHistoryModal(false);
    setIsSaved(false);
    onNotify(`Loaded schema from V${snapshot.version} into editor draft.`);
  };

  // Live validation test in preview
  const handleTestFieldChange = (field: FormField, val: string) => {
    setTestFormValues((prev) => ({ ...prev, [field.id]: val }));

    if (!val.trim()) {
      if (field.required) {
        setTestErrors((prev) => ({ ...prev, [field.id]: `${field.label} is required.` }));
      } else {
        setTestErrors((prev) => {
          const c = { ...prev };
          delete c[field.id];
          return c;
        });
      }
      return;
    }

    if (field.validation) {
      const v = field.validation;
      if (v.minLength && val.length < v.minLength) {
        setTestErrors((prev) => ({ ...prev, [field.id]: `Must be at least ${v.minLength} characters.` }));
        return;
      }
      if (v.maxLength && val.length > v.maxLength) {
        setTestErrors((prev) => ({ ...prev, [field.id]: `Cannot exceed ${v.maxLength} characters.` }));
        return;
      }
      if (field.type === 'number') {
        const num = parseFloat(val);
        if (v.minVal !== undefined && num < v.minVal) {
          setTestErrors((prev) => ({ ...prev, [field.id]: `Must be at least ${v.minVal}.` }));
          return;
        }
        if (v.maxVal !== undefined && num > v.maxVal) {
          setTestErrors((prev) => ({ ...prev, [field.id]: `Cannot exceed ${v.maxVal}.` }));
          return;
        }
      }
      if (v.pattern) {
        try {
          const reg = new RegExp(v.pattern);
          if (!reg.test(val)) {
            setTestErrors((prev) => ({
              ...prev,
              [field.id]: v.patternErrorMessage || `${field.label} format is invalid.`,
            }));
            return;
          }
        } catch {
          // ignore
        }
      }
    }

    setTestErrors((prev) => {
      const c = { ...prev };
      delete c[field.id];
      return c;
    });
  };

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.10]">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="p-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-white transition-colors cursor-pointer"
              title="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <FileCode2 className="w-6 h-6 text-[var(--primary-accent)]" />
              <h1 className="font-poppins font-semibold text-2xl text-white tracking-tight">
                Registration Form Schema Builder
              </h1>
              <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-cyan-950/70 border border-cyan-500/40 text-cyan-300">
                Active Schema V{formConfig.version || 1}
              </span>
            </div>
            <p className="text-xs font-inter text-[var(--text-sec-80)] mt-1">
              Design dynamic intake forms with re-ordering, input validation rules, and phone/desktop preview.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Version History Button */}
          <button
            type="button"
            onClick={() => setShowVersionHistoryModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-inter font-medium text-xs bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.12] text-white transition-all cursor-pointer"
          >
            <History className="w-4 h-4 text-cyan-300" />
            <span>Version History ({historicalVersions.length})</span>
          </button>

          {/* Attendee Preview Toggle */}
          <button
            type="button"
            onClick={() => setIsPreviewMode(!isPreviewMode)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-inter font-medium text-xs transition-all cursor-pointer ${
              isPreviewMode
                ? 'bg-white/20 text-white border border-white/30'
                : 'glass-panel text-[var(--text-secondary)] hover:text-white'
            }`}
          >
            <Eye className="w-4 h-4" />
            <span>{isPreviewMode ? 'Exit Preview' : 'Attendee Preview'}</span>
          </button>

          {/* Publish New Version */}
          <button
            type="button"
            onClick={handlePublishNewVersion}
            className="flex items-center gap-2 px-4 py-2 rounded-xl font-inter font-medium text-xs bg-[var(--primary-accent)] hover:brightness-110 text-white shadow-lg transition-all cursor-pointer"
          >
            {isSaved ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                <span>Published V{formConfig.version}!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Publish as V{(formConfig.version || 1) + 1}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Content Area: Editor or Preview */}
      {isPreviewMode ? (
        /* Attendee Preview Mode with Device Switcher */
        <div className="space-y-6 max-w-5xl mx-auto">
          {/* Device Toggle Header */}
          <div className="glass-panel p-3 rounded-2xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--primary-accent)]">
                Live Interactive Preview
              </span>
              <span className="text-[11px] font-mono text-[var(--text-sec-60)]">
                Test field typing and live regex validation rules
              </span>
            </div>

            <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-white/[0.10]">
              <button
                type="button"
                onClick={() => setPreviewDevice('desktop')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  previewDevice === 'desktop'
                    ? 'bg-white/20 text-white shadow'
                    : 'text-[var(--text-secondary)] hover:text-white'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>Desktop (100%)</span>
              </button>

              <button
                type="button"
                onClick={() => setPreviewDevice('mobile')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  previewDevice === 'mobile'
                    ? 'bg-white/20 text-white shadow'
                    : 'text-[var(--text-secondary)] hover:text-white'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Mobile (375px)</span>
              </button>
            </div>
          </div>

          {/* Preview Container: Desktop or Smartphone Mockup */}
          {previewDevice === 'mobile' ? (
            /* Smartphone Mockup Frame */
            <div className="flex justify-center py-4">
              <div className="w-[375px] rounded-[48px] border-[10px] border-neutral-800 shadow-[0_25px_70px_rgba(0,0,0,0.8)] bg-[#09171F] overflow-hidden flex flex-col relative ring-1 ring-white/10">
                {/* Smartphone Dynamic Island / Speaker Notch */}
                <div className="bg-neutral-900 pt-3 pb-2 px-6 flex items-center justify-between text-[11px] text-white/80 shrink-0">
                  <span className="font-semibold">9:41</span>
                  <div className="w-20 h-4 bg-black rounded-full mx-auto" />
                  <div className="flex items-center gap-1.5">
                    <Wifi className="w-3.5 h-3.5" />
                    <Battery className="w-4 h-4" />
                  </div>
                </div>

                {/* Smartphone Screen Body */}
                <div className="p-5 overflow-y-auto max-h-[640px] space-y-5 text-xs font-inter">
                  <div className="border-b border-white/[0.12] pb-3">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--primary-accent)] bg-[var(--accent-15)] px-2 py-0.5 rounded-full border border-[var(--accent-30)] inline-block mb-1.5">
                      V{formConfig.version || 1} Form
                    </span>
                    <h3 className="font-poppins font-semibold text-base text-white">{formConfig.formName}</h3>
                    {formConfig.description && (
                      <p className="text-[11px] text-white/70 mt-1">{formConfig.description}</p>
                    )}
                  </div>

                  <div className="space-y-4">
                    {formConfig.fields.map((field) => {
                      const hasErr = !!testErrors[field.id];
                      return (
                        <div key={field.id} className="space-y-1">
                          <label className="block text-[11px] font-medium text-white">
                            {field.label} {field.required && <span className="text-rose-400">*</span>}
                          </label>

                          {field.type === 'textarea' ? (
                            <textarea
                              rows={3}
                              value={testFormValues[field.id] || ''}
                              onChange={(e) => handleTestFieldChange(field, e.target.value)}
                              placeholder={field.placeholder}
                              className={`w-full p-2.5 rounded-xl bg-white/[0.06] border text-xs text-white focus:outline-none resize-none ${
                                hasErr ? 'border-rose-400' : 'border-white/[0.15] focus:border-[var(--primary-accent)]'
                              }`}
                            />
                          ) : field.type === 'dropdown' ? (
                            <select
                              value={testFormValues[field.id] || ''}
                              onChange={(e) => handleTestFieldChange(field, e.target.value)}
                              className="w-full h-9 px-2.5 rounded-xl bg-white/[0.06] border border-white/[0.15] text-xs text-white focus:outline-none"
                            >
                              <option value="">Select option...</option>
                              {field.options?.map((opt) => (
                                <option key={opt} value={opt} className="bg-neutral-900 text-white">
                                  {opt}
                                </option>
                              ))}
                            </select>
                          ) : field.type === 'radio' ? (
                            <div className="space-y-1 pt-0.5">
                              {field.options?.map((opt) => (
                                <label key={opt} className="flex items-center gap-2 text-xs text-white/80 cursor-pointer">
                                  <input
                                    type="radio"
                                    name={field.id}
                                    checked={testFormValues[field.id] === opt}
                                    onChange={() => handleTestFieldChange(field, opt)}
                                    className="text-[var(--primary-accent)]"
                                  />
                                  <span>{opt}</span>
                                </label>
                              ))}
                            </div>
                          ) : (
                            <input
                              type={field.type === 'number' ? 'number' : field.type === 'email' ? 'email' : 'text'}
                              value={testFormValues[field.id] || ''}
                              onChange={(e) => handleTestFieldChange(field, e.target.value)}
                              placeholder={field.placeholder}
                              className={`w-full h-9 px-2.5 rounded-xl bg-white/[0.06] border text-xs text-white focus:outline-none ${
                                hasErr ? 'border-rose-400' : 'border-white/[0.15] focus:border-[var(--primary-accent)]'
                              }`}
                            />
                          )}

                          {hasErr && <p className="text-[10px] text-rose-300">{testErrors[field.id]}</p>}
                          {field.helpText && !hasErr && (
                            <p className="text-[10px] text-[var(--text-sec-60)]">{field.helpText}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      className="w-full py-2.5 rounded-xl bg-[var(--primary-accent)] text-white text-xs font-medium shadow"
                    >
                      Submit Registration (Preview)
                    </button>
                  </div>
                </div>

                {/* Smartphone Bottom Home Bar */}
                <div className="bg-neutral-900 py-2 flex justify-center shrink-0">
                  <div className="w-32 h-1 bg-white/40 rounded-full" />
                </div>
              </div>
            </div>
          ) : (
            /* Desktop Preview Card */
            <div className="glass-panel p-6 sm:p-8 rounded-2xl space-y-6">
              <div className="border-b border-white/[0.12] pb-4">
                <span className="inline-block text-xs font-semibold uppercase tracking-wider text-[var(--primary-accent)] bg-[var(--accent-15)] px-2.5 py-1 rounded-full border border-[var(--accent-30)] mb-2">
                  Attendee Desktop Preview (Schema V{formConfig.version || 1})
                </span>
                <h2 className="font-poppins font-semibold text-xl text-white">{formConfig.formName}</h2>
                {formConfig.description && (
                  <p className="text-xs font-inter text-[var(--text-sec-80)] mt-1">{formConfig.description}</p>
                )}
              </div>

              <div className="space-y-4">
                {formConfig.fields.map((field) => {
                  const hasErr = !!testErrors[field.id];
                  return (
                    <div key={field.id} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-inter font-medium text-white">
                          {field.label} {field.required && <span className="text-rose-400">*</span>}
                        </label>
                        {field.validation?.pattern && (
                          <span className="text-[10px] font-mono text-cyan-300/80 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/20">
                            Pattern Validated
                          </span>
                        )}
                      </div>

                      {field.type === 'textarea' ? (
                        <textarea
                          rows={3}
                          value={testFormValues[field.id] || ''}
                          onChange={(e) => handleTestFieldChange(field, e.target.value)}
                          placeholder={field.placeholder}
                          className={`w-full p-3 rounded-xl bg-white/[0.05] border text-xs text-white focus:outline-none resize-none ${
                            hasErr ? 'border-rose-400' : 'border-white/[0.12] focus:border-[var(--primary-accent)]'
                          }`}
                        />
                      ) : field.type === 'dropdown' ? (
                        <select
                          value={testFormValues[field.id] || ''}
                          onChange={(e) => handleTestFieldChange(field, e.target.value)}
                          className="w-full h-10 px-3 rounded-xl bg-white/[0.05] border border-white/[0.12] text-xs text-white focus:outline-none"
                        >
                          <option value="">Select option...</option>
                          {field.options?.map((opt) => (
                            <option key={opt} value={opt} className="bg-neutral-900 text-white">
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : field.type === 'radio' ? (
                        <div className="space-y-1.5 pt-0.5">
                          {field.options?.map((opt) => (
                            <label key={opt} className="flex items-center gap-2 text-xs text-white/80 cursor-pointer">
                              <input
                                type="radio"
                                name={field.id}
                                checked={testFormValues[field.id] === opt}
                                onChange={() => handleTestFieldChange(field, opt)}
                                className="text-[var(--primary-accent)]"
                              />
                              <span>{opt}</span>
                            </label>
                          ))}
                        </div>
                      ) : field.type === 'checkbox' ? (
                        <div className="space-y-1.5 pt-0.5">
                          {field.options?.map((opt) => (
                            <label key={opt} className="flex items-center gap-2 text-xs text-white/80 cursor-pointer">
                              <input type="checkbox" />
                              <span>{opt}</span>
                            </label>
                          ))}
                        </div>
                      ) : (
                        <input
                          type={field.type === 'number' ? 'number' : field.type === 'email' ? 'email' : 'text'}
                          value={testFormValues[field.id] || ''}
                          onChange={(e) => handleTestFieldChange(field, e.target.value)}
                          placeholder={field.placeholder}
                          className={`w-full h-10 px-3 rounded-xl bg-white/[0.05] border text-xs text-white focus:outline-none ${
                            hasErr ? 'border-rose-400' : 'border-white/[0.12] focus:border-[var(--primary-accent)]'
                          }`}
                        />
                      )}

                      {hasErr && <p className="text-[11px] text-rose-300 font-inter">{testErrors[field.id]}</p>}
                      {field.helpText && !hasErr && (
                        <p className="text-[11px] text-[var(--text-sec-60)] font-inter">{field.helpText}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Form Editor Mode */
        <div className="space-y-6 max-w-5xl xl:max-w-6xl mx-auto">
          {/* Form Meta Header Config */}
          <div className="glass-panel p-5 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-semibold tracking-wider text-[var(--primary-accent)]">
                General Form Information
              </span>
              <span className="text-xs font-mono text-[var(--text-sec-70)]">
                {formConfig.fields.length} Active Fields • Schema V{formConfig.version || 1}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-white mb-1">Form Title</label>
                <input
                  type="text"
                  value={formConfig.formName}
                  onChange={(e) => setFormConfig({ ...formConfig, formName: e.target.value })}
                  placeholder="e.g. Standard Session Registration"
                  className="w-full h-10 px-3 rounded-xl bg-white/[0.06] border border-white/[0.12] text-xs text-white focus:outline-none focus:ring-1 focus:ring-[var(--primary-accent)]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-white mb-1">Instructions / Description</label>
                <input
                  type="text"
                  value={formConfig.description || ''}
                  onChange={(e) => setFormConfig({ ...formConfig, description: e.target.value })}
                  placeholder="e.g. Official intake questionnaire and screening form"
                  className="w-full h-10 px-3 rounded-xl bg-white/[0.06] border border-white/[0.12] text-xs text-white focus:outline-none focus:ring-1 focus:ring-[var(--primary-accent)]"
                />
              </div>
            </div>
          </div>

          {/* Fields List Container */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <div>
                <h3 className="font-poppins font-medium text-base text-white">Dynamic Form Questions & Fields</h3>
                <p className="text-[11px] text-[var(--text-sec-70)]">
                  Use Up/Down arrows to re-order fields, edit rules with pencil, or duplicate.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowAddField(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--accent-15)] hover:bg-[var(--accent-25)] border border-[var(--accent-30)] text-[var(--primary-accent)] text-xs font-medium transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Question / Field</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {formConfig.fields.map((field, index) => {
                const typeObj = FIELD_TYPES.find((t) => t.type === field.type);
                const hasValidation = !!field.validation?.pattern || !!field.validation?.minLength;

                return (
                  <div
                    key={field.id}
                    className="glass-panel p-4 rounded-xl flex items-center justify-between gap-3 group hover:border-white/20 transition-all"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {/* Step Number + Type Icon */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[11px] font-mono font-semibold text-white/50 w-5 text-right">
                          #{index + 1}
                        </span>
                        <div className="w-8 h-8 rounded-lg bg-white/[0.06] border border-white/[0.10] flex items-center justify-center text-xs font-mono font-bold text-[var(--primary-accent)] shrink-0">
                          {typeObj?.icon || '•'}
                        </div>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-inter font-medium text-sm text-white truncate max-w-md">
                            {field.label}
                          </span>
                          {field.required && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono">
                              Required
                            </span>
                          )}
                          {hasValidation && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono border border-cyan-500/30 flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3" />
                              <span>Validated</span>
                            </span>
                          )}
                        </div>

                        <span className="text-[11px] font-mono text-[var(--text-sec-60)] block truncate mt-0.5">
                          Type: {typeObj?.label || field.type}
                          {field.placeholder && ` • Placeholder: "${field.placeholder}"`}
                          {field.validation?.pattern && ` • Pattern: /${field.validation.pattern}/`}
                        </span>
                      </div>
                    </div>

                    {/* Action Controls: Edit, Duplicate, Reorder, Delete */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleToggleRequired(field.id)}
                        className={`text-xs px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                          field.required
                            ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                            : 'bg-white/[0.04] border-white/[0.10] text-[var(--text-secondary)] hover:text-white'
                        }`}
                        title="Toggle required status"
                      >
                        {field.required ? 'Mandatory' : 'Optional'}
                      </button>

                      {/* Edit Field */}
                      <button
                        type="button"
                        onClick={() => handleStartEditField(field)}
                        className="p-1.5 rounded-lg text-cyan-300 hover:text-white hover:bg-cyan-500/10 transition-colors cursor-pointer"
                        title="Edit question & validation rules"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>

                      {/* Duplicate Field */}
                      <button
                        type="button"
                        onClick={() => handleDuplicateField(field, index)}
                        className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-white hover:bg-white/[0.10] transition-colors cursor-pointer"
                        title="Duplicate question"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      {/* Reorder Up */}
                      <button
                        type="button"
                        onClick={() => handleMoveField(index, 'up')}
                        disabled={index === 0}
                        className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-white disabled:opacity-20 cursor-pointer"
                        title="Move Up"
                      >
                        <MoveUp className="w-3.5 h-3.5" />
                      </button>

                      {/* Reorder Down */}
                      <button
                        type="button"
                        onClick={() => handleMoveField(index, 'down')}
                        disabled={index === formConfig.fields.length - 1}
                        className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-white disabled:opacity-20 cursor-pointer"
                        title="Move Down"
                      >
                        <MoveDown className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => handleRemoveField(field.id, field.label)}
                        className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title="Delete Question"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Add Field Modal */}
      {showAddField && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAddField(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
        >
          <div className="glass-panel w-full max-w-xl p-6 rounded-2xl space-y-4 border border-white/20 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.10]">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-[var(--primary-accent)]" />
                <h3 className="font-poppins font-medium text-base text-white">Add Intake Form Field</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddField(false)}
                className="text-[var(--text-secondary)] hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-white font-medium mb-1">
                  Field Question / Label <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={newFieldLabel}
                  onChange={(e) => {
                    setNewFieldLabel(e.target.value);
                    if (fieldError) setFieldError('');
                  }}
                  placeholder="e.g. GitHub Repository URL or T-Shirt Size"
                  className={`w-full h-10 px-3 rounded-xl bg-white/[0.06] border text-white focus:outline-none focus:ring-1 ${
                    fieldError ? 'border-rose-500 focus:ring-rose-400' : 'border-white/[0.15] focus:ring-[var(--primary-accent)]'
                  }`}
                />
                {fieldError && <p className="mt-1 text-xs text-rose-400">{fieldError}</p>}
              </div>

              <div>
                <label className="block text-white font-medium mb-1.5">Input Field Type</label>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                  {FIELD_TYPES.map((ft) => (
                    <button
                      key={ft.type}
                      type="button"
                      onClick={() => setNewFieldType(ft.type)}
                      className={`p-2.5 rounded-xl border text-left flex items-center text-xs transition-all cursor-pointer ${
                        newFieldType === ft.type
                          ? 'border-[var(--primary-accent)] bg-[var(--accent-20)] text-white shadow'
                          : 'border-white/[0.08] bg-white/[0.03] text-[var(--text-secondary)] hover:text-white'
                      }`}
                    >
                      <span className="font-mono font-bold mr-1.5 text-[var(--primary-accent)]">{ft.icon}</span>
                      <span>{ft.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {['dropdown', 'radio', 'checkbox'].includes(newFieldType) && (
                <div className="space-y-1.5">
                  <label className="block text-white font-medium mb-1">
                    Selectable Options (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={newFieldOptions}
                    onChange={(e) => setNewFieldOptions(e.target.value)}
                    placeholder="e.g. Computer Science, Artificial Intelligence, Software Engineering"
                    className="w-full h-10 px-3 rounded-xl bg-white/[0.06] border border-white/[0.15] text-white focus:outline-none"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-white font-medium mb-1">Placeholder (optional)</label>
                  <input
                    type="text"
                    value={newFieldPlaceholder}
                    onChange={(e) => setNewFieldPlaceholder(e.target.value)}
                    placeholder="e.g. https://github.com/..."
                    className="w-full h-9 px-3 rounded-xl bg-white/[0.06] border border-white/[0.15] text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-white font-medium mb-1">Helper Hint Text (optional)</label>
                  <input
                    type="text"
                    value={newFieldHelpText}
                    onChange={(e) => setNewFieldHelpText(e.target.value)}
                    placeholder="e.g. Must include README.md"
                    className="w-full h-9 px-3 rounded-xl bg-white/[0.06] border border-white/[0.15] text-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Validation Rules Section */}
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.10] space-y-3">
                <div className="flex items-center gap-1.5 text-cyan-300">
                  <SlidersHorizontal className="w-4 h-4" />
                  <span className="font-semibold text-white">Input Validation & Pattern Rules</span>
                </div>

                <div>
                  <label className="block text-[11px] text-white/80 mb-1">Format Pattern Preset</label>
                  <select
                    value={newPresetId}
                    onChange={(e) => handlePresetChange(e.target.value, false)}
                    className="w-full h-9 px-3 rounded-xl bg-neutral-900 border border-white/[0.15] text-white text-xs"
                  >
                    {VALIDATION_PRESETS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>

                {newPresetId === 'custom' && (
                  <div>
                    <label className="block text-[11px] text-white/80 mb-1">Custom RegEx Pattern</label>
                    <input
                      type="text"
                      value={newCustomPattern}
                      onChange={(e) => setNewCustomPattern(e.target.value)}
                      placeholder="e.g. ^[0-9]{4}-[A-Z]{3}$"
                      className="w-full h-8 px-2.5 rounded-lg bg-neutral-900 border border-white/[0.15] text-white font-mono text-xs"
                    />
                  </div>
                )}

                {newPresetId !== 'none' && (
                  <div>
                    <label className="block text-[11px] text-white/80 mb-1">Custom Error Message</label>
                    <input
                      type="text"
                      value={newPatternError}
                      onChange={(e) => setNewPatternError(e.target.value)}
                      placeholder="e.g. Please enter a valid roll number"
                      className="w-full h-8 px-2.5 rounded-lg bg-neutral-900 border border-white/[0.15] text-white text-xs"
                    />
                  </div>
                )}

                {/* Length Bounds */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="block text-[10px] text-white/60 mb-0.5">Min Characters</label>
                    <input
                      type="number"
                      value={newMinLength}
                      onChange={(e) => setNewMinLength(e.target.value)}
                      placeholder="e.g. 3"
                      className="w-full h-8 px-2.5 rounded-lg bg-neutral-900 border border-white/[0.15] text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-white/60 mb-0.5">Max Characters</label>
                    <input
                      type="number"
                      value={newMaxLength}
                      onChange={(e) => setNewMaxLength(e.target.value)}
                      placeholder="e.g. 100"
                      className="w-full h-8 px-2.5 rounded-lg bg-neutral-900 border border-white/[0.15] text-white text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  id="chk-new-req"
                  type="checkbox"
                  checked={newFieldRequired}
                  onChange={(e) => setNewFieldRequired(e.target.checked)}
                  className="w-4 h-4 rounded text-[var(--primary-accent)] cursor-pointer"
                />
                <label htmlFor="chk-new-req" className="text-white cursor-pointer select-none">
                  Make this a mandatory required question
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/[0.10]">
              <button
                type="button"
                onClick={() => setShowAddField(false)}
                className="px-4 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-xs text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddField}
                className="px-5 py-2 rounded-xl bg-[var(--primary-accent)] hover:brightness-110 text-xs font-medium text-white shadow cursor-pointer"
              >
                Insert Question
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Field Modal */}
      {editingField && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditingField(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
        >
          <div className="glass-panel w-full max-w-xl p-6 rounded-2xl space-y-4 border border-cyan-500/30 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.10]">
              <div className="flex items-center gap-2">
                <Pencil className="w-5 h-5 text-cyan-300" />
                <h3 className="font-poppins font-medium text-base text-white">Edit Question & Validation Rules</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingField(null)}
                className="text-[var(--text-secondary)] hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-white font-medium mb-1">
                  Question Label <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={editLabel}
                  onChange={(e) => {
                    setEditLabel(e.target.value);
                    if (editError) setEditError('');
                  }}
                  className="w-full h-10 px-3 rounded-xl bg-white/[0.06] border border-white/[0.15] text-white focus:outline-none"
                />
                {editError && <p className="mt-1 text-xs text-rose-400">{editError}</p>}
              </div>

              <div>
                <label className="block text-white font-medium mb-1.5">Input Field Type</label>
                <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
                  {FIELD_TYPES.map((ft) => (
                    <button
                      key={ft.type}
                      type="button"
                      onClick={() => setEditType(ft.type)}
                      className={`p-2 rounded-xl border text-left flex items-center text-xs transition-all cursor-pointer ${
                        editType === ft.type
                          ? 'border-cyan-400 bg-cyan-950/60 text-white shadow'
                          : 'border-white/[0.08] bg-white/[0.03] text-[var(--text-secondary)] hover:text-white'
                      }`}
                    >
                      <span className="font-mono font-bold mr-1.5 text-cyan-300">{ft.icon}</span>
                      <span>{ft.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {['dropdown', 'radio', 'checkbox'].includes(editType) && (
                <div className="space-y-1.5">
                  <label className="block text-white font-medium mb-1">
                    Selectable Options (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={editOptions}
                    onChange={(e) => setEditOptions(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-white/[0.06] border border-white/[0.15] text-white focus:outline-none"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-white font-medium mb-1">Placeholder</label>
                  <input
                    type="text"
                    value={editPlaceholder}
                    onChange={(e) => setEditPlaceholder(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl bg-white/[0.06] border border-white/[0.15] text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-white font-medium mb-1">Helper Hint Text</label>
                  <input
                    type="text"
                    value={editHelpText}
                    onChange={(e) => setEditHelpText(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl bg-white/[0.06] border border-white/[0.15] text-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Validation Rules Section */}
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.10] space-y-3">
                <div className="flex items-center gap-1.5 text-cyan-300">
                  <SlidersHorizontal className="w-4 h-4" />
                  <span className="font-semibold text-white">Input Validation & Pattern Rules</span>
                </div>

                <div>
                  <label className="block text-[11px] text-white/80 mb-1">Format Pattern Preset</label>
                  <select
                    value={editPresetId}
                    onChange={(e) => handlePresetChange(e.target.value, true)}
                    className="w-full h-9 px-3 rounded-xl bg-neutral-900 border border-white/[0.15] text-white text-xs"
                  >
                    {VALIDATION_PRESETS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>

                {editPresetId === 'custom' && (
                  <div>
                    <label className="block text-[11px] text-white/80 mb-1">Custom RegEx Pattern</label>
                    <input
                      type="text"
                      value={editCustomPattern}
                      onChange={(e) => setEditCustomPattern(e.target.value)}
                      className="w-full h-8 px-2.5 rounded-lg bg-neutral-900 border border-white/[0.15] text-white font-mono text-xs"
                    />
                  </div>
                )}

                {editPresetId !== 'none' && (
                  <div>
                    <label className="block text-[11px] text-white/80 mb-1">Custom Error Message</label>
                    <input
                      type="text"
                      value={editPatternError}
                      onChange={(e) => setEditPatternError(e.target.value)}
                      className="w-full h-8 px-2.5 rounded-lg bg-neutral-900 border border-white/[0.15] text-white text-xs"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="block text-[10px] text-white/60 mb-0.5">Min Characters</label>
                    <input
                      type="number"
                      value={editMinLength}
                      onChange={(e) => setEditMinLength(e.target.value)}
                      className="w-full h-8 px-2.5 rounded-lg bg-neutral-900 border border-white/[0.15] text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-white/60 mb-0.5">Max Characters</label>
                    <input
                      type="number"
                      value={editMaxLength}
                      onChange={(e) => setEditMaxLength(e.target.value)}
                      className="w-full h-8 px-2.5 rounded-lg bg-neutral-900 border border-white/[0.15] text-white text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  id="chk-edit-req"
                  type="checkbox"
                  checked={editRequired}
                  onChange={(e) => setEditRequired(e.target.checked)}
                  className="w-4 h-4 rounded text-cyan-400 cursor-pointer"
                />
                <label htmlFor="chk-edit-req" className="text-white cursor-pointer select-none">
                  Make this a mandatory required question
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/[0.10]">
              <button
                type="button"
                onClick={() => setEditingField(null)}
                className="px-4 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-xs text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEditedField}
                className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-xs font-medium text-white shadow cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Version History Modal */}
      {showVersionHistoryModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowVersionHistoryModal(false);
              setInspectingSnapshot(null);
            }
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
        >
          <div className="glass-panel w-full max-w-2xl p-6 rounded-2xl space-y-5 border border-white/20 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.12]">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-cyan-400" />
                <h3 className="font-poppins font-medium text-lg text-white">
                  Registration Form Schema Version History
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowVersionHistoryModal(false);
                  setInspectingSnapshot(null);
                }}
                className="p-1 rounded-lg text-white/60 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-xs text-cyan-200">
              <p>
                <strong>Preserved Version Architecture:</strong> Historical form versions are permanently preserved. Registrations submitted under past versions stay linked to their original schema version.
              </p>
            </div>

            <div className="overflow-y-auto space-y-3 flex-1 pr-1">
              {historicalVersions
                .slice()
                .reverse()
                .map((snapshot) => {
                  const isActive = (snapshot.version || 1) === (formConfig.version || 1);
                  return (
                    <div
                      key={snapshot.version || snapshot.id}
                      className={`p-4 rounded-xl border transition-all ${
                        isActive
                          ? 'bg-[var(--accent-15)] border-[var(--accent-35)] ring-1 ring-[var(--accent-30)]'
                          : 'bg-white/[0.04] border-white/[0.08] hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-full bg-cyan-900/60 border border-cyan-400/40 text-cyan-200">
                            Schema V{snapshot.version || 1}
                          </span>
                          <span className="font-medium text-sm text-white">{snapshot.formName}</span>
                          {isActive && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              Current Active
                            </span>
                          )}
                          {!isActive && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.06] text-white/60 border border-white/[0.10]">
                              Archived Snapshot (Immutable)
                            </span>
                          )}
                        </div>

                        <span className="text-xs text-[var(--text-sec-60)] font-mono">
                          {snapshot.updatedAt || '2026-09-22'}
                        </span>
                      </div>

                      <p className="text-xs text-[var(--text-sec-70)] mb-3">
                        {snapshot.description || 'Intake questionnaire snapshot'} • {snapshot.fields.length} configured fields
                      </p>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setInspectingSnapshot(snapshot)}
                          className="px-3 py-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.14] text-xs font-medium text-white flex items-center gap-1.5 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-cyan-300" />
                          <span>Inspect Fields Snapshot</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleLoadVersionAsDraft(snapshot)}
                          className="px-3 py-1.5 rounded-lg bg-[var(--primary-accent)]/80 hover:bg-[var(--primary-accent)] text-xs font-medium text-white flex items-center gap-1.5 cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>Load As Basis for Next Version</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>

            {inspectingSnapshot && (
              <div className="p-4 rounded-xl bg-black/40 border border-cyan-500/40 space-y-3 mt-2">
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <span className="text-xs font-semibold text-cyan-300">
                    Inspecting Snapshot: Schema V{inspectingSnapshot.version || 1} ({inspectingSnapshot.fields.length} Fields)
                  </span>
                  <button
                    type="button"
                    onClick={() => setInspectingSnapshot(null)}
                    className="text-xs text-white/60 hover:text-white"
                  >
                    Close Preview
                  </button>
                </div>
                <div className="max-h-40 overflow-y-auto space-y-1.5 text-xs text-white/90">
                  {inspectingSnapshot.fields.map((f, i) => (
                    <div key={f.id} className="flex items-center justify-between p-2 rounded bg-white/[0.04]">
                      <span>
                        {i + 1}. {f.label} {f.required ? '(Required)' : '(Optional)'}
                      </span>
                      <span className="font-mono text-[10px] text-cyan-300">{f.type}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
