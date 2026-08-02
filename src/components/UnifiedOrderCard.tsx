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
    <div className="cursor-card p-6 space-y-6 w-full">
      {/* 1. Editor Input Pane */}
      <div className="space-y-3 w-full">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
            KAKAOTALK ORDER INPUT
          </label>
        </div>

        <div className="cursor-pane p-1">
          <textarea
            value={rawChatText}
            onChange={e => onRawTextChange(e.target.value)}
            placeholder="카카오톡 대화방의 주문 메시지 전체를 복사해서 붙여넣으세요..."
            className="w-full min-h-[360px] p-4 text-xs font-mono bg-transparent border-none focus:outline-none resize-y block text-[var(--ink)] leading-relaxed"
            style={{ width: '100%' }}
          />
        </div>

        <button
          onClick={handleRunAiAnalysis}
          disabled={isAnalyzing}
          className="btn-cursor-primary w-full text-sm font-medium cursor-pointer disabled:opacity-50"
        >
          {isAnalyzing ? (
            <span className="flex items-center gap-2">
              <span className="pill-thinking animate-pulse">PARSING...</span>
              <span>AI 분석 실행 중</span>
            </span>
          ) : (
            'AI 분석 실행'
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

      {/* 3. Analysis Results List */}
      {userOrders.length > 0 && (
        <div className="pt-6 border-t border-[var(--hairline)] space-y-4 w-full">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
              ORDERS PARSED ({userOrders.length} MEMBERS)
            </h3>
            {isVerified && (
              <span className="pill-done text-[10px]">
                VERIFIED
              </span>
            )}
          </div>

          <div className="space-y-3 w-full">
            {userOrders.map(user => (
              <div
                key={user.id}
                className="p-4 rounded-xl cursor-pane space-y-3"
              >
                <div className="flex items-center justify-between pb-2 border-b border-[var(--hairline-soft)]">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-[var(--ink)]">{user.userName}</span>
                    <span className="pill-grep text-[10px]">{user.departmentName}</span>
                  </div>

                  <button
                    onClick={() => handleDeleteUserOrder(user.id)}
                    className="text-[var(--muted)] hover:text-[var(--semantic-error)] text-xs transition-colors cursor-pointer font-mono"
                    title="주문 삭제"
                  >
                    delete
                  </button>
                </div>

                <div className="space-y-2 w-full">
                  {user.items.map(item => (
                    <div key={item.id} className="space-y-1">
                      <div className="flex items-center justify-between text-xs py-2 px-3 rounded-lg bg-[var(--surface-card)] border border-[var(--hairline)] w-full">
                        <div className="flex items-center gap-2">
                          <span className="text-[var(--ink)] font-mono text-xs">
                            {item.matchedMenuName || item.rawText}
                          </span>
                          {item.status === 'ambiguous' && (
                            <span className="pill-thinking text-[10px]">
                              OPTION NEEDED
                            </span>
                          )}
                          {item.status === 'uncertain' && (
                            <span className="pill-read text-[10px]">
                              CHECK NEEDED
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEditItemQuantity(user.id, item.id, -1)}
                            className="w-5 h-5 rounded bg-[var(--canvas)] flex items-center justify-center font-bold text-[var(--ink)] border border-[var(--hairline)] hover:bg-[var(--surface-strong)] text-xs cursor-pointer"
                          >
                            -
                          </button>
                          <span className="font-bold text-[var(--ink)] tabular-nums font-mono text-xs">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => handleEditItemQuantity(user.id, item.id, +1)}
                            className="w-5 h-5 rounded bg-[var(--canvas)] flex items-center justify-center font-bold text-[var(--ink)] border border-[var(--hairline)] hover:bg-[var(--surface-strong)] text-xs cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Ambiguous Candidates (Burger Single vs Set) */}
                      {item.status === 'ambiguous' && item.candidates && item.candidates.length > 0 && (
                        <div className="p-3 rounded-lg bg-[var(--canvas-soft)] border border-[var(--timeline-thinking)] flex items-center justify-between text-xs gap-2">
                          <span className="text-[var(--ink)] font-medium text-xs">
                            &ldquo;{item.rawText}&rdquo; 옵션 선택:
                          </span>
                          <div className="flex items-center gap-1.5">
                            {item.candidates.map(cand => (
                              <button
                                key={cand.menuId}
                                onClick={() =>
                                  handleSelectAmbiguousCandidate(user.id, item.id, cand.menuName)
                                }
                                className="btn-cursor-ink text-xs h-7 py-1 px-3"
                              >
                                {cand.menuName}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Uncertain Item Card */}
                      {item.status === 'uncertain' && (
                        <div className="p-3 rounded-lg bg-[var(--canvas-soft)] border border-[var(--timeline-read)] flex items-center justify-between text-xs gap-2">
                          <span className="text-[var(--ink)] font-medium text-xs">
                            &ldquo;{item.rawText}&rdquo; 메뉴인가요?
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleConfirmUncertainItem(user.id, item.id)}
                              className="btn-cursor-primary text-xs h-7 py-1 px-3"
                            >
                              메뉴 확정
                            </button>
                            <button
                              onClick={() => handleRejectUncertainItem(user.id, item.id)}
                              className="btn-cursor-secondary text-xs h-7 py-1 px-3"
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
