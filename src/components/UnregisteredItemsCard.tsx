'use client';

import React, { useState } from 'react';
import { UnregisteredItem, MenuItem } from '../types';

interface UnregisteredItemsCardProps {
  unregisteredItems: UnregisteredItem[];
  existingMenuItems: MenuItem[];
  onAddToDb: (suggestedName: string, aliases: string[]) => void;
  onAddAsAlias: (menuId: string, alias: string) => void;
  onDismiss: (id: string) => void;
}

export default function UnregisteredItemsCard({
  unregisteredItems,
  existingMenuItems,
  onAddToDb,
  onAddAsAlias,
  onDismiss,
}: UnregisteredItemsCardProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedName, setEditedName] = useState('');
  const [searchQueries, setSearchQueries] = useState<Record<string, string>>({});
  const [showSearchBox, setShowSearchBox] = useState<Record<string, boolean>>({});

  if (!unregisteredItems || unregisteredItems.length === 0) return null;

  const handleStartEdit = (item: UnregisteredItem) => {
    setEditingId(item.id);
    setEditedName(item.suggestedName);
  };

  const handleSaveEditAndAdd = (item: UnregisteredItem) => {
    if (!editedName.trim()) return;
    onAddToDb(editedName.trim(), item.suggestedAliases);
    setEditingId(null);
    onDismiss(item.id);
  };

  const handleQuickAdd = (item: UnregisteredItem) => {
    onAddToDb(item.suggestedName, item.suggestedAliases);
    onDismiss(item.id);
  };

  const handleSelectAliasMatch = (item: UnregisteredItem, menuId: string) => {
    const aliasToRegister = item.rawText || item.suggestedName;
    onAddAsAlias(menuId, aliasToRegister);
    onDismiss(item.id);
  };

  return (
    <div className="glass-card p-4 border border-accent-warning/30 bg-accent-warning/5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-accent-warning flex items-center gap-1.5">
          <span>💡</span> DB에 없는 새 메뉴가 감지되었습니다 ({unregisteredItems.length}건)
        </h3>
        <span className="text-[11px] text-text-muted">기존 메뉴의 별칭으로 연동하거나 새 메뉴로 등록하세요</span>
      </div>

      <div className="space-y-3">
        {unregisteredItems.map(item => {
          const searchQuery = (searchQueries[item.id] || '').trim().toLowerCase();
          const filteredMenuItems = searchQuery
            ? existingMenuItems.filter(
                m =>
                  m.name.toLowerCase().includes(searchQuery) ||
                  m.aliases.some(a => a.toLowerCase().includes(searchQuery))
              )
            : existingMenuItems;

          return (
            <div
              key={item.id}
              className="p-3.5 rounded-xl bg-bg-card border border-border-primary space-y-2.5 text-xs"
            >
              {/* User info & raw text */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-text-primary">👤 {item.userName}</span>
                  {item.departmentName && (
                    <span className="badge badge-success text-[10px] py-0">{item.departmentName}</span>
                  )}
                  <span className="text-text-muted">입력: &ldquo;{item.rawText}&rdquo; ({item.quantity}개)</span>
                </div>
                <button
                  onClick={() => onDismiss(item.id)}
                  className="text-text-muted hover:text-accent-error text-xs p-1"
                  title="무시"
                >
                  ✕
                </button>
              </div>

              {/* Inline Edit Form */}
              {editingId === item.id ? (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={editedName}
                    onChange={e => setEditedName(e.target.value)}
                    className="input-field text-xs py-1 px-2.5 flex-1"
                    placeholder="신규 메뉴 이름 수정"
                    autoFocus
                  />
                  <button
                    onClick={() => handleSaveEditAndAdd(item)}
                    className="btn-primary text-xs py-1 px-3 whitespace-nowrap"
                  >
                    수정 후 DB 신규 등록
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="btn-secondary text-xs py-1 px-2"
                  >
                    취소
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* AI Suggested Matches to prevent duplicate additions */}
                  {item.suggestedExistingMatches && item.suggestedExistingMatches.length > 0 && (
                    <div className="p-2 rounded-lg bg-bg-input/60 border border-border-primary/50 space-y-1.5">
                      <p className="text-[11px] text-text-accent font-semibold flex items-center gap-1">
                        <span>🤖</span> 혹시 기존 DB의 이 메뉴인가요? (클릭 시 별칭으로 자동 연결)
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {item.suggestedExistingMatches.map(match => (
                          <button
                            key={match.menuId}
                            onClick={() => handleSelectAliasMatch(item, match.menuId)}
                            className="px-2.5 py-1 rounded bg-accent-primary/10 border border-accent-primary/30 text-accent-primary hover:bg-accent-primary hover:text-white transition-all text-xs font-medium flex items-center gap-1"
                          >
                            <span>🔗 &ldquo;{match.menuName}&rdquo; 의 별칭으로 등록</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions & Search Toggle */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-text-muted">AI 유추 메뉴명:</span>
                      <span className="font-bold text-text-primary">&ldquo;{item.suggestedName}&rdquo;</span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Search Toggle */}
                      <button
                        onClick={() =>
                          setShowSearchBox({
                            ...showSearchBox,
                            [item.id]: !showSearchBox[item.id],
                          })
                        }
                        className="btn-secondary text-xs py-1 px-2.5 flex items-center gap-1"
                      >
                        <span>🔍</span> 기존 메뉴 찾아 별칭 연동
                      </button>

                      {/* Edit Name & Add */}
                      <button
                        onClick={() => handleStartEdit(item)}
                        className="btn-secondary text-xs py-1 px-2.5 flex items-center gap-1"
                      >
                        <span>✏️</span> 이름 수정 후 추가
                      </button>

                      {/* Quick Add New */}
                      <button
                        onClick={() => handleQuickAdd(item)}
                        className="btn-primary text-xs py-1 px-3 flex items-center gap-1"
                      >
                        <span>➕</span> 새 메뉴로 DB 등록
                      </button>
                    </div>
                  </div>

                  {/* Search Input & Live Filter Dropdown */}
                  {showSearchBox[item.id] && (
                    <div className="p-3 rounded-lg bg-bg-input border border-border-primary space-y-2 mt-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-semibold text-text-secondary">
                          기존 메뉴 검색 후 별칭으로 추가하기:
                        </label>
                        <button
                          onClick={() =>
                            setShowSearchBox({ ...showSearchBox, [item.id]: false })
                          }
                          className="text-text-muted hover:text-text-primary text-[10px]"
                        >
                          접기 ✕
                        </button>
                      </div>

                      <input
                        type="text"
                        placeholder="기존 메뉴 이름 검색 (예: 마마통살버거)"
                        value={searchQueries[item.id] || ''}
                        onChange={e =>
                          setSearchQueries({
                            ...searchQueries,
                            [item.id]: e.target.value,
                          })
                        }
                        className="input-field text-xs py-1 px-2.5"
                        autoFocus
                      />

                      <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                        {filteredMenuItems.length === 0 ? (
                          <p className="text-[11px] text-text-muted py-1">
                            검색 결과가 없습니다.
                          </p>
                        ) : (
                          filteredMenuItems.map(m => (
                            <div
                              key={m.id}
                              className="flex items-center justify-between p-1.5 rounded bg-bg-card hover:bg-bg-card-hover transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-text-primary">{m.name}</span>
                                {m.aliases.length > 0 && (
                                  <span className="text-[10px] text-text-muted">
                                    (별칭: {m.aliases.join(', ')})
                                  </span>
                                )}
                              </div>
                              <button
                                onClick={() => handleSelectAliasMatch(item, m.id)}
                                className="btn-primary text-[11px] py-0.5 px-2 whitespace-nowrap"
                              >
                                이 메뉴의 별칭으로 추가
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
