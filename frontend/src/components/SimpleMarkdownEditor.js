import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Bold, Italic, Strikethrough, Heading1, Heading2, Heading3,
  List, ListOrdered, Quote, Code, Link as LinkIcon, Image as ImageIcon,
  Table as TableIcon, Minus, Eye, Edit3, Columns, HelpCircle,
  Undo2, Redo2, Eraser, Type
} from 'lucide-react';
import { markdownComponents, formatContentWithBullets } from '../lib/formatContent';

const SimpleMarkdownEditor = ({ value = '', onChange, placeholder = 'Write your content here...', rows = 14 }) => {
  const [viewMode, setViewMode] = useState('edit'); // 'edit' | 'split' | 'preview'
  const textareaRef = useRef(null);

  // Undo / Redo History Stack
  const [history, setHistory] = useState([value]);
  const [historyIdx, setHistoryIdx] = useState(0);

  // Sync external value initial state
  useEffect(() => {
    if (history.length === 1 && history[0] === '' && value) {
      setHistory([value]);
      setHistoryIdx(0);
    }
  }, [value]);

  const updateContent = (newValue) => {
    if (newValue === value) return;

    // Slice forward history if we were in the middle of undoing
    const updatedHistory = history.slice(0, historyIdx + 1);
    updatedHistory.push(newValue);
    if (updatedHistory.length > 50) updatedHistory.shift(); // max 50 steps

    setHistory(updatedHistory);
    setHistoryIdx(updatedHistory.length - 1);
    onChange({ target: { name: 'content', value: newValue } });
  };

  const handleUndo = () => {
    if (historyIdx > 0) {
      const prev = history[historyIdx - 1];
      setHistoryIdx(historyIdx - 1);
      onChange({ target: { name: 'content', value: prev } });
    }
  };

  const handleRedo = () => {
    if (historyIdx < history.length - 1) {
      const next = history[historyIdx + 1];
      setHistoryIdx(historyIdx + 1);
      onChange({ target: { name: 'content', value: next } });
    }
  };

  // Helper to remove markdown headings & styles from text
  const cleanMarkdown = (str) => {
    return str
      .replace(/^#{1,6}\s+/gm, '')     // Remove heading prefixes (# , ## , ### )
      .replace(/^>\s+/gm, '')          // Remove blockquote (> )
      .replace(/^[-*•]\s+/gm, '')      // Remove bullet points (- )
      .replace(/^\d+\.\s+/gm, '')      // Remove numbered list (1. )
      .replace(/\*\*(.*?)\*\*/g, '$1')   // Remove bold
      .replace(/\*(.*?)\*/g, '$1')       // Remove italic
      .replace(/~~(.*?)~~/g, '$1')     // Remove strikethrough
      .replace(/`(.*?)`/g, '$1');       // Remove code
  };

  const handleFormat = (type) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = value || '';
    const selectedText = text.substring(start, end);

    let replacement = '';

    switch (type) {
      case 'normal':
        // Converts selected text or current line back to plain normal text
        if (selectedText) {
          replacement = cleanMarkdown(selectedText);
        } else {
          // Find current line bounds
          const lineStart = text.lastIndexOf('\n', start - 1) + 1;
          const lineEnd = text.indexOf('\n', end);
          const actualEnd = lineEnd === -1 ? text.length : lineEnd;
          const currentLine = text.substring(lineStart, actualEnd);
          const cleanedLine = cleanMarkdown(currentLine);

          const newValue = text.substring(0, lineStart) + cleanedLine + text.substring(actualEnd);
          updateContent(newValue);
          setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(lineStart + cleanedLine.length, lineStart + cleanedLine.length);
          }, 0);
          return;
        }
        break;

      case 'h1':
        if (selectedText) {
          replacement = selectedText.startsWith('# ')
            ? selectedText.replace(/^#\s+/, '') // toggle off
            : `# ${cleanMarkdown(selectedText)}`;
        } else {
          replacement = `# Heading 1\n`;
        }
        break;

      case 'h2':
        if (selectedText) {
          replacement = selectedText.startsWith('## ')
            ? selectedText.replace(/^##\s+/, '') // toggle off
            : `## ${cleanMarkdown(selectedText)}`;
        } else {
          replacement = `## Heading 2\n`;
        }
        break;

      case 'h3':
        if (selectedText) {
          replacement = selectedText.startsWith('### ')
            ? selectedText.replace(/^###\s+/, '') // toggle off
            : `### ${cleanMarkdown(selectedText)}`;
        } else {
          replacement = `### Heading 3\n`;
        }
        break;

      case 'bold':
        replacement = selectedText.startsWith('**') && selectedText.endsWith('**')
          ? selectedText.slice(2, -2) // toggle off
          : `**${selectedText || 'Bold text'}**`;
        break;

      case 'italic':
        replacement = selectedText.startsWith('*') && selectedText.endsWith('*')
          ? selectedText.slice(1, -1) // toggle off
          : `*${selectedText || 'Italic text'}*`;
        break;

      case 'strikethrough':
        replacement = selectedText.startsWith('~~') && selectedText.endsWith('~~')
          ? selectedText.slice(2, -2)
          : `~~${selectedText || 'Strikethrough text'}~~`;
        break;

      case 'quote':
        replacement = selectedText ? `> ${selectedText}` : `> Quote text\n`;
        break;

      case 'code':
        replacement = selectedText.includes('\n')
          ? `\n\`\`\`\n${selectedText || 'code block'}\n\`\`\`\n`
          : `\`${selectedText || 'code'}\``;
        break;

      case 'ul':
        if (selectedText) {
          replacement = selectedText
            .split('\n')
            .map(line => line.startsWith('- ') ? line.replace(/^-\s+/, '') : `- ${line}`)
            .join('\n');
        } else {
          replacement = `\n- Bullet point 1\n- Bullet point 2\n`;
        }
        break;

      case 'ol':
        if (selectedText) {
          replacement = selectedText
            .split('\n')
            .map((line, i) => /^\d+\.\s+/.test(line) ? line.replace(/^\d+\.\s+/, '') : `${i + 1}. ${line}`)
            .join('\n');
        } else {
          replacement = `\n1. First item\n2. Second item\n`;
        }
        break;

      case 'link': {
        const displayLabel = selectedText || 'Link text';
        const rawUrl = prompt(`Insert Hyperlink for "${displayLabel}":\nEnter destination URL (e.g. https://x-space360.in or /guest/browse):`, 'https://');
        if (!rawUrl || rawUrl.trim() === '' || rawUrl === 'https://') return;
        const cleanUrl = rawUrl.trim();
        replacement = `[${displayLabel}](${cleanUrl})`;
        break;
      }

      case 'image':
        const imgUrl = prompt('Enter Image URL:', 'https://');
        if (!imgUrl) return;
        replacement = `![${selectedText || 'Image description'}](${imgUrl})`;
        break;

      case 'table':
        replacement = `\n| Column 1 | Column 2 | Column 3 |\n| :--- | :--- | :--- |\n| Data A | Data B | Data C |\n| Data X | Data Y | Data Z |\n`;
        break;

      case 'hr':
        replacement = `\n---\n`;
        break;

      default:
        return;
    }

    const newValue = text.substring(0, start) + replacement + text.substring(end);
    updateContent(newValue);

    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + replacement.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const handleTextareaChange = (e) => {
    updateContent(e.target.value);
  };

  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      handleFormat('link');
    }
  };

  const wordCount = (value || '').trim() ? (value || '').trim().split(/\s+/).length : 0;
  const charCount = (value || '').length;

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-white focus-within:border-terracotta focus-within:ring-2 focus-within:ring-terracotta/20 transition-all">
      {/* Top Toolbar Header */}
      <div className="bg-gray-50 border-b border-gray-200 p-2 flex flex-wrap items-center justify-between gap-2">
        {/* Left Toolbar Formatting Buttons */}
        <div className="flex items-center flex-wrap gap-1">
          {/* Undo / Redo */}
          <div className="flex items-center bg-white border border-gray-200 rounded-lg p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={handleUndo}
              disabled={historyIdx <= 0}
              className="p-1.5 hover:bg-gray-100 rounded text-gray-700 hover:text-terracotta transition disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-700"
              title="Undo (Ctrl+Z) - Go Back"
            >
              <Undo2 size={16} />
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={historyIdx >= history.length - 1}
              className="p-1.5 hover:bg-gray-100 rounded text-gray-700 hover:text-terracotta transition disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-700"
              title="Redo (Ctrl+Y) - Go Forward"
            >
              <Redo2 size={16} />
            </button>
          </div>

          <div className="w-[1px] h-6 bg-gray-300 mx-0.5" />

          {/* Headings & Normal Text */}
          <div className="flex items-center bg-white border border-gray-200 rounded-lg p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={() => handleFormat('normal')}
              className="p-1.5 hover:bg-gray-100 rounded text-gray-700 hover:text-terracotta transition font-semibold text-xs flex items-center gap-1"
              title="Normal Paragraph (Remove H1/H2/H3 formatting)"
            >
              <Type size={16} />
              <span>Normal</span>
            </button>
            <button
              type="button"
              onClick={() => handleFormat('h1')}
              className="p-1.5 hover:bg-gray-100 rounded text-gray-700 hover:text-terracotta transition font-bold text-xs flex items-center gap-1"
              title="Heading 1 (H1) - Click again to remove"
            >
              <Heading1 size={16} />
              <span>H1</span>
            </button>
            <button
              type="button"
              onClick={() => handleFormat('h2')}
              className="p-1.5 hover:bg-gray-100 rounded text-gray-700 hover:text-terracotta transition font-bold text-xs flex items-center gap-1"
              title="Heading 2 (H2) - Click again to remove"
            >
              <Heading2 size={16} />
              <span>H2</span>
            </button>
            <button
              type="button"
              onClick={() => handleFormat('h3')}
              className="p-1.5 hover:bg-gray-100 rounded text-gray-700 hover:text-terracotta transition font-bold text-xs flex items-center gap-1"
              title="Heading 3 (H3) - Click again to remove"
            >
              <Heading3 size={16} />
              <span>H3</span>
            </button>
          </div>

          <div className="w-[1px] h-6 bg-gray-300 mx-0.5" />

          {/* Text Style */}
          <div className="flex items-center bg-white border border-gray-200 rounded-lg p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={() => handleFormat('bold')}
              className="p-1.5 hover:bg-gray-100 rounded text-gray-700 hover:text-terracotta transition font-bold"
              title="Bold"
            >
              <Bold size={16} />
            </button>
            <button
              type="button"
              onClick={() => handleFormat('italic')}
              className="p-1.5 hover:bg-gray-100 rounded text-gray-700 hover:text-terracotta transition"
              title="Italic"
            >
              <Italic size={16} />
            </button>
            <button
              type="button"
              onClick={() => handleFormat('strikethrough')}
              className="p-1.5 hover:bg-gray-100 rounded text-gray-700 hover:text-terracotta transition"
              title="Strikethrough"
            >
              <Strikethrough size={16} />
            </button>
            <button
              type="button"
              onClick={() => handleFormat('normal')}
              className="p-1.5 hover:bg-red-50 text-gray-500 hover:text-red-600 rounded transition"
              title="Clear Formatting (Remove Bold, Italic, Headings)"
            >
              <Eraser size={16} />
            </button>
          </div>

          <div className="w-[1px] h-6 bg-gray-300 mx-0.5" />

          {/* Lists & Quotes */}
          <div className="flex items-center bg-white border border-gray-200 rounded-lg p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={() => handleFormat('ul')}
              className="p-1.5 hover:bg-gray-100 rounded text-gray-700 hover:text-terracotta transition"
              title="Bullet List"
            >
              <List size={16} />
            </button>
            <button
              type="button"
              onClick={() => handleFormat('ol')}
              className="p-1.5 hover:bg-gray-100 rounded text-gray-700 hover:text-terracotta transition"
              title="Numbered List"
            >
              <ListOrdered size={16} />
            </button>
            <button
              type="button"
              onClick={() => handleFormat('quote')}
              className="p-1.5 hover:bg-gray-100 rounded text-gray-700 hover:text-terracotta transition"
              title="Quote"
            >
              <Quote size={16} />
            </button>
            <button
              type="button"
              onClick={() => handleFormat('code')}
              className="p-1.5 hover:bg-gray-100 rounded text-gray-700 hover:text-terracotta transition"
              title="Code Block"
            >
              <Code size={16} />
            </button>
          </div>

          <div className="w-[1px] h-6 bg-gray-300 mx-0.5" />

          {/* Media & Objects */}
          <div className="flex items-center bg-white border border-gray-200 rounded-lg p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={() => handleFormat('link')}
              className="p-1.5 px-2 hover:bg-terracotta/10 hover:text-terracotta rounded text-gray-700 font-semibold text-xs flex items-center gap-1.5 transition border border-transparent hover:border-terracotta/20"
              title="Add Hyperlink to selected text (Ctrl+K)"
            >
              <LinkIcon size={15} />
              <span>Link</span>
            </button>
            <button
              type="button"
              onClick={() => handleFormat('image')}
              className="p-1.5 hover:bg-gray-100 rounded text-gray-700 hover:text-terracotta transition"
              title="Insert Image URL"
            >
              <ImageIcon size={16} />
            </button>
            <button
              type="button"
              onClick={() => handleFormat('table')}
              className="p-1.5 hover:bg-gray-100 rounded text-gray-700 hover:text-terracotta transition"
              title="Insert Markdown Table"
            >
              <TableIcon size={16} />
            </button>
            <button
              type="button"
              onClick={() => handleFormat('hr')}
              className="p-1.5 hover:bg-gray-100 rounded text-gray-700 hover:text-terracotta transition"
              title="Horizontal Divider"
            >
              <Minus size={16} />
            </button>
          </div>
        </div>

        {/* Right View Mode Switcher */}
        <div className="flex items-center bg-gray-200 p-0.5 rounded-lg text-xs font-semibold">
          <button
            type="button"
            onClick={() => setViewMode('edit')}
            className={`px-2.5 py-1 rounded-md flex items-center gap-1 transition ${
              viewMode === 'edit' ? 'bg-white text-charcoal shadow-xs font-bold' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Edit3 size={13} />
            <span>Write</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('split')}
            className={`px-2.5 py-1 rounded-md flex items-center gap-1 transition ${
              viewMode === 'split' ? 'bg-white text-charcoal shadow-xs font-bold' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Columns size={13} />
            <span>Split</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('preview')}
            className={`px-2.5 py-1 rounded-md flex items-center gap-1 transition ${
              viewMode === 'preview' ? 'bg-white text-terracotta shadow-xs font-bold' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Eye size={13} />
            <span>Preview</span>
          </button>
        </div>
      </div>

      {/* Editor Body depending on ViewMode */}
      {viewMode === 'edit' && (
        <textarea
          ref={textareaRef}
          name="content"
          value={value}
          onChange={handleTextareaChange}
          onKeyDown={handleKeyDown}
          rows={rows}
          placeholder={placeholder}
          className="w-full p-4 text-sm font-sans text-gray-800 leading-relaxed outline-none resize-y min-h-[300px]"
        />
      )}

      {viewMode === 'split' && (
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-200 min-h-[350px]">
          <textarea
            ref={textareaRef}
            name="content"
            value={value}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            rows={rows}
            placeholder={placeholder}
            className="w-full p-4 text-sm font-sans text-gray-800 leading-relaxed outline-none resize-y"
          />
          <div className="p-4 bg-gray-50/50 overflow-y-auto max-h-[500px]">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Live Formatted Preview</div>
            <div className="prose prose-sm max-w-none">
              {value ? (
                <ReactMarkdown components={markdownComponents}>
                  {formatContentWithBullets(value)}
                </ReactMarkdown>
              ) : (
                <p className="text-gray-400 italic text-sm">Nothing to preview yet.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {viewMode === 'preview' && (
        <div className="p-6 bg-white min-h-[350px] overflow-y-auto">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-4">
            <span className="text-xs font-bold text-terracotta uppercase tracking-wider">Full Live Visual Preview</span>
            <span className="text-xs text-gray-400">This is how your post content will look to users</span>
          </div>
          <div className="prose prose-lg max-w-none text-gray-800">
            {value ? (
              <ReactMarkdown components={markdownComponents}>
                {formatContentWithBullets(value)}
              </ReactMarkdown>
            ) : (
              <p className="text-gray-400 italic text-sm">Nothing to preview yet. Switch to "Write" mode to add content.</p>
            )}
          </div>
        </div>
      )}

      {/* Editor Footer Status Bar */}
      <div className="bg-gray-50 border-t border-gray-100 px-3 py-1.5 flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-2 text-gray-500">
          <HelpCircle size={13} className="text-terracotta" />
          <span>Tip: Click <b>Undo</b> to revert changes. Click <b>Normal</b> or <b>Eraser</b> to remove H1/H2 formatting.</span>
        </div>
        <div className="flex items-center gap-3">
          <span><b>{wordCount}</b> words</span>
          <span>•</span>
          <span><b>{charCount}</b> chars</span>
        </div>
      </div>
    </div>
  );
};

export default SimpleMarkdownEditor;
