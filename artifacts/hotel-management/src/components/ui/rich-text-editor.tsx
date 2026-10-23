"use client";

import React, { useRef, useState, useEffect } from "react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Quote,
  Link as LinkIcon,
  Table as TableIcon,
  Code,
  Undo,
  Redo,
  RemoveFormatting,
  Indent,
  Outdent,
} from "lucide-react";

interface RichTextEditorProps {
  name: string;
  defaultValue?: string;
  value?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
  isEditable?: boolean;
}

export function RichTextEditor({
  name,
  defaultValue = "",
  value,
  onChange,
  placeholder = "Write terms, policies, or agreements...",
  minHeight = "220px",
  isEditable = true,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [htmlContent, setHtmlContent] = useState<string>(value ?? defaultValue);
  const [isSourceMode, setIsSourceMode] = useState(false);

  useEffect(() => {
    const val = value !== undefined ? value : defaultValue;
    setHtmlContent(val);
    if (editorRef.current && editorRef.current.innerHTML !== val) {
      editorRef.current.innerHTML = val;
    }
  }, [value, defaultValue, isEditable]);

  const handleInput = () => {
    if (editorRef.current) {
      const content = editorRef.current.innerHTML;
      setHtmlContent(content);
      onChange?.(content);
    }
  };

  const exec = (command: string, value: string | undefined = undefined) => {
    if (!isEditable) return;
    document.execCommand(command, false, value);
    if (editorRef.current) {
      editorRef.current.focus();
      handleInput();
    }
  };

  const handleLink = () => {
    const url = window.prompt("Enter link URL:", "https://");
    if (url) {
      exec("createLink", url);
    }
  };

  const handleInsertTable = () => {
    const tableHtml = `
      <table style="width:100%; border-collapse:collapse; margin: 12px 0;">
        <thead>
          <tr style="background:#f1f5f9; border-bottom: 2px solid #cbd5e1;">
            <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: left;">Item / Policy</th>
            <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: left;">Standard Terms</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding: 8px; border: 1px solid #cbd5e1;">Standard Term 1</td>
            <td style="padding: 8px; border: 1px solid #cbd5e1;">Applicable Conditions</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #cbd5e1;">Standard Term 2</td>
            <td style="padding: 8px; border: 1px solid #cbd5e1;">Applicable Conditions</td>
          </tr>
        </tbody>
      </table>
    `;
    exec("insertHTML", tableHtml);
  };

  const handleHeadingChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const format = e.target.value;
    if (format === "p") {
      exec("formatBlock", "<p>");
    } else {
      exec("formatBlock", `<${format}>`);
    }
  };

  // If in read-only mode, display styled rich HTML content
  if (!isEditable) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-hover)] p-5 text-sm text-[var(--text-primary)] leading-relaxed shadow-2xs font-sans overflow-x-auto">
        <div
          className="prose prose-sm dark:prose-invert max-w-none space-y-2.5 [&>h1]:text-lg [&>h1]:font-bold [&>h2]:text-base [&>h2]:font-bold [&>h3]:text-sm [&>h3]:font-bold [&>p]:leading-relaxed [&>ul]:list-disc [&>ul]:pl-5 [&>ol]:list-decimal [&>ol]:pl-5 [&>blockquote]:border-l-4 [&>blockquote]:border-blue-700 [&>blockquote]:pl-3 [&>blockquote]:italic [&>table]:w-full [&>table]:border-collapse [&>table_th]:border [&>table_th]:border-[var(--border)] [&>table_th]:p-2 [&>table_td]:border [&>table_td]:border-[var(--border)] [&>table_td]:p-2"
          dangerouslySetInnerHTML={{ __html: htmlContent || defaultValue }}
        />
        <input type="hidden" name={name} value={htmlContent} />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-xs overflow-hidden transition-all focus-within:border-blue-700 focus-within:ring-1 focus-within:ring-blue-700">
      {/* Top Menu Bar */}
      <div className="flex items-center gap-4 px-3 py-1.5 border-b border-[var(--border)] bg-[var(--surface-hover)] text-xs font-medium text-[var(--text-secondary)] select-none">
        <span className="hover:text-[var(--text-primary)] cursor-pointer">Edit</span>
        <span className="hover:text-[var(--text-primary)] cursor-pointer" onClick={() => handleLink()}>Insert</span>
        <span className="hover:text-[var(--text-primary)] cursor-pointer" onClick={() => setIsSourceMode(!isSourceMode)}>View</span>
        <span className="hover:text-[var(--text-primary)] cursor-pointer">Format</span>
        <span className="hover:text-[var(--text-primary)] cursor-pointer" onClick={handleInsertTable}>Table</span>
        <span className="hover:text-[var(--text-primary)] cursor-pointer">Tools</span>
      </div>

      {/* Main WYSIWYG Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-1.5 border-b border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)]">
        {/* Source Mode Toggle */}
        <button
          type="button"
          onClick={() => setIsSourceMode(!isSourceMode)}
          className={`p-1.5 rounded hover:bg-[var(--surface-hover)] transition-colors ${
            isSourceMode ? "bg-blue-700/10 text-blue-700" : ""
          }`}
          title="HTML Source Code"
        >
          <Code className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-4 bg-[var(--border)] mx-1" />

        {/* Basic Formatting */}
        <button
          type="button"
          onClick={() => exec("bold")}
          className="p-1.5 rounded hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-colors"
          title="Bold (Ctrl+B)"
        >
          <Bold className="w-4 h-4 font-bold" />
        </button>
        <button
          type="button"
          onClick={() => exec("italic")}
          className="p-1.5 rounded hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-colors"
          title="Italic (Ctrl+I)"
        >
          <Italic className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => exec("underline")}
          className="p-1.5 rounded hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-colors"
          title="Underline (Ctrl+U)"
        >
          <Underline className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => exec("strikeThrough")}
          className="p-1.5 rounded hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-colors"
          title="Strikethrough"
        >
          <Strikethrough className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-4 bg-[var(--border)] mx-1" />

        {/* Alignment */}
        <button
          type="button"
          onClick={() => exec("justifyLeft")}
          className="p-1.5 rounded hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-colors"
          title="Align Left"
        >
          <AlignLeft className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => exec("justifyCenter")}
          className="p-1.5 rounded hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-colors"
          title="Align Center"
        >
          <AlignCenter className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => exec("justifyRight")}
          className="p-1.5 rounded hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-colors"
          title="Align Right"
        >
          <AlignRight className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => exec("justifyFull")}
          className="p-1.5 rounded hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-colors"
          title="Justify"
        >
          <AlignJustify className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-4 bg-[var(--border)] mx-1" />

        {/* Paragraph / Heading Style Select */}
        <select
          onChange={handleHeadingChange}
          className="h-7 px-2 text-xs rounded border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
          defaultValue="p"
        >
          <option value="p">Paragraph</option>
          <option value="h2">Heading 1</option>
          <option value="h3">Heading 2</option>
          <option value="h4">Heading 3</option>
        </select>

        <div className="w-[1px] h-4 bg-[var(--border)] mx-1" />

        {/* Blockquote */}
        <button
          type="button"
          onClick={() => exec("formatBlock", "<blockquote>")}
          className="p-1.5 rounded hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-colors"
          title="Blockquote"
        >
          <Quote className="w-4 h-4" />
        </button>

        {/* Lists */}
        <button
          type="button"
          onClick={() => exec("insertUnorderedList")}
          className="p-1.5 rounded hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-colors"
          title="Bullet List"
        >
          <List className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => exec("insertOrderedList")}
          className="p-1.5 rounded hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-colors"
          title="Numbered List"
        >
          <ListOrdered className="w-4 h-4" />
        </button>

        {/* Indent / Outdent */}
        <button
          type="button"
          onClick={() => exec("outdent")}
          className="p-1.5 rounded hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-colors"
          title="Decrease Indent"
        >
          <Outdent className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => exec("indent")}
          className="p-1.5 rounded hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-colors"
          title="Increase Indent"
        >
          <Indent className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-4 bg-[var(--border)] mx-1" />

        {/* Link & Table */}
        <button
          type="button"
          onClick={handleLink}
          className="p-1.5 rounded hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-colors"
          title="Insert Link"
        >
          <LinkIcon className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={handleInsertTable}
          className="p-1.5 rounded hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-colors"
          title="Insert Table"
        >
          <TableIcon className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => exec("removeFormat")}
          className="p-1.5 rounded hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-colors"
          title="Clear Formatting"
        >
          <RemoveFormatting className="w-4 h-4" />
        </button>
      </div>

      {/* Editor Content Area */}
      {isSourceMode ? (
        <textarea
          value={htmlContent}
          onChange={(e) => {
            setHtmlContent(e.target.value);
            onChange?.(e.target.value);
            if (editorRef.current) {
              editorRef.current.innerHTML = e.target.value;
            }
          }}
          style={{ minHeight }}
          className="w-full p-4 font-mono text-xs text-[var(--text-primary)] bg-[var(--surface-hover)] border-0 outline-none resize-y"
        />
      ) : (
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          onBlur={handleInput}
          style={{ minHeight }}
          className="p-4 text-sm text-[var(--text-primary)] outline-none leading-relaxed prose prose-sm dark:prose-invert max-w-none [&>h1]:text-lg [&>h1]:font-bold [&>h2]:text-base [&>h2]:font-bold [&>h3]:text-sm [&>h3]:font-bold [&>p]:leading-relaxed [&>ul]:list-disc [&>ul]:pl-5 [&>ol]:list-decimal [&>ol]:pl-5 [&>blockquote]:border-l-4 [&>blockquote]:border-blue-700 [&>blockquote]:pl-3 [&>blockquote]:italic"
        />
      )}

      {/* Hidden input to ensure form submission includes HTML value */}
      <input type="hidden" name={name} value={htmlContent} />
    </div>
  );
}
