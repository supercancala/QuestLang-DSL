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

---

## ⚙️ QuestLang Language Engine (Python + textX)

The Studio's **API mode** is served by the real QuestLang engine in `questlang/`. It parses with a
formal textX grammar (`questlang/grammar/questlang.tx`), runs static semantic checks, and exposes the
same play-session runtime to a terminal CLI and to the Studio.

```
[ QuestLang Studio (React) ] ── POST /api/validate ──► [ questlang engine (Python) ]
                                                         layout check → textX grammar → analyzer
                                                         runtime Session · Graphviz DOT · CLI
```

### Setup

```bash
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### Connect the Studio to the engine

```bash
python -m questlang serve          # engine on http://localhost:3000
npm run dev                        # Studio, in a second terminal
```

In the Studio, click the gear icon (**Story Engine Settings**), choose **Express API Mode**, keep the
endpoint `http://localhost:3000/api/validate`, click **Ping Test**, then **Save Settings**. (The mode is
named after the Express server first planned; the Python engine answers it.) Every check now runs on
the textX engine; Story Preview Mode keeps working offline.

### Command line

```bash
python -m questlang check examples/mysterious_town.quest   # errors and warnings, exit code 0/1
python -m questlang play  examples/mysterious_town.quest   # play in the terminal (r = restart, q = quit)
python -m questlang graph examples/mysterious_town.quest -o map.svg   # Graphviz story map (.dot needs no Graphviz)
python -m pytest                                            # engine test suite
```

### Engine API

| Endpoint | Body | Returns |
|---|---|---|
| `POST /api/validate` | `{source}` | `EngineResponse` (`src/types/questlang.ts`); each error also carries a `code` |
| `POST /api/graph` | `{source}` | `{dot}` Graphviz story map |
| `POST /api/session` | `{source}` | new play session: current scene, history, completed, options |
| `POST /api/session/<id>/choose` | `{option}` (1-based) | updated session; invalid input → 400, state unchanged |
| `POST /api/session/<id>/restart` | — | session back at the starting scene |
| `GET /api/health` | — | `{status, engine, version}` |

### Diagnostics

| Code | Severity | Problem |
|---|---|---|
| QL101 | error | Tab character |
| QL102 | error | Indentation not a multiple of four spaces |
| QL103 | error | Statement at the wrong indentation level |
| QL104 | error | More than one statement on a line |
| QL201 | error | Syntax error (missing period, missing exit, mixed exits, …) |
| QL202 | error | Keyword used as a scene name |
| QL301 | error | Reference to an undeclared scene (with a "did you mean" hint) |
| QL302 | error | Duplicate scene name |
| QL403 | error | `Proceed` statements that loop forever |
| QL401 | warning | Scene unreachable from the starting scene |
| QL402 | warning | Dead end: no ending reachable from this scene |
| QL404 | warning | Adventure has no `Conclude` |
| QL405 | warning | Same option label twice in one scene |

Errors block play; warnings do not.

### Repository layout

```
src/                  QuestLang Studio (React + TypeScript + CodeMirror)
questlang/            language engine: grammar, parser, analyzer, runtime, graph, CLI, API server
  grammar/questlang.tx
examples/             sample adventures (.quest), incl. a deliberately broken one
tests/                pytest suite for the engine and its API
```
