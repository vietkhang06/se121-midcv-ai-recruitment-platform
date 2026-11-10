"use client";

import React, { useEffect, useRef, useMemo, useSyncExternalStore } from "react";

const tags = new Set([
  "P",
  "BR",
  "DIV",
  "SPAN",
  "B",
  "STRONG",
  "I",
  "EM",
  "U",
  "UL",
  "OL",
  "LI",
  "H2",
  "H3",
  "BLOCKQUOTE",
  "FONT",
]);
const fonts = ["Arial", "Georgia", "Times New Roman", "Verdana"];
const blockTags = new Set([
  "P",
  "DIV",
  "LI",
  "H2",
  "H3",
  "BLOCKQUOTE",
]);

/**
 * Reads a selected DOM fragment as visual lines. Range#toString() drops BR
 * elements, which was the reason a multi-line selection became one final list
 * item in Chromium. This walker preserves both BR and block boundaries.
 */
export function richTextSelectionLines(fragment: DocumentFragment): string[] {
  const lines: string[] = [];
  let current = "";
  const flush = () => {
    const value = current.replace(/\u00a0/g, " ").trim();
    if (value) lines.push(value);
    current = "";
  };
  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      current += node.textContent || "";
      return;
    }
    if (!(node instanceof HTMLElement)) return;
    if (node.tagName === "BR") {
      flush();
      return;
    }
    const block = blockTags.has(node.tagName);
    if (block && current.trim()) flush();
    [...node.childNodes].forEach(walk);
    if (block) flush();
  };
  [...fragment.childNodes].forEach(walk);
  flush();
  return lines;
}

function escapeHtml(text: string): string {
  const element = document.createElement("div");
  element.textContent = text;
  return element.innerHTML;
}

/** Only text, structural tags and bounded presentation styles survive. No URLs or attributes from pasted HTML. */
export function sanitizeRichText(html: string): string {
  if (typeof document === "undefined") return "";
  const source = new DOMParser().parseFromString(html, "text/html");
  const output = document.createElement("div");
  const copy = (node: Node, target: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      target.appendChild(document.createTextNode(node.textContent || ""));
      return;
    }
    if (!(node instanceof HTMLElement)) return;
    if (
      ["SCRIPT", "STYLE", "IFRAME", "OBJECT", "SVG", "MATH", "IMG"].includes(
        node.tagName,
      )
    )
      return;
    if (!tags.has(node.tagName)) {
      [...node.childNodes].forEach((child) => copy(child, target));
      return;
    }
    const element = document.createElement(
      node.tagName === "FONT" ? "span" : node.tagName.toLowerCase(),
    );
    const face =
      node.getAttribute("face") || node.style.fontFamily.replace(/["']/g, "");
    if (fonts.includes(face)) element.style.fontFamily = face;
    const size = node.getAttribute("size");
    const px = size
      ? (
          {
            "1": 10,
            "2": 13,
            "3": 16,
            "4": 18,
            "5": 24,
            "6": 30,
            "7": 32,
          } as Record<string, number>
        )[size]
      : Number.parseFloat(node.style.fontSize);
    if (Number.isFinite(px) && px >= 10 && px <= 32)
      element.style.fontSize = `${px}px`;
    if (["left", "center", "right", "justify"].includes(node.style.textAlign))
      element.style.textAlign = node.style.textAlign;
    [...node.childNodes].forEach((child) => copy(child, element));
    target.appendChild(element);
  };
  [...source.body.childNodes].forEach((child) => copy(child, output));
  return output.innerHTML;
}

export function richTextPlain(html: string): string {
  if (typeof document === "undefined") return html.replace(/<[^>]*>/g, "");
  const div = document.createElement("div");
  div.innerHTML = sanitizeRichText(html)
    .replace(/<\/(p|div|li|h2|h3)>/g, "</$1>\n")
    .replace(/<br\s*\/?\s*>/g, "\n");
  return (div.textContent || "").trim();
}

export function RichTextDisplay({
  html,
  fallback = "",
}: {
  html?: string;
  fallback?: string;
}) {
  const client = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const safe = useMemo(
    () => (client ? sanitizeRichText(html || "") : ""),
    [html, client],
  );
  if (!safe)
    return <p className="whitespace-pre-wrap break-words">{fallback}</p>;
  return (
    <div
      className="midcv-richtext break-words"
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  );
}

export function RichTextEditor({
  label,
  value,
  onChange,
  placeholder = "Nhập nội dung…",
}: {
  label: string;
  value: string;
  onChange: (html: string, text: string) => void;
  placeholder?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const range = useRef<Range | null>(null);
  const last = useRef("");
  useEffect(() => {
    if (ref.current && value !== last.current) {
      ref.current.innerHTML = sanitizeRichText(value);
      last.current = value;
    }
  }, [value]);
  const remember = () => {
    const selection = window.getSelection();
    if (selection?.rangeCount && ref.current?.contains(selection.anchorNode))
      range.current = selection.getRangeAt(0).cloneRange();
  };
  const emit = () => {
    const html = sanitizeRichText(ref.current?.innerHTML || "");
    last.current = html;
    onChange(html, richTextPlain(html));
    remember();
  };
  const command = (name: string, arg?: string) => {
    ref.current?.focus();
    const selection = window.getSelection();
    if (
      range.current &&
      ref.current?.contains(range.current.commonAncestorContainer)
    ) {
      selection?.removeAllRanges();
      selection?.addRange(range.current);
    }
    if (
      (name === "insertUnorderedList" || name === "insertOrderedList") &&
      range.current &&
      !range.current.collapsed
    ) {
      const lines = richTextSelectionLines(range.current.cloneContents());
      if (lines.length > 1) {
        const tag = name === "insertOrderedList" ? "ol" : "ul";
        const html = `<${tag}>${lines
          .map((line) => `<li>${escapeHtml(line)}</li>`)
          .join("")}</${tag}>`;
        document.execCommand("insertHTML", false, html);
        emit();
        return;
      }
    }
    document.execCommand(name, false, arg);
    emit();
  };
  return (
    <div className="space-y-2">
      <span className="block text-sm font-semibold">{label}</span>
      <div className="overflow-hidden rounded-xl border border-slate-300 bg-white text-slate-900 shadow-sm">
        <div
          role="toolbar"
          aria-label={`Định dạng ${label}`}
          className="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-slate-50 p-2"
        >
          <select
            aria-label="Font chữ"
            className="rounded border border-slate-200 p-1.5 text-xs"
            defaultValue="Arial"
            onChange={(e) => command("fontName", e.target.value)}
          >
            {fonts.map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
          <select
            aria-label="Cỡ chữ"
            className="rounded border border-slate-200 p-1.5 text-xs"
            defaultValue="3"
            onChange={(e) => command("fontSize", e.target.value)}
          >
            {[
              ["2", "13"],
              ["3", "16"],
              ["4", "18"],
              ["5", "24"],
              ["6", "30"],
            ].map(([v, t]) => (
              <option key={v} value={v}>
                {t}px
              </option>
            ))}
          </select>
          <select
            aria-label="Kiểu đoạn"
            className="rounded border border-slate-200 p-1.5 text-xs"
            defaultValue="p"
            onChange={(e) => command("formatBlock", e.target.value)}
          >
            <option value="p">Đoạn văn</option>
            <option value="h2">Tiêu đề lớn</option>
            <option value="h3">Tiêu đề nhỏ</option>
            <option value="blockquote">Trích dẫn</option>
          </select>
          {(
            [
              ["bold", "B", "In đậm"],
              ["italic", "I", "In nghiêng"],
              ["underline", "U", "Gạch chân"],
              ["insertUnorderedList", "•", "Danh sách"],
              ["insertOrderedList", "1.", "Đánh số"],
              ["justifyLeft", "⇤", "Căn trái"],
              ["justifyCenter", "↔", "Căn giữa"],
              ["justifyRight", "⇥", "Căn phải"],
              ["undo", "↶", "Hoàn tác"],
              ["redo", "↷", "Làm lại"],
              ["removeFormat", "Tx", "Xóa định dạng"],
            ] as const
          ).map(([cmd, text, title]) => (
            <button
              key={cmd}
              type="button"
              title={title}
              aria-label={title}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => command(cmd)}
              className="min-w-8 rounded px-2 py-1.5 text-sm font-semibold hover:bg-emerald-100 focus-visible:ring-2 focus-visible:ring-emerald-600"
            >
              {text}
            </button>
          ))}
        </div>
        <div
          ref={ref}
          role="textbox"
          aria-label={label}
          aria-multiline="true"
          contentEditable
          suppressContentEditableWarning
          data-placeholder={placeholder}
          onInput={emit}
          onMouseUp={remember}
          onKeyUp={remember}
          onBlur={remember}
          onPaste={(e) => {
            e.preventDefault();
            command("insertText", e.clipboardData.getData("text/plain"));
          }}
          className="midcv-richtext min-h-40 p-4 outline-none focus:ring-2 focus:ring-inset focus:ring-emerald-600"
        />
      </div>
    </div>
  );
}
