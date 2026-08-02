'use client';

import React, { useState, useEffect } from 'react';
import { Restaurant, MenuItem } from '../types';
import { setLocalCachedRestaurants } from '../lib/dbService';

interface MenuManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  restaurants: Restaurant[];
  onSaveRestaurants: (newRestaurants: Restaurant[]) => void;
}

export default function MenuManagementModal({
  isOpen,
  onClose,
  restaurants,
  onSaveRestaurants,
}: MenuManagementModalProps) {
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>('');
  const [newMenuName, setNewMenuName] = useState('');
  const [newMenuAliases, setNewMenuAliases] = useState('');

  const [newRestaurantName, setNewRestaurantName] = useState('');
  const [showAddRestaurant, setShowAddRestaurant] = useState(false);

  useEffect(() => {
    if (restaurants.length > 0) {
      if (!selectedRestaurantId || !restaurants.some(r => r.id === selectedRestaurantId)) {
        setSelectedRestaurantId(restaurants[0].id);
      }
    }
  }, [restaurants, selectedRestaurantId]);

  if (!isOpen) return null;

  const currentRestaurant = restaurants.find(r => r.id === selectedRestaurantId);

  const commitUpdate = (updatedRestaurants: Restaurant[]) => {
    setLocalCachedRestaurants(updatedRestaurants);
    onSaveRestaurants(updatedRestaurants);
  };

  const handleAddMenuItem = () => {
    if (!selectedRestaurantId || !newMenuName.trim()) return;

    const cleanName = newMenuName.trim();
    const aliases = newMenuAliases
      .split(',')
      .map(a => a.trim())
      .filter(a => a.length > 0);

    const newMenuItem: MenuItem = {
      id: `menu-${Date.now()}`,
      name: cleanName,
      aliases,
    };

    const updated = restaurants.map(r => {
      if (r.id !== selectedRestaurantId) return r;
      const exists = r.menuItems.some(
        m => m.name.trim().toLowerCase() === cleanName.toLowerCase()
      );
      if (exists) return r;

      return {
        ...r,
        menuItems: [...r.menuItems, newMenuItem],
      };
    });

    commitUpdate(updated);
    setNewMenuName('');
    setNewMenuAliases('');
  };

  const handleDeleteMenuItem = (menuId: string) => {
    const updated = restaurants.map(r => {
      if (r.id !== selectedRestaurantId) return r;
      return {
        ...r,
        menuItems: r.menuItems.filter(m => m.id !== menuId),
      };
    });
    commitUpdate(updated);
  };

  const handleAddAliasToItem = (menuId: string, alias: string) => {
    if (!alias.trim()) return;
    const updated = restaurants.map(r => {
      if (r.id !== selectedRestaurantId) return r;
      return {
        ...r,
        menuItems: r.menuItems.map(m => {
          if (m.id !== menuId) return m;
          if (m.aliases.includes(alias.trim())) return m;
          return { ...m, aliases: [...m.aliases, alias.trim()] };
        }),
      };
    });
    commitUpdate(updated);
  };

  const handleDeleteAlias = (menuId: string, aliasToDelete: string) => {
    const updated = restaurants.map(r => {
      if (r.id !== selectedRestaurantId) return r;
      return {
        ...r,
        menuItems: r.menuItems.map(m => {
          if (m.id !== menuId) return m;
          return {
            ...m,
            aliases: m.aliases.filter(a => a !== aliasToDelete),
          };
        }),
      };
    });
    commitUpdate(updated);
  };

  const handleAddRestaurant = () => {
    if (!newRestaurantName.trim()) return;
    const newRest: Restaurant = {
      id: `rest-${Date.now()}`,
      name: newRestaurantName.trim(),
      menuItems: [],
    };
    const updated = [...restaurants, newRest];
    setSelectedRestaurantId(newRest.id);
    commitUpdate(updated);
    setNewRestaurantName('');
    setShowAddRestaurant(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="glass-card w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl border border-border-primary">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border-primary/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚙️</span>
            <h2 className="text-base font-bold text-text-primary">식당 및 메뉴 관리 (전역 DB 연동)</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-text-muted hover:text-text-primary text-sm p-1 rounded-md cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Restaurant Selector & Add Restaurant */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                관리할 식당 선택
              </label>
              <button
                type="button"
                onClick={() => setShowAddRestaurant(!showAddRestaurant)}
                className="text-xs text-accent-primary hover:underline flex items-center gap-1 cursor-pointer font-medium"
              >
                <span>➕</span> {showAddRestaurant ? '접기' : '새 식당 추가'}
              </button>
            </div>

            {showAddRestaurant && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-bg-input border border-border-primary">
                <input
                  type="text"
                  placeholder="새 식당 이름 (예: 신전떡볶이)"
                  value={newRestaurantName}
                  onChange={e => setNewRestaurantName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddRestaurant()}
                  className="input-field text-xs py-1.5 flex-1"
                />
                <button
                  type="button"
                  onClick={handleAddRestaurant}
                  className="btn-primary text-xs py-1.5 px-3 whitespace-nowrap cursor-pointer"
                >
                  식당 등록
                </button>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {restaurants.map(r => {
                const isSelected = selectedRestaurantId === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setSelectedRestaurantId(r.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-md border-2 border-blue-700'
                        : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-300'
                    }`}
                  >
                    {r.name} ({r.menuItems.length})
                  </button>
                );
              })}
            </div>
          </div>

          {currentRestaurant && (
            <div className="space-y-4 pt-2 border-t border-border-primary/40">
              {/* Add Menu Form */}
              <div className="p-4 rounded-xl bg-bg-input/60 border border-border-primary/60 space-y-3">
                <h4 className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                  <span>➕</span> &ldquo;{currentRestaurant.name}&rdquo;에 새 메뉴 추가
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                  <input
                    type="text"
                    placeholder="메뉴 이름 (예: 치킨마요)"
                    value={newMenuName}
                    onChange={e => setNewMenuName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddMenuItem()}
                    className="sm:col-span-6 input-field text-xs py-2"
                  />
                  <input
                    type="text"
                    placeholder="별칭/약어 (쉼표 구분: 치마, 치킨마요도시락)"
                    value={newMenuAliases}
                    onChange={e => setNewMenuAliases(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddMenuItem()}
                    className="sm:col-span-4 input-field text-xs py-2"
                  />
                  <button
                    type="button"
                    onClick={handleAddMenuItem}
                    className="sm:col-span-2 btn-primary text-xs py-2 whitespace-nowrap font-semibold cursor-pointer active:scale-95"
                  >
                    추가하기
                  </button>
                </div>
              </div>

              {/* Existing Menu Items List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-text-secondary">
                    등록된 메뉴 목록 ({currentRestaurant.menuItems.length}개)
                  </h4>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                  {currentRestaurant.menuItems.length === 0 ? (
                    <p className="text-xs text-text-muted py-4 text-center">
                      등록된 메뉴가 없습니다. 위에서 메뉴를 추가하세요.
                    </p>
                  ) : (
                    currentRestaurant.menuItems.map(item => (
                      <MenuItemRow
                        key={item.id}
                        item={item}
                        onDelete={() => handleDeleteMenuItem(item.id)}
                        onAddAlias={alias => handleAddAliasToItem(item.id, alias)}
                        onDeleteAlias={alias => handleDeleteAlias(item.id, alias)}
                      />
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-border-primary/50 flex justify-end bg-bg-card">
          <button
            type="button"
            onClick={onClose}
            className="btn-primary px-6 py-2 text-xs font-semibold cursor-pointer"
          >
            완료 및 닫기
          </button>
        </div>
      </div>
    </div>
  );
}

function MenuItemRow({
  item,
  onDelete,
  onAddAlias,
  onDeleteAlias,
}: {
  item: MenuItem;
  onDelete: () => void;
  onAddAlias: (alias: string) => void;
  onDeleteAlias: (alias: string) => void;
}) {
  const [newAlias, setNewAlias] = useState('');
  const [showAddAlias, setShowAddAlias] = useState(false);

  const handleAdd = () => {
    if (!newAlias.trim()) return;
    onAddAlias(newAlias.trim());
    setNewAlias('');
    setShowAddAlias(false);
  };

  return (
    <div className="p-3 rounded-lg bg-bg-card border border-border-primary space-y-2 text-xs">
      <div className="flex items-center justify-between">
        <span className="font-bold text-text-primary text-sm">{item.name}</span>
        <button
          type="button"
          onClick={onDelete}
          className="text-text-muted hover:text-accent-error text-xs px-2 py-0.5 rounded hover:bg-accent-error/10 cursor-pointer"
        >
          삭제 ✕
        </button>
      </div>

      {/* Aliases */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[11px] text-text-muted">별칭:</span>
        {item.aliases.map((alias, idx) => (
          <span
            key={idx}
            className="px-2 py-0.5 rounded bg-bg-input border border-border-primary/60 text-text-secondary text-[11px] flex items-center gap-1"
          >
            {alias}
            <button
              type="button"
              onClick={() => onDeleteAlias(alias)}
              className="text-text-muted hover:text-accent-error text-[10px] cursor-pointer"
            >
              ✕
            </button>
          </span>
        ))}

        {showAddAlias ? (
          <div className="flex items-center gap-1 inline-flex">
            <input
              type="text"
              placeholder="약어 입력"
              value={newAlias}
              onChange={e => setNewAlias(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              className="input-field text-[11px] py-0.5 px-2 w-24"
              autoFocus
            />
            <button type="button" onClick={handleAdd} className="btn-primary text-[10px] py-0.5 px-2 cursor-pointer">
              등록
            </button>
            <button type="button" onClick={() => setShowAddAlias(false)} className="btn-secondary text-[10px] py-0.5 px-1 cursor-pointer">
              취소
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowAddAlias(true)}
            className="text-[11px] text-accent-primary hover:underline cursor-pointer"
          >
            + 별칭 추가
          </button>
        )}
      </div>
    </div>
  );
}
