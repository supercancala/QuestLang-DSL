import { StreamLanguage, HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';
import { EditorView } from '@codemirror/view';

const KEYWORDS = /^(Adventure|Begin|at|Scene|Narrate|Option|leads|to|Proceed|Conclude|Restart)\b/;

export const questlangStreamLanguage = StreamLanguage.define({
  name: 'questlang',
  startState: () => ({
    inString: false,
  }),
  token(stream, state) {
    // Eat whitespace
    if (stream.eatSpace()) return null;

    // Comments (# or //)
    if (stream.match(/^#.*/) || stream.match(/^\/\/.*/)) {
      return 'comment';
    }

    // String continuation across lines if unclosed
    if (state.inString) {
      while (!stream.eol()) {
        const ch = stream.next();
        if (ch === '"') {
          state.inString = false;
          break;
        }
        if (ch === '\\') {
          stream.next();
        }
      }
      return 'string';
    }

    // Double-quoted strings: "..."
    if (stream.peek() === '"') {
      stream.next();
      while (!stream.eol()) {
        const ch = stream.next();
        if (ch === '"') {
          return 'string';
        }
        if (ch === '\\') {
          stream.next();
        }
      }
      state.inString = true;
      return 'string';
    }

    // Reserved Keywords
    if (stream.match(KEYWORDS)) {
      return 'keyword';
    }

    // Colons and terminating periods
    if (stream.match(/^[:.]/)) {
      return 'punctuation';
    }

    // Identifiers (Scene IDs, Start scene, Target IDs)
    if (stream.match(/^[A-Za-z0-9_]+/)) {
      return 'variableName';
    }

    stream.next();
    return null;
  },
});

/**
 * Creative Manuscript Syntax Themes
 */

// Light Mode ("Manuscript Paper"):
export const questlangLightHighlightStyle = HighlightStyle.define([
  { tag: t.keyword, color: '#C2410C', fontWeight: '600' }, // Warm terracotta
  { tag: t.string, color: '#166534', fontWeight: '400' }, // Forest green
  { tag: t.variableName, color: '#1E1B4B', fontWeight: '600' }, // Deep ink indigo
  { tag: t.punctuation, color: '#78716C', fontWeight: '600' }, // Warm stone
  { tag: t.comment, color: '#A8A29E', fontStyle: 'italic' },
]);

// Dark Mode ("Evening Desk"):
export const questlangDarkHighlightStyle = HighlightStyle.define([
  { tag: t.keyword, color: '#FBBF24', fontWeight: '600' }, // Warm amber
  { tag: t.string, color: '#86EFAC', fontWeight: '400' }, // Soft sage
  { tag: t.variableName, color: '#F5F5F4', fontWeight: '500' }, // Crisp cream
  { tag: t.punctuation, color: '#A8A29E', fontWeight: '600' }, // Warm stone
  { tag: t.comment, color: '#78716C', fontStyle: 'italic' },
]);

export function getQuestlangSyntaxHighlighting(isDark: boolean) {
  return syntaxHighlighting(isDark ? questlangDarkHighlightStyle : questlangLightHighlightStyle);
}

/**
 * EditorView UI Themes for Manuscript Light & Evening Desk Dark
 */
export function getEditorViewTheme(isDark: boolean) {
  if (isDark) {
    return EditorView.theme(
      {
        '&': {
          color: '#F5F5F4',
          backgroundColor: '#141413 !important',
          height: '100%',
          fontSize: '14px',
          fontFamily: '"JetBrains Mono", "Fira Code", Menlo, Monaco, Consolas, monospace',
        },
        '.cm-content': {
          caretColor: '#F5F5F4',
          padding: '16px 0',
          whiteSpace: 'pre',
          lineHeight: '1.7',
        },
        '&.cm-focused .cm-cursor': {
          borderLeftColor: '#F5F5F4',
          borderLeftWidth: '2px',
        },
        // Fix active line grey override on multi-line selection
        '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
          backgroundColor: '#3D3A36 !important',
        },
        '.cm-activeLine': {
          backgroundColor: 'rgba(255, 255, 255, 0.03) !important',
        },
        '.cm-activeLine.cm-selectionBackground': {
          backgroundColor: '#3D3A36 !important',
        },
        '.cm-gutters': {
          backgroundColor: '#141413 !important',
          color: '#78716C !important',
          borderRight: '1px solid #2E2C29 !important',
          paddingRight: '8px',
          userSelect: 'none',
        },
        '.cm-activeLineGutter': {
          backgroundColor: 'transparent !important',
          color: '#F5F5F4 !important',
          fontWeight: '600',
        },
        '.cm-scroller': {
          overflow: 'auto',
          lineHeight: '1.7',
          fontFamily: 'inherit',
          whiteSpace: 'pre',
        },
      },
      { dark: true }
    );
  }

  // Light Mode ("Manuscript Paper")
  return EditorView.theme(
    {
      '&': {
        color: '#1C1917',
        backgroundColor: '#FAF9F6 !important',
        height: '100%',
        fontSize: '14px',
        fontFamily: '"JetBrains Mono", "Fira Code", Menlo, Monaco, Consolas, monospace',
      },
      '.cm-content': {
        caretColor: '#1C1917',
        padding: '16px 0',
        whiteSpace: 'pre',
        lineHeight: '1.7',
      },
      '&.cm-focused .cm-cursor': {
        borderLeftColor: '#C2410C',
        borderLeftWidth: '2px',
      },
      // Fix active line grey override on multi-line selection
      '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
        backgroundColor: '#FED7AA !important',
      },
      '.cm-activeLine': {
        backgroundColor: 'rgba(0, 0, 0, 0.02) !important',
      },
      '.cm-activeLine.cm-selectionBackground': {
        backgroundColor: '#FED7AA !important',
      },
      '.cm-gutters': {
        backgroundColor: '#FAF9F6 !important',
        color: '#A8A29E !important',
        borderRight: '1px solid #E5E2DC !important',
        paddingRight: '8px',
        userSelect: 'none',
      },
      '.cm-activeLineGutter': {
        backgroundColor: 'transparent !important',
        color: '#1C1917 !important',
        fontWeight: '600',
      },
      '.cm-scroller': {
        overflow: 'auto',
        lineHeight: '1.7',
        fontFamily: 'inherit',
        whiteSpace: 'pre',
      },
    },
    { dark: false }
  );
}
