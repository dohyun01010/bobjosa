'use client';

import React, { useState, useEffect } from 'react';
import { Restaurant } from '../types';

interface HeaderProps {
  restaurants: Restaurant[];
  selectedRestaurantId: string;
  onRestaurantChange: (id: string) => void;
  onOpenMenuManagement: () => void;
  onOpenApiKeyModal: () => void;
  onOpenAiTraining: () => void;
  hasApiKey: boolean;
}

export default function Header({
  restaurants,
  selectedRestaurantId,
  onRestaurantChange,
  onOpenMenuManagement,
  onOpenApiKeyModal,
  onOpenAiTraining,
  hasApiKey,
}: HeaderProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="discord-card px-6 py-5 mb-6 border-b-2 border-b-[var(--colors-primary)] relative overflow-hidden">
      {/* Decorative Blurple / Magenta Glow inside Header */}
      <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-[var(--colors-magenta)] opacity-20 blur-3xl pointer-events-none"></div>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 relative z-10">
        {/* Discord Server Title & Brand */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-[var(--rounded-lg)] bg-gradient-to-br from-[var(--colors-primary)] to-[var(--colors-magenta)] flex items-center justify-center font-display font-extrabold text-white text-2xl shadow-lg transform -rotate-2 transition-transform hover:rotate-0">
            🍚
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-display font-extrabold text-[var(--colors-ink)] tracking-tight uppercase">
                밥조사 <span className="text-[var(--colors-primary)] text-sm font-sans tracking-widest font-bold">HQ</span>
              </h1>
              <span className="badge-discord-green text-xs flex items-center gap-1.5 font-bold shadow-sm">
                <span className="w-2 h-2 rounded-full bg-[var(--colors-green)] inline-block animate-pulse"></span>
                <span>ONLINE DB</span>
              </span>
            </div>
            <p className="text-xs text-[var(--colors-muted)] font-medium">카카오톡 식사 주문 AI 집계 서버</p>
          </div>
        </div>

        {/* Discord Top Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Restaurant Selector */}
          <div className="flex items-center gap-2 bg-[var(--colors-surface-onyx)] px-3 py-1.5 rounded-[var(--rounded-sm)] border border-[var(--colors-hairline)]">
            <label htmlFor="restaurant-select" className="text-xs text-[var(--colors-muted)] font-extrabold uppercase tracking-wider flex items-center gap-1">
              <span>🏪</span> 식당
            </label>
            <select
              id="restaurant-select"
              value={selectedRestaurantId}
              onChange={e => onRestaurantChange(e.target.value)}
              className="discord-select text-xs h-9 min-w-[170px] bg-transparent border-none focus:ring-0 text-[var(--colors-ink)] font-semibold cursor-pointer"
              suppressHydrationWarning
            >
              <option value="" className="bg-[var(--colors-surface-onyx)]">식당을 선택하세요...</option>
              {mounted &&
                restaurants.map(r => (
                  <option key={r.id} value={r.id} className="bg-[var(--colors-surface-onyx)]" suppressHydrationWarning>
                    {r.name} ({r.menuItems.length}개 메뉴)
                  </option>
                ))}
            </select>
          </div>

          {/* AI Key Button */}
          <button
            onClick={onOpenApiKeyModal}
            className={hasApiKey ? "button-ghost text-xs h-9 cursor-pointer" : "button-green text-xs h-9 cursor-pointer"}
          >
            <span className="w-2 h-2 rounded-full bg-[var(--colors-green)] mr-1.5"></span>
            <span>{hasApiKey ? 'AI 연결됨' : 'AI 키 설정'}</span>
          </button>

          {/* AI Training Center Button */}
          <button
            onClick={onOpenAiTraining}
            className="button-magenta text-xs h-9 flex items-center gap-1.5 shadow-md hover:scale-105 transition-transform cursor-pointer"
          >
            <span>🧠</span>
            <span className="font-extrabold">AI 학습 센터</span>
          </button>

          {/* Menu Management Button */}
          <button
            onClick={onOpenMenuManagement}
            className="button-ghost text-xs h-9 cursor-pointer"
          >
            ⚙️ 메뉴 관리
          </button>
        </div>
      </div>
    </header>
  );
}
