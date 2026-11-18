import { AdventureMetrics, AdventureModel, EngineMode, EngineResponse } from '../types/questlang';
import { parseQuestLangMock } from './mockEngine';

export interface ILanguageEngine {
  validateAndParse(source: string): Promise<EngineResponse>;
}

/**
 * EngineService acts as the abstraction layer for QuestLang Studio.
 * UI components only talk to this service, allowing zero-friction swapping between
 * the in-browser mock engine and the Phase 4 real Express/Rust/Node engine.
 */
export class EngineService implements ILanguageEngine {
  private mode: EngineMode = 'mock';
  private apiEndpoint: string = 'http://localhost:3000/api/validate';

  constructor(initialMode: EngineMode = 'mock', endpoint?: string) {
    this.mode = initialMode;
    if (endpoint) this.apiEndpoint = endpoint;
  }

  public getMode(): EngineMode {
    return this.mode;
  }

  public setMode(mode: EngineMode): void {
    this.mode = mode;
  }

  public getApiEndpoint(): string {
    return this.apiEndpoint;
  }

  public setApiEndpoint(endpoint: string): void {
    this.apiEndpoint = endpoint;
  }

  public async validateAndParse(source: string): Promise<EngineResponse> {
    if (this.mode === 'mock') {
      // Run the built-in fast mock parser
      return parseQuestLangMock(source);
    }

    // API Mode: Forward to backend REST endpoint
    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ source }),
      });

      if (!response.ok) {
        throw new Error(`Backend returned HTTP status ${response.status}: ${response.statusText}`);
      }

      const data: EngineResponse = await response.json();
      return data;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      return {
        valid: false,
        model: null,
        errors: [
          {
            line: 1,
            severity: 'error',
            message: `Failed to connect to backend engine at "${this.apiEndpoint}": ${errorMessage}. (Ensure Express server is running or switch to Mock mode).`,
          },
        ],
      };
    }
  }

  /**
   * Calculate graph and story metrics from an AdventureModel
   */
  public static calculateMetrics(model: AdventureModel | null): AdventureMetrics {
    if (!model) {
      return {
        sceneCount: 0,
        transitionCount: 0,
        choiceCount: 0,
        jumpCount: 0,
        concludeCount: 0,
        unreachableScenes: [],
        deadEndScenes: [],
      };
    }

    const scenes = Object.values(model.scenes);
    let transitionCount = 0;
    let choiceCount = 0;
    let jumpCount = 0;
    let concludeCount = 0;
    const deadEndScenes: string[] = [];

    // Reachability calculation
    const reachable = new Set<string>();
    if (model.startScene && model.scenes[model.startScene]) {
      const queue = [model.startScene];
      reachable.add(model.startScene);

      while (queue.length > 0) {
        const currId = queue.shift()!;
        const curr = model.scenes[currId];
        if (!curr) continue;

        if (curr.exit.type === 'choices') {
          for (const opt of curr.exit.options) {
            if (model.scenes[opt.target] && !reachable.has(opt.target)) {
              reachable.add(opt.target);
              queue.push(opt.target);
            }
          }
        } else if (curr.exit.type === 'jump') {
          if (model.scenes[curr.exit.target] && !reachable.has(curr.exit.target)) {
            reachable.add(curr.exit.target);
            queue.push(curr.exit.target);
          }
        }
      }
    }

    const unreachableScenes: string[] = [];
    for (const s of scenes) {
      if (!reachable.has(s.id)) {
        unreachableScenes.push(s.id);
      }

      if (s.exit.type === 'choices') {
        choiceCount += s.exit.options.length;
        transitionCount += s.exit.options.length;
      } else if (s.exit.type === 'jump') {
        jumpCount += 1;
        transitionCount += 1;
      } else if (s.exit.type === 'conclude') {
        concludeCount += 1;
      }
    }

    return {
      sceneCount: scenes.length,
      transitionCount,
      choiceCount,
      jumpCount,
      concludeCount,
      unreachableScenes,
      deadEndScenes,
    };
  }
}

// Export default singleton instance
export const defaultEngineService = new EngineService('mock');
