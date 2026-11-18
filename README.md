# QuestLang Studio ✍️📖✨

A distraction-free, creative writing and narrative design studio for **QuestLang** — an indentation-sensitive declarative Domain-Specific Language (`.quest`) for authoring interactive branching adventures.

Inspired by **iA Writer**, **Bear**, and **Scrivener's story corkboard**, QuestLang Studio puts story craft, dialogue, and branching narrative front and center for creative writers, narrative designers, educators, and students.

---

## 🎨 Themes: Manuscript Paper & Evening Desk

QuestLang Studio includes a seamless Light/Dark mode switcher in the top toolbar:

* **Light Mode ("Manuscript Paper" - Default):** Warm off-white paper canvas (`#FAF9F6`), crisp stone-gray borders (`#E5E2DC`), soft cream sidebars (`#F3F1EC`), rich charcoal prose text (`#1C1917`), and warm terracotta/forest green accents.
* **Dark Mode ("Evening Desk"):** Warm matte charcoal (`#141413`), elevated stone panels (`#1E1D1B`), subtle warm borders (`#2E2C29`), and soft cream text (`#F5F5F4`).

---

## 🏛️ Architecture & Clean Contracts

QuestLang Studio maintains a strict separation between UI components and language execution. All AST parsing, structural validation, and reachability analysis run through an engine service contract (`src/types/questlang.ts`):

```
[ Manuscript Editor (CodeMirror 6) ]
                   │
                   ▼
           [ EngineService ]
            ┌──────┴──────┐
            ▼             ▼
   [ Story Preview ]  [ Express API ]
     (In-Browser)    (Phase 4 Backend)
```

### TypeScript Data Contract (`src/types/questlang.ts`)

```typescript
export interface ValidationError {
  line: number;
  column?: number;
  severity: 'error' | 'warning';
  message: string;
}

export type SceneExit =
  | { type: 'choices'; options: { label: string; target: string }[] }
  | { type: 'jump'; target: string }
  | { type: 'conclude' };

export interface SceneNode {
  id: string;
  line: number;
  passages: string[];
  exit: SceneExit;
}

export interface AdventureModel {
  title: string;
  startScene: string;
  scenes: Record<string, SceneNode>;
}

export interface EngineResponse {
  valid: boolean;
  model: AdventureModel | null;
  errors: ValidationError[];
}
```

---

## ✨ Features & Writer-Friendly Enhancements

### 1. De-Jargonized, Writer-Friendly Interface
* `Engine: Mock / Preview` ➔ **`Story Preview Mode`**
* `Validate & Run` ➔ **`Check & Play Story`**
* `Scene Inspector` ➔ **`Scene Overview`**
* Bottom status bar ➔ **`"Story structure verified — X scenes and Y story paths ready to play."`**

### 2. Manuscript Code Editor (Bug-Free Single-Caret Typing)
* **Whole-Line Selection Bug Fixed:** Clicking anywhere in the editor now places a single native caret (`EditorSelection.cursor(pos)`). Whole-line selection is only triggered when explicitly clicking an issue in the Story Check panel.
* Powered by **CodeMirror 6** with custom QuestLang highlighting:
  * Warm Terracotta / Amber for reserved keywords (`Adventure`, `Begin`, `at`, `Scene`, `Narrate`, `Option`, `leads`, `to`, `Proceed`, `Conclude`, `Restart`).
  * Deep Forest / Sage Green for narrative dialogue and prose passages (`"..."`).
  * Deep Indigo / Off-White for Scene Identifiers.
  * Muted stone for punctuation.
* Generous `1.7` line height and native 4-space Tab/Shift+Tab indentation (`indentUnit.of("    ")` & `indentWithTab`).

### 3. Story Corkboard (Story Map Overhaul)
* **Organic Index Cards:** Nodes are styled like Scrivener index cards with rounded corners (`rounded-xl`), title headers, a 1-line italicized snippet of opening dialogue, and warm pill badges (`Opening Scene`, `Ending`) rather than technical UML boxes.
* **Native Trackpad Pinch Zoom & Pan:** Pinch-to-zoom on trackpads, mouse-wheel zooming (`Ctrl+Wheel`), and smooth 2-finger panning directly on the corkboard canvas.
* **Full-Screen Canvas:** One-click full-screen expander (`Maximize2` / `Minimize2` button or `Esc` key shortcut) for inspecting expansive narrative webs.

### 4. Uncluttered Sidebar Accordions
* **Story Files (`Import`, `Export`, `New Blank Story`)** are expanded by default at the top.
* **Sample Adventures** and **Syntax Quick-Reference** are organized into collapsible accordions (collapsed by default).

---

## 💻 Development Commands

```bash
# Start local Vite development server
npm run dev

# Run TypeScript compilation and production build
npm run build

# Run unit tests for Mock Language Engine
npm test
```
