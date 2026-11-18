import {
  AdventureModel,
  EngineResponse,
  SceneExit,
  SceneNode,
  ValidationError,
} from '../types/questlang';

/**
 * QuestLang Mock Engine & Lightweight Line-by-Line Parser
 *
 * Implements the AST construction and syntax/semantic validation for QuestLang DSL.
 * Behind this strict interface, the team can swap this module with the official
 * Phase 4 compiler/validator or an Express REST API backend without touching the UI.
 */
export function parseQuestLangMock(source: string): EngineResponse {
  const errors: ValidationError[] = [];
  const lines = source.split(/\r?\n/);

  let title = '';
  let startScene = '';
  let titleLine = -1;
  let startSceneLine = -1;

  const scenes: Record<string, SceneNode> = {};
  let currentScene: {
    id: string;
    line: number;
    passages: string[];
    options: { label: string; target: string; line: number }[];
    jumpTarget: string | null;
    jumpLine: number | null;
    hasConclude: boolean;
    concludeLine: number | null;
  } | null = null;

  // Track scene declarations for duplicate checks
  const sceneDeclarationLines: Record<string, number> = {};

  // Stage 1: Line-by-line lexical & structural scan
  for (let i = 0; i < lines.length; i++) {
    const lineNumber = i + 1;
    const rawLine = lines[i];

    // Blank lines are skipped
    if (rawLine.trim() === '') {
      continue;
    }

    // Check 1: Tab character detection (Strict 4-space indentation rule)
    if (rawLine.includes('\t')) {
      errors.push({
        line: lineNumber,
        column: rawLine.indexOf('\t') + 1,
        severity: 'error',
        message: 'Tab characters are strictly forbidden in QuestLang. Use 4 spaces for indentation.',
      });
    }

    // Check 2: Indentation check
    const leadingSpacesMatch = rawLine.match(/^ +/);
    const leadingSpaceCount = leadingSpacesMatch ? leadingSpacesMatch[0].length : 0;
    const trimmed = rawLine.trim();

    // Check for odd/invalid indentation (must be multiple of 4: 0 or 4)
    if (leadingSpaceCount % 4 !== 0) {
      errors.push({
        line: lineNumber,
        column: 1,
        severity: 'error',
        message: `Invalid indentation: Found ${leadingSpaceCount} spaces. Indentation must be in multiples of 4 spaces.`,
      });
    }

    // Top-level unindented statements
    if (leadingSpaceCount === 0) {
      // If we were inside a scene, finalize it before starting a new top-level construct
      if (currentScene) {
        finalizeScene(currentScene, scenes, errors);
        currentScene = null;
      }

      // Check for: Adventure "Title":
      const adventureMatch = trimmed.match(/^Adventure\s+"([^"]*)"\s*(:?)$/);
      if (adventureMatch) {
        if (!adventureMatch[2]) {
          errors.push({
            line: lineNumber,
            column: rawLine.length,
            severity: 'error',
            message: 'Missing colon ":" after Adventure declaration. Expected `Adventure "Title":`',
          });
        }
        if (title !== '') {
          errors.push({
            line: lineNumber,
            severity: 'error',
            message: `Multiple Adventure headers detected. Only one Adventure statement is allowed per file (previously defined at line ${titleLine}).`,
          });
        } else {
          title = adventureMatch[1];
          titleLine = lineNumber;
        }
        continue;
      }

      // Check for unclosed string in Adventure
      if (trimmed.startsWith('Adventure')) {
        errors.push({
          line: lineNumber,
          severity: 'error',
          message: 'Malformed Adventure declaration. Expected format: `Adventure "Story Title":`',
        });
        continue;
      }

      // Check for: Scene SceneID:
      const sceneHeaderMatch = trimmed.match(/^Scene\s+([A-Za-z0-9_]+)\s*(:?)$/);
      if (sceneHeaderMatch) {
        const sceneId = sceneHeaderMatch[1];
        if (!sceneHeaderMatch[2]) {
          errors.push({
            line: lineNumber,
            column: rawLine.length,
            severity: 'error',
            message: `Missing colon ":" after Scene ID "${sceneId}". Expected \`Scene ${sceneId}:\``,
          });
        }

        if (sceneDeclarationLines[sceneId]) {
          errors.push({
            line: lineNumber,
            severity: 'error',
            message: `Duplicate Scene identifier "${sceneId}". Previously declared at line ${sceneDeclarationLines[sceneId]}.`,
          });
        } else {
          sceneDeclarationLines[sceneId] = lineNumber;
        }

        currentScene = {
          id: sceneId,
          line: lineNumber,
          passages: [],
          options: [],
          jumpTarget: null,
          jumpLine: null,
          hasConclude: false,
          concludeLine: null,
        };
        continue;
      }

      // Check for malformed Scene header
      if (trimmed.startsWith('Scene')) {
        errors.push({
          line: lineNumber,
          severity: 'error',
          message: 'Malformed Scene declaration. Expected format: `Scene <SceneID>:`',
        });
        continue;
      }

      // Any other unindented text is invalid
      errors.push({
        line: lineNumber,
        severity: 'error',
        message: `Unexpected top-level statement "${trimmed}". Only "Adventure" and "Scene" declarations may appear unindented.`,
      });
      continue;
    }

    // Indented statements (must be indented with 4 spaces)
    if (leadingSpaceCount === 4) {
      // 1. Begin at SceneID.
      const beginMatch = trimmed.match(/^Begin\s+at\s+([A-Za-z0-9_]+)\s*(\.?)$/);
      if (beginMatch) {
        if (!beginMatch[2]) {
          errors.push({
            line: lineNumber,
            column: rawLine.length,
            severity: 'error',
            message: 'Missing terminating period "." after Begin statement. Expected `Begin at SceneID.`',
          });
        }
        if (titleLine === -1) {
          errors.push({
            line: lineNumber,
            severity: 'error',
            message: '`Begin at` statement found before `Adventure "Title":` header.',
          });
        }
        if (startScene !== '') {
          errors.push({
            line: lineNumber,
            severity: 'error',
            message: `Multiple \`Begin at\` statements found (previously defined at line ${startSceneLine}).`,
          });
        } else {
          startScene = beginMatch[1];
          startSceneLine = lineNumber;
        }
        continue;
      }

      if (trimmed.startsWith('Begin')) {
        errors.push({
          line: lineNumber,
          severity: 'error',
          message: 'Malformed Begin statement. Expected format: `Begin at <SceneID>.`',
        });
        continue;
      }

      // Check if we are inside a scene definition
      if (!currentScene) {
        errors.push({
          line: lineNumber,
          severity: 'error',
          message: `Indented statement "${trimmed}" found outside of any Scene definition.`,
        });
        continue;
      }

      // 2. Narrate "text..."
      const narrateMatch = trimmed.match(/^Narrate\s+"([^"]*)"\s*(\.?)$/);
      if (narrateMatch) {
        const passageText = narrateMatch[1];
        // If an exit was already parsed in this scene, Narrate cannot come after an exit!
        if (currentScene.options.length > 0 || currentScene.jumpTarget || currentScene.hasConclude) {
          errors.push({
            line: lineNumber,
            severity: 'error',
            message: `Narrate statement cannot appear after a scene exit (Option, Proceed, or Conclude) in Scene "${currentScene.id}".`,
          });
        }
        currentScene.passages.push(passageText);
        continue;
      }

      // Malformed Narrate check (e.g. unclosed quotes or missing quotes)
      if (trimmed.startsWith('Narrate')) {
        errors.push({
          line: lineNumber,
          severity: 'error',
          message: 'Malformed Narrate statement. Passages must be enclosed in double quotes: `Narrate "Story text..."`',
        });
        continue;
      }

      // 3. Option "label" leads to TargetSceneID.
      const optionMatch = trimmed.match(/^Option\s+"([^"]*)"\s+leads\s+to\s+([A-Za-z0-9_]+)\s*(\.?)$/);
      if (optionMatch) {
        if (!optionMatch[3]) {
          errors.push({
            line: lineNumber,
            column: rawLine.length,
            severity: 'error',
            message: 'Missing terminating period "." after Option statement. Expected `Option "..." leads to TargetSceneID.`',
          });
        }
        if (currentScene.jumpTarget) {
          errors.push({
            line: lineNumber,
            severity: 'error',
            message: `Scene "${currentScene.id}" cannot mix "Option" choices with "Proceed to" (Proceed defined at line ${currentScene.jumpLine}).`,
          });
        }
        if (currentScene.hasConclude) {
          errors.push({
            line: lineNumber,
            severity: 'error',
            message: `Scene "${currentScene.id}" cannot have "Option" choices after "Conclude." (Conclude defined at line ${currentScene.concludeLine}).`,
          });
        }
        currentScene.options.push({
          label: optionMatch[1],
          target: optionMatch[2],
          line: lineNumber,
        });
        continue;
      }

      // Malformed Option check
      if (trimmed.startsWith('Option')) {
        errors.push({
          line: lineNumber,
          severity: 'error',
          message: 'Malformed Option statement. Expected: `Option "Choice label" leads to TargetSceneID.`',
        });
        continue;
      }

      // 4. Proceed to TargetSceneID.
      const proceedMatch = trimmed.match(/^Proceed\s+to\s+([A-Za-z0-9_]+)\s*(\.?)$/);
      if (proceedMatch) {
        if (!proceedMatch[2]) {
          errors.push({
            line: lineNumber,
            column: rawLine.length,
            severity: 'error',
            message: 'Missing terminating period "." after Proceed statement. Expected `Proceed to TargetSceneID.`',
          });
        }
        if (currentScene.options.length > 0) {
          errors.push({
            line: lineNumber,
            severity: 'error',
            message: `Scene "${currentScene.id}" cannot have "Proceed to" when "Option" choices are already defined.`,
          });
        }
        if (currentScene.jumpTarget) {
          errors.push({
            line: lineNumber,
            severity: 'error',
            message: `Scene "${currentScene.id}" has multiple "Proceed to" statements. Exactly one exit is permitted.`,
          });
        }
        if (currentScene.hasConclude) {
          errors.push({
            line: lineNumber,
            severity: 'error',
            message: `Scene "${currentScene.id}" cannot have "Proceed to" after "Conclude."`,
          });
        }
        currentScene.jumpTarget = proceedMatch[1];
        currentScene.jumpLine = lineNumber;
        continue;
      }

      if (trimmed.startsWith('Proceed')) {
        errors.push({
          line: lineNumber,
          severity: 'error',
          message: 'Malformed Proceed statement. Expected: `Proceed to TargetSceneID.`',
        });
        continue;
      }

      // 5. Conclude.
      const concludeMatch = trimmed.match(/^Conclude\s*(\.?)$/);
      if (concludeMatch) {
        if (!concludeMatch[1]) {
          errors.push({
            line: lineNumber,
            column: rawLine.length,
            severity: 'error',
            message: 'Missing terminating period "." after Conclude. Expected `Conclude.`',
          });
        }
        if (currentScene.options.length > 0) {
          errors.push({
            line: lineNumber,
            severity: 'error',
            message: `Scene "${currentScene.id}" cannot mix "Conclude." with "Option" choices.`,
          });
        }
        if (currentScene.jumpTarget) {
          errors.push({
            line: lineNumber,
            severity: 'error',
            message: `Scene "${currentScene.id}" cannot mix "Conclude." with "Proceed to".`,
          });
        }
        if (currentScene.hasConclude) {
          errors.push({
            line: lineNumber,
            severity: 'error',
            message: `Scene "${currentScene.id}" has duplicate "Conclude." statements.`,
          });
        }
        currentScene.hasConclude = true;
        currentScene.concludeLine = lineNumber;
        continue;
      }

      // Check for reserved word Restart used improperly
      if (trimmed.startsWith('Restart')) {
        errors.push({
          line: lineNumber,
          severity: 'error',
          message: '"Restart" is a reserved runtime keyword and cannot be used as an in-file statement.',
        });
        continue;
      }

      // Unknown indented statement
      errors.push({
        line: lineNumber,
        severity: 'error',
        message: `Unrecognized statement "${trimmed}". Allowed scene statements: Narrate, Option, Proceed, Conclude.`,
      });
      continue;
    }

    // Greater than 4 spaces indentation
    if (leadingSpaceCount > 4) {
      errors.push({
        line: lineNumber,
        column: 1,
        severity: 'error',
        message: `Over-indented line (${leadingSpaceCount} spaces). QuestLang only uses single 4-space indentation levels.`,
      });
    }
  }

  // Finalize last scene if still open
  if (currentScene) {
    finalizeScene(currentScene, scenes, errors);
  }

  // Stage 2: Global semantic checks
  // Check 1: Missing Adventure header
  if (!title) {
    errors.push({
      line: 1,
      severity: 'error',
      message: 'Missing Adventure header. File must start with `Adventure "Title":`',
    });
  }

  // Check 2: Missing Begin at statement
  if (!startScene) {
    errors.push({
      line: titleLine > 0 ? titleLine + 1 : 1,
      severity: 'error',
      message: 'Missing starting scene declaration. Expected `Begin at <SceneID>.` under Adventure header.',
    });
  } else if (!scenes[startScene]) {
    errors.push({
      line: startSceneLine > 0 ? startSceneLine : 1,
      severity: 'error',
      message: `Initial scene "${startScene}" declared in \`Begin at ${startScene}.\` is never defined.`,
    });
  }

  // Check 3: At least one scene required
  const sceneKeys = Object.keys(scenes);
  if (sceneKeys.length === 0) {
    errors.push({
      line: lines.length,
      severity: 'error',
      message: 'Adventure must define at least one `Scene <ID>:` block.',
    });
  }

  // Check 4: Validate all exit targets exist
  for (const scene of Object.values(scenes)) {
    if (scene.exit.type === 'choices') {
      for (const opt of scene.exit.options) {
        if (!scenes[opt.target]) {
          errors.push({
            line: scene.line,
            severity: 'error',
            message: `Target scene "${opt.target}" referenced in Option "${opt.label}" does not exist in Scene "${scene.id}".`,
          });
        }
      }
    } else if (scene.exit.type === 'jump') {
      if (!scenes[scene.exit.target]) {
        errors.push({
          line: scene.line,
          severity: 'error',
          message: `Target scene "${scene.exit.target}" referenced in \`Proceed to ${scene.exit.target}.\` does not exist in Scene "${scene.id}".`,
        });
      }
    }
  }

  // Check 5: Reachability Analysis (Depth-First Search from startScene)
  if (startScene && scenes[startScene]) {
    const reachable = new Set<string>();
    const queue = [startScene];
    reachable.add(startScene);

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const node = scenes[currentId];
      if (!node) continue;

      if (node.exit.type === 'choices') {
        for (const opt of node.exit.options) {
          if (scenes[opt.target] && !reachable.has(opt.target)) {
            reachable.add(opt.target);
            queue.push(opt.target);
          }
        }
      } else if (node.exit.type === 'jump') {
        if (scenes[node.exit.target] && !reachable.has(node.exit.target)) {
          reachable.add(node.exit.target);
          queue.push(node.exit.target);
        }
      }
    }

    // Flag unreachable scenes as warnings
    for (const [id, node] of Object.entries(scenes)) {
      if (!reachable.has(id)) {
        errors.push({
          line: node.line,
          severity: 'warning',
          message: `Scene "${id}" is unreachable from starting scene "${startScene}".`,
        });
      }
    }
  }

  // Build model if no errors (warnings are permitted!)
  const hasFatalErrors = errors.some((e) => e.severity === 'error');
  const model: AdventureModel | null =
    hasFatalErrors || !title || !startScene
      ? null
      : {
          title,
          startScene,
          scenes,
        };

  return {
    valid: !hasFatalErrors,
    model,
    errors,
  };
}

/**
 * Helper to finalize a parsed scene block into a SceneNode
 */
function finalizeScene(
  currentScene: {
    id: string;
    line: number;
    passages: string[];
    options: { label: string; target: string; line: number }[];
    jumpTarget: string | null;
    jumpLine: number | null;
    hasConclude: boolean;
    concludeLine: number | null;
  },
  scenes: Record<string, SceneNode>,
  errors: ValidationError[]
) {
  let exit: SceneExit;

  if (currentScene.options.length > 0) {
    exit = {
      type: 'choices',
      options: currentScene.options.map((o) => ({ label: o.label, target: o.target })),
    };
  } else if (currentScene.jumpTarget) {
    exit = {
      type: 'jump',
      target: currentScene.jumpTarget,
    };
  } else if (currentScene.hasConclude) {
    exit = {
      type: 'conclude',
    };
  } else {
    errors.push({
      line: currentScene.line,
      severity: 'error',
      message: `Scene "${currentScene.id}" is missing an exit form. Every scene must end with Option(s), Proceed to, or Conclude.`,
    });
    // Fallback exit to prevent crash in visualizers
    exit = { type: 'conclude' };
  }

  scenes[currentScene.id] = {
    id: currentScene.id,
    line: currentScene.line,
    passages: currentScene.passages,
    exit,
  };
}
