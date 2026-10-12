'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Search,
  Star,
  Plus,
  X,
  Filter,
  Check,
  Sparkles,
  AlertCircle,
  Folder,
  Briefcase,
  ChevronDown
} from 'lucide-react';
import {
  TAXONOMY_INDUSTRIES,
  TAXONOMY_SKILLS,
  searchTaxonomyCatalog
} from '@/lib/taxonomyCatalog';
import { TaxonomyCatalogSkill } from '@/types';
import {
  fetchFavoriteSkills,
  addFavoriteSkill,
  removeFavoriteSkill,
  searchTaxonomySkills
} from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';

export interface SelectedSkillCriteria {
  id?: string;
  skillName: string;
  canonicalId?: string;
  category?: string;
  requirementType?: 'REQUIRED' | 'PREFERRED';
  minYearsExperience?: number;
}

interface SkillCatalogPickerProps {
  // Mode 1: Detailed Rubric criteria selection
  onSelectCriteria?: (criteria: SelectedSkillCriteria) => void;
  // Mode 2: Simple chip selection (string[] or name list)
  selectedSkills?: string[];
  onAddSkill?: (skillName: string, category?: string) => void;
  // Configurations
  allowRequirementType?: boolean;
  allowExperienceYears?: boolean;
  placeholder?: string;
  className?: string;
  compact?: boolean;
}

export const SkillCatalogPicker: React.FC<SkillCatalogPickerProps> = ({
  onSelectCriteria,
  selectedSkills = [],
  onAddSkill,
  allowRequirementType = false,
  allowExperienceYears = false,
  placeholder = 'Tìm kỹ năng (VD: Java, React, Docker, Python, Figma...)',
  className = '',
  compact = false
}) => {
  const { isAuthenticated } = useAuth();
  const { locale } = useLanguage();
  const isVi = locale === 'vi';

  // Query and Dropdown State
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [selectedIndustry, setSelectedIndustry] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);

  // Rubric Criterion Draft Inputs
  const [draftReqType, setDraftReqType] = useState<'REQUIRED' | 'PREFERRED'>('REQUIRED');
  const [draftYears, setDraftYears] = useState<number>(1);

  // Favorites state (Server-synced)
  const [favoriteSkillIds, setFavoriteSkillIds] = useState<string[]>([]);
  const [favoriteSkillsList, setFavoriteSkillsList] = useState<{ id: string; name: string; category?: string }[]>([]);
  const [favoriteMessage, setFavoriteMessage] = useState<string | null>(null);
  const [isUpdatingFavorite, setIsUpdatingFavorite] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load user favorites on mount if authenticated
  const loadFavorites = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const favs = await fetchFavoriteSkills();
      if (Array.isArray(favs)) {
        setFavoriteSkillIds(favs.map((f: any) => f.id || f.canonicalName));
        setFavoriteSkillsList(favs.map((f: any) => ({
          id: f.id,
          name: f.canonicalName || f.name,
          category: f.category
        })));
      }
    } catch {
      // Graceful fallback to local catalog state
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute filtered suggestions using the Canonical Taxonomy Catalog
  const suggestions = useMemo(() => {
    return searchTaxonomyCatalog(query, {
      industryId: selectedIndustry,
      category: selectedCategory,
      excludeSkillNames: selectedSkills,
      favoriteSkillIds,
      onlyFavorites: showOnlyFavorites,
      limit: 10
    });
  }, [query, selectedIndustry, selectedCategory, selectedSkills, favoriteSkillIds, showOnlyFavorites]);

  // Toggle favorite on/off (enforcing server maximum 10)
  const handleToggleFavorite = async (e: React.MouseEvent, skill: TaxonomyCatalogSkill) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      setFavoriteMessage(isVi ? 'Vui lòng đăng nhập để lưu kỹ năng yêu thích.' : 'Please log in to save favorite skills.');
      return;
    }

    const isFav = favoriteSkillIds.includes(skill.id);
    setFavoriteMessage(null);
    setIsUpdatingFavorite(true);

    try {
      if (isFav) {
        await removeFavoriteSkill(skill.id);
        setFavoriteSkillIds((prev) => prev.filter((id) => id !== skill.id));
        setFavoriteSkillsList((prev) => prev.filter((f) => f.id !== skill.id));
      } else {
        if (favoriteSkillIds.length >= 10) {
          setFavoriteMessage(isVi ? 'Đã đạt giới hạn tối đa 10 kỹ năng yêu thích.' : 'Maximum 10 favorite skills limit reached.');
          setIsUpdatingFavorite(false);
          return;
        }
        await addFavoriteSkill(skill.id);
        setFavoriteSkillIds((prev) => [...prev, skill.id]);
        setFavoriteSkillsList((prev) => [...prev, { id: skill.id, name: skill.canonicalName, category: skill.category }]);
      }
    } catch (err: any) {
      setFavoriteMessage(err?.message || (isVi ? 'Lỗi khi cập nhật kỹ năng yêu thích.' : 'Failed to update favorite.'));
    } finally {
      setIsUpdatingFavorite(false);
    }
  };

  // Add the chosen skill to the parent form
  const handleChooseSkill = (skill: TaxonomyCatalogSkill | { name: string; category?: string; id?: string }) => {
    const canonicalName = 'canonicalName' in skill ? skill.canonicalName : skill.name;
    const cat = skill.category;
    const skillId = skill.id;

    if (onSelectCriteria) {
      onSelectCriteria({
        id: `req-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        skillName: canonicalName,
        canonicalId: skillId,
        category: cat,
        requirementType: draftReqType,
        minYearsExperience: draftYears
      });
    }

    if (onAddSkill) {
      onAddSkill(canonicalName, cat);
    }

    setQuery('');
    setIsOpen(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIsOpen(true);
      if (suggestions.length > 0) {
        setSelectedIndex((prev) => (prev + 1) % suggestions.length);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (suggestions.length > 0) {
        setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
        handleChooseSkill(suggestions[selectedIndex]);
      } else if (query.trim()) {
        // Direct addition of custom query if no suggestion selected
        handleChooseSkill({ name: query.trim(), category: selectedCategory !== 'ALL' ? selectedCategory : undefined });
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={`space-y-3 ${className}`}>

      {/* 1. Quick-Pick Favorites Bar (Max 10) */}
      {favoriteSkillsList.length > 0 && (
        <div className="p-2.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/40 space-y-1.5 transition-all">
          <div className="flex items-center justify-between text-[11px] font-bold text-amber-900 dark:text-amber-200">
            <span className="flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
              <span>{isVi ? 'Kỹ năng yêu thích đã lưu' : 'Favorite Skills Quick-Pick'} ({favoriteSkillsList.length}/10):</span>
            </span>
            <span className="text-[10px] text-amber-700/80 dark:text-amber-300/80 font-normal">
              {isVi ? 'Nhấp để thêm nhanh' : 'Click to add'}
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {favoriteSkillsList.map((fav) => {
              const isAlreadyChosen = selectedSkills.some((s) => s.toLowerCase() === fav.name.toLowerCase());
              return (
                <button
                  key={fav.id}
                  type="button"
                  disabled={isAlreadyChosen}
                  onClick={() => handleChooseSkill({ id: fav.id, name: fav.name, category: fav.category })}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                    isAlreadyChosen
                      ? 'bg-slate-200/70 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed line-through'
                      : 'bg-white dark:bg-[#111C38] text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800 hover:bg-amber-100 hover:border-amber-400 shadow-2xs cursor-pointer active:scale-95'
                  }`}
                  title={isAlreadyChosen ? (isVi ? 'Đã có trong danh sách' : 'Already added') : (isVi ? 'Thêm kỹ năng này' : 'Add this skill')}
                >
                  <span>{fav.name}</span>
                  {isAlreadyChosen ? (
                    <Check className="w-3 h-3 text-slate-400" />
                  ) : (
                    <Plus className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Favorite Feedback Message Banner */}
      {favoriteMessage && (
        <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-xs text-blue-700 dark:text-blue-300 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{favoriteMessage}</span>
          </span>
          <button
            type="button"
            onClick={() => setFavoriteMessage(null)}
            className="text-slate-400 hover:text-slate-600 text-xs px-1"
          >
            ×
          </button>
        </div>
      )}

      {/* 2. Taxonomy Filters Row */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {/* Industry Filter Dropdown */}
        <div className="flex items-center gap-1 bg-white dark:bg-[#111C38] border border-[#CBD5E1] dark:border-[#1E3A5F] rounded-lg px-2.5 py-1.5 shadow-2xs">
          <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <select
            value={selectedIndustry}
            onChange={(e) => setSelectedIndustry(e.target.value)}
            className="bg-transparent text-xs text-[#0F2A52] dark:text-white font-medium focus:outline-none cursor-pointer max-w-[160px] truncate"
            title={isVi ? 'Lọc theo ngành nghề' : 'Filter by industry'}
          >
            <option value="ALL">{isVi ? 'Tất cả ngành nghề' : 'All Industries'}</option>
            {TAXONOMY_INDUSTRIES.map((ind) => (
              <option key={ind.id} value={ind.id}>
                {isVi ? ind.vi : ind.en}
              </option>
            ))}
          </select>
        </div>

        {/* Favorite Filter Toggle */}
        <button
          type="button"
          onClick={() => setShowOnlyFavorites((prev) => !prev)}
          className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition cursor-pointer shadow-2xs ${
            showOnlyFavorites
              ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border-amber-400'
              : 'bg-white dark:bg-[#111C38] text-slate-600 dark:text-slate-300 border-[#CBD5E1] dark:border-[#1E3A5F] hover:border-amber-400'
          }`}
          title={isVi ? 'Chỉ hiện kỹ năng yêu thích' : 'Show only favorites'}
        >
          <Star className={`w-3.5 h-3.5 ${showOnlyFavorites ? 'fill-amber-500 text-amber-500' : 'text-slate-400'}`} />
          <span>{isVi ? 'Đã lưu' : 'Favorites'}</span>
        </button>
      </div>

      {/* 3. Main Input Row: Autocomplete + Rubric Criteria Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
        {/* Skill Search Input */}
        <div className={`relative ${allowRequirementType ? 'sm:col-span-6' : 'sm:col-span-12'}`}>
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              role="combobox"
              aria-expanded={isOpen}
              aria-autocomplete="list"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setIsOpen(true);
                setSelectedIndex(-1);
              }}
              onFocus={() => setIsOpen(true)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="w-full pl-9 pr-8 py-2 bg-white dark:bg-[#111C38] border border-[#CBD5E1] dark:border-[#1E3A5F] rounded-lg text-[#0F2A52] dark:text-white text-xs focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] shadow-2xs"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setSelectedIndex(-1);
                }}
                className="absolute right-2.5 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Autocomplete Dropdown List */}
          {isOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-[#111C38] border border-blue-200 dark:border-[#1E293B] rounded-xl shadow-xl z-50 max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-[#1E293B] animate-fade-in">
              {suggestions.length === 0 ? (
                <div className="p-3.5 text-center text-xs text-slate-500 dark:text-slate-400 space-y-1">
                  <p>{isVi ? 'Không tìm thấy kỹ năng có sẵn khớp từ khóa.' : 'No catalog skills found matching query.'}</p>
                  {query.trim() && (
                    <button
                      type="button"
                      onClick={() => handleChooseSkill({ name: query.trim() })}
                      className="text-xs font-bold text-[#2563EB] hover:underline flex items-center justify-center gap-1 mx-auto cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>{isVi ? `Thêm tùy chỉnh "${query.trim()}"` : `Add custom "${query.trim()}"`}</span>
                    </button>
                  )}
                </div>
              ) : (
                suggestions.map((skill, idx) => {
                  const isFavorited = favoriteSkillIds.includes(skill.id);
                  const isSelected = selectedIndex === idx;

                  return (
                    <div
                      key={skill.id}
                      onClick={() => handleChooseSkill(skill)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs cursor-pointer transition ${
                        isSelected
                          ? 'bg-blue-50 dark:bg-[#18294E] text-[#2563EB] dark:text-[#3B82F6]'
                          : 'hover:bg-slate-50 dark:hover:bg-[#142342] text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-white truncate">
                            {skill.canonicalName}
                          </span>
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {skill.category}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                          {isVi ? skill.viName : skill.enName}
                        </div>
                      </div>

                      {/* Favorite Button on Suggestion */}
                      <button
                        type="button"
                        onClick={(e) => handleToggleFavorite(e, skill)}
                        disabled={isUpdatingFavorite}
                        className={`p-1.5 rounded-lg transition shrink-0 cursor-pointer ${
                          isFavorited
                            ? 'text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30'
                            : 'text-slate-300 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                        title={isFavorited ? (isVi ? 'Bỏ lưu yêu thích' : 'Unfavorite') : (isVi ? 'Lưu vào yêu thích (tối đa 10)' : 'Save to favorites (max 10)')}
                      >
                        <Star className={`w-4 h-4 ${isFavorited ? 'fill-amber-400 text-amber-500' : ''}`} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Optional Rubric Controls: Requirement Type & Min Years */}
        {allowRequirementType && (
          <>
            <div className="sm:col-span-3">
              <select
                value={draftReqType}
                onChange={(e) => setDraftReqType(e.target.value as 'REQUIRED' | 'PREFERRED')}
                className="w-full px-3 py-2 bg-white dark:bg-[#111C38] border border-[#CBD5E1] dark:border-[#1E3A5F] rounded-lg text-[#0F2A52] dark:text-white text-xs focus:outline-none focus:border-[#2563EB]"
              >
                <option value="REQUIRED">{isVi ? 'Bắt buộc (REQUIRED)' : 'REQUIRED'}</option>
                <option value="PREFERRED">{isVi ? 'Ưu tiên (PREFERRED)' : 'PREFERRED'}</option>
              </select>
            </div>

            <div className="sm:col-span-3 flex items-center gap-1.5">
              <input
                type="number"
                min="0"
                max="25"
                placeholder={isVi ? 'Năm KN' : 'Years'}
                value={draftYears}
                onChange={(e) => setDraftYears(Number(e.target.value))}
                className="w-20 px-2.5 py-2 bg-white dark:bg-[#111C38] border border-[#CBD5E1] dark:border-[#1E3A5F] rounded-lg text-[#0F2A52] dark:text-white text-xs font-mono"
                title={isVi ? 'Số năm kinh nghiệm tối thiểu' : 'Minimum years of experience'}
              />
              <button
                type="button"
                onClick={() => {
                  if (query.trim()) {
                    handleChooseSkill({ name: query.trim() });
                  } else if (suggestions.length > 0) {
                    handleChooseSkill(suggestions[0]);
                  }
                }}
                className="flex-1 py-2 px-3 rounded-lg text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] transition cursor-pointer shadow-xs whitespace-nowrap active:scale-95"
              >
                {isVi ? '+ Thêm' : '+ Add'}
              </button>
            </div>
          </>
        )}
      </div>

    </div>
  );
};
