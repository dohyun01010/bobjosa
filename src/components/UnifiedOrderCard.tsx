'use client';

import React, { useState } from 'react';
import {
  UserOrder,
  UnregisteredItem,
  AiParseResult,
  MenuItem,
} from '../types';
import { DepartmentName } from '../constants';
import { parseChatWithAi } from '../lib/aiParser';
import UnrecognizedUsersCard from './UnrecognizedUsersCard';
import UnregisteredItemsCard from './UnregisteredItemsCard';

interface UnifiedOrderCardProps {
  rawChatText: string;
  userOrders: UserOrder[];
  unregisteredItems: UnregisteredItem[];
  unrecognizedUsers: string[];
  menuItems: MenuItem[];
  restaurantSelected: boolean;
  apiKey: string;
  memberMap: Record<string, DepartmentName>;
  onRawTextChange: (text: string) => void;
  onAnalyzeComplete: (result: AiParseResult) => void;
  onUserOrderUpdate: (userOrders: UserOrder[]) => void;
  onDismissUnregisteredItem: (id: string) => void;
  onAddMenuItemToDb: (suggestedName: string, aliases: string[]) => void;
  onAddAliasToDb: (menuId: string, alias: string) => void;
  onSelectUserDepartment: (memberName: string, departmentName: DepartmentName) => void;
  onDismissUnrecognizedUser: (memberName: string) => void;
  onOpenApiKeyModal: () => void;
}

export default function UnifiedOrderCard({
  rawChatText,
  userOrders,
  unregisteredItems,
  unrecognizedUsers,
  menuItems,
  restaurantSelected,
  apiKey,
  memberMap,
  onRawTextChange,
  onAnalyzeComplete,
  onUserOrderUpdate,
  onDismissUnregisteredItem,
  onAddMenuItemToDb,
  onAddAliasToDb,
  onSelectUserDepartment,
  onDismissUnrecognizedUser,
  onOpenApiKeyModal,
}: UnifiedOrderCardProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  const formatCleanedRawChatText = (orders: UserOrder[]): string => {
    const blocks: string[] = [];

    for (const u of orders) {
      if (!u.userName) continue;
      const lines: string[] = [];
      lines.push(u.userName.trim());

      for (const item of u.items) {
        if (item.status === 'uncertain') continue;
        const name = item.matchedMenuName || item.rawText;
        if (name) {
          lines.push(`${name} ${item.quantity}`);
        }
      }

      if (lines.length > 1 || (lines.length === 1 && u.items.length > 0)) {
        blocks.push(lines.join('\n'));
      }
    }

    return blocks.join('\n--------------------\n');
  };

  const handleRunAiAnalysis = async () => {
    if (!rawChatText.trim()) {
      alert('카카오톡 주문 대화 내용을 입력해 주세요.');
      return;
    }

    setIsAnalyzing(true);
    setIsVerified(false);
    try {
      const result = await parseChatWithAi(
        rawChatText,
        menuItems,
        apiKey,
        memberMap
      );
      onAnalyzeComplete(result);
      setIsVerified(true);

      if (result.userOrders && result.userOrders.length > 0) {
        const formatted = formatCleanedRawChatText(result.userOrders);
        if (formatted) {
          onRawTextChange(formatted);
        }
      }
    } catch (e: any) {
      console.error('AI Parse error:', e);
      alert(`분석 오류가 발생했습니다: ${e?.message || e}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleEditItemQuantity = (userId: string, itemId: string, delta: number) => {
    const updated = userOrders.map(u => {
      if (u.id !== userId) return u;
      return {
        ...u,
        items: u.items
          .map(item => {
            if (item.id !== itemId) return item;
            const newQty = Math.max(0, item.quantity + delta);
            return { ...item, quantity: newQty };
          })
          .filter(item => item.quantity > 0),
      };
    }).filter(u => u.items.length > 0);

    onUserOrderUpdate(updated);
    onRawTextChange(formatCleanedRawChatText(updated));
  };

  const handleSelectAmbiguousCandidate = async (userId: string, itemId: string, chosenName: string) => {
    const updated = userOrders.map(u => {
      if (u.id !== userId) return u;
      return {
        ...u,
        items: u.items.map(item => {
          if (item.id !== itemId) return item;
          return {
            ...item,
            matchedMenuName: chosenName,
            status: 'confirmed' as const,
          };
        }),
      };
    });

    onUserOrderUpdate(updated);
    onRawTextChange(formatCleanedRawChatText(updated));
  };

  const handleConfirmUncertainItem = (userId: string, itemId: string) => {
    const updated = userOrders.map(u => {
      if (u.id !== userId) return u;
      return {
        ...u,
        items: u.items.map(item => {
          if (item.id !== itemId) return item;
          return {
            ...item,
            status: 'confirmed' as const,
          };
        }),
      };
    });

    onUserOrderUpdate(updated);
    onRawTextChange(formatCleanedRawChatText(updated));
  };

  const handleRejectUncertainItem = (userId: string, itemId: string) => {
    const updated = userOrders.map(u => {
      if (u.id !== userId) return u;
      return {
        ...u,
        items: u.items.filter(item => item.id !== itemId),
      };
    }).filter(u => u.items.length > 0);

    onUserOrderUpdate(updated);
    onRawTextChange(formatCleanedRawChatText(updated));
  };

  const handleDeleteUserOrder = (userId: string) => {
    const updated = userOrders.filter(u => u.id !== userId);
    onUserOrderUpdate(updated);
    onRawTextChange(formatCleanedRawChatText(updated));
  };

  return (
    <div className="discord-card p-6 space-y-6 w-full shadow-2xl">
      {/* 1. Discord Chat Input Pane */}
      <div className="space-y-3 w-full">
        <div className="flex items-center justify-between">
          <label className="text-xs font-extrabold uppercase tracking-wider text-[var(--colors-muted)] flex items-center gap-2">
            <span className="text-[var(--colors-primary)] text-sm">#</span>
            <span>주문-메시지-채널</span>
          </label>
          <span className="text-[10px] bg-[var(--colors-surface-onyx)] text-[var(--colors-muted)] px-2 py-0.5 rounded font-mono border border-[var(--colors-hairline)]">
            KAKAO CHAT PARSER
          </span>
        </div>

        <textarea
          value={rawChatText}
          onChange={e => onRawTextChange(e.target.value)}
          placeholder="#주문-채널에 카카오톡 대화 전문을 붙여넣으세요..."
          className="discord-input w-full min-h-[340px] p-4 text-xs font-mono leading-relaxed resize-y block text-[var(--colors-ink)] shadow-inner"
          style={{ width: '100%' }}
        />

        {/* High Intent CTA Button (Electric Green per spec) */}
        <button
          onClick={handleRunAiAnalysis}
          disabled={isAnalyzing}
          className="button-green w-full text-base font-extrabold cursor-pointer disabled:opacity-50 py-3.5 shadow-lg uppercase tracking-wide flex items-center justify-center gap-2"
        >
          {isAnalyzing ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>AI 파싱 엔진 작동 중...</span>
            </span>
          ) : (
            <>
              <span>⚡ AI 스마트 분석 실행</span>
            </>
          )}
        </button>
      </div>

      {/* 2. Dynamic Notifications */}
      {unrecognizedUsers.length > 0 && (
        <UnrecognizedUsersCard
          unrecognizedUsers={unrecognizedUsers}
          onSelectDepartment={onSelectUserDepartment}
          onDismiss={onDismissUnrecognizedUser}
        />
      )}

      {unregisteredItems.length > 0 && (
        <UnregisteredItemsCard
          unregisteredItems={unregisteredItems}
          existingMenuItems={menuItems}
          onAddToDb={onAddMenuItemToDb}
          onAddAsAlias={onAddAliasToDb}
          onDismiss={onDismissUnregisteredItem}
        />
      )}

      {/* 3. Analysis Results List (Discord User List Style) */}
      {userOrders.length > 0 && (
        <div className="pt-6 border-t border-[var(--border-primary)] space-y-4 w-full">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-display font-extrabold uppercase tracking-wider text-[var(--colors-muted)] flex items-center gap-1.5">
              <span>👥</span> 멤버별 파싱 결과 — {userOrders.length}명
            </h3>
            {isVerified && (
              <span className="badge-discord-green text-[11px] font-mono font-bold">
                AUTO-VERIFIED
              </span>
            )}
          </div>

          <div className="space-y-3 w-full">
            {userOrders.map(user => (
              <div
                key={user.id}
                className="p-4 rounded-[var(--rounded-sm)] discord-card-inner space-y-3 border border-[var(--colors-hairline)]"
              >
                <div className="flex items-center justify-between pb-2 border-b border-[var(--colors-hairline)]">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[var(--colors-green)] inline-block shadow-sm"></span>
                    <span className="font-extrabold text-sm text-[var(--colors-ink)]">{user.userName}</span>
                    <span className="badge-discord-blurple text-[10px]">{user.departmentName}</span>
                  </div>

                  <button
                    onClick={() => handleDeleteUserOrder(user.id)}
                    className="text-[var(--colors-muted)] hover:text-[var(--discord-red)] text-xs font-bold transition-colors cursor-pointer"
                    title="주문 삭제"
                  >
                    삭제 ✕
                  </button>
                </div>

                <div className="space-y-2 w-full">
                  {user.items.map(item => (
                    <div key={item.id} className="space-y-1">
                      <div className="flex items-center justify-between text-xs py-2 px-3 rounded-[var(--rounded-xs)] bg-[var(--colors-surface-indigo)] border border-[var(--border-primary)] w-full">
                        <div className="flex items-center gap-2">
                          <span className="text-[var(--colors-ink)] font-semibold">
                            {item.matchedMenuName || item.rawText}
                          </span>
                          {item.status === 'ambiguous' && (
                            <span className="badge-discord-yellow text-[10px]">
                              옵션 확인 필요
                            </span>
                          )}
                          {item.status === 'uncertain' && (
                            <span className="badge-discord-yellow text-[10px]">
                              메뉴 확인 필요
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEditItemQuantity(user.id, item.id, -1)}
                            className="w-6 h-6 rounded bg-[var(--colors-surface-onyx)] flex items-center justify-center font-bold text-white hover:bg-[var(--colors-primary)] text-xs cursor-pointer transition-colors"
                          >
                            -
                          </button>
                          <span className="font-bold text-[var(--colors-ink)] tabular-nums font-mono text-xs px-1">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => handleEditItemQuantity(user.id, item.id, +1)}
                            className="w-6 h-6 rounded bg-[var(--colors-surface-onyx)] flex items-center justify-center font-bold text-white hover:bg-[var(--colors-primary)] text-xs cursor-pointer transition-colors"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Ambiguous Candidates */}
                      {item.status === 'ambiguous' && item.candidates && item.candidates.length > 0 && (
                        <div className="p-3 rounded-[var(--rounded-xs)] bg-[var(--colors-surface-onyx)] border border-[var(--discord-yellow)] flex items-center justify-between text-xs gap-2">
                          <span className="text-[var(--discord-yellow)] font-bold text-xs">
                            &ldquo;{item.rawText}&rdquo; 옵션 선택:
                          </span>
                          <div className="flex items-center gap-1.5">
                            {item.candidates.map(cand => (
                              <button
                                key={cand.menuId}
                                onClick={() =>
                                  handleSelectAmbiguousCandidate(user.id, item.id, cand.menuName)
                                }
                                className="button-primary text-xs h-7 py-1 px-3"
                              >
                                {cand.menuName}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Uncertain Item Card */}
                      {item.status === 'uncertain' && (
                        <div className="p-3 rounded-[var(--rounded-xs)] bg-[var(--colors-surface-onyx)] border border-[var(--discord-yellow)] flex items-center justify-between text-xs gap-2">
                          <span className="text-[var(--discord-yellow)] font-bold text-xs">
                            &ldquo;{item.rawText}&rdquo; 메뉴인가요?
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleConfirmUncertainItem(user.id, item.id)}
                              className="button-green text-xs h-7 py-1 px-3"
                            >
                              메뉴 확정
                            </button>
                            <button
                              onClick={() => handleRejectUncertainItem(user.id, item.id)}
                              className="btn-discord-danger text-xs h-7 py-1 px-3"
                            >
                              제외
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
