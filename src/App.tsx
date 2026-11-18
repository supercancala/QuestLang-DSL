import React, { useState, useEffect, useCallback, useRef } from 'react';
import { EngineMode, EngineResponse } from './types/questlang';
import { SAMPLE_ADVENTURES } from './data/sampleAdventures';
import { EngineService } from './services/engineService';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { CodeEditor } from './components/Editor/CodeEditor';
import { DiagnosticsDrawer } from './components/Editor/DiagnosticsDrawer';
import { StoryMap } from './components/Workspace/StoryMap';
import { PlaytestSimulator } from './components/Workspace/PlaytestSimulator';
import { SceneInspector } from './components/Workspace/SceneInspector';
import { BookOpen, Play, Layers } from 'lucide-react';

/** Three full-width views in the Center Workspace */
type CenterTab = 'manuscript' | 'play' | 'overview';

export const App: React.FC = () => {
  // Pre-load Preset 1: "The mysterious town"
  const defaultAdventure = SAMPLE_ADVENTURES[0].code;

  const [code, setCode] = useState<string>(defaultAdventure);
  const [engineMode, setEngineMode] = useState<EngineMode>('mock');
  const [apiEndpoint, setApiEndpoint] = useState<string>('http://localhost:3000/api/validate');
  const [engineResponse, setEngineResponse] = useState<EngineResponse | null>(null);
  const [isValidating, setIsValidating] = useState<boolean>(false);

  // Theme: defaults to Light Mode ("Manuscript Paper")
  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = localStorage.getItem('questlang-theme');
    return saved === 'dark';
  });

  // jumpTarget: set only on explicit error-row or scene-inspector click — never on normal editor clicks
  const [jumpTarget, setJumpTarget] = useState<{ line: number; ts: number } | null>(null);

  // Center Workspace tabs
  const [centerTab, setCenterTab] = useState<CenterTab>('manuscript');

  // Scene to start playtest from (set by Story Map "Play from here")
  const [playtestTargetScene, setPlaytestTargetScene] = useState<string | null>(null);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);

  // Right Story Map panel: resizable & collapsible
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState<boolean>(true);
  const [workspaceWidth, setWorkspaceWidth] = useState<number>(560);
  const [isDraggingSplitter, setIsDraggingSplitter] = useState<boolean>(false);

  const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mainContainerRef = useRef<HTMLDivElement>(null);

  // Sync theme with document root
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('questlang-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('questlang-theme', 'light');
    }
  }, [isDark]);

  const handleToggleTheme = () => setIsDark((prev) => !prev);

  // Core validation via EngineService
  const performValidation = useCallback(
    async (sourceCode: string, mode: EngineMode, endpoint: string) => {
      setIsValidating(true);
      const service = new EngineService(mode, endpoint);
      try {
        const response = await service.validateAndParse(sourceCode);
        setEngineResponse(response);
      } catch (err) {
        console.error('Validation error:', err);
      } finally {
        setIsValidating(false);
      }
    },
    []
  );

  // Initial validation on mount
  useEffect(() => {
    performValidation(code, engineMode, apiEndpoint);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced auto-validation on code edits (350ms)
  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    if (validationTimeoutRef.current) clearTimeout(validationTimeoutRef.current);
    validationTimeoutRef.current = setTimeout(() => {
      performValidation(newCode, engineMode, apiEndpoint);
    }, 350);
  };

  // Immediate "Check & Play Story" (Ctrl+Enter or header button)
  const handleValidateAndRun = async () => {
    if (validationTimeoutRef.current) clearTimeout(validationTimeoutRef.current);
    setIsValidating(true);
    const service = new EngineService(engineMode, apiEndpoint);
    const response = await service.validateAndParse(code);
    setEngineResponse(response);
    setIsValidating(false);

    // If valid: open map pane, switch to Playtest tab in center
    if (response.valid) {
      setIsWorkspaceOpen(true);
      setCenterTab('play');
    }
  };

  // Draggable Split-Pane
  const handleSplitterPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsDraggingSplitter(true);
    const startX = e.clientX;
    const startWidth = workspaceWidth;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const containerWidth = mainContainerRef.current?.clientWidth || window.innerWidth;
      const delta = startX - moveEvent.clientX;
      const minW = 320;
      const maxW = Math.max(minW, containerWidth - 360);
      setWorkspaceWidth(Math.min(Math.max(minW, startWidth + delta), maxW));
    };

    const handlePointerUp = () => {
      setIsDraggingSplitter(false);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  // Export .quest file
  const handleExport = () => {
    const title = engineResponse?.model?.title || 'story';
    const filename =
      title.toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-') + '.quest';
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Sample / file management handlers
  const handleLoadSample = (sampleCode: string) => {
    setCode(sampleCode);
    setJumpTarget(null);
    setCenterTab('manuscript');
    performValidation(sampleCode, engineMode, apiEndpoint);
  };

  const handleUploadFile = (uploadedCode: string) => {
    setCode(uploadedCode);
    setJumpTarget(null);
    setCenterTab('manuscript');
    performValidation(uploadedCode, engineMode, apiEndpoint);
  };

  const handleNewFile = () => {
    const blankCode = SAMPLE_ADVENTURES[1].code;
    setCode(blankCode);
    setJumpTarget(null);
    setCenterTab('manuscript');
    performValidation(blankCode, engineMode, apiEndpoint);
  };

  const handleEngineModeChange = (mode: EngineMode) => {
    setEngineMode(mode);
    performValidation(code, mode, apiEndpoint);
  };

  const handleApiEndpointChange = (endpoint: string) => {
    setApiEndpoint(endpoint);
    performValidation(code, engineMode, endpoint);
  };

  // Jump editor cursor to a specific line (from diagnostics panel or scene table)
  const handleSelectLine = (line: number) => {
    setCenterTab('manuscript');
    setJumpTarget({ line, ts: Date.now() });
  };

  // Story Map → switch to Playtest in center
  const handlePlaytestScene = (sceneId: string) => {
    setPlaytestTargetScene(sceneId);
    setCenterTab('play');
  };

  // Center tab button shared styles
  const tabBtn = (active: boolean) =>
    `flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
      active
        ? isDark
          ? 'bg-[#252422] text-[#F5F5F4] shadow-sm'
          : 'bg-[#FFFFFF] text-[#1C1917] shadow-sm border border-[#E5E2DC]'
        : isDark
        ? 'text-[#A8A29E] hover:text-[#F5F5F4] hover:bg-[#252422]'
        : 'text-[#78716C] hover:text-[#1C1917] hover:bg-[#EDEAE4]'
    }`;

  return (
    <div
      className={`flex flex-col h-screen w-screen overflow-hidden transition-colors duration-200 ${
        isDark ? 'bg-[#141413] text-[#F5F5F4]' : 'bg-[#FAF9F6] text-[#1C1917]'
      }`}
    >
      {/* ── Top Header Bar ── */}
      <Header
        engineMode={engineMode}
        onEngineModeChange={handleEngineModeChange}
        apiEndpoint={apiEndpoint}
        onApiEndpointChange={handleApiEndpointChange}
        onValidateAndRun={handleValidateAndRun}
        onExport={handleExport}
        engineResponse={engineResponse}
        isValidating={isValidating}
        isWorkspaceOpen={isWorkspaceOpen}
        onToggleWorkspace={() => setIsWorkspaceOpen(!isWorkspaceOpen)}
        isDark={isDark}
        onToggleTheme={handleToggleTheme}
      />

      {/* ── Main IDE Body ── */}
      <div
        ref={mainContainerRef}
        className={`flex-1 flex overflow-hidden ${
          isDraggingSplitter ? 'select-none cursor-col-resize' : ''
        }`}
      >
        {/* Left Sidebar */}
        <Sidebar
          onLoadSample={handleLoadSample}
          onUploadFile={handleUploadFile}
          onDownloadFile={handleExport}
          onNewFile={handleNewFile}
          currentAdventureTitle={engineResponse?.model?.title}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          isDark={isDark}
        />

        {/* ── Center Workspace (Manuscript | Playtest | Scene Overview) ── */}
        <main className="flex-1 flex flex-col min-w-[320px] h-full overflow-hidden">

          {/* Center Tab Bar */}
          <div
            className={`flex items-center px-3 py-1.5 border-b shrink-0 gap-1 transition-colors ${
              isDark
                ? 'bg-[#1E1D1B] border-[#2E2C29]'
                : 'bg-[#F3F1EC] border-[#E5E2DC]'
            }`}
          >
            <button
              onClick={() => setCenterTab('manuscript')}
              className={tabBtn(centerTab === 'manuscript')}
              title="Manuscript Editor (story.quest)"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Manuscript</span>
              <span
                className={`text-[10px] font-mono ${
                  isDark ? 'text-[#78716C]' : 'text-[#A8A29E]'
                }`}
              >
                story.quest
              </span>
            </button>

            <button
              onClick={() => setCenterTab('play')}
              className={tabBtn(centerTab === 'play')}
              title="Playtest — interactive story player"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Playtest</span>
              {engineResponse?.valid && (
                <span
                  className={`w-1.5 h-1.5 rounded-full bg-[#16A34A]`}
                  title="Story is ready to play"
                />
              )}
            </button>

            <button
              onClick={() => setCenterTab('overview')}
              className={tabBtn(centerTab === 'overview')}
              title="Scene Overview — all scenes, passages, and exits"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Scene Overview</span>
              {engineResponse?.model && (
                <span
                  className={`text-[10px] px-1.5 rounded-full font-sans border ${
                    isDark
                      ? 'bg-[#141413] text-[#A8A29E] border-[#2E2C29]'
                      : 'bg-[#FAF9F6] text-[#78716C] border-[#E5E2DC]'
                  }`}
                >
                  {Object.keys(engineResponse.model.scenes).length}
                </span>
              )}
            </button>
          </div>

          {/* Center Tab Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* ── Tab 1: Manuscript Editor ── */}
            {centerTab === 'manuscript' && (
              <>
                <CodeEditor
                  code={code}
                  onChange={handleCodeChange}
                  errors={engineResponse?.errors || []}
                  jumpTarget={jumpTarget}
                  onValidate={handleValidateAndRun}
                  isDark={isDark}
                />
                <DiagnosticsDrawer
                  engineResponse={engineResponse}
                  onSelectLine={handleSelectLine}
                  isDark={isDark}
                />
              </>
            )}

            {/* ── Tab 2: Playtest Simulator (full-width) ── */}
            {centerTab === 'play' && (
              <div className="flex-1 overflow-hidden">
                <PlaytestSimulator
                  model={engineResponse?.model || null}
                  initialSceneId={playtestTargetScene}
                  onSelectSceneInEditor={handleSelectLine}
                  isDark={isDark}
                />
              </div>
            )}

            {/* ── Tab 3: Scene Overview (full-width) ── */}
            {centerTab === 'overview' && (
              <div className="flex-1 overflow-hidden">
                <SceneInspector
                  model={engineResponse?.model || null}
                  onSelectSceneInEditor={handleSelectLine}
                  onPlaytestScene={handlePlaytestScene}
                  isDark={isDark}
                />
              </div>
            )}
          </div>
        </main>

        {/* ── Draggable Vertical Splitter ── */}
        {isWorkspaceOpen && (
          <div
            onPointerDown={handleSplitterPointerDown}
            className={`w-1.5 hover:w-2 cursor-col-resize flex items-center justify-center relative transition-all group z-20 shrink-0 select-none border-x ${
              isDark
                ? 'bg-[#1E1D1B] border-[#2E2C29] hover:bg-[#3D3A36]'
                : 'bg-[#F3F1EC] border-[#E5E2DC] hover:bg-[#D7D3CB]'
            } ${isDraggingSplitter ? (isDark ? 'bg-[#3D3A36]' : 'bg-[#D7D3CB]') : ''}`}
            title="Drag to resize Story Map"
          >
            <div
              className={`w-0.5 h-7 rounded-full transition-colors ${
                isDraggingSplitter
                  ? isDark
                    ? 'bg-[#F5F5F4]'
                    : 'bg-[#1C1917]'
                  : isDark
                  ? 'bg-[#3D3A36] group-hover:bg-[#A8A29E]'
                  : 'bg-[#D7D3CB] group-hover:bg-[#78716C]'
              }`}
            />
          </div>
        )}

        {/* ── Right Pane: Story Map (dedicated, no tabs) ── */}
        {isWorkspaceOpen && (
          <section
            style={{ width: `${workspaceWidth}px` }}
            className="flex flex-col min-w-[320px] h-full shrink-0 overflow-hidden"
          >
            <StoryMap
              model={engineResponse?.model || null}
              onSelectSceneInEditor={(line) => {
                setCenterTab('manuscript');
                handleSelectLine(line);
              }}
              onPlaytestScene={handlePlaytestScene}
              onClosePanel={() => setIsWorkspaceOpen(false)}
              isDark={isDark}
            />
          </section>
        )}
      </div>
    </div>
  );
};
