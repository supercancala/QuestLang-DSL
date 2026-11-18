import React, { useState, useMemo } from 'react';
import { AdventureModel } from '../../types/questlang';
import {
  Search,
  CheckCircle2,
  AlertOctagon,
  Code2,
  Play,
  Layers,
  ChevronRight,
  FileText,
} from 'lucide-react';
import { EngineService } from '../../services/engineService';

interface SceneInspectorProps {
  model: AdventureModel | null;
  onSelectSceneInEditor?: (line: number) => void;
  onPlaytestScene?: (sceneId: string) => void;
  isDark: boolean;
}

export const SceneInspector: React.FC<SceneInspectorProps> = ({
  model,
  onSelectSceneInEditor,
  onPlaytestScene,
  isDark,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterType, setFilterType] = useState<'all' | 'reachable' | 'unreachable' | 'conclude' | 'choices'>('all');
  const [expandedSceneId, setExpandedSceneId] = useState<string | null>(null);

  const metrics = useMemo(() => EngineService.calculateMetrics(model), [model]);
  const unreachableSet = useMemo(() => new Set<string>(metrics.unreachableScenes), [metrics]);

  const sceneList = useMemo(() => {
    if (!model) return [];
    return Object.values(model.scenes);
  }, [model]);

  const filteredScenes = useMemo(() => {
    return sceneList.filter((scene) => {
      const matchesSearch =
        searchQuery === '' ||
        scene.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        scene.passages.some((p) => p.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      if (filterType === 'reachable') return !unreachableSet.has(scene.id);
      if (filterType === 'unreachable') return unreachableSet.has(scene.id);
      if (filterType === 'conclude') return scene.exit.type === 'conclude';
      if (filterType === 'choices') return scene.exit.type === 'choices';

      return true;
    });
  }, [sceneList, searchQuery, filterType, unreachableSet]);

  if (!model) {
    return (
      <div
        className={`flex-1 flex flex-col items-center justify-center p-8 text-center transition-colors ${
          isDark ? 'bg-[#141413] text-[#78716C]' : 'bg-[#FAF9F6] text-[#78716C]'
        }`}
      >
        <Layers className="w-10 h-10 opacity-40 mb-3" />
        <h3
          className={`text-sm font-semibold font-serif ${
            isDark ? 'text-[#F5F5F4]' : 'text-[#1C1917]'
          }`}
        >
          Scene Overview Ready
        </h3>
        <p className="text-xs max-w-sm mt-1">
          Add scenes to your adventure to review story passages and branch reachability.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`flex-1 flex flex-col h-full overflow-hidden transition-colors duration-200 ${
        isDark ? 'bg-[#141413] text-[#F5F5F4]' : 'bg-[#FAF9F6] text-[#1C1917]'
      }`}
    >
      {/* Metrics Banner */}
      <div
        className={`grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 border-b transition-colors ${
          isDark
            ? 'bg-[#181816] border-[#2E2C29]'
            : 'bg-[#F3F1EC] border-[#E5E2DC]'
        }`}
      >
        <div
          className={`p-3 rounded-xl border transition-colors ${
            isDark
              ? 'bg-[#1E1D1B] border-[#2E2C29]'
              : 'bg-[#FFFFFF] border-[#E5E2DC] shadow-sm'
          }`}
        >
          <div className="text-[11px] font-sans text-[#78716C] uppercase font-semibold">Total Scenes</div>
          <div className="text-lg font-bold font-serif mt-0.5">{metrics.sceneCount}</div>
        </div>
        <div
          className={`p-3 rounded-xl border transition-colors ${
            isDark
              ? 'bg-[#1E1D1B] border-[#2E2C29]'
              : 'bg-[#FFFFFF] border-[#E5E2DC] shadow-sm'
          }`}
        >
          <div className="text-[11px] font-sans text-[#78716C] uppercase font-semibold">Story Paths</div>
          <div className="text-lg font-bold font-serif mt-0.5">{metrics.transitionCount}</div>
        </div>
        <div
          className={`p-3 rounded-xl border transition-colors ${
            isDark
              ? 'bg-[#1E1D1B] border-[#2E2C29]'
              : 'bg-[#FFFFFF] border-[#E5E2DC] shadow-sm'
          }`}
        >
          <div className="text-[11px] font-sans text-[#78716C] uppercase font-semibold">Endings</div>
          <div
            className={`text-lg font-bold font-serif mt-0.5 ${
              isDark ? 'text-[#FBBF24]' : 'text-[#D97706]'
            }`}
          >
            {metrics.concludeCount}
          </div>
        </div>
        <div
          className={`p-3 rounded-xl border transition-colors ${
            isDark
              ? 'bg-[#1E1D1B] border-[#2E2C29]'
              : 'bg-[#FFFFFF] border-[#E5E2DC] shadow-sm'
          }`}
        >
          <div className="text-[11px] font-sans text-[#78716C] uppercase font-semibold">Unreachable</div>
          <div
            className={`text-lg font-bold font-serif mt-0.5 ${
              metrics.unreachableScenes.length > 0 ? 'text-[#DC2626]' : 'text-[#16A34A]'
            }`}
          >
            {metrics.unreachableScenes.length}
          </div>
        </div>
      </div>

      {/* Controls & Filters */}
      <div
        className={`p-3.5 border-b flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 transition-colors ${
          isDark ? 'border-[#2E2C29]' : 'border-[#E5E2DC]'
        }`}
      >
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 opacity-50 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search story scenes..."
            className={`w-full pl-8 pr-3 py-1.5 border rounded-lg text-xs outline-none transition-colors ${
              isDark
                ? 'bg-[#1E1D1B] border-[#2E2C29] text-[#F5F5F4] focus:border-[#FBBF24]'
                : 'bg-[#FFFFFF] border-[#E5E2DC] text-[#1C1917] focus:border-[#C2410C]'
            }`}
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto text-xs font-sans">
          <button
            onClick={() => setFilterType('all')}
            className={`px-2.5 py-1 rounded-lg transition-colors border ${
              filterType === 'all'
                ? isDark
                  ? 'bg-[#2E2C29] text-[#F5F5F4] border-[#3D3A36]'
                  : 'bg-[#1C1917] text-[#FAF9F6] border-[#1C1917]'
                : isDark
                ? 'bg-[#1E1D1B] text-[#A8A29E] border-[#2E2C29] hover:text-[#F5F5F4]'
                : 'bg-[#FFFFFF] text-[#78716C] border-[#E5E2DC] hover:text-[#1C1917]'
            }`}
          >
            All ({sceneList.length})
          </button>
          <button
            onClick={() => setFilterType('reachable')}
            className={`px-2.5 py-1 rounded-lg transition-colors border ${
              filterType === 'reachable'
                ? isDark
                  ? 'bg-[#17261C] text-[#86EFAC] border-[#16A34A]/50'
                  : 'bg-[#DCFCE7] text-[#166534] border-[#86EFAC]'
                : isDark
                ? 'bg-[#1E1D1B] text-[#A8A29E] border-[#2E2C29]'
                : 'bg-[#FFFFFF] text-[#78716C] border-[#E5E2DC]'
            }`}
          >
            Reachable
          </button>
          {metrics.unreachableScenes.length > 0 && (
            <button
              onClick={() => setFilterType('unreachable')}
              className={`px-2.5 py-1 rounded-lg transition-colors border ${
                filterType === 'unreachable'
                  ? isDark
                    ? 'bg-[#2E1A1A] text-[#FCA5A5] border-[#DC2626]/50'
                    : 'bg-[#FEE2E2] text-[#991B1B] border-[#FCA5A5]'
                  : isDark
                  ? 'bg-[#1E1D1B] text-[#DC2626] border-[#2E2C29]'
                  : 'bg-[#FFFFFF] text-[#DC2626] border-[#E5E2DC]'
              }`}
            >
              Unreachable ({metrics.unreachableScenes.length})
            </button>
          )}
          <button
            onClick={() => setFilterType('conclude')}
            className={`px-2.5 py-1 rounded-lg transition-colors border ${
              filterType === 'conclude'
                ? isDark
                  ? 'bg-[#2E2416] text-[#FDE68A] border-[#D97706]/50'
                  : 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]'
                : isDark
                ? 'bg-[#1E1D1B] text-[#A8A29E] border-[#2E2C29]'
                : 'bg-[#FFFFFF] text-[#78716C] border-[#E5E2DC]'
            }`}
          >
            Endings ({metrics.concludeCount})
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead
            className={`sticky top-0 border-b z-10 font-sans transition-colors ${
              isDark
                ? 'bg-[#181816] border-[#2E2C29] text-[#A8A29E]'
                : 'bg-[#F3F1EC] border-[#E5E2DC] text-[#78716C]'
            }`}
          >
            <tr>
              <th className="py-2.5 px-4 font-semibold">Scene Title</th>
              <th className="py-2.5 px-3 font-semibold">Manuscript Line</th>
              <th className="py-2.5 px-3 font-semibold">Passages</th>
              <th className="py-2.5 px-3 font-semibold">Branch Exit</th>
              <th className="py-2.5 px-3 font-semibold">Status</th>
              <th className="py-2.5 px-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody
            className={`divide-y font-sans transition-colors ${
              isDark
                ? 'bg-[#141413] divide-[#2E2C29]'
                : 'bg-[#FAF9F6] divide-[#E5E2DC]'
            }`}
          >
            {filteredScenes.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 opacity-60">
                  No scenes match the filter.
                </td>
              </tr>
            ) : (
              filteredScenes.map((scene) => {
                const isStart = scene.id === model.startScene;
                const isUnreachable = unreachableSet.has(scene.id);
                const isExpanded = expandedSceneId === scene.id;

                return (
                  <React.Fragment key={scene.id}>
                    <tr
                      className={`transition-colors ${
                        isDark
                          ? isExpanded
                            ? 'bg-[#1E1D1B]'
                            : 'hover:bg-[#1E1D1B]'
                          : isExpanded
                          ? 'bg-[#F3F1EC]'
                          : 'hover:bg-[#F3F1EC]'
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setExpandedSceneId(isExpanded ? null : scene.id)}
                            className="opacity-60 hover:opacity-100"
                          >
                            <ChevronRight
                              className={`w-3.5 h-3.5 transition-transform ${
                                isExpanded ? 'transform rotate-90' : ''
                              }`}
                            />
                          </button>
                          <span className="font-semibold text-sm">{scene.id}</span>
                          {isStart && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#16A34A]/15 text-[#16A34A] font-semibold border border-[#16A34A]/30">
                              Opening
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-3 opacity-70">
                        <button
                          onClick={() => onSelectSceneInEditor?.(scene.line)}
                          className="hover:underline font-mono"
                        >
                          L{scene.line}
                        </button>
                      </td>

                      <td className="py-3 px-3 opacity-80">
                        <span className="flex items-center space-x-1.5">
                          <FileText className="w-3.5 h-3.5 opacity-60" />
                          <span>{scene.passages.length}</span>
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        {scene.exit.type === 'choices' ? (
                          <span
                            className={`px-2 py-0.5 rounded-md border text-xs font-sans ${
                              isDark
                                ? 'bg-[#1E1D1B] border-[#2E2C29] text-[#F5F5F4]'
                                : 'bg-[#FFFFFF] border-[#E5E2DC] text-[#1C1917]'
                            }`}
                          >
                            {scene.exit.options.length} Choices
                          </span>
                        ) : scene.exit.type === 'jump' ? (
                          <span
                            className={`px-2 py-0.5 rounded-md border text-xs font-sans ${
                              isDark
                                ? 'bg-[#1E1D1B] border-[#2E2C29] text-[#A8A29E]'
                                : 'bg-[#FFFFFF] border-[#E5E2DC] text-[#57534E]'
                            }`}
                          >
                            Proceed → {scene.exit.target}
                          </span>
                        ) : (
                          <span
                            className={`px-2 py-0.5 rounded-md border text-xs font-sans ${
                              isDark
                                ? 'bg-[#2E2416] border-[#5E4B25] text-[#FDE68A]'
                                : 'bg-[#FEF3C7] border-[#FDE68A] text-[#92400E]'
                            }`}
                          >
                            Ending
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        {isUnreachable ? (
                          <span className="inline-flex items-center space-x-1 text-[#DC2626] text-xs font-medium">
                            <AlertOctagon className="w-3 h-3" />
                            <span>Unreachable</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 text-[#16A34A] text-xs font-medium">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Reachable</span>
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => onSelectSceneInEditor?.(scene.line)}
                            className={`p-1.5 rounded-lg border transition-colors ${
                              isDark
                                ? 'hover:bg-[#252422] border-[#2E2C29]'
                                : 'hover:bg-[#FFFFFF] border-[#E5E2DC]'
                            }`}
                            title="Edit Scene in Manuscript"
                          >
                            <Code2 className="w-3.5 h-3.5 opacity-70" />
                          </button>
                          <button
                            onClick={() => onPlaytestScene?.(scene.id)}
                            className={`p-1.5 rounded-lg border transition-colors ${
                              isDark
                                ? 'hover:bg-[#252422] border-[#2E2C29]'
                                : 'hover:bg-[#FFFFFF] border-[#E5E2DC]'
                            }`}
                            title="Play Story from this Scene"
                          >
                            <Play className="w-3.5 h-3.5 opacity-70" />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr className={isDark ? 'bg-[#181816]' : 'bg-[#F3F1EC]'}>
                        <td colSpan={6} className="p-4 pl-12 border-b border-inherit">
                          <div className="space-y-3 font-sans">
                            <div>
                              <div className="text-[11px] uppercase font-bold opacity-60 mb-1">
                                Narration Passages:
                              </div>
                              {scene.passages.length > 0 ? (
                                <div className="space-y-1.5">
                                  {scene.passages.map((p, pIdx) => (
                                    <div
                                      key={pIdx}
                                      className={`p-3 rounded-lg border font-serif text-sm leading-relaxed ${
                                        isDark
                                          ? 'bg-[#1E1D1B] border-[#2E2C29] text-[#F5F5F4]'
                                          : 'bg-[#FFFFFF] border-[#E5E2DC] text-[#1C1917]'
                                      }`}
                                    >
                                      "{p}"
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="opacity-60 italic text-xs">No passages written yet.</div>
                              )}
                            </div>

                            <div>
                              <div className="text-[11px] uppercase font-bold opacity-60 mb-1">
                                Narrative Transitions:
                              </div>
                              {scene.exit.type === 'choices' ? (
                                <div className="space-y-1">
                                  {scene.exit.options.map((opt, oIdx) => (
                                    <div
                                      key={oIdx}
                                      className="flex items-center space-x-2 text-xs"
                                    >
                                      <span className="font-semibold">Choice:</span>
                                      <span className="font-serif italic">"{opt.label}"</span>
                                      <span className="opacity-60">leads to</span>
                                      <strong>{opt.target}</strong>
                                    </div>
                                  ))}
                                </div>
                              ) : scene.exit.type === 'jump' ? (
                                <div className="text-xs">
                                  Proceeds directly to: <strong>{scene.exit.target}</strong>
                                </div>
                              ) : (
                                <div className="text-xs opacity-80">
                                  Concludes the adventure.
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
