'use client';

import React, { useState } from 'react';
import { UserOrder } from '../types';
import { aggregateTotal, aggregateDepartmentByName, formatForKakao } from '../lib/aggregator';
import { DEPARTMENTS, DepartmentName } from '../constants';

interface OrderSummaryProps {
  userOrders: UserOrder[];
  restaurantName: string;
  rawChatText?: string;
}

export default function OrderSummary({
  userOrders,
  restaurantName,
}: OrderSummaryProps) {
  const [activeTab, setActiveTab] = useState<'total' | 'department'>('total');
  const [copied, setCopied] = useState(false);

  const totalAggregated = aggregateTotal(userOrders);
  const grandTotalCount = totalAggregated.reduce((sum, item) => sum + item.quantity, 0);

  const handleCopy = async () => {
    const kakaoText = formatForKakao(restaurantName, userOrders);
    try {
      await navigator.clipboard.writeText(kakaoText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  return (
    <div className="discord-card p-6 space-y-6 sticky top-6 w-full">
      {/* 1. Full-width Blurple / Green Copy Button */}
      {totalAggregated.length > 0 && (
        <button
          onClick={handleCopy}
          className={`w-full py-3.5 text-sm font-extrabold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all rounded block ${
            copied ? 'btn-discord-green' : 'btn-discord-blurple'
          }`}
        >
          {copied ? '✅ 복사 완료' : '📋 카톡 공유용 복사 하기'}
        </button>
      )}

      {/* 2. Discord Tabs */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex p-1 rounded bg-[#1e1f22] border border-[#111214] text-xs w-full">
          <button
            onClick={() => setActiveTab('total')}
            className={`flex-1 py-2 rounded font-bold transition-all cursor-pointer text-center text-xs ${
              activeTab === 'total'
                ? 'bg-[#313338] text-[var(--text-primary)] shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            전체 메뉴 합계
          </button>
          <button
            onClick={() => setActiveTab('department')}
            className={`flex-1 py-2 rounded font-bold transition-all cursor-pointer text-center text-xs ${
              activeTab === 'department'
                ? 'bg-[#313338] text-[var(--text-primary)] shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            직종별 합계
          </button>
        </div>
      </div>

      {/* 3. Main Content Area */}
      {totalAggregated.length === 0 ? (
        <div className="py-12 text-center text-[var(--text-muted)] space-y-1">
          <p className="text-xs font-mono font-bold uppercase tracking-wider">NO ORDERS PARSED</p>
          <p className="text-xs">왼쪽 메시지 입력창에 대화를 붙여넣으세요</p>
        </div>
      ) : activeTab === 'total' ? (
        /* Total Aggregation Tab */
        <div className="space-y-4">
          <div className="space-y-2">
            {totalAggregated.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded discord-card-inner text-xs"
              >
                <span className="font-bold text-[var(--text-primary)]">{item.menuName}</span>
                <span className="badge-discord-blurple text-xs tabular-nums font-mono font-bold">
                  {item.quantity}개
                </span>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-[var(--border-primary)] flex justify-between items-center text-xs font-extrabold text-[var(--text-primary)]">
            <span className="uppercase font-mono tracking-wider">TOTAL QUANTITY</span>
            <span className="text-[var(--discord-green)] text-base tabular-nums font-mono font-bold">{grandTotalCount}개</span>
          </div>
        </div>
      ) : (
        /* Department Aggregation Tab */
        <div className="space-y-3">
          {DEPARTMENTS.map(dept => {
            const summary = aggregateDepartmentByName(dept as DepartmentName, userOrders);
            if (summary.items.length === 0) return null;

            return (
              <div
                key={dept}
                className="p-4 rounded discord-card-inner space-y-2 text-xs"
              >
                <div className="flex items-center justify-between border-b border-[var(--border-primary)] pb-2">
                  <span className="font-bold text-[var(--text-primary)]">
                    {dept}
                  </span>
                  <span className="badge-discord-green text-[10px] tabular-nums font-mono">
                    {summary.totalCount}개
                  </span>
                </div>

                <div className="space-y-1.5 pt-1">
                  {summary.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs">
                      <span className="text-[var(--text-secondary)] font-mono">{item.menuName}</span>
                      <span className="font-bold text-[var(--text-primary)] tabular-nums font-mono">{item.quantity}개</span>
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
