'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bold, Italic, Underline, List, ListOrdered, Undo, Redo, RemoveFormatting } from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Nhập nội dung mô tả...',
  className = '',
  minHeight = '100px'
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const isUpdatingFromProp = useRef(false);

  // Sync prop value into contentEditable DOM without moving caret on every keypress
  useEffect(() => {
    if (editorRef.current && !isUpdatingFromProp.current) {
      if (editorRef.current.innerHTML !== (value || '')) {
        editorRef.current.innerHTML = value || '';
      }
    }
    isUpdatingFromProp.current = false;
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      isUpdatingFromProp.current = true;
      const html = editorRef.current.innerHTML;
      onChange(html);
    }
  };

  const exec = (command: string, arg?: string) => {
    document.execCommand(command, false, arg);
    if (editorRef.current) {
      editorRef.current.focus();
      handleInput();
    }
  };

  return (
    <div className={`border border-slate-200 dark:border-[#1E293B] rounded-xl overflow-hidden bg-white dark:bg-[#0B1329] focus-within:border-blue-500 transition shadow-xs ${className}`}>
      {/* Formatting Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-1.5 border-b border-slate-100 dark:border-[#1E293B] bg-slate-50/80 dark:bg-[#111C38]/80 text-slate-600 dark:text-slate-300">
        <button
          type="button"
          onClick={() => exec('bold')}
          title="In đậm (Bold)"
          className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-[#18294E] transition text-xs flex items-center justify-center cursor-pointer"
        >
          <Bold className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => exec('italic')}
          title="In nghiêng (Italic)"
          className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-[#18294E] transition text-xs flex items-center justify-center cursor-pointer"
        >
          <Italic className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => exec('underline')}
          title="Gạch chân (Underline)"
          className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-[#18294E] transition text-xs flex items-center justify-center cursor-pointer"
        >
          <Underline className="w-3.5 h-3.5" />
        </button>

        <div className="w-px h-4 bg-slate-200 dark:bg-[#1E293B] mx-1" />

        <button
          type="button"
          onClick={() => exec('insertUnorderedList')}
          title="Danh sách dấu đầu dòng (Bullet list)"
          className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-[#18294E] transition text-xs flex items-center justify-center cursor-pointer"
        >
          <List className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => exec('insertOrderedList')}
          title="Danh sách số (Numbered list)"
          className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-[#18294E] transition text-xs flex items-center justify-center cursor-pointer"
        >
          <ListOrdered className="w-3.5 h-3.5" />
        </button>

        <div className="w-px h-4 bg-slate-200 dark:bg-[#1E293B] mx-1" />

        <button
          type="button"
          onClick={() => exec('undo')}
          title="Hoàn tác (Undo)"
          className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-[#18294E] transition text-xs flex items-center justify-center cursor-pointer"
        >
          <Undo className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => exec('redo')}
          title="Làm lại (Redo)"
          className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-[#18294E] transition text-xs flex items-center justify-center cursor-pointer"
        >
          <Redo className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => exec('removeFormat')}
          title="Xóa định dạng"
          className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-[#18294E] transition text-xs flex items-center justify-center cursor-pointer"
        >
          <RemoveFormatting className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Editable Area */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        data-placeholder={placeholder}
        className="p-3 text-xs sm:text-sm text-slate-800 dark:text-slate-100 outline-none overflow-y-auto leading-relaxed empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400 empty:before:pointer-events-none"
        style={{ minHeight }}
      />
    </div>
  );
};
