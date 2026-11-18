import React, { useState, useEffect } from 'react';
import { AdventureModel } from '../../types/questlang';
import {
  RotateCcw,
  ArrowRight,
  Footprints,
  AlertCircle,
  Trophy,
  ChevronRight,
  BookOpen,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface PlaytestSimulatorProps {
  model: AdventureModel | null;
  initialSceneId?: string | null;
  onSelectSceneInEditor?: (line: number) => void;
  isDark: boolean;
}

export const PlaytestSimulator: React.FC<PlaytestSimulatorProps> = ({
  model,
  initialSceneId,
  onSelectSceneInEditor,
  isDark,
}) => {
  const [currentSceneId, setCurrentSceneId] = useState<string>('');
  const [history, setHistory] = useState<string[]>([]);
  const [choiceHistory, setChoiceHistory] = useState<{ from: string; label: string; to: string }[]>([]);
  const [turnCount, setTurnCount] = useState<number>(0);

  useEffect(() => {
    if (model) {
      const start = initialSceneId && model.scenes[initialSceneId] ? initialSceneId : model.startScene;
      setCurrentSceneId(start);
      setHistory([start]);
      setChoiceHistory([]);
      setTurnCount(1);
    }
  }, [model, initialSceneId]);

  const currentScene = model && currentSceneId ? model.scenes[currentSceneId] : null;

  // Confetti when concluding
  useEffect(() => {
    if (currentScene && currentScene.exit.type === 'conclude') {
      try {
        confetti({
          particleCount: 60,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#EA580C', '#D97706', '#16A34A', '#2563EB'],
        });
      } catch {
        // Safe fallback
      }
    }
  }, [currentScene]);

  const handleSelectOption = (target: string, label: string) => {
    if (!model || !model.scenes[target]) return;
    setChoiceHistory((prev) => [...prev, { from: currentSceneId, label, to: target }]);
    setHistory((prev) => [...prev, target]);
    setCurrentSceneId(target);
    setTurnCount((c) => c + 1);
  };

  const handleProceed = (target: string) => {
    if (!model || !model.scenes[target]) return;
    setChoiceHistory((prev) => [...prev, { from: currentSceneId, label: 'Proceeded', to: target }]);
    setHistory((prev) => [...prev, target]);
    setCurrentSceneId(target);
    setTurnCount((c) => c + 1);
  };

  const handleRestart = () => {
    if (!model) return;
    const start = model.startScene;
    setCurrentSceneId(start);
    setHistory([start]);
    setChoiceHistory([]);
    setTurnCount(1);
  };

  const handleJumpToHistory = (index: number) => {
    const targetScene = history[index];
    if (targetScene && model?.scenes[targetScene]) {
      setCurrentSceneId(targetScene);
      setHistory(history.slice(0, index + 1));
      setChoiceHistory(choiceHistory.slice(0, index));
      setTurnCount((c) => c + 1);
    }
  };

  if (!model) {
    return (
      <div
        className={`flex-1 flex flex-col items-center justify-center p-8 text-center transition-colors ${
          isDark ? 'bg-[#141413] text-[#78716C]' : 'bg-[#FAF9F6] text-[#78716C]'
        }`}
      >
        <BookOpen className="w-10 h-10 opacity-40 mb-3" />
        <h3
          className={`text-sm font-semibold font-serif ${
            isDark ? 'text-[#F5F5F4]' : 'text-[#1C1917]'
          }`}
        >
          Playtest Simulator Ready
        </h3>
        <p className="text-xs max-w-sm mt-1">
          Check story structure to start your interactive playtest.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`flex-1 flex flex-col h-full overflow-y-auto transition-colors duration-200 ${
        isDark ? 'bg-[#141413] text-[#F5F5F4]' : 'bg-[#FAF9F6] text-[#1C1917]'
      }`}
    >
      {/* Ready Banner */}
      <div
        className={`px-4 py-2 border-b flex items-center justify-between text-xs transition-colors ${
          isDark
            ? 'bg-[#1E1D1B] border-[#2E2C29]'
            : 'bg-[#F3F1EC] border-[#E5E2DC]'
        }`}
      >
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-[#16A34A]"></span>
          <span
            className={`font-semibold tracking-wide uppercase text-[11px] ${
              isDark ? 'text-[#F5F5F4]' : 'text-[#1C1917]'
            }`}
          >
            Live Narrative Playtest
          </span>
        </div>
        <div
          className={`flex items-center space-x-3 ${
            isDark ? 'text-[#A8A29E]' : 'text-[#78716C]'
          }`}
        >
          <span className="font-sans">Turn #{turnCount}</span>
          <button
            onClick={handleRestart}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors ${
              isDark
                ? 'bg-[#252422] hover:bg-[#2E2C29] border-[#2E2C29] text-[#F5F5F4]'
                : 'bg-[#FFFFFF] hover:bg-[#FAF9F6] border-[#E5E2DC] text-[#1C1917] shadow-sm'
            }`}
            title="Restart adventure from the beginning"
          >
            <RotateCcw className="w-3.5 h-3.5 opacity-70" />
            <span>Restart</span>
          </button>
        </div>
      </div>

      {/* Story Breadcrumbs / Visit History */}
      <div
        className={`px-4 py-2 border-b flex items-center space-x-2 overflow-x-auto text-xs transition-colors ${
          isDark
            ? 'bg-[#181816] border-[#2E2C29]'
            : 'bg-[#EDEAE4] border-[#E5E2DC]'
        }`}
      >
        <div
          className={`flex items-center shrink-0 mr-1 font-sans font-medium text-[11px] uppercase tracking-wider ${
            isDark ? 'text-[#78716C]' : 'text-[#78716C]'
          }`}
        >
          <Footprints className="w-3.5 h-3.5 mr-1 opacity-70" />
          <span>Trail:</span>
        </div>
        <div className="flex items-center space-x-1.5 shrink-0 font-sans">
          {history.map((sceneId, idx) => {
            const isCurrent = idx === history.length - 1;
            return (
              <React.Fragment key={idx}>
                {idx > 0 && <ChevronRight className="w-3 h-3 opacity-40" />}
                <button
                  onClick={() => handleJumpToHistory(idx)}
                  className={`px-2.5 py-0.5 rounded-full text-xs transition-colors border ${
                    isCurrent
                      ? isDark
                        ? 'bg-[#2E2C29] text-[#F5F5F4] border-[#3D3A36] font-semibold'
                        : 'bg-[#FFFFFF] text-[#1C1917] border-[#D7D3CB] font-semibold shadow-sm'
                      : isDark
                      ? 'bg-[#1E1D1B] hover:bg-[#252422] text-[#A8A29E] border-[#2E2C29]'
                      : 'bg-[#FAF9F6] hover:bg-[#FFFFFF] text-[#78716C] border-[#E5E2DC]'
                  }`}
                  title={`Jump back to scene "${sceneId}"`}
                >
                  {sceneId}
                </button>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Main Playtest Canvas */}
      <div className="flex-1 max-w-2xl w-full mx-auto p-6 md:p-8 flex flex-col justify-between">
        <div>
          <div
            className={`flex items-center justify-between pb-4 border-b mb-6 ${
              isDark ? 'border-[#2E2C29]' : 'border-[#E5E2DC]'
            }`}
          >
            <div>
              <h2 className="text-xl font-bold tracking-tight font-serif">
                {model.title}
              </h2>
              <div className="flex items-center space-x-2 mt-1">
                <span
                  className={`text-xs px-2 py-0.5 rounded-md border font-sans font-medium ${
                    isDark
                      ? 'bg-[#1E1D1B] text-[#A8A29E] border-[#2E2C29]'
                      : 'bg-[#F3F1EC] text-[#57534E] border-[#E5E2DC]'
                  }`}
                >
                  Scene: <strong>{currentSceneId}</strong>
                </span>
                {currentScene && (
                  <button
                    onClick={() => onSelectSceneInEditor?.(currentScene.line)}
                    className="text-xs opacity-60 hover:opacity-100 underline decoration-dotted"
                  >
                    Line {currentScene.line} in manuscript
                  </button>
                )}
              </div>
            </div>

            {/* Quick jump to scene */}
            <div className="flex items-center space-x-2">
              <span
                className={`text-[11px] font-sans ${
                  isDark ? 'text-[#78716C]' : 'text-[#78716C]'
                }`}
              >
                Jump:
              </span>
              <select
                value={currentSceneId}
                onChange={(e) => {
                  const target = e.target.value;
                  setCurrentSceneId(target);
                  setHistory((prev) => [...prev, target]);
                  setTurnCount((c) => c + 1);
                }}
                className={`text-xs rounded-lg px-2.5 py-1 border outline-none font-sans transition-colors ${
                  isDark
                    ? 'bg-[#1E1D1B] border-[#2E2C29] text-[#F5F5F4]'
                    : 'bg-[#FFFFFF] border-[#E5E2DC] text-[#1C1917]'
                }`}
              >
                {Object.keys(model.scenes).map((sId) => (
                  <option key={sId} value={sId}>
                    {sId} {sId === model.startScene ? '(Opening)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Narration Passages in Warm Manuscript Typography */}
          <div className="space-y-4 mb-8">
            {currentScene && currentScene.passages.length > 0 ? (
              currentScene.passages.map((passage, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-xl border leading-relaxed font-serif text-base shadow-sm transition-colors ${
                    isDark
                      ? 'bg-[#1E1D1B] border-[#2E2C29] text-[#F5F5F4]'
                      : 'bg-[#FFFFFF] border-[#E5E2DC] text-[#1C1917]'
                  }`}
                >
                  <p>{passage}</p>
                </div>
              ))
            ) : (
              <div
                className={`p-4 rounded-xl border italic text-sm ${
                  isDark
                    ? 'bg-[#1E1D1B] border-[#2E2C29] text-[#78716C]'
                    : 'bg-[#FFFFFF] border-[#E5E2DC] text-[#78716C]'
                }`}
              >
                (This scene has no narrative passages written yet)
              </div>
            )}
          </div>
        </div>

        {/* Scene Exits */}
        <div
          className={`pt-4 border-t ${
            isDark ? 'border-[#2E2C29]' : 'border-[#E5E2DC]'
          }`}
        >
          {currentScene ? (
            <>
              {/* Choices */}
              {currentScene.exit.type === 'choices' && (
                <div className="space-y-2.5">
                  <div
                    className={`flex items-center justify-between text-xs mb-1 ${
                      isDark ? 'text-[#78716C]' : 'text-[#78716C]'
                    }`}
                  >
                    <span>What does the protagonist do next?</span>
                    <span>{currentScene.exit.options.length} choices available</span>
                  </div>
                  <div className="grid grid-cols-1 gap-2.5">
                    {currentScene.exit.options.map((option, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSelectOption(option.target, option.label)}
                        className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center justify-between group ${
                          isDark
                            ? 'bg-[#1E1D1B] hover:bg-[#252422] border-[#2E2C29] hover:border-[#3D3A36] text-[#F5F5F4]'
                            : 'bg-[#FFFFFF] hover:bg-[#FAF9F6] border-[#E5E2DC] hover:border-[#D7D3CB] text-[#1C1917] shadow-sm'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <span
                            className={`w-5 h-5 rounded-md text-xs font-sans font-semibold flex items-center justify-center transition-colors ${
                              isDark
                                ? 'bg-[#2E2C29] group-hover:bg-[#3D3A36] text-[#A8A29E]'
                                : 'bg-[#F3F1EC] group-hover:bg-[#EDEAE4] text-[#78716C]'
                            }`}
                          >
                            {idx + 1}
                          </span>
                          <span className="text-sm font-medium font-sans">{option.label}</span>
                        </div>
                        <div className="flex items-center space-x-2 opacity-60 group-hover:opacity-100 transition-opacity">
                          <span className="text-xs font-sans hidden sm:inline">
                            → {option.target}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Proceed */}
              {currentScene.exit.type === 'jump' && (
                <div
                  className={`p-4 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-3 ${
                    isDark
                      ? 'bg-[#1E1D1B] border-[#2E2C29]'
                      : 'bg-[#FFFFFF] border-[#E5E2DC] shadow-sm'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                        isDark ? 'bg-[#252422] text-[#FBBF24]' : 'bg-[#FFF7ED] text-[#C2410C]'
                      }`}
                    >
                      →
                    </div>
                    <div>
                      <div
                        className={`text-[11px] uppercase font-sans tracking-wide ${
                          isDark ? 'text-[#78716C]' : 'text-[#78716C]'
                        }`}
                      >
                        Continuous Narrative Transition
                      </div>
                      <div className="text-sm font-medium">
                        Proceeding to: <strong>{currentScene.exit.target}</strong>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleProceed((currentScene.exit as { type: 'jump'; target: string }).target)}
                    className={`w-full sm:w-auto px-4 py-2 rounded-lg font-semibold text-xs flex items-center justify-center space-x-1.5 transition-colors shadow-sm ${
                      isDark
                        ? 'bg-[#F5F5F4] hover:bg-[#FFFFFF] text-[#141413]'
                        : 'bg-[#1C1917] hover:bg-[#292524] text-[#FAF9F6]'
                    }`}
                  >
                    <span>Proceed Now</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Conclude */}
              {currentScene.exit.type === 'conclude' && (
                <div
                  className={`p-6 rounded-2xl border text-center space-y-4 shadow-sm ${
                    isDark
                      ? 'bg-[#1E1D1B] border-[#2E2C29]'
                      : 'bg-[#FFFFFF] border-[#E5E2DC]'
                  }`}
                >
                  <div
                    className={`inline-flex items-center justify-center w-12 h-12 rounded-full border ${
                      isDark
                        ? 'bg-[#2E2416] text-[#FBBF24] border-[#5E4B25]'
                        : 'bg-[#FEF3C7] text-[#D97706] border-[#FDE68A]'
                    }`}
                  >
                    <Trophy className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold font-serif">
                      Story Concluded
                    </h3>
                    <p
                      className={`text-xs mt-1 max-w-sm mx-auto ${
                        isDark ? 'text-[#A8A29E]' : 'text-[#57534E]'
                      }`}
                    >
                      You have reached an ending in "{model.title}".
                    </p>
                  </div>

                  <div
                    className={`flex justify-center space-x-8 text-xs py-2 border-y ${
                      isDark ? 'border-[#2E2C29]' : 'border-[#E5E2DC]'
                    }`}
                  >
                    <div>
                      <span className="block text-[10px] uppercase opacity-70">TURNS TAKEN</span>
                      <strong className="text-sm font-sans">{turnCount}</strong>
                    </div>
                    <div
                      className={`w-[1px] ${
                        isDark ? 'bg-[#2E2C29]' : 'bg-[#E5E2DC]'
                      }`}
                    ></div>
                    <div>
                      <span className="block text-[10px] uppercase opacity-70">SCENES VISITED</span>
                      <strong className="text-sm font-sans">{new Set(history).size}</strong>
                    </div>
                  </div>

                  <button
                    onClick={handleRestart}
                    className={`px-5 py-2.5 rounded-lg font-semibold text-xs transition-colors flex items-center justify-center space-x-2 mx-auto shadow-sm ${
                      isDark
                        ? 'bg-[#F5F5F4] hover:bg-[#FFFFFF] text-[#141413]'
                        : 'bg-[#1C1917] hover:bg-[#292524] text-[#FAF9F6]'
                    }`}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Play Story Again</span>
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center p-4 text-[#DC2626] flex items-center justify-center space-x-2 text-xs">
              <AlertCircle className="w-4 h-4" />
              <span>Scene not found in story model.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
