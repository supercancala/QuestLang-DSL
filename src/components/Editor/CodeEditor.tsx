import React, { useRef, useEffect, useMemo, useCallback } from 'react';
import CodeMirror, { ReactCodeMirrorRef, ViewUpdate } from '@uiw/react-codemirror';
import { EditorView, keymap } from '@codemirror/view';
import { indentWithTab } from '@codemirror/commands';
import { indentUnit } from '@codemirror/language';
import { ValidationError } from '../../types/questlang';
import {
  questlangStreamLanguage,
  getQuestlangSyntaxHighlighting,
  getEditorViewTheme,
} from './questlangMode';

interface CodeEditorProps {
  code: string;
  onChange: (value: string) => void;
  errors: ValidationError[];
  jumpTarget?: { line: number; ts: number } | null;
  onCursorMove?: (line: number, col: number) => void;
  onValidate?: () => void;
  isDark: boolean;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  code,
  onChange,
  errors,
  jumpTarget,
  onCursorMove,
  onValidate,
  isDark,
}) => {
  const editorRef = useRef<ReactCodeMirrorRef>(null);
  const editorViewRef = useRef<EditorView | null>(null);

  const lines = useMemo(() => code.split(/\r?\n/), [code]);

  // Jump to specific line ONLY when explicitly triggered by an external jumpTarget request
  // (e.g. clicking an error row or jumping from scene overview)
  useEffect(() => {
    if (!jumpTarget || !editorViewRef.current) return;
    const view = editorViewRef.current;
    const doc = view.state.doc;
    const targetLine = Math.min(Math.max(1, jumpTarget.line), doc.lines);
    const lineObj = doc.line(targetLine);

    view.dispatch({
      selection: { anchor: lineObj.from, head: lineObj.to },
      scrollIntoView: true,
    });
    view.focus();
  }, [jumpTarget]);

  const handleCreateEditor = useCallback((view: EditorView) => {
    editorViewRef.current = view;
  }, []);

  // Update cursor line/column metrics on caret move WITHOUT triggering line selection
  const handleUpdate = useCallback(
    (update: ViewUpdate) => {
      if (update.selectionSet && onCursorMove) {
        const head = update.state.selection.main.head;
        const line = update.state.doc.lineAt(head);
        const col = head - line.from + 1;
        onCursorMove(line.number, col);
      }
    },
    [onCursorMove]
  );

  const extensions = useMemo(() => {
    return [
      questlangStreamLanguage,
      getQuestlangSyntaxHighlighting(isDark),
      getEditorViewTheme(isDark),
      indentUnit.of('    '), // 4 spaces indentation
      keymap.of([
        indentWithTab,
        {
          key: 'Mod-Enter',
          run: () => {
            onValidate?.();
            return true;
          },
        },
        {
          key: 'Mod-s',
          run: () => {
            onValidate?.();
            return true;
          },
        },
      ]),
    ];
  }, [isDark, onValidate]);

  return (
    <div
      className={`relative flex-1 flex flex-col h-full overflow-hidden select-none transition-colors duration-200 ${
        isDark ? 'bg-[#141413] text-[#F5F5F4]' : 'bg-[#FAF9F6] text-[#1C1917]'
      }`}
    >
      {/* Editor top status bar */}
      <div
        className={`flex items-center justify-between px-4 py-2 text-xs font-mono shrink-0 border-b whitespace-nowrap overflow-x-auto transition-colors ${
          isDark
            ? 'bg-[#1E1D1B] border-[#2E2C29] text-[#A8A29E]'
            : 'bg-[#F3F1EC] border-[#E5E2DC] text-[#78716C]'
        }`}
      >
        <div className="flex items-center space-x-3 shrink-0">
          <span
            className={`flex items-center font-medium ${
              isDark ? 'text-[#F5F5F4]' : 'text-[#1C1917]'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#10b981] mr-2"></span>
            story.quest
          </span>
          <span className={isDark ? 'text-[#3D3A36]' : 'text-[#D7D3CB]'}>•</span>
          <span>
            Indentation: <strong className="font-normal">4 Spaces</strong>
          </span>
          <span className={isDark ? 'text-[#3D3A36]' : 'text-[#D7D3CB]'}>•</span>
          <span>{lines.length} lines</span>
          <span className={isDark ? 'text-[#3D3A36]' : 'text-[#D7D3CB]'}>•</span>
          {errors.length > 0 ? (
            <span className="text-[#EA580C] font-sans font-medium text-xs">
              {errors.length} {errors.length === 1 ? 'note' : 'notes'}
            </span>
          ) : (
            <span className="text-[#15803D] font-sans font-medium text-xs">
              Story Ready
            </span>
          )}
        </div>
        <div className="flex items-center space-x-3 shrink-0 ml-3">
          <span className="hidden sm:inline-flex items-center text-xs opacity-70">
            <kbd
              className={`px-1.5 py-0.5 rounded text-[11px] mr-1.5 border ${
                isDark
                  ? 'bg-[#252422] border-[#2E2C29] text-[#A8A29E]'
                  : 'bg-[#FAF9F6] border-[#E5E2DC] text-[#78716C]'
              }`}
            >
              Ctrl+Enter
            </kbd>
            Check & Play
          </span>
        </div>
      </div>

      {/* CodeMirror 6 Editor Container */}
      <div className="flex-1 h-full overflow-hidden">
        <CodeMirror
          ref={editorRef}
          value={code}
          height="100%"
          className="h-full"
          basicSetup={{
            lineNumbers: true,
            highlightActiveLineGutter: true,
            highlightActiveLine: true,
            foldGutter: false,
            autocompletion: false,
            dropCursor: true,
            allowMultipleSelections: true,
            indentOnInput: true,
            bracketMatching: true,
            closeBrackets: true,
          }}
          extensions={extensions}
          onChange={onChange}
          onCreateEditor={handleCreateEditor}
          onUpdate={handleUpdate}
        />
      </div>
    </div>
  );
};
