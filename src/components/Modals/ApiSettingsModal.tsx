import React, { useState } from 'react';
import { EngineMode } from '../../types/questlang';
import {
  X,
  Server,
  Cpu,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

interface ApiSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: EngineMode;
  onModeChange: (mode: EngineMode) => void;
  apiEndpoint: string;
  onApiEndpointChange: (endpoint: string) => void;
  isDark: boolean;
}

export const ApiSettingsModal: React.FC<ApiSettingsModalProps> = ({
  isOpen,
  onClose,
  mode,
  onModeChange,
  apiEndpoint,
  onApiEndpointChange,
  isDark,
}) => {
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState<string>('');
  const [endpointInput, setEndpointInput] = useState<string>(apiEndpoint);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setTestStatus('testing');
    setTestMessage('Checking connection to story backend...');

    try {
      const response = await fetch(endpointInput, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'Adventure "Ping":\n    Begin at PingStart.\n\nScene PingStart:\n    Conclude.',
        }),
      });

      if (response.ok) {
        setTestStatus('success');
        setTestMessage('Connected to language engine server successfully!');
      } else {
        setTestStatus('error');
        setTestMessage(`Server returned error ${response.status}: ${response.statusText}`);
      }
    } catch (err: unknown) {
      setTestStatus('error');
      const msg = err instanceof Error ? err.message : String(err);
      setTestMessage(`Could not connect (${msg}). Ensure your backend server is active.`);
    }
  };

  const handleSave = () => {
    onApiEndpointChange(endpointInput);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div
        className={`w-full max-w-lg border rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-colors ${
          isDark
            ? 'bg-[#1E1D1B] border-[#2E2C29]'
            : 'bg-[#FAF9F6] border-[#E5E2DC]'
        }`}
      >
        {/* Modal Header */}
        <div
          className={`flex items-center justify-between px-6 py-4 border-b ${
            isDark
              ? 'bg-[#181816] border-[#2E2C29]'
              : 'bg-[#F3F1EC] border-[#E5E2DC]'
          }`}
        >
          <div className="flex items-center space-x-2.5">
            <Server className={`w-4 h-4 ${isDark ? 'text-[#FBBF24]' : 'text-[#C2410C]'}`} />
            <h3
              className={`font-semibold text-sm ${
                isDark ? 'text-[#F5F5F4]' : 'text-[#1C1917]'
              }`}
            >
              Story Engine Configuration
            </h3>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-md transition-colors ${
              isDark
                ? 'text-[#A8A29E] hover:text-[#F5F5F4] hover:bg-[#252422]'
                : 'text-[#78716C] hover:text-[#1C1917] hover:bg-[#E5E2DC]'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div
          className={`p-6 space-y-5 text-xs ${
            isDark ? 'text-[#A8A29E]' : 'text-[#57534E]'
          }`}
        >
          {/* Mode Selector */}
          <div>
            <label
              className={`block text-[11px] font-semibold uppercase tracking-wider mb-2 ${
                isDark ? 'text-[#F5F5F4]' : 'text-[#1C1917]'
              }`}
            >
              Story Engine Mode
            </label>
            <div className="grid grid-cols-2 gap-3">
              {/* Mock Engine Option */}
              <div
                onClick={() => onModeChange('mock')}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  mode === 'mock'
                    ? isDark
                      ? 'bg-[#252422] border-[#FBBF24] text-[#F5F5F4]'
                      : 'bg-[#FFFFFF] border-[#C2410C] text-[#1C1917] shadow-sm'
                    : isDark
                    ? 'bg-[#181816] border-[#2E2C29] hover:border-[#3D3A36]'
                    : 'bg-[#F3F1EC] border-[#E5E2DC] hover:border-[#D7D3CB]'
                }`}
              >
                <div className="flex items-center space-x-2 mb-1">
                  <Cpu className="w-4 h-4 text-[#10b981]" />
                  <span className="font-bold text-sm">Story Preview Mode</span>
                </div>
                <p className="text-xs leading-relaxed opacity-85">
                  Built-in browser parser. Instant feedback, no server setup needed.
                </p>
              </div>

              {/* API Endpoint Option */}
              <div
                onClick={() => onModeChange('api')}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  mode === 'api'
                    ? isDark
                      ? 'bg-[#252422] border-[#FBBF24] text-[#F5F5F4]'
                      : 'bg-[#FFFFFF] border-[#C2410C] text-[#1C1917] shadow-sm'
                    : isDark
                    ? 'bg-[#181816] border-[#2E2C29] hover:border-[#3D3A36]'
                    : 'bg-[#F3F1EC] border-[#E5E2DC] hover:border-[#D7D3CB]'
                }`}
              >
                <div className="flex items-center space-x-2 mb-1">
                  <Server className="w-4 h-4 text-[#38bdf8]" />
                  <span className="font-bold text-sm">Express API Mode</span>
                </div>
                <p className="text-xs leading-relaxed opacity-85">
                  Connect to a remote compiler and backend validator in Phase 4.
                </p>
              </div>
            </div>
          </div>

          {/* API Endpoint URL Input */}
          <div>
            <label
              className={`block text-[11px] font-semibold uppercase tracking-wider mb-1.5 ${
                isDark ? 'text-[#F5F5F4]' : 'text-[#1C1917]'
              }`}
            >
              Backend API Endpoint
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={endpointInput}
                onChange={(e) => setEndpointInput(e.target.value)}
                placeholder="http://localhost:3000/api/validate"
                disabled={mode === 'mock'}
                className={`flex-1 px-3 py-2 border rounded-lg font-mono text-xs outline-none disabled:opacity-50 transition-colors ${
                  isDark
                    ? 'bg-[#141413] border-[#2E2C29] text-[#F5F5F4] focus:border-[#FBBF24]'
                    : 'bg-[#FFFFFF] border-[#E5E2DC] text-[#1C1917] focus:border-[#C2410C]'
                }`}
              />
              <button
                onClick={handleTestConnection}
                disabled={mode === 'mock' || testStatus === 'testing'}
                className={`px-3 py-2 rounded-lg border flex items-center space-x-1.5 disabled:opacity-50 transition-colors font-medium ${
                  isDark
                    ? 'bg-[#252422] hover:bg-[#2E2C29] border-[#2E2C29] text-[#F5F5F4]'
                    : 'bg-[#FFFFFF] hover:bg-[#F3F1EC] border-[#E5E2DC] text-[#1C1917]'
                }`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${testStatus === 'testing' ? 'animate-spin' : ''}`} />
                <span>Ping Test</span>
              </button>
            </div>

            {testStatus === 'success' && (
              <div className="mt-2.5 p-2.5 rounded-lg bg-[#DCFCE7] border border-[#86EFAC] text-[#166534] flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{testMessage}</span>
              </div>
            )}
            {testStatus === 'error' && (
              <div className="mt-2.5 p-2.5 rounded-lg bg-[#FEE2E2] border border-[#FCA5A5] text-[#991B1B] flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{testMessage}</span>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div
          className={`flex items-center justify-end space-x-2 px-6 py-3.5 border-t ${
            isDark
              ? 'bg-[#181816] border-[#2E2C29]'
              : 'bg-[#F3F1EC] border-[#E5E2DC]'
          }`}
        >
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
              isDark
                ? 'text-[#A8A29E] hover:text-[#F5F5F4] hover:bg-[#252422]'
                : 'text-[#78716C] hover:text-[#1C1917] hover:bg-[#E5E2DC]'
            }`}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className={`px-4 py-2 rounded-lg text-xs font-semibold shadow-sm transition-colors ${
              isDark
                ? 'bg-[#F5F5F4] hover:bg-[#FFFFFF] text-[#141413]'
                : 'bg-[#1C1917] hover:bg-[#292524] text-[#FAF9F6]'
            }`}
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};
