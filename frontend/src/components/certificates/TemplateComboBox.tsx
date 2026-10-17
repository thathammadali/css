/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Search,
  ChevronDown,
  Check,
  X,
  FileText,
  Image as ImageIcon,
  Palette,
  Layers,
} from 'lucide-react';
import { CertificateTemplateStyle, CertificateTemplateFormat } from '../../types';

export interface TemplateOption {
  id: CertificateTemplateStyle;
  name: string;
  category: 'Academic' | 'Tech & Hackathon' | 'Executive & Leadership' | 'Arts & Media' | 'Heritage & Honors';
  format: CertificateTemplateFormat;
  formatLabel: string;
  themeColor: string;
  badgeBg: string;
  description: string;
}

export const AVAILABLE_TEMPLATES: TemplateOption[] = [
  {
    id: 'classic_ivory',
    name: 'Classic Ivory & Gold',
    category: 'Academic',
    format: 'html',
    formatLabel: 'HTML',
    themeColor: '#D97706',
    badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    description: 'Parchment ivory background with 24kt gold rosettes, serif calligraphy, and gold medallion.',
  },
  {
    id: 'modern_tech',
    name: 'Modern Cyber Dark',
    category: 'Tech & Hackathon',
    format: 'html',
    formatLabel: 'HTML',
    themeColor: '#10B981',
    badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    description: 'Dark cyber grid, neon emerald highlights, monospace cryptographic hashes, and tech crest.',
  },
  {
    id: 'royal_navy',
    name: 'Royal Navy Academic',
    category: 'Academic',
    format: 'html',
    formatLabel: 'HTML',
    themeColor: '#38BDF8',
    badgeBg: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
    description: 'Deep midnight navy blue with gold foil trim, convocation crest, and formal typography.',
  },
  {
    id: 'ornate_image_frame',
    name: 'Guilloche Ornate Frame',
    category: 'Heritage & Honors',
    format: 'image',
    formatLabel: 'Graphic Canvas',
    themeColor: '#C5A059',
    badgeBg: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
    description: 'Banknote-grade guilloche geometric security border with superimposed dynamic data.',
  },
  {
    id: 'minimal_monochrome',
    name: 'Minimalist Slate & Silver',
    category: 'Arts & Media',
    format: 'html',
    formatLabel: 'HTML',
    themeColor: '#94A3B8',
    badgeBg: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
    description: 'Swiss modernist monochrome layout, refined typography, and subtle silver watermark.',
  },
  {
    id: 'emerald_executive',
    name: 'Emerald Executive Distinction',
    category: 'Executive & Leadership',
    format: 'html',
    formatLabel: 'HTML',
    themeColor: '#059669',
    badgeBg: 'bg-emerald-600/20 text-emerald-200 border-emerald-600/40',
    description: 'Deep forest emerald canvas with platinum embossed lettering and executive council seals.',
  },
  {
    id: 'crimson_heritage',
    name: 'Crimson Heritage Scroll',
    category: 'Heritage & Honors',
    format: 'image',
    formatLabel: 'Graphic Canvas',
    themeColor: '#E11D48',
    badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    description: 'Classical ceremonial crimson frame with royal heritage seal, laurels, and antique borders.',
  },
  {
    id: 'sapphire_vector',
    name: 'Sapphire Tech Sprint',
    category: 'Tech & Hackathon',
    format: 'html',
    formatLabel: 'HTML',
    themeColor: '#2563EB',
    badgeBg: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    description: 'Electric cobalt and sapphire vector lines, modern hackathon & workshop accreditation.',
  },
];

interface TemplateComboBoxProps {
  activeStyle: CertificateTemplateStyle;
  onSelectTemplate: (template: TemplateOption) => void;
  className?: string;
  label?: string;
}

export const TemplateComboBox: React.FC<TemplateComboBoxProps> = ({
  activeStyle,
  onSelectTemplate,
  className = '',
  label = 'Select Template',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Active template metadata
  const currentTemplate = useMemo(() => {
    return (
      AVAILABLE_TEMPLATES.find((t) => t.id === activeStyle) || AVAILABLE_TEMPLATES[0]
    );
  }, [activeStyle]);

  // Categories list
  const categories = ['All', 'HTML', 'Graphic Canvas', 'Academic', 'Tech', 'Heritage'];

  // Filter templates based on search query and category
  const filteredTemplates = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return AVAILABLE_TEMPLATES.filter((t) => {
      // Category filter
      if (selectedCategory === 'HTML' && t.format !== 'html') return false;
      if (selectedCategory === 'Graphic Canvas' && t.format !== 'image') return false;
      if (selectedCategory === 'Academic' && t.category !== 'Academic') return false;
      if (selectedCategory === 'Tech' && t.category !== 'Tech & Hackathon') return false;
      if (selectedCategory === 'Heritage' && t.category !== 'Heritage & Honors') return false;

      // Query filter
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        t.formatLabel.toLowerCase().includes(q) ||
        t.format.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q)
      );
    });
  }, [searchQuery, selectedCategory]);

  // Reset highlight when filter changes
  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredTemplates.length]);

  // Focus search input when combobox opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery('');
    }
  }, [isOpen]);

  // Close combobox when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < filteredTemplates.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredTemplates[highlightedIndex]) {
        onSelectTemplate(filteredTemplates[highlightedIndex]);
        setIsOpen(false);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full select-none ${className}`}
      onKeyDown={handleKeyDown}
    >
      {/* Combobox Trigger Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[var(--primary-accent)] shrink-0" />
          <span className="font-inter text-xs text-[var(--text-sec-80)] font-medium">
            {label}:
          </span>
        </div>

        <button
          id="btn-template-combobox-trigger"
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          className="w-full sm:w-auto min-w-[280px] sm:max-w-md h-10 px-3.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.15] text-left transition-all cursor-pointer flex items-center justify-between gap-3 shadow-sm group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-accent)]"
        >
          <div className="flex items-center gap-2.5 truncate">
            {/* Template Color Dot */}
            <span
              className="w-3 h-3 rounded-full shrink-0 shadow-sm border border-white/30"
              style={{ backgroundColor: currentTemplate.themeColor }}
            />
            <span className="font-poppins font-medium text-xs sm:text-[13px] text-white truncate">
              {currentTemplate.name}
            </span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono border font-semibold shrink-0 ${currentTemplate.badgeBg}`}
            >
              {currentTemplate.formatLabel}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-white/50 group-hover:text-white transition-colors shrink-0">
            <span className="text-[11px] font-inter text-white/40 hidden md:inline">
              Search & Switch
            </span>
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-200 ${
                isOpen ? 'rotate-180 text-[var(--primary-accent)]' : ''
              }`}
            />
          </div>
        </button>
      </div>

      {/* Combobox Popover Dropdown */}
      {isOpen && (
        <div
          id="template-combobox-dropdown"
          className="absolute z-50 right-0 left-0 sm:left-auto sm:right-0 mt-2 sm:w-[460px] max-w-[95vw] rounded-2xl bg-[#0D1826]/95 backdrop-blur-xl border border-white/[0.18] shadow-2xl overflow-hidden animate-fadeIn space-y-2 p-3 text-white"
        >
          {/* Search Input Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-white/40 absolute left-3 top-3 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search template by name, HTML/Image, or style..."
              className="w-full h-10 pl-9 pr-9 rounded-xl bg-white/[0.08] border border-white/[0.15] text-xs sm:text-sm text-white placeholder-white/40 focus:outline-none focus:border-[var(--primary-accent)] focus:ring-1 focus:ring-[var(--primary-accent)] transition-all font-inter"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 p-1 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.10] cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Category Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 pt-0.5 no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-inter whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
                  selectedCategory === cat
                    ? 'bg-[var(--primary-accent)] text-white font-medium shadow-sm'
                    : 'bg-white/[0.05] hover:bg-white/[0.10] text-[var(--text-secondary)] hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Templates Scrollable List */}
          <div
            ref={listRef}
            role="listbox"
            className="max-h-[300px] overflow-y-auto space-y-1.5 pr-1"
          >
            {filteredTemplates.length > 0 ? (
              filteredTemplates.map((template, index) => {
                const isSelected = template.id === activeStyle;
                const isHighlighted = highlightedIndex === index;

                return (
                  <div
                    key={template.id}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      onSelectTemplate(template);
                      setIsOpen(false);
                    }}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                      isSelected
                        ? 'bg-[var(--accent-20)] border-[var(--primary-accent)] text-white'
                        : isHighlighted
                        ? 'bg-white/[0.08] border-white/[0.15] text-white'
                        : 'bg-white/[0.03] border-white/[0.06] text-white/80 hover:bg-white/[0.06]'
                    }`}
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      {/* Left icon & format indicator */}
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border border-white/20 mt-0.5"
                        style={{ backgroundColor: `${template.themeColor}33` }}
                      >
                        {template.format === 'html' ? (
                          <FileText className="w-4 h-4" style={{ color: template.themeColor }} />
                        ) : (
                          <ImageIcon className="w-4 h-4" style={{ color: template.themeColor }} />
                        )}
                      </div>

                      {/* Name & description */}
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-poppins font-medium text-xs sm:text-[13px] text-white">
                            {template.name}
                          </span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] font-mono border ${template.badgeBg}`}
                          >
                            {template.formatLabel}
                          </span>
                          <span className="text-[10px] font-inter text-white/40">
                            • {template.category}
                          </span>
                        </div>
                        <p className="text-[11px] font-inter text-[var(--text-sec-70)] line-clamp-2 leading-relaxed">
                          {template.description}
                        </p>
                      </div>
                    </div>

                    {/* Selection status checkmark */}
                    <div className="shrink-0 pt-1">
                      {isSelected ? (
                        <div className="w-5 h-5 rounded-full bg-[var(--primary-accent)] flex items-center justify-center text-white shadow-sm">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full border border-white/20" />
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-6 text-center space-y-2">
                <Palette className="w-8 h-8 text-white/30 mx-auto" />
                <p className="font-poppins text-xs font-medium text-white">
                  No templates matching "{searchQuery}"
                </p>
                <p className="text-[11px] font-inter text-white/50">
                  Try searching for "HTML", "Canvas", "Cyber", "Gold", or "Navy".
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('All');
                  }}
                  className="px-3 py-1 rounded-lg bg-white/[0.08] hover:bg-white/[0.14] text-xs font-inter text-[var(--primary-accent)] cursor-pointer"
                >
                  Reset filters
                </button>
              </div>
            )}
          </div>

          {/* Combobox Footer Status */}
          <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between text-[11px] font-inter text-white/50 px-1">
            <span>
              Showing {filteredTemplates.length} of {AVAILABLE_TEMPLATES.length} templates
            </span>
            <span className="font-mono text-[10px] text-[var(--primary-accent)]">
              SEMS Template Engine
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
