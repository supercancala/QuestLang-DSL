import React, { useState } from 'react';
import { EngineResponse } from '../../types/questlang';
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ChevronUp,
  ChevronDown,
  BookCheck,
} from 'lucide-react';
import { EngineService } from '../../services/engineService';

interface DiagnosticsDrawerProps {
  engineResponse: EngineResponse | null;
  onSelectLine: (line: number) => void;
  isDark: boolean;
}

export const DiagnosticsDrawer: React.FC<DiagnosticsDrawerProps> = ({
  engineResponse,
  onSelectLine,
  isDark,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  if (!engineResponse) {
    return (
      <div
        className={`px-4 py-2 text-xs font-sans flex items-center justify-between shrink-0 border-t ${
          isDark
            ? 'bg-[#1E1D1B] border-[#2E2C29] text-[#78716C]'
            : 'bg-[#F3F1EC] border-[#E5E2DC] text-[#78716C]'
        }`}
      >
        <div className="flex items-center space-x-2">
          <BookCheck className="w-4 h-4 text-[#A8A29E]" />
          <span>Story Check: Ready</span>
        </div>
      </div>
    );
  }

  const { valid, model, errors } = engineResponse;
  const metrics = EngineService.calculateMetrics(model);
  const errorItems = errors.filter((e) => e.severity === 'error');
  const warningItems = errors.filter((e) => e.severity === 'warning');
  const hasIssues = errors.length > 0;

  return (
    <div
      className={`text-xs flex flex-col z-20 shrink-0 border-t ${
        isDark
          ? 'bg-[#1E1D1B] border-[#2E2C29]'
          : 'bg-[#F3F1EC] border-[#E5E2DC]'
      }`}
    >
      {/* Single Clean Status Bar */}
      <div
        className={`px-4 py-2.5 flex items-center justify-between transition-colors ${
          hasIssues ? 'cursor-pointer' : ''
        } ${
          !valid
            ? isDark
              ? 'bg-[#2E1A1A] text-[#FCA5A5] hover:bg-[#382020]'
              : 'bg-[#FEE2E2] text-[#991B1B] hover:bg-[#FECACA]'
            : warningItems.length > 0
            ? isDark
              ? 'bg-[#2E2416] text-[#FDE68A] hover:bg-[#382C1B]'
              : 'bg-[#FEF3C7] text-[#92400E] hover:bg-[#FDE68A]'
            : isDark
            ? 'bg-[#17261C] text-[#86EFAC]'
            : 'bg-[#DCFCE7] text-[#166534]'
        }`}
        onClick={() => hasIssues && setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-2.5 min-w-0">
          {valid ? (
            <div className="flex items-center space-x-2 font-medium font-sans truncate">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span className="truncate">
                Story structure verified — <strong>{metrics.sceneCount} scenes</strong> and{' '}
                <strong>{metrics.transitionCount} story paths</strong> ready to play.
              </span>
              {warningItems.length > 0 && (
                <span
                  className={`ml-2 px-2 py-0.5 rounded text-[11px] font-sans flex items-center gap-1 border shrink-0 ${
                    isDark
                      ? 'bg-[#3D3019] text-[#FDE68A] border-[#5E4B25]'
                      : 'bg-[#FEF9C3] text-[#854D0E] border-[#FDE047]'
                  }`}
                >
                  <AlertTriangle className="w-3 h-3" />
                  {warningItems.length} {warningItems.length === 1 ? 'note' : 'notes'}
                </span>
              )}
            </div>
          ) : (
            <div className="flex items-center space-x-2 font-medium font-sans truncate">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="truncate">
                Story Review Needed: <strong>{errorItems.length} {errorItems.length === 1 ? 'correction' : 'corrections'}</strong>
                {warningItems.length > 0 && `, ${warningItems.length} suggestions`}
              </span>
            </div>
          )}
        </div>

        {hasIssues && (
          <div className="flex items-center space-x-2 opacity-75 shrink-0 ml-3">
            <span className="text-[11px] font-sans hidden sm:inline">
              {isExpanded ? 'Hide notes' : 'View notes'}
            </span>
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronUp className="w-3.5 h-3.5" />
            )}
          </div>
        )}
      </div>

      {/* Expanded details list ONLY when there are issues (no duplicate banner!) */}
      {hasIssues && isExpanded && (
        <div
          className={`max-h-48 overflow-y-auto divide-y ${
            isDark
              ? 'bg-[#141413] divide-[#2E2C29]'
              : 'bg-[#FAF9F6] divide-[#E5E2DC]'
          }`}
        >
          {errors.map((item, index) => (
            <div
              key={index}
              onClick={() => onSelectLine(item.line)}
              className={`px-4 py-2.5 flex items-start space-x-3 cursor-pointer transition-colors ${
                item.severity === 'error'
                  ? isDark
                    ? 'hover:bg-[#251717] text-[#FCA5A5]'
                    : 'hover:bg-[#FEF2F2] text-[#B91C1C]'
                  : isDark
                  ? 'hover:bg-[#241D14] text-[#FDE68A]'
                  : 'hover:bg-[#FFFBEB] text-[#B45309]'
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {item.severity === 'error' ? (
                  <AlertCircle className="w-3.5 h-3.5 text-[#DC2626]" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 text-[#D97706]" />
                )}
              </div>

              <div className="flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <div className="flex items-center space-x-2.5">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[11px] font-mono font-medium border ${
                      isDark
                        ? 'bg-[#1E1D1B] text-[#F5F5F4] border-[#2E2C29]'
                        : 'bg-[#F3F1EC] text-[#1C1917] border-[#E5E2DC]'
                    }`}
                  >
                    Line {item.line}
                  </span>
                  <span className="text-xs font-sans">{item.message}</span>
                </div>

                <span
                  className={`text-[11px] self-end sm:self-auto font-sans underline decoration-dotted ${
                    isDark ? 'text-[#78716C] hover:text-[#F5F5F4]' : 'text-[#78716C] hover:text-[#1C1917]'
                  }`}
                >
                  Jump to line →
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
