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

  const handleRunAiAnalysis = async () => {
    if (!rawChatText.trim()) {
      alert('카카오톡 주문 대화 내용을 입력해 주세요.');
      return;
    }

    setIsAnalyzing(true);
    try {
      const result = await parseChatWithAi(
        rawChatText,
        menuItems,
        apiKey,
        memberMap
      );
      onAnalyzeComplete(result);
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
  };

  const handleDeleteUserOrder = (userId: string) => {
    const updated = userOrders.filter(u => u.id !== userId);
    onUserOrderUpdate(updated);
  };

  return (
    <div className="glass-card p-6 space-y-6 w-full">
      {/* 1. Input Area */}
      <div className="space-y-3 w-full">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <label className="text-sm font-bold text-text-primary flex items-center gap-2">
            <span>💬</span> 카카오톡 주문 대화 전문 붙여넣기
          </label>
        </div>

        <textarea
          value={rawChatText}
          onChange={e => onRawTextChange(e.target.value)}
          placeholder="카카오톡 대화방의 주문 메시지 전체를 복사해서 붙여넣으세요...&#10;예시:&#10;오전 9:23 조예성 육짬뽕밥1(포장) 짜장면1&#10;오전 9:31 조윤성 짜장면 1"
          className="input-field w-full min-h-[200px] p-4 text-sm font-mono leading-relaxed resize-y block"
          style={{ width: '100%' }}
        />

        <button
          onClick={handleRunAiAnalysis}
          disabled={isAnalyzing}
          className="btn-primary w-full py-3.5 text-base flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
        >
          {isAnalyzing ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              AI 파싱 분석 진행 중...
            </>
          ) : (
            <>
              <span>🤖</span> AI 분석 실행
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

      {/* 3. Analysis Results List */}
      {userOrders.length > 0 && (
        <div className="pt-4 border-t border-border-primary space-y-4 w-full">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
              <span>👥</span> 사람별 주문 파싱 결과 ({userOrders.length}명)
            </h3>
            <span className="text-xs text-text-muted">직종 자동 배정 완료</span>
          </div>

          <div className="space-y-3 w-full">
            {userOrders.map(user => (
              <div
                key={user.id}
                className="p-4 rounded-xl bg-bg-input/60 border border-border-primary hover:border-border-focus transition-all w-full"
              >
                <div className="flex items-center justify-between mb-2 pb-2 border-b border-border-primary/50">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-text-primary text-sm">{user.userName}</span>
                    <span className="badge badge-success text-[11px]">{user.departmentName}</span>
                  </div>

                  <button
                    onClick={() => handleDeleteUserOrder(user.id)}
                    className="text-text-muted hover:text-accent-error text-xs p-1 rounded hover:bg-accent-error/10 cursor-pointer"
                    title="주문 삭제"
                  >
                    삭제 ✕
                  </button>
                </div>

                <div className="space-y-1.5 w-full">
                  {user.items.map(item => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between text-xs py-1 px-2.5 rounded bg-bg-card border border-border-primary/40 w-full"
                    >
                      <span className="text-text-primary font-medium">{item.matchedMenuName || item.rawText}</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditItemQuantity(user.id, item.id, -1)}
                          className="w-5 h-5 rounded bg-bg-input border border-border-primary flex items-center justify-center font-bold text-text-secondary hover:bg-border-primary cursor-pointer"
                        >
                          -
                        </button>
                        <span className="font-bold text-accent-primary tabular-nums min-w-[16px] text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => handleEditItemQuantity(user.id, item.id, +1)}
                          className="w-5 h-5 rounded bg-bg-input border border-border-primary flex items-center justify-center font-bold text-text-secondary hover:bg-border-primary cursor-pointer"
                        >
                          +
                        </button>
                      </div>
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
