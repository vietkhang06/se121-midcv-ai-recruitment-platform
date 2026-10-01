'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, X, Loader2, Sparkles } from 'lucide-react';
import { searchTaxonomySkills } from '@/lib/api';
import { TaxonomySkillItem } from '@/types';

interface SkillItem {
  name: string;
  category?: string;
  level?: string;
  isCustom?: boolean;
}

interface SkillAutocompleteProps {
  skills: (SkillItem | string)[];
  onChange: (skills: SkillItem[]) => void;
  placeholder?: string;
  className?: string;
}

export const SkillAutocomplete: React.FC<SkillAutocompleteProps> = ({
  skills,
  onChange,
  placeholder = 'Tìm kiếm kỹ năng hoặc gõ kỹ năng mới...',
  className = ''
}) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<TaxonomySkillItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Normalize current skills into objects
  const normalizedSkills: SkillItem[] = skills.map((s) =>
    typeof s === 'string' ? { name: s } : s
  );

  // Debounce search query 250-350ms
  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const handler = setTimeout(async () => {
      try {
        const results = await searchTaxonomySkills(query.trim(), 8);
        setSuggestions(results || []);
      } catch (err) {
        console.warn('Taxonomy skill search failed:', err);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, 280);

    return () => clearTimeout(handler);
  }, [query]);

  // Click outside listener to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isDuplicate = (skillName: string) => {
    const lower = skillName.toLowerCase().trim();
    return normalizedSkills.some((s) => s.name.toLowerCase().trim() === lower);
  };

  const handleAddSkill = (name: string, isCustom = false, category?: string) => {
    const cleanName = name.trim();
    if (!cleanName || isDuplicate(cleanName)) {
      setQuery('');
      setIsOpen(false);
      return;
    }

    const newSkill: SkillItem = {
      name: cleanName,
      isCustom,
      category
    };

    onChange([...normalizedSkills, newSkill]);
    setQuery('');
    setIsOpen(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  const handleRemoveSkill = (index: number) => {
    const next = [...normalizedSkills];
    next.splice(index, 1);
    onChange(next);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' && suggestions.length > 0) {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < suggestions.length ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
        const item = suggestions[selectedIndex];
        handleAddSkill(item.canonicalName, false, item.category);
      } else if (query.trim()) {
        // Add as custom skill if no exact match
        const exactMatch = suggestions.find(
          (s) => s.canonicalName.toLowerCase() === query.trim().toLowerCase()
        );
        if (exactMatch) {
          handleAddSkill(exactMatch.canonicalName, false, exactMatch.category);
        } else {
          handleAddSkill(query.trim(), true);
        }
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={`space-y-2.5 ${className}`}>
      {/* Existing Tag Chips */}
      <div className="flex flex-wrap gap-1.5 min-h-[32px] items-center">
        {normalizedSkills.map((skill, idx) => (
          <span
            key={idx}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
              skill.isCustom
                ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60'
                : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/60'
            }`}
          >
            <span>{skill.name}</span>
            {skill.isCustom && (
              <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400">
                tùy chỉnh
              </span>
            )}
            <button
              type="button"
              onClick={() => handleRemoveSkill(idx)}
              className="text-slate-400 hover:text-rose-500 transition cursor-pointer p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>

      {/* Autocomplete Input */}
      <div className="relative">
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 absolute left-3 text-slate-400 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => {
              if (query.trim()) setIsOpen(true);
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#1E293B] bg-white dark:bg-[#0B1329] text-slate-800 dark:text-slate-100 outline-none focus:border-blue-500 transition"
          />
          {isLoading && (
            <Loader2 className="w-3.5 h-3.5 absolute right-3 text-blue-500 animate-spin" />
          )}
        </div>

        {/* Dropdown Suggestions */}
        {isOpen && query.trim() && (
          <div className="absolute z-30 mt-1 w-full rounded-xl border border-slate-200 dark:border-[#1E293B] bg-white dark:bg-[#111C38] shadow-xl overflow-hidden py-1 max-h-56 overflow-y-auto">
            {suggestions.length > 0 ? (
              suggestions.map((item, idx) => {
                const alreadySelected = isDuplicate(item.canonicalName);
                const isHighlighted = idx === selectedIndex;

                return (
                  <button
                    key={item.id || idx}
                    type="button"
                    disabled={alreadySelected}
                    onClick={() => handleAddSkill(item.canonicalName, false, item.category)}
                    className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between transition cursor-pointer ${
                      alreadySelected
                        ? 'opacity-40 cursor-not-allowed bg-slate-50 dark:bg-[#0B1329]'
                        : isHighlighted
                        ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300'
                        : 'hover:bg-slate-50 dark:hover:bg-[#18294E] text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{item.canonicalName}</span>
                      {item.category && (
                        <span className="text-[10px] text-slate-400 font-mono">({item.category})</span>
                      )}
                    </div>
                    {alreadySelected ? (
                      <span className="text-[10px] text-slate-400">Đã chọn</span>
                    ) : (
                      <Plus className="w-3 h-3 text-slate-400" />
                    )}
                  </button>
                );
              })
            ) : (
              <div className="px-3 py-2 text-xs text-slate-400">
                Không tìm thấy trong taxonomy.
              </div>
            )}

            {/* Custom Skill Option */}
            {!suggestions.some(
              (s) => s.canonicalName.toLowerCase() === query.trim().toLowerCase()
            ) &&
              !isDuplicate(query.trim()) && (
                <button
                  type="button"
                  onClick={() => handleAddSkill(query.trim(), true)}
                  className="w-full px-3 py-2 border-t border-slate-100 dark:border-[#1E293B] text-left text-xs flex items-center gap-2 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Thêm kỹ năng tùy chỉnh: &quot;<strong>{query.trim()}</strong>&quot;</span>
                </button>
              )}
          </div>
        )}
      </div>
    </div>
  );
};
