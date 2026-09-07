'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { SKILL_TAXONOMY, CANONICAL_ALIAS_LOOKUP, TaxonomySkill } from '@/config/skillTaxonomy';
import { Sparkles, Plus, X, Check } from 'lucide-react';

interface SkillAutocompleteProps {
  skills: string[];
  onSkillsChange: (skills: string[]) => void;
  placeholder?: string;
  maxSkills?: number;
  className?: string;
}

export const SkillAutocomplete: React.FC<SkillAutocompleteProps> = ({
  skills,
  onSkillsChange,
  placeholder = 'Type to search skills (e.g. jav, spr, doc)...',
  maxSkills = 20,
  className = ''
}) => {
  const [query, setQuery] = useState<string>('');
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Filter suggestions based on query
  const suggestions = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();

    return SKILL_TAXONOMY.filter((skill) => {
      // Don't show already selected skills
      if (skills.some((s) => s.toLowerCase() === skill.name.toLowerCase())) {
        return false;
      }

      // Check name prefix/containment
      const nameLower = skill.name.toLowerCase();
      if (nameLower.startsWith(q) || nameLower.includes(q)) return true;

      // Check aliases
      if (skill.aliases && skill.aliases.some((a) => a.toLowerCase().startsWith(q) || a.toLowerCase().includes(q))) {
        return true;
      }

      return false;
    }).slice(0, 7); // Max 7 suggestions
  }, [query, skills]);

  const addSkill = (rawSkill: string) => {
    const trimmed = rawSkill.trim();
    if (!trimmed) return;

    // Normalize through canonical dictionary if available
    const canonical = CANONICAL_ALIAS_LOOKUP[trimmed.toLowerCase()] || trimmed;

    // Check duplicate
    if (!skills.some((s) => s.toLowerCase() === canonical.toLowerCase())) {
      if (skills.length < maxSkills) {
        onSkillsChange([...skills, canonical]);
      }
    }

    setQuery('');
    setIsOpen(false);
    setHighlightedIndex(0);
    inputRef.current?.focus();
  };

  const removeSkill = (skillToRemove: string) => {
    onSkillsChange(skills.filter((s) => s !== skillToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (suggestions.length > 0) {
        setHighlightedIndex((prev) => (prev + 1) % suggestions.length);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (suggestions.length > 0) {
        setHighlightedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (isOpen && suggestions.length > 0 && suggestions[highlightedIndex]) {
        addSkill(suggestions[highlightedIndex].name);
      } else if (query.trim()) {
        addSkill(query);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'Backspace' && !query && skills.length > 0) {
      removeSkill(skills[skills.length - 1]);
    }
  };

  return (
    <div ref={containerRef} className={`relative space-y-2 ${className}`}>
      {/* Chips Container + Input */}
      <div className="flex flex-wrap items-center gap-2 p-2.5 bg-white dark:bg-[#0E241E] border border-slate-200 dark:border-[#1B3D34] rounded-xl min-h-[46px] shadow-2xs focus-within:border-[#0C2B24] dark:focus-within:border-emerald-500 transition-colors">
        {skills.map((skill) => (
          <span
            key={skill}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-[#F8FAF9] dark:bg-[#14332B] text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-emerald-900/50 shadow-2xs transition group"
          >
            <span>{skill}</span>
            <button
              type="button"
              onClick={() => removeSkill(skill)}
              className="text-slate-400 hover:text-rose-500 transition cursor-pointer"
              title={`Remove ${skill}`}
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setHighlightedIndex(0);
          }}
          onFocus={() => {
            if (query.trim()) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={skills.length === 0 ? placeholder : 'Add more...'}
          className="flex-1 min-w-[140px] bg-transparent text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none px-1 py-1"
        />
      </div>

      {/* Intelligent Autocomplete Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 z-50 mt-1 bg-white dark:bg-[#0E241E] border border-slate-200 dark:border-[#1B3D34] rounded-xl shadow-xl overflow-hidden animate-fade-in divide-y divide-slate-100 dark:divide-[#1B3D34]">
          <div className="px-3 py-1.5 bg-[#F8FAF9] dark:bg-[#0A1E19] flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <span>Intelligent Taxonomy Matches</span>
            <span>Use ↑↓ to navigate, Enter to select</span>
          </div>
          <ul className="max-h-60 overflow-y-auto py-1">
            {suggestions.map((item, idx) => (
              <li
                key={item.name}
                onClick={() => addSkill(item.name)}
                onMouseEnter={() => setHighlightedIndex(idx)}
                className={`px-3.5 py-2 text-xs flex items-center justify-between cursor-pointer transition-colors ${
                  idx === highlightedIndex
                    ? 'bg-[#0C2B24] text-white'
                    : 'text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#14332B]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Sparkles className={`w-3.5 h-3.5 ${idx === highlightedIndex ? 'text-amber-400' : 'text-emerald-500'}`} />
                  <span className="font-semibold">{item.name}</span>
                  {item.aliases && item.aliases.length > 0 && (
                    <span className={`text-[10px] font-mono ${idx === highlightedIndex ? 'text-emerald-200' : 'text-slate-400 dark:text-slate-500'}`}>
                      (aka {item.aliases.join(', ')})
                    </span>
                  )}
                </div>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                    idx === highlightedIndex
                      ? 'bg-emerald-800 text-emerald-100'
                      : 'bg-slate-100 dark:bg-[#14332B] text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {item.category}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
