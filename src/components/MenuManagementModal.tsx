'use client';

import React, { useState } from 'react';
import { Restaurant, MenuItem } from '../types';

interface MenuManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  restaurants: Restaurant[];
  onSaveRestaurants: (restaurants: Restaurant[]) => void;
}

export default function MenuManagementModal({
  isOpen,
  onClose,
  restaurants,
  onSaveRestaurants,
}: MenuManagementModalProps) {
  const [localRestaurants, setLocalRestaurants] = useState<Restaurant[]>(restaurants);
  const [selectedRestId, setSelectedRestId] = useState<string>(
    restaurants[0]?.id || ''
  );

  const [newRestName, setNewRestName] = useState('');
  const [newMenuName, setNewMenuName] = useState('');
  const [newMenuAliasInput, setNewMenuAliasInput] = useState('');

  if (!isOpen) return null;

  const currentRest = localRestaurants.find(r => r.id === selectedRestId);

  const handleAddRestaurant = () => {
    if (!newRestName.trim()) return;
    const newRest: Restaurant = {
      id: `rest-${Date.now()}`,
      name: newRestName.trim(),
      menuItems: [],
    };
    setLocalRestaurants([...localRestaurants, newRest]);
    setSelectedRestId(newRest.id);
    setNewRestName('');
  };

  const handleDeleteRestaurant = (restId: string) => {
    if (localRestaurants.length <= 1) {
      alert('최소 하나의 식당은 존재해야 합니다.');
      return;
    }
    if (!confirm('이 식당과 등록된 모든 메뉴를 삭제하시겠습니까?')) return;
    const updated = localRestaurants.filter(r => r.id !== restId);
    setLocalRestaurants(updated);
    if (selectedRestId === restId) {
      setSelectedRestId(updated[0]?.id || '');
    }
  };

  const handleAddMenuItem = () => {
    if (!newMenuName.trim() || !selectedRestId) return;
    const aliases = newMenuAliasInput
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const newItem: MenuItem = {
      id: `menu-${Date.now()}`,
      name: newMenuName.trim(),
      aliases,
    };

    setLocalRestaurants(
      localRestaurants.map(r => {
        if (r.id !== selectedRestId) return r;
        return {
          ...r,
          menuItems: [...r.menuItems, newItem],
        };
      })
    );

    setNewMenuName('');
    setNewMenuAliasInput('');
  };

  const handleDeleteMenuItem = (menuId: string) => {
    setLocalRestaurants(
      localRestaurants.map(r => {
        if (r.id !== selectedRestId) return r;
        return {
          ...r,
          menuItems: r.menuItems.filter(m => m.id !== menuId),
        };
      })
    );
  };

  const handleSaveAndClose = () => {
    onSaveRestaurants(localRestaurants);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#313338] border border-[#1f2023] w-full max-w-4xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Discord Modal Header */}
        <div className="px-6 py-4 bg-[#2b2d31] border-b border-[#1f2023] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚙️</span>
            <div>
              <h2 className="text-base font-extrabold text-[var(--text-primary)] uppercase tracking-wider">
                서버 메뉴 & 식당 관리 DB
              </h2>
              <p className="text-xs text-[var(--text-muted)] font-medium">
                등록된 식당과 메뉴를 실시간으로 수정 및 추가합니다.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-2 text-xl font-bold transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Discord Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-[#313338]">
          {/* 1. Restaurant Tabs Section */}
          <div className="space-y-3">
            <label className="text-xs font-extrabold uppercase tracking-wider text-[var(--text-muted)] block">
              식당 목록 (탭 선택)
            </label>
            <div className="flex flex-wrap gap-2">
              {localRestaurants.map(r => {
                const isSelected = r.id === selectedRestId;
                return (
                  <div
                    key={r.id}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded font-bold text-xs cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-[var(--primary-blurple)] text-white shadow-md'
                        : 'bg-[#2b2d31] text-[var(--text-secondary)] hover:bg-[#383a40] hover:text-white border border-[#1f2023]'
                    }`}
                    onClick={() => setSelectedRestId(r.id)}
                  >
                    <span>🏪 {r.name}</span>
                    <span className="text-[10px] opacity-80">({r.menuItems.length})</span>
                    {isSelected && (
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          handleDeleteRestaurant(r.id);
                        }}
                        className="ml-1 hover:text-red-300 font-bold"
                        title="식당 삭제"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Add New Restaurant */}
            <div className="flex gap-2 pt-2">
              <input
                type="text"
                value={newRestName}
                onChange={e => setNewRestName(e.target.value)}
                placeholder="새 식당 이름 입력..."
                className="discord-input text-xs flex-1"
              />
              <button
                onClick={handleAddRestaurant}
                className="btn-discord-blurple text-xs py-2 px-4 whitespace-nowrap font-bold"
              >
                + 식당 추가
              </button>
            </div>
          </div>

          {/* 2. Menu Items Section */}
          {currentRest && (
            <div className="pt-4 border-t border-[#1f2023] space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-[var(--text-primary)]">
                  [{currentRest.name}] 메뉴 및 별칭 목록 ({currentRest.menuItems.length}개)
                </h3>
              </div>

              {/* Add New Menu Item */}
              <div className="p-4 rounded-xl bg-[#2b2d31] border border-[#1f2023] space-y-3">
                <h4 className="text-xs font-bold text-[var(--text-primary)]">
                  + 신규 메뉴 추가
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={newMenuName}
                    onChange={e => setNewMenuName(e.target.value)}
                    placeholder="메뉴명 (예: 돼지국밥)"
                    className="discord-input text-xs"
                  />
                  <input
                    type="text"
                    value={newMenuAliasInput}
                    onChange={e => setNewMenuAliasInput(e.target.value)}
                    placeholder="별칭 쉼표 구분 (예: 국밥, 돼지 국밥)"
                    className="discord-input text-xs"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={handleAddMenuItem}
                    className="btn-discord-green text-xs py-2 px-4 font-bold"
                  >
                    + 메뉴 등록
                  </button>
                </div>
              </div>

              {/* Registered Menu List */}
              <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                {currentRest.menuItems.length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)] py-4 text-center">
                    등록된 메뉴가 없습니다.
                  </p>
                ) : (
                  currentRest.menuItems.map(menu => (
                    <div
                      key={menu.id}
                      className="p-3 rounded-lg bg-[#2b2d31] border border-[#1f2023] flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-[var(--text-primary)] text-xs">{menu.name}</span>
                        {menu.aliases.length > 0 && (
                          <div className="flex gap-1 flex-wrap mt-1">
                            {menu.aliases.map((alias, idx) => (
                              <span
                                key={idx}
                                className="badge-discord-blurple text-[10px] py-0 px-2 font-mono"
                              >
                                {alias}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => handleDeleteMenuItem(menu.id)}
                        className="btn-discord-danger text-[11px] h-7 py-0 px-2.5 font-bold"
                      >
                        삭제
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Discord Modal Footer */}
        <div className="px-6 py-4 bg-[#2b2d31] border-t border-[#1f2023] flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="btn-discord-secondary text-xs py-2 px-4 font-bold"
          >
            취소
          </button>
          <button
            onClick={handleSaveAndClose}
            className="btn-discord-blurple text-xs py-2 px-5 font-bold"
          >
            변경사항 저장 & 적용
          </button>
        </div>
      </div>
    </div>
  );
}
