'use client';

import React, { useState, useEffect } from 'react';
import { Restaurant } from '../types';

interface HeaderProps {
  restaurants: Restaurant[];
  selectedRestaurantId: string;
  onRestaurantChange: (id: string) => void;
  onOpenMenuManagement: () => void;
  onOpenApiKeyModal: () => void;
  hasApiKey: boolean;
}

export default function Header({
  restaurants,
  selectedRestaurantId,
  onRestaurantChange,
  onOpenMenuManagement,
  onOpenApiKeyModal,
  hasApiKey,
}: HeaderProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="glass-card px-6 py-4 mb-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Title */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-accent-primary/20 flex items-center justify-center">
            <span className="text-lg">🍚</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-text-primary tracking-tight">밥조사</h1>
              <span className="badge badge-success text-[10px]">DB 영구 동기화 활성</span>
            </div>
            <p className="text-xs text-text-muted">AI 기반 카카오톡 식사 주문 자동 취합</p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Restaurant Select */}
          <div className="flex items-center gap-2">
            <label htmlFor="restaurant-select" className="text-sm text-text-secondary whitespace-nowrap">
              🏪 식당
            </label>
            <select
              id="restaurant-select"
              value={selectedRestaurantId}
              onChange={e => onRestaurantChange(e.target.value)}
              className="select-field min-w-[160px]"
              suppressHydrationWarning
            >
              <option value="">식당을 선택하세요</option>
              {mounted &&
                restaurants.map(r => (
                  <option key={r.id} value={r.id} suppressHydrationWarning>
                    {r.name} ({r.menuItems.length}개 메뉴)
                  </option>
                ))}
            </select>
          </div>

          {/* AI Key Button */}
          <button
            onClick={onOpenApiKeyModal}
            className={`btn-secondary flex items-center gap-1.5 justify-center ${
              hasApiKey ? 'border-accent-success/40 text-accent-success' : ''
            }`}
            title="Google Gemini API Key 설정"
          >
            <span>🔑</span>
            <span className="text-xs font-medium">{hasApiKey ? 'AI 연결됨' : 'AI 키 설정'}</span>
          </button>

          {/* Menu Management Button */}
          <button
            onClick={onOpenMenuManagement}
            className="btn-secondary flex items-center gap-2 justify-center"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            메뉴 관리
          </button>
        </div>
      </div>
    </header>
  );
}
