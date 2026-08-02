'use client';

import React, { useState } from 'react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  onSaveApiKey: (key: string) => void;
}

export default function ApiKeyModal({
  isOpen,
  onClose,
  apiKey,
  onSaveApiKey,
}: ApiKeyModalProps) {
  const [inputKey, setInputKey] = useState(apiKey);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveApiKey(inputKey.trim());
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
            <span>🔑</span> Google Gemini API 키 설정
          </h2>
          <button onClick={onClose} className="btn-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="text-xs text-text-secondary mb-4 leading-relaxed">
          카카오톡 대화 내용의 자연어, 잡담, 타임스탬프 및 수량 수정을 인공지능이 정교하게 파악하기 위해 Gemini API Key를 사용합니다. 키는 브라우저의 localStorage에만 안전하게 보관됩니다.
        </p>

        <div className="space-y-3 mb-6">
          <label className="block text-xs font-semibold text-text-secondary">
            Gemini API Key
          </label>
          <input
            type="password"
            placeholder="AIzaSy..."
            value={inputKey}
            onChange={e => setInputKey(e.target.value)}
            className="input-field text-sm font-mono"
          />
          <p className="text-[11px] text-text-muted">
            * API 키가 없으신 경우{' '}
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              className="text-text-accent underline hover:text-accent-primary"
            >
              Google AI Studio
            </a>
            에서 무료로 발급받으실 수 있습니다.
          </p>
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary text-xs py-1.5 px-3">
            취소
          </button>
          <button onClick={handleSave} className="btn-primary text-xs py-1.5 px-4">
            저장하기
          </button>
        </div>
      </div>
    </div>
  );
}
