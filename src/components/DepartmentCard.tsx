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
  onTextChange: (text: string) => void;
  onItemsChange: (items: ParsedOrderItem[]) => void;
}

export default function DepartmentCard({
  departmentName,
  rawText,
  items,
  menuItems,
  onTextChange,
  onItemsChange,
}: DepartmentCardProps) {
  const [isEditingText, setIsEditingText] = useState(false);

  const handleParseText = () => {
    const rawEntries = parseOrderText(rawText);
    const matched = matchAllEntries(rawEntries, menuItems);
    onItemsChange(matched);
    setIsEditingText(false);
  };

  const handleFixCandidate = (itemId: string, chosenMenuId: string, chosenMenuName: string) => {
    const updated = items.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          matchedMenuId: chosenMenuId,
          matchedMenuName: chosenMenuName,
          status: 'confirmed' as const,
        };
      }
      return item;
    });
    onItemsChange(updated);
  };

  const handleQuantityChange = (itemId: string, newQty: number) => {
    if (newQty <= 0) return;
    const updated = items.map(item => {
      if (item.id === itemId) {
        return { ...item, quantity: newQty };
      }
      return item;
    });
    onItemsChange(updated);
  };

  const handleDeleteItem = (itemId: string) => {
    const updated = items.filter(item => item.id !== itemId);
    onItemsChange(updated);
  };

  const confirmedCount = items
    .filter(i => i.status === 'confirmed')
    .reduce((sum, i) => sum + i.quantity, 0);

  const hasIssues = items.some(i => i.status === 'ambiguous' || i.status === 'error' || i.status === 'uncertain');

  return (
    <div className="glass-card p-5 space-y-4">
      {/* Card Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-text-primary text-base">{departmentName}</h3>
          <span className="badge badge-primary text-xs">
            {confirmedCount}개 확정
          </span>
          {hasIssues && (
            <span className="badge badge-warning text-xs">
              확인 필요
            </span>
          )}
        </div>

        <button
          onClick={() => setIsEditingText(!isEditingText)}
          className="text-xs text-accent-primary hover:underline cursor-pointer flex items-center gap-1 font-medium"
        >
          {isEditingText ? '접기 ✕' : '✏️ 텍스트 수정'}
        </button>
      </div>

      {/* Editable Textarea Area */}
      {isEditingText && (
        <div className="space-y-2 animate-fade-in">
          <textarea
            value={rawText}
            onChange={e => onTextChange(e.target.value)}
            placeholder={`예: 고국 2, 국밥 2\n(직종 주문 텍스트를 입력하세요)`}
            className="input-field w-full h-24 p-3 text-xs font-mono"
          />
          <div className="flex justify-end">
            <button
              onClick={handleParseText}
              className="btn-primary text-xs py-1.5 px-4"
            >
              다시 파싱하기
            </button>
          </div>
        </div>
      )}

      {/* Parsed Items List */}
      <div className="space-y-2">
        {items.length === 0 ? (
          <p className="text-xs text-text-muted py-2">
            주문 내역이 없습니다.
          </p>
        ) : (
          items.map(item => (
            <ItemRow
              key={item.id}
              item={item}
              menuItems={menuItems}
              onFixCandidate={handleFixCandidate}
              onQuantityChange={handleQuantityChange}
              onDeleteItem={handleDeleteItem}
            />
          ))
        )}
      </div>
    </div>
  );
}

function ItemRow({
  item,
  menuItems,
  onFixCandidate,
  onQuantityChange,
  onDeleteItem,
}: {
  item: ParsedOrderItem;
  menuItems: MenuItem[];
  onFixCandidate: (itemId: string, chosenMenuId: string, chosenMenuName: string) => void;
  onQuantityChange: (itemId: string, newQty: number) => void;
  onDeleteItem: (itemId: string) => void;
}) {
  const [showDropdown, setShowDropdown] = useState(false);

  const statusConfig = {
    confirmed: {
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/30',
      icon: '✅',
    },
    ambiguous: {
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30',
      icon: '❓',
    },
    uncertain: {
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/30',
      icon: '❓',
    },
    error: {
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/30',
      icon: '❌',
    },
  };

  const config = statusConfig[item.status] || statusConfig.confirmed;

  return (
    <div className={`flex flex-col gap-2 p-3 rounded-lg border ${config.bg} ${config.border} text-xs transition-all`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1">
          <span>{config.icon}</span>
          <span className="font-mono text-text-muted text-[11px]">&ldquo;{item.rawText}&rdquo;</span>
          <span className="text-text-muted">➔</span>

          {item.status === 'confirmed' ? (
            <span className="font-bold text-text-primary">{item.matchedMenuName}</span>
          ) : (
            <span className="text-accent-warning font-semibold">
              {item.status === 'ambiguous' ? '메뉴 선택 필요' : '미인식 메뉴'}
            </span>
          )}
        </div>

        {/* Quantity control & delete */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-bg-card rounded border border-border-primary p-0.5">
            <button
              onClick={() => onQuantityChange(item.id, item.quantity - 1)}
              className="w-5 h-5 flex items-center justify-center rounded hover:bg-bg-input text-text-secondary cursor-pointer"
            >
              -
            </button>
            <span className="font-bold px-1 min-w-[20px] text-center tabular-nums text-text-primary">
              {item.quantity}
            </span>
            <button
              onClick={() => onQuantityChange(item.id, item.quantity + 1)}
              className="w-5 h-5 flex items-center justify-center rounded hover:bg-bg-input text-text-secondary cursor-pointer"
            >
              +
            </button>
          </div>

          <button
            onClick={() => onDeleteItem(item.id)}
            className="text-text-muted hover:text-accent-error p-1 rounded cursor-pointer"
            title="삭제"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Ambiguous candidates list */}
      {item.status === 'ambiguous' && item.candidates && item.candidates.length > 0 && (
        <div className="pl-6 space-y-1 pt-1 border-t border-amber-500/20">
          <p className="text-[11px] text-accent-warning font-medium">추천 메뉴 후보 중 선택하세요:</p>
          <div className="flex flex-wrap gap-1.5">
            {item.candidates.map(cand => (
              <button
                key={cand.menuId}
                onClick={() => onFixCandidate(item.id, cand.menuId, cand.menuName)}
                className="px-2 py-1 rounded bg-bg-card border border-amber-500/40 text-text-primary hover:bg-accent-primary hover:text-white cursor-pointer transition-all text-[11px]"
              >
                {cand.menuName} ({Math.round(cand.similarity * 100)}%)
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Error - Manual dropdown match */}
      {item.status === 'error' && (
        <div className="pl-6 pt-1 border-t border-rose-500/20">
          {!showDropdown ? (
            <button
              onClick={() => setShowDropdown(true)}
              className="text-[11px] text-accent-primary hover:underline cursor-pointer"
            >
              수동으로 메뉴 지정하기...
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <select
                onChange={e => {
                  const m = menuItems.find(x => x.id === e.target.value);
                  if (m) onFixCandidate(item.id, m.id, m.name);
                }}
                className="input-field text-xs py-1 px-2"
                defaultValue=""
              >
                <option value="" disabled>
                  메뉴 선택...
                </option>
                {menuItems.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setShowDropdown(false)}
                className="text-text-muted hover:text-text-primary text-[11px]"
              >
                취소
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
