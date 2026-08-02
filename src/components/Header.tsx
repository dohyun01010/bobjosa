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
    <header className="cursor-card px-6 py-4 mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Brand & Wordmark */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-normal tracking-tighter text-[var(--ink)]">
              밥조사 <span className="text-[var(--primary)] font-semibold">.</span>
            </h1>
            <span className="pill-done text-[10px]">
              CLOUD DB CONNECTED
            </span>
          </div>
        </div>

        {/* Navigation & Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Restaurant Selector */}
          <div className="flex items-center gap-2">
            <select
              id="restaurant-select"
              value={selectedRestaurantId}
              onChange={e => onRestaurantChange(e.target.value)}
              className="cursor-select text-xs h-10 min-w-[170px]"
              suppressHydrationWarning
            >
              <option value="">식당 선택...</option>
              {mounted &&
                restaurants.map(r => (
                  <option key={r.id} value={r.id} suppressHydrationWarning>
                    {r.name} ({r.menuItems.length}개 메뉴)
                  </option>
                ))}
            </select>
          </div>

          {/* AI Key Button (Cursor Orange signature primary CTA when unlinked, or secondary pill) */}
          <button
            onClick={onOpenApiKeyModal}
            className={hasApiKey ? "btn-cursor-secondary text-xs h-10" : "btn-cursor-primary text-xs h-10"}
          >
            <span className="w-2 h-2 rounded-full bg-[var(--primary)] mr-1.5"></span>
            <span>{hasApiKey ? 'AI 연결됨' : 'AI 키 설정'}</span>
          </button>

          {/* Menu Management Button */}
          <button
            onClick={onOpenMenuManagement}
            className="btn-cursor-secondary text-xs h-10"
          >
            메뉴 관리
          </button>
        </div>
      </div>
    </header>
  );
}
