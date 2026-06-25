'use client';

import React, { useRef, useEffect, useState } from 'react';
import { 
  Bold, Italic, Underline, Strikethrough, 
  List, ListOrdered, AlignLeft, AlignCenter, AlignRight, 
  Type, Palette, Highlighter, Undo2, Redo2, Trash2 
} from 'lucide-react';

export default function RichTextEditor({ value, onChange, placeholder = 'Escribe aquí tu nota...' }) {
  const editorRef = useRef(null);
  const [activeStates, setActiveStates] = useState({
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    listUnordered: false,
    listOrdered: false,
  });
  
  const [showColorMenu, setShowColorMenu] = useState(false);
  const [showHighlightMenu, setShowHighlightMenu] = useState(false);

  // Sync external changes to the editor, but only if the content is truly different.
  // This prevents cursor jumping when typing.
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
    checkActiveStates();
  };

  const checkActiveStates = () => {
    if (typeof document === 'undefined') return;
    try {
      setActiveStates({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
        strikethrough: document.queryCommandState('strikeThrough'),
        listUnordered: document.queryCommandState('insertUnorderedList'),
        listOrdered: document.queryCommandState('insertOrderedList'),
      });
    } catch (e) {
      // Fail silently if commands are not supported in specific state
    }
  };

  const execCommand = (e, command, argument = null) => {
    e.preventDefault();
    if (typeof document !== 'undefined') {
      document.execCommand(command, false, argument);
      handleInput();
      if (editorRef.current) {
        editorRef.current.focus();
      }
    }
  };

  const colors = [
    { name: 'Negro', code: '#000000', textClass: 'text-zinc-950 dark:text-white' },
    { name: 'Gris', code: '#71717a', textClass: 'text-zinc-500' },
    { name: 'Rojo', code: '#dc2626', textClass: 'text-red-600' },
    { name: 'Azul', code: '#2563eb', textClass: 'text-blue-600' },
    { name: 'Verde', code: '#16a34a', textClass: 'text-green-600' },
  ];

  const highlights = [
    { name: 'Ninguno', code: 'transparent', bgClass: 'bg-transparent border border-zinc-200' },
    { name: 'Amarillo', code: '#fef08a', bgClass: 'bg-yellow-200' },
    { name: 'Verde', code: '#bbf7d0', bgClass: 'bg-green-200' },
    { name: 'Azul', code: '#bfdbfe', bgClass: 'bg-blue-200' },
    { name: 'Rojo', code: '#fecaca', bgClass: 'bg-red-200' },
  ];

  return (
    <div className="flex flex-col rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden min-h-[380px] focus-within:border-red-500 focus-within:ring-2 focus-within:ring-red-500/10 transition-all">
      {/* Editor Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 select-none">
        
        {/* Undo / Redo */}
        <button
          onClick={(e) => execCommand(e, 'undo')}
          title="Deshacer (Ctrl+Z)"
          className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors"
        >
          <Undo2 className="h-4 w-4" />
        </button>
        <button
          onClick={(e) => execCommand(e, 'redo')}
          title="Rehacer (Ctrl+Y)"
          className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors"
        >
          <Redo2 className="h-4 w-4" />
        </button>

        <div className="w-[1px] h-4 bg-zinc-200 dark:bg-zinc-800 mx-1" />

        {/* Text Formats */}
        <button
          onClick={(e) => execCommand(e, 'bold')}
          title="Negrita"
          className={`p-1.5 rounded transition-colors ${
            activeStates.bold 
              ? 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 font-bold' 
              : 'hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300'
          }`}
        >
          <Bold className="h-4 w-4" />
        </button>
        <button
          onClick={(e) => execCommand(e, 'italic')}
          title="Cursiva"
          className={`p-1.5 rounded transition-colors ${
            activeStates.italic 
              ? 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400' 
              : 'hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300'
          }`}
        >
          <Italic className="h-4 w-4" />
        </button>
        <button
          onClick={(e) => execCommand(e, 'underline')}
          title="Subrayado"
          className={`p-1.5 rounded transition-colors ${
            activeStates.underline 
              ? 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400' 
              : 'hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300'
          }`}
        >
          <Underline className="h-4 w-4" />
        </button>
        <button
          onClick={(e) => execCommand(e, 'strikeThrough')}
          title="Tachado"
          className={`p-1.5 rounded transition-colors ${
            activeStates.strikethrough 
              ? 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400' 
              : 'hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300'
          }`}
        >
          <Strikethrough className="h-4 w-4" />
        </button>

        <div className="w-[1px] h-4 bg-zinc-200 dark:bg-zinc-800 mx-1" />

        {/* Headings */}
        <button
          onClick={(e) => execCommand(e, 'formatBlock', '<h1>')}
          title="Título Grande"
          className="px-2 py-1 text-xs font-black rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors"
        >
          H1
        </button>
        <button
          onClick={(e) => execCommand(e, 'formatBlock', '<h2>')}
          title="Título Mediano"
          className="px-2 py-1 text-xs font-extrabold rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors"
        >
          H2
        </button>
        <button
          onClick={(e) => execCommand(e, 'formatBlock', '<h3>')}
          title="Título Pequeño"
          className="px-2 py-1 text-xs font-bold rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors"
        >
          H3
        </button>
        <button
          onClick={(e) => execCommand(e, 'formatBlock', '<p>')}
          title="Texto Normal"
          className="px-2 py-1 text-xs font-medium rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors"
        >
          P
        </button>

        <div className="w-[1px] h-4 bg-zinc-200 dark:bg-zinc-800 mx-1" />

        {/* Lists */}
        <button
          onClick={(e) => execCommand(e, 'insertUnorderedList')}
          title="Lista con viñetas"
          className={`p-1.5 rounded transition-colors ${
            activeStates.listUnordered 
              ? 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400' 
              : 'hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300'
          }`}
        >
          <List className="h-4 w-4" />
        </button>
        <button
          onClick={(e) => execCommand(e, 'insertOrderedList')}
          title="Lista numerada"
          className={`p-1.5 rounded transition-colors ${
            activeStates.listOrdered 
              ? 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400' 
              : 'hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300'
          }`}
        >
          <ListOrdered className="h-4 w-4" />
        </button>

        <div className="w-[1px] h-4 bg-zinc-200 dark:bg-zinc-800 mx-1" />

        {/* Alignment */}
        <button
          onClick={(e) => execCommand(e, 'justifyLeft')}
          title="Alinear a la izquierda"
          className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors"
        >
          <AlignLeft className="h-4 w-4" />
        </button>
        <button
          onClick={(e) => execCommand(e, 'justifyCenter')}
          title="Centrar"
          className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors"
        >
          <AlignCenter className="h-4 w-4" />
        </button>
        <button
          onClick={(e) => execCommand(e, 'justifyRight')}
          title="Alinear a la derecha"
          className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors"
        >
          <AlignRight className="h-4 w-4" />
        </button>

        <div className="w-[1px] h-4 bg-zinc-200 dark:bg-zinc-800 mx-1" />

        {/* Color de texto dropdown */}
        <div className="relative">
          <button
            onClick={(e) => { e.preventDefault(); setShowColorMenu(!showColorMenu); setShowHighlightMenu(false); }}
            title="Color de texto"
            className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors flex items-center gap-0.5"
          >
            <Palette className="h-4 w-4" />
          </button>
          {showColorMenu && (
            <div className="absolute left-0 mt-1 w-32 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-lg z-50 p-1 flex flex-col gap-0.5">
              {colors.map(col => (
                <button
                  key={col.name}
                  onClick={(e) => {
                    execCommand(e, 'foreColor', col.code);
                    setShowColorMenu(false);
                  }}
                  className="flex items-center gap-2 w-full px-2.5 py-1 text-left text-xs font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded text-zinc-700 dark:text-zinc-300"
                >
                  <span className="h-3 w-3 rounded-full border border-black/10 flex-shrink-0" style={{ backgroundColor: col.code }} />
                  {col.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Resaltado dropdown */}
        <div className="relative">
          <button
            onClick={(e) => { e.preventDefault(); setShowHighlightMenu(!showHighlightMenu); setShowColorMenu(false); }}
            title="Color de resaltado"
            className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors flex items-center gap-0.5"
          >
            <Highlighter className="h-4 w-4" />
          </button>
          {showHighlightMenu && (
            <div className="absolute left-0 mt-1 w-32 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-lg z-50 p-1 flex flex-col gap-0.5">
              {highlights.map(hl => (
                <button
                  key={hl.name}
                  onClick={(e) => {
                    execCommand(e, 'hiliteColor', hl.code);
                    setShowHighlightMenu(false);
                  }}
                  className="flex items-center gap-2 w-full px-2.5 py-1 text-left text-xs font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded text-zinc-700 dark:text-zinc-300"
                >
                  <span className={`h-3 w-3 rounded border border-black/10 flex-shrink-0 ${hl.bgClass}`} style={{ backgroundColor: hl.code !== 'transparent' ? hl.code : undefined }} />
                  {hl.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="w-[1px] h-4 bg-zinc-200 dark:bg-zinc-800 mx-1" />

        {/* Clear formatting */}
        <button
          onClick={(e) => execCommand(e, 'removeFormat')}
          title="Limpiar formato"
          className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors"
        >
          <Trash2 className="h-4 w-4 text-red-500/70 dark:text-red-400/70" />
        </button>

      </div>

      {/* Editable Area */}
      <div className="flex-1 p-4 relative min-h-[300px] overflow-y-auto">
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          onKeyUp={checkActiveStates}
          onMouseUp={checkActiveStates}
          className="w-full h-full min-h-[280px] outline-none text-sm text-zinc-800 dark:text-zinc-200 prose prose-zinc dark:prose-invert max-w-none focus:outline-none"
        />
        
        {/* Placeholder element if text is completely empty */}
        {(!value || value === '<p></p>' || value === '<br>' || value === '') && (
          <div className="absolute top-4 left-4 text-zinc-400 dark:text-zinc-600 text-sm pointer-events-none select-none">
            {placeholder}
          </div>
        )}
      </div>
    </div>
  );
}
