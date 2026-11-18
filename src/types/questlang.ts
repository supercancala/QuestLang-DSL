/**
 * QuestLang Core Data Contract
 * Strict TypeScript interfaces defining the language AST, model, validation, and engine responses.
 * Can be shared with backend services and Phase 4 compilers.
 */

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

/**
 * Metadata and analysis computed from an AdventureModel
 */
export interface AdventureMetrics {
  sceneCount: number;
  transitionCount: number;
  choiceCount: number;
  jumpCount: number;
  concludeCount: number;
  unreachableScenes: string[];
  deadEndScenes: string[];
}

export type EngineMode = 'mock' | 'api';
