import React, { useState, useRef } from 'react';
import { SAMPLE_ADVENTURES } from '../data/sampleAdventures';
import {
  FolderOpen,
  Upload,
  Download,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  BookMarked,
  Copy,
  Check,
  ChevronDown,
  FilePlus2,
  Feather,
} from 'lucide-react';

interface SidebarProps {
  onLoadSample: (code: string) => void;
  onUploadFile: (code: string, fileName?: string) => void;
  onDownloadFile: () => void;
  onNewFile: () => void;
  currentAdventureTitle?: string;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isDark: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  onLoadSample,
  onUploadFile,
  onDownloadFile,
  onNewFile,
  currentAdventureTitle,
  isCollapsed,
  onToggleCollapse,
  isDark,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Requirement 3: File actions expanded by default, Samples and Syntax collapsed by default
  const [isSamplesOpen, setIsSamplesOpen] = useState<boolean>(false);
  const [isCheatSheetOpen, setIsCheatSheetOpen] = useState<boolean>(false);
  const [copiedSnippet, setCopiedSnippet] = useState<boolean>(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content !== undefined) {
        onUploadFile(content, file.name);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const copyCheatSheetSnippet = () => {
    const snippet = `Adventure "Title":
    Begin at Start.

Scene Start:
    Narrate "Story text..."
    Option "Take path" leads to Next.

Scene Next:
    Conclude.`;
    navigator.clipboard.writeText(snippet);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  // Minimized icon rail
  if (isCollapsed) {
    return (
      <aside
        className={`w-12 border-r flex flex-col items-center py-3.5 select-none z-20 shrink-0 transition-colors duration-200 ${
          isDark ? 'bg-[#1E1D1B] border-[#2E2C29]' : 'bg-[#F3F1EC] border-[#E5E2DC]'
        }`}
      >
        <button
          onClick={onToggleCollapse}
          className={`p-2 rounded-md transition-colors mb-4 ${
            isDark
              ? 'text-[#A8A29E] hover:text-[#F5F5F4] hover:bg-[#252422]'
              : 'text-[#78716C] hover:text-[#1C1917] hover:bg-[#E5E2DC]'
          }`}
          title="Expand Sidebar"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        <div className="space-y-2.5 flex flex-col items-center">
          <button
            onClick={() => fileInputRef.current?.click()}
            className={`p-2 rounded-md transition-colors ${
              isDark
                ? 'text-[#A8A29E] hover:text-[#F5F5F4] hover:bg-[#252422]'
                : 'text-[#78716C] hover:text-[#1C1917] hover:bg-[#E5E2DC]'
            }`}
            title="Upload .quest file"
          >
            <Upload className="w-4 h-4" />
          </button>
          <button
            onClick={onDownloadFile}
            className={`p-2 rounded-md transition-colors ${
              isDark
                ? 'text-[#A8A29E] hover:text-[#F5F5F4] hover:bg-[#252422]'
                : 'text-[#78716C] hover:text-[#1C1917] hover:bg-[#E5E2DC]'
            }`}
            title="Download .quest file"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={onToggleCollapse}
            className={`p-2 rounded-md transition-colors ${
              isDark
                ? 'text-[#A8A29E] hover:text-[#F5F5F4] hover:bg-[#252422]'
                : 'text-[#78716C] hover:text-[#1C1917] hover:bg-[#E5E2DC]'
            }`}
            title="Open Reference Sheet"
          >
            <BookOpen className="w-4 h-4" />
          </button>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept=".quest,.txt"
          className="hidden"
        />
      </aside>
    );
  }

  return (
    <aside
      className={`w-80 border-r flex flex-col h-full select-none z-20 shrink-0 overflow-y-auto transition-colors duration-200 ${
        isDark ? 'bg-[#1E1D1B] border-[#2E2C29]' : 'bg-[#F3F1EC] border-[#E5E2DC]'
      }`}
    >
      {/* Sidebar Header */}
      <div
        className={`p-4 border-b flex items-center justify-between transition-colors ${
          isDark ? 'border-[#2E2C29]' : 'border-[#E5E2DC]'
        }`}
      >
        <div className="flex items-center space-x-2.5">
          <Feather
            className={`w-4 h-4 ${isDark ? 'text-[#FBBF24]' : 'text-[#C2410C]'}`}
          />
          <span
            className={`text-sm font-semibold tracking-tight ${
              isDark ? 'text-[#F5F5F4]' : 'text-[#1C1917]'
            }`}
          >
            Story Studio
          </span>
        </div>
        <button
          onClick={onToggleCollapse}
          className={`p-1.5 rounded-md transition-colors ${
            isDark
              ? 'text-[#A8A29E] hover:text-[#F5F5F4] hover:bg-[#252422]'
              : 'text-[#78716C] hover:text-[#1C1917] hover:bg-[#E5E2DC]'
          }`}
          title="Collapse Sidebar"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {currentAdventureTitle && (
        <div
          className={`px-4 py-2.5 border-b flex items-center space-x-2 ${
            isDark ? 'bg-[#181816] border-[#2E2C29]' : 'bg-[#EDEAE4] border-[#E5E2DC]'
          }`}
        >
          <BookMarked
            className={`w-4 h-4 shrink-0 ${isDark ? 'text-[#FBBF24]' : 'text-[#C2410C]'}`}
          />
          <span
            className={`font-serif italic font-medium text-xs truncate ${
              isDark ? 'text-[#F5F5F4]' : 'text-[#1C1917]'
            }`}
            title={currentAdventureTitle}
          >
            "{currentAdventureTitle}"
          </span>
        </div>
      )}

      <div className="p-4 space-y-5 flex-1">
        {/* Section 1: File Actions (ALWAYS EXPANDED BY DEFAULT) */}
        <div>
          <div
            className={`text-xs font-semibold uppercase tracking-wider mb-2.5 ${
              isDark ? 'text-[#A8A29E]' : 'text-[#78716C]'
            }`}
          >
            Story Files
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className={`flex items-center justify-center space-x-2 p-2.5 rounded-lg border text-sm font-medium transition-colors ${
                isDark
                  ? 'bg-[#252422] hover:bg-[#2E2C29] border-[#2E2C29] text-[#F5F5F4]'
                  : 'bg-[#FFFFFF] hover:bg-[#FAF9F6] border-[#E5E2DC] text-[#1C1917] shadow-sm'
              }`}
              title="Open a .quest file"
            >
              <Upload className="w-4 h-4 opacity-70" />
              <span>Import</span>
            </button>
            <button
              onClick={onDownloadFile}
              className={`flex items-center justify-center space-x-2 p-2.5 rounded-lg border text-sm font-medium transition-colors ${
                isDark
                  ? 'bg-[#252422] hover:bg-[#2E2C29] border-[#2E2C29] text-[#F5F5F4]'
                  : 'bg-[#FFFFFF] hover:bg-[#FAF9F6] border-[#E5E2DC] text-[#1C1917] shadow-sm'
              }`}
              title="Download editor contents as .quest"
            >
              <Download className="w-4 h-4 opacity-70" />
              <span>Export</span>
            </button>
          </div>
          <button
            onClick={onNewFile}
            className={`w-full mt-2 flex items-center justify-center space-x-2 p-2 rounded-lg border border-dashed text-xs font-medium transition-colors ${
              isDark
                ? 'border-[#3D3A36] text-[#A8A29E] hover:text-[#F5F5F4] hover:bg-[#252422]'
                : 'border-[#D7D3CB] text-[#78716C] hover:text-[#1C1917] hover:bg-[#FAF9F6]'
            }`}
          >
            <FilePlus2 className="w-3.5 h-3.5" />
            <span>New Blank Story</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".quest,.txt"
            className="hidden"
          />
        </div>

        {/* Section 2: Sample Adventures (COLLAPSED BY DEFAULT) */}
        <div
          className={`border rounded-xl overflow-hidden transition-colors ${
            isDark ? 'border-[#2E2C29] bg-[#181816]' : 'border-[#E5E2DC] bg-[#FAF9F6]'
          }`}
        >
          <button
            onClick={() => setIsSamplesOpen(!isSamplesOpen)}
            className={`w-full p-3 flex items-center justify-between text-left transition-colors ${
              isDark ? 'hover:bg-[#252422]' : 'hover:bg-[#EDEAE4]'
            }`}
          >
            <div className="flex items-center space-x-2">
              <BookOpen
                className={`w-4 h-4 ${isDark ? 'text-[#FBBF24]' : 'text-[#C2410C]'}`}
              />
              <span
                className={`text-sm font-semibold ${
                  isDark ? 'text-[#F5F5F4]' : 'text-[#1C1917]'
                }`}
              >
                Sample Adventures
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span
                className={`text-xs px-1.5 py-0.5 rounded font-sans ${
                  isDark
                    ? 'bg-[#252422] text-[#A8A29E]'
                    : 'bg-[#EDEAE4] text-[#78716C]'
                }`}
              >
                {SAMPLE_ADVENTURES.length}
              </span>
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-200 ${
                  isSamplesOpen ? 'transform rotate-180' : ''
                } ${isDark ? 'text-[#A8A29E]' : 'text-[#78716C]'}`}
              />
            </div>
          </button>

          {isSamplesOpen && (
            <div className="p-3 pt-0 space-y-2 border-t border-inherit">
              {SAMPLE_ADVENTURES.map((sample) => (
                <div
                  key={sample.id}
                  onClick={() => onLoadSample(sample.code)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    isDark
                      ? 'bg-[#1E1D1B] hover:bg-[#252422] border-[#2E2C29] text-[#F5F5F4]'
                      : 'bg-[#FFFFFF] hover:bg-[#FAF9F6] border-[#E5E2DC] text-[#1C1917] shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">
                      {sample.name}
                    </span>
                  </div>
                  <p
                    className={`text-[13px] mt-1 line-clamp-2 leading-relaxed ${
                      isDark ? 'text-[#A8A29E]' : 'text-[#57534E]'
                    }`}
                  >
                    {sample.description}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 3: Syntax Quick-Reference (COLLAPSED BY DEFAULT) */}
        <div
          className={`border rounded-xl overflow-hidden transition-colors ${
            isDark ? 'border-[#2E2C29] bg-[#181816]' : 'border-[#E5E2DC] bg-[#FAF9F6]'
          }`}
        >
          <button
            onClick={() => setIsCheatSheetOpen(!isCheatSheetOpen)}
            className={`w-full p-3 flex items-center justify-between text-left transition-colors ${
              isDark ? 'hover:bg-[#252422]' : 'hover:bg-[#EDEAE4]'
            }`}
          >
            <div className="flex items-center space-x-2">
              <FolderOpen
                className={`w-4 h-4 ${isDark ? 'text-[#FBBF24]' : 'text-[#C2410C]'}`}
              />
              <span
                className={`text-sm font-semibold ${
                  isDark ? 'text-[#F5F5F4]' : 'text-[#1C1917]'
                }`}
              >
                Syntax Quick-Reference
              </span>
            </div>
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-200 ${
                isCheatSheetOpen ? 'transform rotate-180' : ''
              }`}
            />
          </button>

          {isCheatSheetOpen && (
            <div className="p-3.5 pt-2 space-y-4 text-[13px] border-t border-inherit">
              <div>
                <span
                  className={`text-xs font-semibold uppercase tracking-wider block mb-2 ${
                    isDark ? 'text-[#F5F5F4]' : 'text-[#1C1917]'
                  }`}
                >
                  10 Reserved Keywords
                </span>
                <div className="flex flex-wrap gap-1.5 font-mono text-xs">
                  {[
                    'Adventure',
                    'Begin',
                    'at',
                    'Scene',
                    'Narrate',
                    'Option',
                    'leads',
                    'to',
                    'Proceed',
                    'Conclude',
                  ].map((kw) => (
                    <span
                      key={kw}
                      className={`px-2 py-0.5 rounded border ${
                        isDark
                          ? 'bg-[#252422] text-[#FBBF24] border-[#2E2C29]'
                          : 'bg-[#FFF7ED] text-[#C2410C] border-[#FFEDD5]'
                      }`}
                    >
                      {kw}
                    </span>
                  ))}
                  <span
                    className={`px-2 py-0.5 rounded border italic ${
                      isDark
                        ? 'bg-[#252422] text-[#78716C] border-[#2E2C29]'
                        : 'bg-[#EDEAE4] text-[#78716C] border-[#E5E2DC]'
                    }`}
                  >
                    Restart*
                  </span>
                </div>
              </div>

              <div>
                <span
                  className={`text-xs font-semibold uppercase tracking-wider block mb-2 ${
                    isDark ? 'text-[#F5F5F4]' : 'text-[#1C1917]'
                  }`}
                >
                  Key Writing Rules
                </span>
                <ul
                  className={`list-disc list-inside space-y-1.5 leading-relaxed ${
                    isDark ? 'text-[#A8A29E]' : 'text-[#57534E]'
                  }`}
                >
                  <li>
                    <strong>4-space indentation</strong> for statements under scenes (no tabs).
                  </li>
                  <li>
                    Colons <code className="font-mono">:</code> after story and scene titles.
                  </li>
                  <li>
                    Periods <code className="font-mono">.</code> terminate every action.
                  </li>
                  <li>
                    Each scene ends with one exit: choices, proceed, or conclude.
                  </li>
                </ul>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className={`text-xs font-semibold uppercase tracking-wider ${
                      isDark ? 'text-[#F5F5F4]' : 'text-[#1C1917]'
                    }`}
                  >
                    Starter Pattern
                  </span>
                  <button
                    onClick={copyCheatSheetSnippet}
                    className={`flex items-center space-x-1 text-xs transition-colors ${
                      isDark
                        ? 'text-[#FBBF24] hover:text-[#FDE68A]'
                        : 'text-[#C2410C] hover:text-[#EA580C]'
                    }`}
                  >
                    {copiedSnippet ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#16A34A]" />
                        <span className="text-[#16A34A]">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <pre
                  className={`p-3 rounded-lg text-xs font-mono leading-relaxed border overflow-x-auto ${
                    isDark
                      ? 'bg-[#141413] text-[#A8A29E] border-[#2E2C29]'
                      : 'bg-[#FFFFFF] text-[#57534E] border-[#E5E2DC]'
                  }`}
                >
{`Adventure "Title":
    Begin at Start.

Scene Start:
    Narrate "..."
    Option "Go" leads to Next.

Scene Next:
    Conclude.`}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div
        className={`p-3.5 border-t text-xs font-sans text-center transition-colors ${
          isDark
            ? 'border-[#2E2C29] text-[#78716C]'
            : 'border-[#E5E2DC] text-[#78716C]'
        }`}
      >
        QuestLang Studio • For Story Authors
      </div>
    </aside>
  );
};
