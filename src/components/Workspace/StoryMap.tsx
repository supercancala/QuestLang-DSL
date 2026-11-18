import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import dagre from '@dagrejs/dagre';
import { AdventureModel } from '../../types/questlang';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  AlertOctagon,
  Play,
  Code2,
  BookOpen,
  Scan,
  X,
} from 'lucide-react';
import { EngineService } from '../../services/engineService';

interface StoryMapProps {
  model: AdventureModel | null;
  onSelectSceneInEditor?: (line: number) => void;
  onPlaytestScene?: (sceneId: string) => void;
  onClosePanel?: () => void;
  isDark: boolean;
}

interface LayoutNode {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isStart: boolean;
  isConclude: boolean;
  isUnreachable: boolean;
  openingPassage: string;
  passagesCount: number;
  line: number;
}

interface LayoutEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  isProceed: boolean;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  isBackward: boolean;
}

export const StoryMap: React.FC<StoryMapProps> = ({
  model,
  onSelectSceneInEditor,
  onPlaytestScene,
  onClosePanel,
  isDark,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 50, y: 50 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);

  // Compute Dagre hierarchical left-to-right layout
  const { nodes, edges, unreachableSet, boundingBox } = useMemo(() => {
    if (!model || !model.scenes || Object.keys(model.scenes).length === 0) {
      return {
        nodes: [] as LayoutNode[],
        edges: [] as LayoutEdge[],
        unreachableSet: new Set<string>(),
        boundingBox: { minX: 0, minY: 0, maxX: 400, maxY: 300 },
      };
    }

    const metrics = EngineService.calculateMetrics(model);
    const unreachables = new Set<string>(metrics.unreachableScenes);

    // Initialize Dagre Graph
    const g = new dagre.graphlib.Graph();
    g.setGraph({
      rankdir: 'LR',
      nodesep: 60,
      ranksep: 110,
      marginx: 50,
      marginy: 60,
    });
    g.setDefaultEdgeLabel(() => ({}));

    const nodeWidth = 220;
    const nodeHeight = 88;

    // Register all nodes
    Object.keys(model.scenes).forEach((sceneId) => {
      g.setNode(sceneId, { width: nodeWidth, height: nodeHeight });
    });

    // Register all edges
    Object.values(model.scenes).forEach((scene) => {
      if (scene.exit.type === 'choices') {
        scene.exit.options.forEach((opt) => {
          if (model.scenes[opt.target]) {
            g.setEdge(scene.id, opt.target);
          }
        });
      } else if (scene.exit.type === 'jump') {
        if (model.scenes[scene.exit.target]) {
          g.setEdge(scene.id, scene.exit.target);
        }
      }
    });

    // Run Dagre Layout computation
    dagre.layout(g);

    const computedNodes: LayoutNode[] = [];
    const nodeCenterPositions: Record<string, { x: number; y: number }> = {};

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    Object.keys(model.scenes).forEach((sceneId) => {
      const dagreNode = g.node(sceneId);
      if (!dagreNode) return;

      const topLeftX = dagreNode.x - nodeWidth / 2;
      const topLeftY = dagreNode.y - nodeHeight / 2;

      minX = Math.min(minX, topLeftX);
      minY = Math.min(minY, topLeftY);
      maxX = Math.max(maxX, topLeftX + nodeWidth);
      maxY = Math.max(maxY, topLeftY + nodeHeight);

      nodeCenterPositions[sceneId] = { x: dagreNode.x, y: dagreNode.y };

      const scene = model.scenes[sceneId];
      computedNodes.push({
        id: sceneId,
        x: topLeftX,
        y: topLeftY,
        width: nodeWidth,
        height: nodeHeight,
        isStart: sceneId === model.startScene,
        isConclude: scene.exit.type === 'conclude',
        isUnreachable: unreachables.has(sceneId),
        openingPassage: scene.passages[0] || 'No narration written yet.',
        passagesCount: scene.passages.length,
        line: scene.line,
      });
    });

    // Build edges with loopback detection
    const computedEdges: LayoutEdge[] = [];
    Object.values(model.scenes).forEach((scene) => {
      const sourceCenter = nodeCenterPositions[scene.id];
      if (!sourceCenter) return;

      const fromX = sourceCenter.x + nodeWidth / 2;
      const fromY = sourceCenter.y;

      if (scene.exit.type === 'choices') {
        scene.exit.options.forEach((opt, optIdx) => {
          const targetCenter = nodeCenterPositions[opt.target];
          if (targetCenter) {
            const isBackward = targetCenter.x <= sourceCenter.x;
            const toX = isBackward ? targetCenter.x + nodeWidth / 2 : targetCenter.x - nodeWidth / 2;
            const toY = targetCenter.y;

            computedEdges.push({
              id: `${scene.id}-${opt.target}-${optIdx}`,
              source: scene.id,
              target: opt.target,
              label: opt.label,
              isProceed: false,
              fromX,
              fromY,
              toX,
              toY,
              isBackward,
            });
          }
        });
      } else if (scene.exit.type === 'jump') {
        const targetCenter = nodeCenterPositions[scene.exit.target];
        if (targetCenter) {
          const isBackward = targetCenter.x <= sourceCenter.x;
          const toX = isBackward ? targetCenter.x + nodeWidth / 2 : targetCenter.x - nodeWidth / 2;
          const toY = targetCenter.y;

          computedEdges.push({
            id: `${scene.id}-${scene.exit.target}-jump`,
            source: scene.id,
            target: scene.exit.target,
            label: 'Proceed',
            isProceed: true,
            fromX,
            fromY,
            toX,
            toY,
            isBackward,
          });
        }
      }
    });

    return {
      nodes: computedNodes,
      edges: computedEdges,
      unreachableSet: unreachables,
      boundingBox: {
        minX: minX === Infinity ? 0 : minX,
        minY: minY === Infinity ? 0 : minY,
        maxX: maxX === -Infinity ? 500 : maxX,
        maxY: maxY === -Infinity ? 400 : maxY,
      },
    };
  }, [model]);

  // Fit to View Calculation
  const fitToView = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const containerWidth = container.clientWidth || 600;
    const containerHeight = container.clientHeight || 500;

    const graphWidth = boundingBox.maxX - boundingBox.minX + 120;
    const graphHeight = boundingBox.maxY - boundingBox.minY + 120;

    const zoomX = containerWidth / graphWidth;
    const zoomY = containerHeight / graphHeight;
    const newZoom = Math.min(Math.max(0.4, Math.min(zoomX, zoomY) * 0.92), 1.25);

    const centerX = (boundingBox.minX + boundingBox.maxX) / 2;
    const centerY = (boundingBox.minY + boundingBox.maxY) / 2;

    const newPanX = containerWidth / 2 - centerX * newZoom;
    const newPanY = containerHeight / 2 - centerY * newZoom;

    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  }, [boundingBox]);

  // Auto fit to view when model loads or changes
  useEffect(() => {
    const timer = setTimeout(() => {
      fitToView();
    }, 60);
    return () => clearTimeout(timer);
  }, [model?.title, fitToView]);

  // Keyboard shortcut: Esc to exit full-screen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullScreen) {
        setIsFullScreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullScreen]);

  // Trackpad 2-finger zoom & pan via non-passive native wheel listener
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const zoomDelta = -e.deltaY * 0.005;
        setZoom((z) => Math.min(Math.max(0.35, z + zoomDelta), 2.2));
      } else {
        setPan((prev) => ({
          x: prev.x - e.deltaX * 0.9,
          y: prev.y - e.deltaY * 0.9,
        }));
      }
    };

    container.addEventListener('wheel', onWheel, { passive: false });
    return () => container.removeEventListener('wheel', onWheel);
  }, [isFullScreen]);

  // Mouse drag panning
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.interactive-story-card')) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const selectedNode = useMemo(() => {
    if (!selectedNodeId || !model || !model.scenes[selectedNodeId]) return null;
    return model.scenes[selectedNodeId];
  }, [selectedNodeId, model]);

  if (!model || nodes.length === 0) {
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
          Story Map Ready
        </h3>
        <p className="text-xs max-w-sm mt-1">
          Type scene passages in the editor to visualize your story branches on this corkboard.
        </p>
      </div>
    );
  }

  // The main canvas content — always fills its container (flex-1 w-full h-full)
  // The portal shell handles fixed positioning when in full-screen mode
  const mapContent = (
    <div
      className={`relative flex flex-col w-full h-full overflow-hidden select-none transition-colors ${
        isDark ? 'bg-[#141413]' : 'bg-[#FAF9F6]'
      }`}
    >
      {/* Requirement 1: Single, Clean Top Toolbar (No Wrap, No Duplicate Legend) */}
      <div
        className={`h-11 px-3 border-b flex items-center justify-between shrink-0 whitespace-nowrap overflow-x-auto transition-colors z-20 ${
          isDark ? 'bg-[#1E1D1B] border-[#2E2C29]' : 'bg-[#F3F1EC] border-[#E5E2DC]'
        }`}
      >
        {/* Left: Zoom Controls & Fit to View */}
        <div className="flex items-center space-x-1 shrink-0">
          <button
            onClick={() => setZoom((z) => Math.max(z - 0.15, 0.35))}
            className={`p-1.5 rounded-md transition-colors ${
              isDark
                ? 'hover:bg-[#252422] text-[#A8A29E] hover:text-[#F5F5F4]'
                : 'hover:bg-[#EDEAE4] text-[#78716C] hover:text-[#1C1917]'
            }`}
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span
            className={`text-xs font-mono px-1.5 min-w-[42px] text-center ${
              isDark ? 'text-[#A8A29E]' : 'text-[#78716C]'
            }`}
          >
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.min(z + 0.15, 2.2))}
            className={`p-1.5 rounded-md transition-colors ${
              isDark
                ? 'hover:bg-[#252422] text-[#A8A29E] hover:text-[#F5F5F4]'
                : 'hover:bg-[#EDEAE4] text-[#78716C] hover:text-[#1C1917]'
            }`}
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <div
            className={`w-[1px] h-4 mx-1 ${
              isDark ? 'bg-[#2E2C29]' : 'bg-[#E5E2DC]'
            }`}
          />
          {/* Fit to View Button */}
          <button
            onClick={fitToView}
            className={`flex items-center space-x-1 px-2 py-1 rounded-md text-xs font-medium border transition-colors ${
              isDark
                ? 'bg-[#252422] hover:bg-[#2E2C29] border-[#2E2C29] text-[#F5F5F4]'
                : 'bg-[#FFFFFF] hover:bg-[#FAF9F6] border-[#E5E2DC] text-[#1C1917]'
            }`}
            title="Fit story to view"
          >
            <Scan className="w-3.5 h-3.5 opacity-70" />
            <span className="hidden sm:inline">Fit View</span>
          </button>
        </div>

        {/* Middle: Compact Color Dots Only (No wordy helper text that wraps) */}
        <div className="flex items-center space-x-3 text-xs font-sans shrink-0 px-2">
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A]"></span>
            <span className={isDark ? 'text-[#F5F5F4]' : 'text-[#1C1917]'}>Start</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#D97706]"></span>
            <span className={isDark ? 'text-[#F5F5F4]' : 'text-[#1C1917]'}>Ending</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isDark ? 'bg-[#78716C]' : 'bg-[#A8A29E]'
              }`}
            ></span>
            <span className={isDark ? 'text-[#A8A29E]' : 'text-[#78716C]'}>Scene</span>
          </div>
          {unreachableSet.size > 0 && (
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#DC2626]"></span>
              <span className="text-[#DC2626]">Unreachable</span>
            </div>
          )}
        </div>

        {/* Right: Full-Screen & Close Buttons */}
        <div className="flex items-center space-x-1 shrink-0">
          <button
            onClick={() => setIsFullScreen(!isFullScreen)}
            className={`p-1.5 rounded-md transition-colors ${
              isFullScreen
                ? isDark
                  ? 'bg-[#2E2C29] text-[#FBBF24]'
                  : 'bg-[#EDEAE4] text-[#C2410C]'
                : isDark
                ? 'hover:bg-[#252422] text-[#A8A29E] hover:text-[#F5F5F4]'
                : 'hover:bg-[#EDEAE4] text-[#78716C] hover:text-[#1C1917]'
            }`}
            title={isFullScreen ? 'Exit Full-Screen (Esc)' : 'Expand Full-Screen Story Map'}
          >
            {isFullScreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>

          {onClosePanel && !isFullScreen && (
            <button
              onClick={onClosePanel}
              className={`p-1.5 rounded-md transition-colors ${
                isDark
                  ? 'hover:bg-[#252422] text-[#78716C] hover:text-[#F5F5F4]'
                  : 'hover:bg-[#EDEAE4] text-[#78716C] hover:text-[#1C1917]'
              }`}
              title="Close Story Map panel"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Floating Exit Button in Full-Screen Mode */}
      {isFullScreen && (
        <div className="absolute top-14 left-1/2 transform -translate-x-1/2 z-30">
          <button
            onClick={() => setIsFullScreen(false)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border shadow-lg flex items-center space-x-1.5 transition-colors ${
              isDark
                ? 'bg-[#1E1D1B] border-[#2E2C29] text-[#F5F5F4] hover:bg-[#252422]'
                : 'bg-[#FFFFFF] border-[#E5E2DC] text-[#1C1917] hover:bg-[#FAF9F6]'
            }`}
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span>Exit Full-Screen (Esc)</span>
          </button>
        </div>
      )}

      {/* Storyboard Corkboard Canvas */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`flex-1 w-full h-full cursor-${
          isDragging ? 'grabbing' : 'grab'
        } relative overflow-hidden`}
        style={{
          backgroundImage: isDark
            ? 'radial-gradient(circle, #2E2C29 1.5px, transparent 1.5px)'
            : 'radial-gradient(circle, #D7D3CB 1.5px, transparent 1.5px)',
          backgroundSize: '24px 24px',
        }}
      >
        <div
          className="absolute origin-top-left transition-transform duration-75"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          }}
        >
          {/* SVG Canvas for Connectors */}
          <svg
            className="overflow-visible pointer-events-none"
            style={{ width: '6000px', height: '5000px' }}
          >
            <defs>
              <marker
                id="story-arrow"
                viewBox="0 0 10 10"
                refX="7"
                refY="5"
                markerWidth="5"
                markerHeight="5"
                orient="auto-start-reverse"
              >
                <path
                  d="M 0 1.5 L 8 5 L 0 8.5 z"
                  fill={isDark ? '#78716C' : '#A8A29E'}
                />
              </marker>
              <marker
                id="story-proceed-arrow"
                viewBox="0 0 10 10"
                refX="7"
                refY="5"
                markerWidth="5"
                markerHeight="5"
                orient="auto-start-reverse"
              >
                <path
                  d="M 0 1.5 L 8 5 L 0 8.5 z"
                  fill={isDark ? '#FBBF24' : '#C2410C'}
                />
              </marker>
            </defs>

            {edges.map((edge) => {
              const dx = edge.toX - edge.fromX;

              let pathData: string;
              let midX: number;
              let midY: number;

              if (edge.isBackward) {
                // Requirement 4: Smooth routing for backward/looping edges (e.g. Garage -> TheTown)
                // Curve smoothly above or below the cards so arrows don't cut through card bodies!
                const archAbove = edge.fromY >= edge.toY;
                const offset = archAbove ? -70 : 70;
                const archY = (archAbove ? Math.min(edge.fromY, edge.toY) : Math.max(edge.fromY, edge.toY)) + offset;

                const c1x = edge.fromX + 40;
                const c1y = archY;
                const c2x = edge.toX + 40;
                const c2y = archY;

                pathData = `M ${edge.fromX} ${edge.fromY} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${edge.toX} ${edge.toY}`;
                midX = (edge.fromX + edge.toX) / 2 + 30;
                midY = archY;
              } else {
                // Forward smooth Bezier curve
                const c1x = edge.fromX + dx * 0.45;
                const c1y = edge.fromY;
                const c2x = edge.fromX + dx * 0.55;
                const c2y = edge.toY;
                pathData = `M ${edge.fromX} ${edge.fromY} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${edge.toX} ${edge.toY}`;
                midX = (edge.fromX + edge.toX) / 2;
                midY = (edge.fromY + edge.toY) / 2;
              }

              return (
                <g key={edge.id} className="transition-opacity">
                  <path
                    d={pathData}
                    fill="none"
                    stroke={
                      edge.isProceed
                        ? isDark
                          ? '#FBBF24'
                          : '#C2410C'
                        : isDark
                        ? '#78716C'
                        : '#A8A29E'
                    }
                    strokeWidth={edge.isProceed ? 2 : 1.7}
                    strokeDasharray={edge.isProceed ? '4,3' : undefined}
                    markerEnd={edge.isProceed ? 'url(#story-proceed-arrow)' : 'url(#story-arrow)'}
                  />
                  {edge.label && (
                    <g transform={`translate(${midX}, ${midY - 9})`}>
                      <rect
                        x="-44"
                        y="-10"
                        width="88"
                        height="20"
                        rx="10"
                        fill={isDark ? '#1E1D1B' : '#FFFFFF'}
                        stroke={isDark ? '#2E2C29' : '#E5E2DC'}
                        strokeWidth="1"
                        className="shadow-sm"
                      />
                      <text
                        x="0"
                        y="4"
                        textAnchor="middle"
                        fontSize="9.5"
                        fill={
                          edge.isProceed
                            ? isDark
                              ? '#FBBF24'
                              : '#C2410C'
                            : isDark
                            ? '#D6D3D1'
                            : '#57534E'
                        }
                        fontFamily="inherit"
                        fontWeight="500"
                        className="pointer-events-none"
                      >
                        {edge.label.length > 14 ? edge.label.substring(0, 13) + '…' : edge.label}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Clean Organic Story Index Cards (Dagre Computed Layout) */}
          {nodes.map((node) => {
            const isSelected = selectedNodeId === node.id;

            return (
              <div
                key={node.id}
                onClick={() => setSelectedNodeId(node.id)}
                className={`interactive-story-card absolute rounded-xl p-3.5 cursor-pointer transition-all duration-150 border shadow-sm ${
                  node.isStart
                    ? isDark
                      ? 'bg-[#18261E] border-[#16A34A] text-[#F5F5F4]'
                      : 'bg-[#F0FDF4] border-[#16A34A] text-[#1C1917]'
                    : node.isConclude
                    ? isDark
                      ? 'bg-[#2E2416] border-[#D97706] text-[#F5F5F4]'
                      : 'bg-[#FFFBEB] border-[#D97706] text-[#1C1917]'
                    : node.isUnreachable
                    ? isDark
                      ? 'bg-[#2E1A1A] border-dashed border-[#DC2626] text-[#F5F5F4]'
                      : 'bg-[#FEF2F2] border-dashed border-[#DC2626] text-[#1C1917]'
                    : isDark
                    ? 'bg-[#1E1D1B] border-[#2E2C29] hover:border-[#3D3A36] text-[#F5F5F4]'
                    : 'bg-[#FFFFFF] border-[#E5E2DC] hover:border-[#D7D3CB] text-[#1C1917]'
                } ${
                  isSelected
                    ? isDark
                      ? 'ring-2 ring-[#FBBF24] shadow-md'
                      : 'ring-2 ring-[#C2410C] shadow-md'
                    : ''
                }`}
                style={{
                  left: `${node.x}px`,
                  top: `${node.y}px`,
                  width: `${node.width}px`,
                  height: `${node.height}px`,
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-sans font-bold text-sm tracking-tight truncate">
                    {node.id}
                  </span>

                  {node.isStart ? (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-sans font-semibold tracking-wide uppercase border ${
                        isDark
                          ? 'bg-[#16A34A]/20 text-[#86EFAC] border-[#16A34A]/40'
                          : 'bg-[#DCFCE7] text-[#166534] border-[#86EFAC]'
                      }`}
                    >
                      Opening
                    </span>
                  ) : node.isConclude ? (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-sans font-semibold tracking-wide uppercase border ${
                        isDark
                          ? 'bg-[#D97706]/20 text-[#FDE68A] border-[#D97706]/40'
                          : 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]'
                      }`}
                    >
                      Ending
                    </span>
                  ) : node.isUnreachable ? (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-sans font-semibold tracking-wide uppercase border ${
                        isDark
                          ? 'bg-[#DC2626]/20 text-[#FCA5A5] border-[#DC2626]/40'
                          : 'bg-[#FEE2E2] text-[#991B1B] border-[#FCA5A5]'
                      }`}
                    >
                      Unreachable
                    </span>
                  ) : (
                    <span
                      className={`text-[11px] font-sans ${
                        isDark ? 'text-[#78716C]' : 'text-[#78716C]'
                      }`}
                    >
                      {node.passagesCount} {node.passagesCount === 1 ? 'passage' : 'passages'}
                    </span>
                  )}
                </div>

                <p
                  className={`text-xs font-serif italic line-clamp-2 leading-relaxed ${
                    isDark ? 'text-[#A8A29E]' : 'text-[#57534E]'
                  }`}
                  title={node.openingPassage}
                >
                  "{node.openingPassage}"
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Scene Bottom Card */}
      {selectedNode && (
        <div
          className={`absolute bottom-4 left-4 right-4 z-30 rounded-2xl p-4 shadow-xl border flex flex-col md:flex-row md:items-center justify-between gap-3.5 transition-colors ${
            isDark
              ? 'bg-[#1E1D1B] border-[#2E2C29]'
              : 'bg-[#FFFFFF] border-[#E5E2DC]'
          }`}
        >
          <div className="flex-1">
            <div className="flex items-center space-x-2.5 mb-1">
              <h4
                className={`font-sans text-sm font-bold flex items-center space-x-2 ${
                  isDark ? 'text-[#F5F5F4]' : 'text-[#1C1917]'
                }`}
              >
                <span>Scene: {selectedNode.id}</span>
                <span className="text-xs font-normal opacity-60">
                  (Line {selectedNode.line})
                </span>
              </h4>
              {selectedNode.id === model.startScene && (
                <span className="px-2 py-0.5 text-[10px] rounded-full bg-[#16A34A]/15 text-[#16A34A] font-semibold">
                  Opening Scene
                </span>
              )}
              {selectedNode.exit.type === 'conclude' && (
                <span className="px-2 py-0.5 text-[10px] rounded-full bg-[#D97706]/15 text-[#D97706] font-semibold">
                  Ending
                </span>
              )}
              {unreachableSet.has(selectedNode.id) && (
                <span className="px-2 py-0.5 text-[10px] rounded-full bg-[#DC2626]/15 text-[#DC2626] font-semibold flex items-center gap-1">
                  <AlertOctagon className="w-3 h-3" /> Unreachable
                </span>
              )}
            </div>

            <p
              className={`text-xs font-serif italic line-clamp-2 leading-relaxed ${
                isDark ? 'text-[#D6D3D1]' : 'text-[#44403C]'
              }`}
            >
              "{selectedNode.passages[0] || 'No narration written yet.'}"
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => onSelectSceneInEditor?.(selectedNode.line)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border flex items-center space-x-1.5 transition-colors ${
                isDark
                  ? 'bg-[#252422] hover:bg-[#2E2C29] border-[#2E2C29] text-[#F5F5F4]'
                  : 'bg-[#FAF9F6] hover:bg-[#F3F1EC] border-[#E5E2DC] text-[#1C1917]'
              }`}
            >
              <Code2 className="w-3.5 h-3.5 opacity-70" />
              <span>Edit in Manuscript</span>
            </button>
            <button
              onClick={() => onPlaytestScene?.(selectedNode.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition-colors shadow-sm ${
                isDark
                  ? 'bg-[#F5F5F4] hover:bg-[#FFFFFF] text-[#141413]'
                  : 'bg-[#1C1917] hover:bg-[#292524] text-[#FAF9F6]'
              }`}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Play from here</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // Render via React Portal when Full-Screen — shell div owns the fixed/z positioning,
  // mapContent fills it without any fixed class of its own (avoids stacking-context conflicts)
  if (isFullScreen) {
    return createPortal(
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 9999, width: '100vw', height: '100vh' }}
        className={isDark ? 'bg-[#141413]' : 'bg-[#FAF9F6]'}
      >
        {mapContent}
      </div>,
      document.body
    );
  }

  return mapContent;
};
