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
    <header className="discord-card px-6 py-4 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Discord Server Title & Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--primary-blurple)] flex items-center justify-center font-extrabold text-white text-lg shadow-md">
            밥
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-extrabold text-[var(--text-primary)] tracking-tight uppercase">밥조사</h1>
              <span className="badge-discord-green text-[10px] flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[var(--discord-green)] inline-block"></span>
                <span>ONLINE DB</span>
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)] font-medium">카카오톡 식사 주문 집계 서버</p>
          </div>
        </div>

        {/* Discord Top Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Restaurant Selector */}
          <div className="flex items-center gap-2">
            <label htmlFor="restaurant-select" className="text-xs text-[var(--text-muted)] font-bold uppercase tracking-wider">
              식당
            </label>
            <select
              id="restaurant-select"
              value={selectedRestaurantId}
              onChange={e => onRestaurantChange(e.target.value)}
              className="discord-select text-xs h-10 min-w-[180px]"
              suppressHydrationWarning
            >
              <option value="">식당을 선택하세요...</option>
              {mounted &&
                restaurants.map(r => (
                  <option key={r.id} value={r.id} suppressHydrationWarning>
                    {r.name} ({r.menuItems.length}개 메뉴)
                  </option>
                ))}
            </select>
          </div>

          {/* AI Key Button (Blurple Primary CTA) */}
          <button
            onClick={onOpenApiKeyModal}
            className={hasApiKey ? "btn-discord-secondary text-xs h-10" : "btn-discord-blurple text-xs h-10"}
          >
            <span className="w-2 h-2 rounded-full bg-[var(--discord-green)] mr-1.5"></span>
            <span>{hasApiKey ? 'AI 연결됨' : 'AI 키 설정'}</span>
          </button>

          {/* Menu Management Button */}
          <button
            onClick={onOpenMenuManagement}
            className="btn-discord-secondary text-xs h-10"
          >
            ⚙️ 메뉴 관리
          </button>
        </div>
      </div>
    </header>
  );
}
