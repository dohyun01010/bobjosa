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
    <div className="discord-card p-6 space-y-6 sticky top-6 w-full shadow-2xl">
      {/* 1. Full-width Copy Button */}
      {totalAggregated.length > 0 && (
        <button
          onClick={handleCopy}
          className={`w-full py-3.5 text-sm font-extrabold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all rounded-[var(--rounded-sm)] block shadow-lg ${
            copied ? 'button-green' : 'button-primary'
          }`}
        >
          {copied ? '✅ 복사 완료' : '📋 카톡 공유용 복사 하기'}
        </button>
      )}

      {/* 2. Discord Tabs */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex p-1 rounded-[var(--rounded-sm)] bg-[var(--colors-surface-onyx)] border border-[var(--colors-hairline)] text-xs w-full">
          <button
            onClick={() => setActiveTab('total')}
            className={`flex-1 py-2 rounded-[var(--rounded-xs)] font-bold transition-all cursor-pointer text-center text-xs ${
              activeTab === 'total'
                ? 'bg-[var(--colors-primary)] text-white shadow-md'
                : 'text-[var(--colors-muted)] hover:text-white'
            }`}
          >
            전체 메뉴 합계
          </button>
          <button
            onClick={() => setActiveTab('department')}
            className={`flex-1 py-2 rounded-[var(--rounded-xs)] font-bold transition-all cursor-pointer text-center text-xs ${
              activeTab === 'department'
                ? 'bg-[var(--colors-primary)] text-white shadow-md'
                : 'text-[var(--colors-muted)] hover:text-white'
            }`}
          >
            직종별 합계
          </button>
        </div>
      </div>

      {/* 3. Main Content Area */}
      {totalAggregated.length === 0 ? (
        <div className="py-14 text-center text-[var(--colors-muted)] space-y-2">
          <div className="text-3xl opacity-40">📊</div>
          <p className="text-xs font-display font-extrabold uppercase tracking-wider text-[var(--colors-muted)]">NO ORDERS PARSED</p>
          <p className="text-xs text-[var(--colors-muted)]">왼쪽 메시지 채널에 대화를 붙여넣으세요</p>
        </div>
      ) : activeTab === 'total' ? (
        /* Total Aggregation Tab */
        <div className="space-y-4">
          <div className="space-y-2.5">
            {totalAggregated.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3.5 rounded-[var(--rounded-sm)] discord-card-inner text-xs border border-[var(--colors-hairline)]"
              >
                <span className="font-bold text-[var(--colors-ink)] text-sm">{item.menuName}</span>
                <span className="badge-discord-blurple text-xs tabular-nums font-mono font-bold px-2.5 py-1">
                  {item.quantity}개
                </span>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-[var(--border-primary)] flex justify-between items-center text-xs font-display font-extrabold text-[var(--colors-ink)]">
            <span className="uppercase tracking-wider text-[var(--colors-muted)]">TOTAL QUANTITY</span>
            <span className="text-[var(--colors-green)] text-lg tabular-nums font-mono font-bold">{grandTotalCount}개</span>
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
                className="p-4 rounded-[var(--rounded-sm)] discord-card-inner space-y-2.5 text-xs border border-[var(--colors-hairline)]"
              >
                <div className="flex items-center justify-between border-b border-[var(--colors-hairline)] pb-2">
                  <span className="font-extrabold text-[var(--colors-ink)] text-sm">
                    {dept}
                  </span>
                  <span className="badge-discord-green text-[11px] tabular-nums font-mono font-bold">
                    {summary.totalCount}개
                  </span>
                </div>

                <div className="space-y-1.5 pt-1">
                  {summary.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs py-0.5">
                      <span className="text-[var(--text-secondary)] font-medium">{item.menuName}</span>
                      <span className="font-bold text-[var(--colors-ink)] tabular-nums font-mono">{item.quantity}개</span>
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
