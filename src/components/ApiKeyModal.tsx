'use client';

import React, { useState, useEffect } from 'react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  onSaveApiKey: (key: string) => void;
}

const DEFAULT_FIXED_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "AQ.Ab8RN6L6TrLv1CcNx-2rK0oOVPnsubAtg06rFLhPJt-iv0WqvQ";

export default function ApiKeyModal({
  isOpen,
  onClose,
  apiKey,
  onSaveApiKey,
}: ApiKeyModalProps) {
  const [inputKey, setInputKey] = useState('');

  useEffect(() => {
    setInputKey(apiKey || DEFAULT_FIXED_KEY);
  }, [apiKey, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    const keyToSave = inputKey.trim() || DEFAULT_FIXED_KEY;
    onSaveApiKey(keyToSave);
    onClose();
  };

  const handleResetToDefault = () => {
    setInputKey(DEFAULT_FIXED_KEY);
    onSaveApiKey(DEFAULT_FIXED_KEY);
    alert('기본 제공 AI 키로 설정되었습니다.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="glass-card w-full max-w-md p-6 space-y-5 shadow-2xl border border-border-primary">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-primary/50 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🔑</span>
            <h2 className="text-base font-bold text-text-primary">Google Gemini AI 키 설정</h2>
          </div>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary text-sm p-1 rounded-md cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <div className="space-y-4 text-xs">
          <p className="text-text-secondary leading-relaxed">
            카카오톡 식사 주문 자동 해석 및 파싱에 사용하는 <b>Google Gemini API Key</b> 설정입니다.
          </p>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-text-primary">API Key 입력</label>
              <button
                type="button"
                onClick={handleResetToDefault}
                className="text-accent-primary hover:underline text-[11px] font-medium flex items-center gap-1 cursor-pointer"
              >
                <span>⚡</span> 기본값으로 설정
              </button>
            </div>
            <input
              type="password"
              placeholder="AIzaSy... 또는 개인 API 키"
              value={inputKey}
              onChange={e => setInputKey(e.target.value)}
              className="input-field font-mono text-xs py-2 px-3"
            />
          </div>

          <div className="p-3 rounded-lg bg-accent-primary/5 border border-accent-primary/20 text-text-muted space-y-1 text-[11px]">
            <p className="font-semibold text-accent-primary">💡 안내</p>
            <p>- 아예 처음 들어오는 사용자도 <b>[기본값으로 설정]</b> 버튼을 통해 기본 제공 키를 자유롭게 적용할 수 있습니다.</p>
            <p>- 개인 키가 있으신 분은 직접 입력 후 저장하실 수 있습니다.</p>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-primary/50">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary text-xs py-2 px-4 cursor-pointer"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="btn-primary text-xs py-2 px-4 cursor-pointer"
          >
            저장하기
          </button>
        </div>
      </div>
    </div>
  );
}
