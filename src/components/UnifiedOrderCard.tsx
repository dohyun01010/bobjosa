'use client';

import React, { useState } from 'react';
import { MenuItem, UserOrder, ParsedOrderItem, UnregisteredItem, AiParseResult } from '../types';
import { parseChatWithAi } from '../lib/aiParser';
import { parseChatTextFallback } from '../lib/parser';
import { groupOrdersByDepartment } from '../lib/aggregator';
import { DepartmentName } from '../constants';
import UnregisteredItemsCard from './UnregisteredItemsCard';
import UnrecognizedUsersCard from './UnrecognizedUsersCard';

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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fillSampleText = () => {
    const sample = `오후 8:21 조예성 망고스파클링1 만두1 버팔로윙1 마마세트1
오후 8:22 김현수 콜팝 2 망고스파클링1 만두1 해시브라운1
오후 8:28 윤준영 메카 마마세트 1개 추가해줘
오후 8:28 김도현 네
오후 8:29 정지훈 마마세트 2
오후 8:30 강경완 망고 스파클링 1 너겟 1 치즈스틱 2 버팔로봉1 콜팝1 베이컨 단 1
오후 8:31 박승제 마마치킨버거 세트 1개 추가해줘
오후 8:32 테스트회원 마마세트 1`;
    onRawTextChange(sample);
  };

  const handleAnalyze = async () => {
    if (!restaurantSelected || !rawChatText.trim()) return;
    setIsAnalyzing(true);
    setErrorMessage(null);

    try {
      if (apiKey && apiKey.trim()) {
        const aiResult = await parseChatWithAi(rawChatText, menuItems, apiKey, memberMap);
        onAnalyzeComplete(aiResult);
      } else {
        const localUserOrders = parseChatTextFallback(rawChatText, menuItems, memberMap);
        onAnalyzeComplete({
          userOrders: localUserOrders,
          unregisteredItems: [],
        });
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || '분석 중 오류가 발생했습니다. 로컬 파서로 시도합니다.');
      try {
        const localUserOrders = parseChatTextFallback(rawChatText, menuItems, memberMap);
        onAnalyzeComplete({
          userOrders: localUserOrders,
          unregisteredItems: [],
        });
      } catch (localErr) {
        console.error(localErr);
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleItemUpdate = (
    userOrderId: string,
    itemId: string,
    menuId: string,
    menuName: string
  ) => {
    const updated = userOrders.map(u => {
      if (u.id !== userOrderId) return u;
      return {
        ...u,
        items: u.items.map(item =>
          item.id === itemId
            ? {
                ...item,
                matchedMenuId: menuId,
                matchedMenuName: menuName,
                status: 'confirmed' as const,
              }
            : item
        ),
      };
    });
    onUserOrderUpdate(updated);
  };

  const handleItemDelete = (userOrderId: string, itemId: string) => {
    const updated = userOrders
      .map(u => {
        if (u.id !== userOrderId) return u;
        return {
          ...u,
          items: u.items.filter(item => item.id !== itemId),
        };
      })
      .filter(u => u.items.length > 0);
    onUserOrderUpdate(updated);
  };

  const handleQuantityChange = (
    userOrderId: string,
    itemId: string,
    quantity: number
  ) => {
    const updated = userOrders.map(u => {
      if (u.id !== userOrderId) return u;
      return {
        ...u,
        items: u.items.map(item =>
          item.id === itemId ? { ...item, quantity } : item
        ),
      };
    });
    onUserOrderUpdate(updated);
  };

  const departmentGroups = groupOrdersByDepartment(userOrders);

  return (
    <div className="space-y-6">
      {/* Input Card */}
      <div className="glass-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-text-primary flex items-center gap-2">
            <span>💬</span> 카카오톡 주문 대화 전문 붙여넣기
          </h2>
          <button
            onClick={fillSampleText}
            className="text-xs text-text-accent hover:underline flex items-center gap-1"
          >
            <span>✨</span> 예시 데이터 채우기 (신규 인물 예시 포함)
          </button>
        </div>

        <textarea
          value={rawChatText}
          onChange={e => onRawTextChange(e.target.value)}
          placeholder={
            restaurantSelected
              ? `카카오톡 전체 대화 텍스트를 그대로 붙여넣으세요...\n\n[예시]\n오후 8:21 조예성 망고스파클링1 만두1\n오후 8:28 윤준영 메카 마마세트 1개 추가해줘\n오후 8:31 박승제 마마치킨버거 세트 1개`
              : '먼저 상단에서 식당을 선택하세요'
          }
          disabled={!restaurantSelected}
          className="textarea-order min-h-[160px] font-mono text-xs disabled:opacity-50"
        />

        {errorMessage && (
          <div className="text-xs p-2.5 rounded-lg bg-accent-warning/10 border border-accent-warning/30 text-accent-warning flex items-center justify-between">
            <span>⚠️ {errorMessage}</span>
            {!apiKey && (
              <button
                onClick={onOpenApiKeyModal}
                className="underline font-semibold ml-2 hover:text-text-primary"
              >
                API 키 설정하기
              </button>
            )}
          </div>
        )}

        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={handleAnalyze}
            disabled={!restaurantSelected || !rawChatText.trim() || isAnalyzing}
            className="btn-primary flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-40 disabled:transform-none disabled:shadow-none"
          >
            {isAnalyzing ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                AI 분석 및 직종별 분류 중...
              </>
            ) : (
              <>
                <span>🤖</span>
                {apiKey ? 'AI 분석 실행' : '주문 분석 실행 (로컬 파서)'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Unrecognized Users Selection Card */}
      <UnrecognizedUsersCard
        unrecognizedUsers={unrecognizedUsers}
        onSelectDepartment={onSelectUserDepartment}
        onDismiss={onDismissUnrecognizedUser}
      />

      {/* AI Inferred Unregistered Items Card */}
      <UnregisteredItemsCard
        unregisteredItems={unregisteredItems}
        existingMenuItems={menuItems}
        onAddToDb={onAddMenuItemToDb}
        onAddAsAlias={onAddAliasToDb}
        onDismiss={onDismissUnregisteredItem}
      />

      {/* Analysis Results Grouped by 5 Departments */}
      {userOrders.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
              직종별 주문 분류 (총 {userOrders.length}명)
            </h3>
          </div>

          {departmentGroups.map(group => {
            if (group.userOrders.length === 0) return null;

            return (
              <div key={group.departmentName} className="glass-card p-4 space-y-3">
                {/* Department Header */}
                <div className="flex items-center justify-between pb-2 border-b border-border-primary/60">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🏢</span>
                    <h4 className="text-sm font-bold text-text-primary">
                      {group.departmentName}
                    </h4>
                    <span className="badge badge-success text-[11px]">
                      {group.userOrders.length}명
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-accent-primary">
                    합계 {group.totalCount}개
                  </span>
                </div>

                {/* Orders under this department */}
                <div className="space-y-3 pl-1">
                  {group.userOrders.map(uOrder => (
                    <div
                      key={uOrder.id}
                      className="p-3 rounded-lg bg-bg-input/60 border border-border-primary/40 space-y-2"
                    >
                      <div className="flex items-center justify-between text-xs font-medium border-b border-border-primary/30 pb-1">
                        <span className="text-text-primary font-bold">👤 {uOrder.userName}</span>
                        {uOrder.time && <span className="text-text-muted">({uOrder.time})</span>}
                      </div>

                      <div className="space-y-1.5 pt-0.5">
                        {uOrder.items.map(item => (
                          <OrderItemRow
                            key={item.id}
                            item={item}
                            menuItems={menuItems}
                            onUpdate={(itemId, menuId, menuName) =>
                              handleItemUpdate(uOrder.id, itemId, menuId, menuName)
                            }
                            onDelete={itemId => handleItemDelete(uOrder.id, itemId)}
                            onQuantityChange={(itemId, qty) =>
                              handleQuantityChange(uOrder.id, itemId, qty)
                            }
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function OrderItemRow({
  item,
  menuItems,
  onUpdate,
  onDelete,
  onQuantityChange,
}: {
  item: ParsedOrderItem;
  menuItems: MenuItem[];
  onUpdate: (itemId: string, menuId: string, menuName: string) => void;
  onDelete: (itemId: string) => void;
  onQuantityChange: (itemId: string, quantity: number) => void;
}) {
  const statusConfig = {
    confirmed: {
      bg: 'bg-accent-success/5',
      border: 'border-accent-success/20',
      icon: '✅',
    },
    ambiguous: {
      bg: 'bg-accent-warning/5',
      border: 'border-accent-warning/20',
      icon: '⚠️',
    },
    error: {
      bg: 'bg-accent-error/5',
      border: 'border-accent-error/20',
      icon: '❌',
    },
  };

  const config = statusConfig[item.status];

  return (
    <div className={`flex items-start gap-2 px-2.5 py-1.5 rounded-md border ${config.bg} ${config.border} transition-colors duration-150 text-xs`}>
      <span className="mt-0.5 shrink-0">{config.icon}</span>

      <div className="flex-1 min-w-0">
        {item.status === 'confirmed' && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-text-primary">{item.matchedMenuName}</span>
            {item.rawText !== item.matchedMenuName && (
              <span className="text-[11px] text-text-muted">← &ldquo;{item.rawText}&rdquo;</span>
            )}
          </div>
        )}

        {item.status === 'ambiguous' && (
          <div>
            <p className="text-[11px] text-accent-warning font-medium mb-1">
              &ldquo;{item.rawText}&rdquo; — 확인 필요 (후보를 선택하세요)
            </p>
            <div className="flex flex-wrap gap-1">
              {item.candidates?.map(c => (
                <button
                  key={c.menuId}
                  onClick={() => onUpdate(item.id, c.menuId, c.menuName)}
                  className="text-[11px] px-2 py-0.5 rounded bg-bg-card border border-border-primary hover:border-accent-primary hover:text-accent-primary"
                >
                  {c.menuName}
                </button>
              ))}
            </div>
          </div>
        )}

        {item.status === 'error' && (
          <p className="text-[11px] text-accent-error">
            &ldquo;{item.rawText}&rdquo; — 미인식 (DB 등록 영역에서 추가 가능)
          </p>
        )}
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <input
          type="number"
          value={item.quantity}
          onChange={e => onQuantityChange(item.id, Math.max(1, parseInt(e.target.value) || 1))}
          className="w-11 h-6 text-center text-xs bg-bg-input border border-border-primary rounded text-text-primary focus:outline-none focus:border-accent-primary"
          min={1}
        />
        <button onClick={() => onDelete(item.id)} className="btn-icon text-text-muted hover:text-accent-error">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
