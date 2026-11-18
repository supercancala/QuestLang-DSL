import React, { useState } from 'react';
import { EngineMode, EngineResponse } from '../types/questlang';
import {
  Feather,
  Play,
  Download,
  Settings,
  PanelRightClose,
  PanelRightOpen,
  Sun,
  Moon,
} from 'lucide-react';
import { ApiSettingsModal } from './Modals/ApiSettingsModal';

interface HeaderProps {
  engineMode: EngineMode;
  onEngineModeChange: (mode: EngineMode) => void;
  apiEndpoint: string;
  onApiEndpointChange: (endpoint: string) => void;
  onValidateAndRun: () => void;
  onExport: () => void;
  engineResponse: EngineResponse | null;
  isValidating?: boolean;
  isWorkspaceOpen: boolean;
  onToggleWorkspace: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  engineMode,
  onEngineModeChange,
  apiEndpoint,
  onApiEndpointChange,
  onValidateAndRun,
  onExport,
  isValidating = false,
  isWorkspaceOpen,
  onToggleWorkspace,
  isDark,
  onToggleTheme,
}) => {
  const [isApiModalOpen, setIsApiModalOpen] = useState<boolean>(false);

  return (
    <>
      <header
        className={`h-14 px-4 flex items-center justify-between shrink-0 select-none z-30 border-b whitespace-nowrap overflow-x-auto transition-colors duration-200 ${
          isDark
            ? 'bg-[#1E1D1B] border-[#2E2C29]'
            : 'bg-[#F3F1EC] border-[#E5E2DC]'
        }`}
      >
        {/* Left: Studio Brand & De-Jargonized Story Mode Badge */}
        <div className="flex items-center space-x-3.5 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                isDark
                  ? 'bg-[#252422] text-[#FBBF24] border border-[#2E2C29]'
                  : 'bg-[#FFFFFF] text-[#C2410C] border border-[#E5E2DC] shadow-sm'
              }`}
            >
              <Feather className="w-4 h-4" />
            </div>
            <div>
              <h1
                className={`text-sm font-bold tracking-tight leading-none flex items-center gap-1.5 ${
                  isDark ? 'text-[#F5F5F4]' : 'text-[#1C1917]'
                }`}
              >
                <span>QuestLang Studio</span>
                <span
                  className={`text-[10px] font-sans px-1.5 py-0.2 rounded border font-medium ${
                    isDark
                      ? 'bg-[#252422] text-[#A8A29E] border-[#2E2C29]'
                      : 'bg-[#FAF9F6] text-[#78716C] border-[#E5E2DC]'
                  }`}
                >
                  Writer's Edition
                </span>
              </h1>
              <p
                className={`text-[11px] font-sans leading-none mt-1 ${
                  isDark ? 'text-[#78716C]' : 'text-[#78716C]'
                }`}
              >
                Interactive Storytelling & Adventure Craft
              </p>
            </div>
          </div>

          <div
            className={`h-4 w-[1px] hidden sm:block ${
              isDark ? 'bg-[#2E2C29]' : 'bg-[#E5E2DC]'
            }`}
          ></div>

          {/* Writer-friendly mode badge: "Story Preview Mode" */}
          <div className="flex items-center space-x-1.5">
            <div
              onClick={() => setIsApiModalOpen(true)}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs cursor-pointer transition-colors border ${
                isDark
                  ? 'bg-[#141413] hover:bg-[#252422] border-[#2E2C29] text-[#A8A29E]'
                  : 'bg-[#FFFFFF] hover:bg-[#FAF9F6] border-[#E5E2DC] text-[#57534E] shadow-sm'
              }`}
              title="Click to view engine settings"
            >
              <span className="w-2 h-2 rounded-full bg-[#10b981]"></span>
              <span className="text-xs font-sans">
                {engineMode === 'mock' ? (
                  <>
                    <span className="hidden md:inline">Mode: </span>
                    <strong
                      className={isDark ? 'text-[#F5F5F4]' : 'text-[#1C1917]'}
                    >
                      Story Preview Mode
                    </strong>
                  </>
                ) : (
                  <>
                    <span className="hidden md:inline">Mode: </span>
                    <strong
                      className={isDark ? 'text-[#F5F5F4]' : 'text-[#1C1917]'}
                    >
                      Server Mode
                    </strong>
                  </>
                )}
              </span>
            </div>

            <button
              onClick={() => setIsApiModalOpen(true)}
              className={`p-1.5 rounded-md transition-colors ${
                isDark
                  ? 'hover:bg-[#252422] text-[#78716C] hover:text-[#F5F5F4]'
                  : 'hover:bg-[#E5E2DC] text-[#78716C] hover:text-[#1C1917]'
              }`}
              title="Story Engine Settings"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right: Actions, Theme Switcher & Panel Toggle */}
        <div className="flex items-center space-x-2">
          {/* Light / Dark Mode Toggle */}
          <button
            onClick={onToggleTheme}
            className={`p-2 rounded-lg border transition-all ${
              isDark
                ? 'bg-[#252422] hover:bg-[#2E2C29] border-[#2E2C29] text-[#FBBF24]'
                : 'bg-[#FFFFFF] hover:bg-[#FAF9F6] border-[#E5E2DC] text-[#C2410C] shadow-sm'
            }`}
            title={isDark ? 'Switch to Light Mode ("Manuscript Paper")' : 'Switch to Dark Mode ("Evening Desk")'}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Export Story Button */}
          <button
            onClick={onExport}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              isDark
                ? 'bg-[#252422] hover:bg-[#2E2C29] border-[#2E2C29] text-[#F5F5F4]'
                : 'bg-[#FFFFFF] hover:bg-[#FAF9F6] border-[#E5E2DC] text-[#1C1917] shadow-sm'
            }`}
            title="Download current manuscript as .quest"
          >
            <Download className="w-3.5 h-3.5 opacity-70" />
            <span className="hidden sm:inline">Export Story</span>
          </button>

          {/* De-jargonized Primary Action: "Check & Play Story" */}
          <button
            onClick={onValidateAndRun}
            disabled={isValidating}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm ${
              isDark
                ? 'bg-[#F5F5F4] hover:bg-[#FFFFFF] text-[#141413] active:bg-[#E5E2DC]'
                : 'bg-[#1C1917] hover:bg-[#292524] text-[#FAF9F6] active:bg-[#0C0A09]'
            }`}
            title="Check story structure and play in simulator (Ctrl+Enter)"
          >
            <Play className={`w-3.5 h-3.5 fill-current ${isValidating ? 'animate-spin' : ''}`} />
            <span>{isValidating ? 'Checking...' : 'Check & Play Story'}</span>
          </button>

          <div
            className={`h-4 w-[1px] mx-1 ${
              isDark ? 'bg-[#2E2C29]' : 'bg-[#E5E2DC]'
            }`}
          ></div>

          {/* Story Map / Workspace Toggle */}
          <button
            onClick={onToggleWorkspace}
            className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
              isWorkspaceOpen
                ? isDark
                  ? 'bg-[#252422] text-[#F5F5F4] border-[#2E2C29]'
                  : 'bg-[#EDEAE4] text-[#1C1917] border-[#E5E2DC]'
                : isDark
                ? 'bg-transparent text-[#78716C] hover:text-[#F5F5F4] border-transparent hover:bg-[#252422]'
                : 'bg-transparent text-[#78716C] hover:text-[#1C1917] border-transparent hover:bg-[#E5E2DC]'
            }`}
            title={isWorkspaceOpen ? 'Hide Right Panel (Wide Manuscript View)' : 'Show Storyboard & Simulator'}
          >
            {isWorkspaceOpen ? (
              <>
                <PanelRightClose className="w-4 h-4" />
                <span className="hidden lg:inline text-xs">Wide View</span>
              </>
            ) : (
              <>
                <PanelRightOpen className="w-4 h-4 text-[#10b981]" />
                <span className="hidden lg:inline text-xs font-medium">Show Storyboard</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Engine Settings Modal */}
      <ApiSettingsModal
        isOpen={isApiModalOpen}
        onClose={() => setIsApiModalOpen(false)}
        mode={engineMode}
        onModeChange={onEngineModeChange}
        apiEndpoint={apiEndpoint}
        onApiEndpointChange={onApiEndpointChange}
        isDark={isDark}
      />
    </>
  );
};
