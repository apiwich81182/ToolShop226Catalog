'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Check, ChevronsUpDown, Plus, Search, X } from 'lucide-react';

interface SearchableComboboxProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  label?: string;
  required?: boolean;
  onAddNewOption?: (newOption: string) => void;
  emptyText?: string;
}

export const SearchableCombobox: React.FC<SearchableComboboxProps> = ({
  value,
  onChange,
  options,
  placeholder = 'เลือกหรือพิมพ์ค้นหา...',
  label,
  required = false,
  onAddNewOption,
  emptyText = 'ไม่พบข้อมูลที่ค้นหา',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter options based on search query
  const filteredOptions = options.filter((opt) =>
    opt.toLowerCase().includes(searchTerm.toLowerCase().trim())
  );

  const exactMatchExists = options.some(
    (opt) => opt.toLowerCase() === searchTerm.toLowerCase().trim()
  );

  const handleSelect = (option: string) => {
    onChange(option);
    setSearchTerm('');
    setIsOpen(false);
  };

  const handleCreateNew = () => {
    const trimmed = searchTerm.trim();
    if (!trimmed) return;
    if (onAddNewOption) {
      onAddNewOption(trimmed);
    }
    onChange(trimmed);
    setSearchTerm('');
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={containerRef}>
      {label && (
        <label className="block text-xs font-semibold text-zinc-300 mb-1">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      {/* Combobox Trigger Button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) {
            setTimeout(() => inputRef.current?.focus(), 50);
          }
        }}
        className={`w-full px-3 py-2 text-sm bg-zinc-950 border rounded-xl flex items-center justify-between text-left transition-colors focus:outline-none focus:ring-1 focus:ring-amber-400 ${
          isOpen ? 'border-amber-400' : 'border-zinc-800 hover:border-zinc-700'
        }`}
      >
        <span className={value ? 'text-zinc-100 font-bold' : 'text-zinc-500'}>
          {value || placeholder}
        </span>
        <div className="flex items-center gap-1 text-zinc-500">
          {value && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              className="p-0.5 hover:text-white rounded"
              title="ล้างค่า"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronsUpDown className="w-4 h-4" />
        </div>
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-zinc-900 border border-zinc-700/80 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 text-zinc-100">
          {/* Search Input Inside Dropdown */}
          <div className="p-2 border-b border-zinc-800 bg-zinc-950/80">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="พิมพ์เพื่อค้นหาหรือเพิ่มใหม่..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-zinc-900 border border-zinc-800 rounded-lg focus:outline-none focus:border-amber-400 text-zinc-100 placeholder-zinc-500 font-medium"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-52 overflow-y-auto p-1 text-xs no-scrollbar">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => {
                const isSelected = opt.toLowerCase() === value.toLowerCase();
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => handleSelect(opt)}
                    className={`w-full px-3 py-2 rounded-lg text-left flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'bg-amber-400 text-zinc-950 font-bold'
                        : 'text-zinc-200 hover:bg-zinc-800 hover:text-white font-medium'
                    }`}
                  >
                    <span>{opt}</span>
                    {isSelected && <Check className="w-4 h-4 text-zinc-950 shrink-0" />}
                  </button>
                );
              })
            ) : (
              <div className="py-2.5 px-3 text-zinc-500 text-center font-normal">
                {emptyText}
              </div>
            )}

            {/* Quick Add New Option Button */}
            {searchTerm.trim() && !exactMatchExists && (
              <button
                type="button"
                onClick={handleCreateNew}
                className="w-full mt-1 px-3 py-2 rounded-lg text-left bg-amber-400/10 hover:bg-amber-400/20 text-amber-400 font-bold flex items-center gap-2 border border-amber-400/30 transition-colors"
              >
                <Plus className="w-3.5 h-3.5 shrink-0" />
                <span>
                  เพิ่มใหม่ &ldquo;<strong className="underline">{searchTerm.trim()}</strong>&rdquo;
                </span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
