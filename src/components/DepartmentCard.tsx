'use client';

import React, { useState } from 'react';
import { MenuItem, ParsedOrderItem } from '../types';
import { parseOrderText } from '../lib/parser';
import { matchAllEntries } from '../lib/matcher';

interface DepartmentCardProps {
  departmentName: string;
  rawText: string;
  items: ParsedOrderItem[];
  menuItems: MenuItem[];
  restaurantSelected: boolean;
  onRawTextChange: (text: string) => void;
  onAnalyze: (items: ParsedOrderItem[]) => void;
  onItemUpdate: (itemId: string, menuId: string, menuName: string) => void;
  onItemDelete: (itemId: string) => void;
  onItemQuantityChange: (itemId: string, quantity: number) => void;
}

export default function DepartmentCard({
  departmentName,
  rawText,
  items,
  menuItems,
  restaurantSelected,
  onRawTextChange,
  onAnalyze,
  onItemUpdate,
  onItemDelete,
  onItemQuantityChange,
}: DepartmentCardProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const confirmedCount = items.filter(i => i.status === 'confirmed').length;
  const ambiguousCount = items.filter(i => i.status === 'ambiguous').length;
  const errorCount = items.filter(i => i.status === 'error').length;
  const totalQuantity = items
    .filter(i => i.status === 'confirmed')
    .reduce((sum, i) => sum + i.quantity, 0);

  const handleAnalyze = () => {
    if (!restaurantSelected || !rawText.trim()) return;
    const parsed = parseOrderText(rawText);
    const matched = matchAllEntries(parsed, menuItems);
    onAnalyze(matched);
  };

  return (
    <div className="glass-card overflow-hidden transition-all duration-300">
      {/* Card Header */}
      <div
        className="flex items-center justify-between px-5 py-3 cursor-pointer hover:bg-bg-card-hover/50 transition-colors duration-150"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-accent-primary" />
          <h3 className="text-sm font-semibold text-text-primary">{departmentName}</h3>
          {items.length > 0 && (
            <div className="flex items-center gap-1.5 ml-1">
              {confirmedCount > 0 && (
                <span className="badge badge-success">{confirmedCount}건</span>
              )}
              {ambiguousCount > 0 && (
                <span className="badge badge-warning">{ambiguousCount}건</span>
              )}
              {errorCount > 0 && (
                <span className="badge badge-error">{errorCount}건</span>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {totalQuantity > 0 && (
            <span className="text-xs text-text-muted">총 {totalQuantity}개</span>
          )}
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={`text-text-muted transition-transform duration-200 ${isCollapsed ? '' : 'rotate-180'}`}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
      </div>

      {/* Card Body */}
      {!isCollapsed && (
        <div className="px-5 pb-4 space-y-3 border-t border-border-primary/50">
          {/* Textarea & Analyze Button */}
          <div className="pt-3 space-y-2">
            <textarea
              value={rawText}
              onChange={e => onRawTextChange(e.target.value)}
              placeholder={
                restaurantSelected
                  ? '카카오톡 주문 메시지를 붙여넣으세요...\n예: 고국 2\n    국밥 3\n    얼큰 1'
                  : '먼저 상단에서 식당을 선택하세요'
              }
              disabled={!restaurantSelected}
              className="textarea-order disabled:opacity-50 disabled:cursor-not-allowed"
              rows={4}
            />
            <button
              onClick={handleAnalyze}
              disabled={!restaurantSelected || !rawText.trim()}
              className="btn-primary w-full disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none flex items-center justify-center gap-2"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
              </svg>
              분석하기
            </button>
          </div>

          {/* Parsed Items */}
          {items.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs text-text-muted font-medium pt-1">분석 결과</p>
              {items.map(item => (
                <OrderItemRow
                  key={item.id}
                  item={item}
                  menuItems={menuItems}
                  onUpdate={onItemUpdate}
                  onDelete={onItemDelete}
                  onQuantityChange={onItemQuantityChange}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* Individual parsed order item row */
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
    <div className={`flex items-start gap-2 px-3 py-2 rounded-lg border ${config.bg} ${config.border} transition-colors duration-150`}>
      <span className="text-sm mt-0.5 shrink-0">{config.icon}</span>

      <div className="flex-1 min-w-0">
        {item.status === 'confirmed' && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-text-primary">{item.matchedMenuName}</span>
            {item.rawText !== item.matchedMenuName && (
              <span className="text-xs text-text-muted">← &ldquo;{item.rawText}&rdquo;</span>
            )}
          </div>
        )}

        {item.status === 'ambiguous' && (
          <div>
            <p className="text-sm text-accent-warning font-medium mb-1.5">
              &ldquo;{item.rawText}&rdquo; — 확인이 필요합니다
            </p>
            <div className="flex flex-wrap gap-1.5">
              {item.candidates?.map(c => (
                <button
                  key={c.menuId}
                  onClick={() => onUpdate(item.id, c.menuId, c.menuName)}
                  className="text-xs px-2.5 py-1 rounded-md bg-bg-card-hover border border-border-primary hover:border-accent-primary hover:text-accent-primary transition-colors duration-150"
                >
                  {c.menuName}
                  <span className="text-text-muted ml-1">({Math.round(c.similarity * 100)}%)</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {item.status === 'error' && (
          <p className="text-sm text-accent-error">
            &ldquo;{item.rawText}&rdquo; — 메뉴를 찾을 수 없습니다
          </p>
        )}
      </div>

      {/* Quantity & Actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        <input
          type="number"
          value={item.quantity}
          onChange={e => onQuantityChange(item.id, Math.max(1, parseInt(e.target.value) || 1))}
          className="w-12 h-7 text-center text-sm bg-bg-input border border-border-primary rounded-md text-text-primary focus:outline-none focus:border-accent-primary"
          min={1}
        />
        <button onClick={() => onDelete(item.id)} className="btn-icon text-text-muted hover:text-accent-error">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
