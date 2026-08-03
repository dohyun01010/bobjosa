'use client';

import React, { useState, useEffect } from 'react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  onSaveApiKey: (key: string) => void;
}

const DEFAULT_FIXED_USER_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "AQ.Ab8RN6L6TrLv1CcNx-2rK0oOVPnsubAtg06rFLhPJt-iv0WqvQ";

export default function ApiKeyModal({
  isOpen,
  onClose,
  apiKey,
  onSaveApiKey,
}: ApiKeyModalProps) {
  const [inputKey, setInputKey] = useState(apiKey);

  useEffect(() => {
    setInputKey(apiKey || DEFAULT_FIXED_USER_KEY);
  }, [apiKey]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveApiKey(inputKey.trim());
    onClose();
  };

  const handleResetToDefault = () => {
    setInputKey(DEFAULT_FIXED_USER_KEY);
    onSaveApiKey(DEFAULT_FIXED_USER_KEY);
    alert('기본 Gemini API 키로 재설정되었습니다.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-[var(--colors-surface-indigo)] border border-[var(--border-primary)] w-full max-w-md rounded-[var(--rounded-lg)] shadow-2xl overflow-hidden flex flex-col">
        {/* Discord Modal Header */}
        <div className="px-6 py-4 bg-[var(--colors-surface-onyx)] border-b border-[var(--colors-hairline)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">🔑</span>
            <div>
              <h2 className="text-base font-display font-extrabold text-[var(--colors-ink)] uppercase tracking-wider">
                Google Gemini API Key 설정
              </h2>
              <p className="text-xs text-[var(--colors-muted)] font-medium">
                AI 파싱 엔진 연동키를 설정합니다.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--colors-muted)] hover:text-white p-2 text-xl font-bold transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Discord Modal Content */}
        <div className="p-6 space-y-4 bg-[var(--colors-surface-indigo)]">
          <div className="space-y-2">
            <label className="text-xs font-display font-extrabold uppercase tracking-wider text-[var(--colors-muted)] block">
              Gemini API Key
            </label>
            <input
              type="password"
              value={inputKey}
              onChange={e => setInputKey(e.target.value)}
              placeholder="API Key를 입력하세요..."
              className="discord-input w-full text-xs font-mono"
            />
          </div>

          <div className="flex justify-between items-center pt-2">
            <button
              onClick={handleResetToDefault}
              className="text-xs text-[var(--colors-primary)] hover:underline font-bold cursor-pointer"
            >
              ⚡ 기본값으로 설정
            </button>
            <a
              href="https://aistudio.google.com/app/api-keys?project=gen-lang-client-0101333658"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[var(--colors-green)] hover:underline font-bold"
            >
              🔑 키 발급받기 ➔
            </a>
          </div>
        </div>

        {/* Discord Modal Footer */}
        <div className="px-6 py-4 bg-[var(--colors-surface-onyx)] border-t border-[var(--colors-hairline)] flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="button-ghost text-xs py-2 px-4 font-bold"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            className="button-primary text-xs py-2 px-5 font-bold"
          >
            저장 및 적용
          </button>
        </div>
      </div>
    </div>
  );
}
