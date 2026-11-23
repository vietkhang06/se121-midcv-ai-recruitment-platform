'use client';

import { useEffect, useRef } from 'react';
import { Bold, Italic, Underline, List, ListOrdered, Undo, Redo, RemoveFormatting } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { sanitizeRichText } from '@/components/editor/RichText';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  minHeight?: string;
}

const tools = [
  ['bold', Bold, 'In đậm', 'Bold'],
  ['italic', Italic, 'In nghiêng', 'Italic'],
  ['underline', Underline, 'Gạch chân', 'Underline'],
  ['insertUnorderedList', List, 'Danh sách dấu đầu dòng', 'Bullet list'],
  ['insertOrderedList', ListOrdered, 'Danh sách đánh số', 'Numbered list'],
  ['undo', Undo, 'Hoàn tác', 'Undo'],
  ['redo', Redo, 'Làm lại', 'Redo'],
  ['removeFormat', RemoveFormatting, 'Xóa định dạng', 'Clear formatting'],
] as const;

export function RichTextEditor({
  value, onChange, label, placeholder, className = '', minHeight = '100px',
}: RichTextEditorProps) {
  const { locale } = useLanguage();
  const isVi = locale === 'vi';
  const editorRef = useRef<HTMLDivElement>(null);
  const lastValue = useRef<string | null>(null);
  const selectionRange = useRef<Range | null>(null);
  const fieldLabel = label ?? (isVi ? 'Nội dung văn bản' : 'Text content');

  useEffect(() => {
    if (editorRef.current && value !== lastValue.current) {
      editorRef.current.innerHTML = sanitizeRichText(value || '');
      lastValue.current = value;
      selectionRange.current = null;
    }
  }, [value]);

  function rememberSelection() {
    const range = window.getSelection();
    if (range?.rangeCount && editorRef.current?.contains(range.getRangeAt(0).commonAncestorContainer)) {
      selectionRange.current = range.getRangeAt(0).cloneRange();
    }
  }

  function handleInput() {
    const html = sanitizeRichText(editorRef.current?.innerHTML || '');
    lastValue.current = html;
    onChange(html);
    rememberSelection();
  }

  function applyCommand(command: string) {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    const selection = window.getSelection();
    if (selectionRange.current && editor.contains(selectionRange.current.commonAncestorContainer)) {
      selection?.removeAllRanges();
      selection?.addRange(selectionRange.current);
    }
    document.execCommand(command, false);
    handleInput();
  }

  return <div className={className}>
    {label && <span className="mb-1 block text-sm font-semibold">{label}</span>}
    <div className="overflow-hidden rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] focus-within:border-[var(--primary)]">
      <div role="toolbar" aria-label={isVi ? 'Định dạng văn bản' : 'Text formatting'} className="flex flex-wrap gap-1 border-b border-[var(--border-soft)] bg-[var(--surface-secondary)] p-2">
        {tools.map(([command, Icon, vi, en]) => <button
          key={command} type="button" title={isVi ? vi : en} aria-label={isVi ? vi : en}
          onMouseDown={event => event.preventDefault()} onClick={() => applyCommand(command)}
          className="rounded-md p-2 hover:bg-[var(--surface)] focus-visible:outline-2 focus-visible:outline-[var(--primary)]"
        ><Icon className="size-4" /></button>)}
      </div>
      <div
        ref={editorRef} role="textbox" aria-label={fieldLabel} aria-multiline="true"
        contentEditable suppressContentEditableWarning
        onInput={handleInput} onMouseUp={rememberSelection} onKeyUp={rememberSelection} onBlur={rememberSelection}
        onDrop={event => event.preventDefault()}
        onPaste={event => {
          event.preventDefault();
          document.execCommand('insertText', false, event.clipboardData.getData('text/plain'));
        }}
        data-placeholder={placeholder || (isVi ? 'Nhập nội dung…' : 'Enter text…')}
        className="midcv-richtext break-words p-3 text-sm leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--primary)] empty:before:pointer-events-none empty:before:text-[var(--text-secondary)] empty:before:content-[attr(data-placeholder)]"
        style={{ minHeight }}
      />
    </div>
  </div>;
}
