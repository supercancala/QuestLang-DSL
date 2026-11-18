import React, { useState } from 'react';
import { AdventureModel } from '../../types/questlang';
import { StoryMap } from './StoryMap';
import { PlaytestSimulator } from './PlaytestSimulator';
import { SceneInspector } from './SceneInspector';
import { Network, Play, Table, PanelRightClose } from 'lucide-react';
import { EngineService } from '../../services/engineService';

export type WorkspaceTab = 'map' | 'play' | 'inspector';

interface WorkspacePaneProps {
  model: AdventureModel | null;
  activeTab: WorkspaceTab;
  onTabChange: (tab: WorkspaceTab) => void;
  onSelectSceneInEditor?: (line: number) => void;
  onClosePanel?: () => void;
  isDark: boolean;
}

export const WorkspacePane: React.FC<WorkspacePaneProps> = ({
  model,
  activeTab,
  onTabChange,
  onSelectSceneInEditor,
  onClosePanel,
  isDark,
}) => {
  const [playtestTargetScene, setPlaytestTargetScene] = useState<string | null>(null);

  const metrics = EngineService.calculateMetrics(model);

  const handlePlaytestScene = (sceneId: string) => {
    setPlaytestTargetScene(sceneId);
    onTabChange('play');
  };

  return (
    <div
      className={`flex-1 flex flex-col h-full overflow-hidden select-none transition-colors duration-200 ${
        isDark ? 'bg-[#141413]' : 'bg-[#FAF9F6]'
      }`}
    >
      {/* Workspace Tab Header */}
      <div
        className={`flex items-center justify-between px-3.5 py-2 border-b shrink-0 transition-colors ${
          isDark
            ? 'bg-[#1E1D1B] border-[#2E2C29]'
            : 'bg-[#F3F1EC] border-[#E5E2DC]'
        }`}
      >
        <div className="flex items-center space-x-1.5">
          {/* Tab 1: Story Map */}
          <button
            onClick={() => onTabChange('map')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'map'
                ? isDark
                  ? 'bg-[#252422] text-[#F5F5F4] shadow-sm'
                  : 'bg-[#FFFFFF] text-[#1C1917] shadow-sm'
                : isDark
                ? 'text-[#A8A29E] hover:text-[#F5F5F4] hover:bg-[#252422]'
                : 'text-[#78716C] hover:text-[#1C1917] hover:bg-[#E5E2DC]'
            }`}
          >
            <Network className="w-3.5 h-3.5" />
            <span>Story Map</span>
            {model && (
              <span
                className={`text-[11px] px-1.5 py-0.2 rounded-full font-sans border ${
                  isDark
                    ? 'bg-[#141413] text-[#A8A29E] border-[#2E2C29]'
                    : 'bg-[#FAF9F6] text-[#78716C] border-[#E5E2DC]'
                }`}
              >
                {metrics.sceneCount}
              </span>
            )}
          </button>

          {/* Tab 2: Playtest Simulator */}
          <button
            onClick={() => onTabChange('play')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'play'
                ? isDark
                  ? 'bg-[#252422] text-[#F5F5F4] shadow-sm'
                  : 'bg-[#FFFFFF] text-[#1C1917] shadow-sm'
                : isDark
                ? 'text-[#A8A29E] hover:text-[#F5F5F4] hover:bg-[#252422]'
                : 'text-[#78716C] hover:text-[#1C1917] hover:bg-[#E5E2DC]'
            }`}
          >
            <Play className="w-3.5 h-3.5" />
            <span>Playtest Simulator</span>
          </button>

          {/* Tab 3: Scene Overview (De-jargonized from Scene Inspector) */}
          <button
            onClick={() => onTabChange('inspector')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'inspector'
                ? isDark
                  ? 'bg-[#252422] text-[#F5F5F4] shadow-sm'
                  : 'bg-[#FFFFFF] text-[#1C1917] shadow-sm'
                : isDark
                ? 'text-[#A8A29E] hover:text-[#F5F5F4] hover:bg-[#252422]'
                : 'text-[#78716C] hover:text-[#1C1917] hover:bg-[#E5E2DC]'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            <span>Scene Overview</span>
          </button>
        </div>

        {/* Right Header: Metrics summary & Close Panel button */}
        <div className="flex items-center space-x-3">
          {model && (
            <div
              className={`hidden xl:flex items-center space-x-3 text-xs font-sans ${
                isDark ? 'text-[#78716C]' : 'text-[#78716C]'
              }`}
            >
              <span>
                Opening: <strong className={isDark ? 'text-[#86EFAC]' : 'text-[#16A34A]'}>{model.startScene}</strong>
              </span>
              <span>•</span>
              <span>
                Endings: <strong className={isDark ? 'text-[#FDE68A]' : 'text-[#D97706]'}>{metrics.concludeCount}</strong>
              </span>
            </div>
          )}

          {onClosePanel && (
            <button
              onClick={onClosePanel}
              className={`p-1.5 rounded-lg transition-colors ${
                isDark
                  ? 'text-[#78716C] hover:text-[#F5F5F4] hover:bg-[#252422]'
                  : 'text-[#78716C] hover:text-[#1C1917] hover:bg-[#E5E2DC]'
              }`}
              title="Close Storyboard (Wide Manuscript View)"
            >
              <PanelRightClose className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Tab Content Panes */}
      <div className="flex-1 overflow-hidden relative">
        {activeTab === 'map' && (
          <StoryMap
            model={model}
            onSelectSceneInEditor={onSelectSceneInEditor}
            onPlaytestScene={handlePlaytestScene}
            isDark={isDark}
          />
        )}

        {activeTab === 'play' && (
          <PlaytestSimulator
            model={model}
            initialSceneId={playtestTargetScene}
            onSelectSceneInEditor={onSelectSceneInEditor}
            isDark={isDark}
          />
        )}

        {activeTab === 'inspector' && (
          <SceneInspector
            model={model}
            onSelectSceneInEditor={onSelectSceneInEditor}
            onPlaytestScene={handlePlaytestScene}
            isDark={isDark}
          />
        )}
      </div>
    </div>
  );
};
