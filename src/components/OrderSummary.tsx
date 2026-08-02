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
    <div className="cursor-card p-6 space-y-6 sticky top-6 w-full">
      {/* 1. Full-width Prominent Cursor Orange / Ink Copy Button */}
      {totalAggregated.length > 0 && (
        <button
          onClick={handleCopy}
          className={`w-full py-3.5 text-sm font-medium flex items-center justify-center gap-2 cursor-pointer transition-all rounded-lg block ${
            copied ? 'bg-[var(--semantic-success)] text-white' : 'btn-cursor-primary'
          }`}
        >
          {copied ? '복사 완료' : '복사 하기'}
        </button>
      )}

      {/* 2. Tabs */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex p-1 rounded-lg bg-[var(--canvas-soft)] border border-[var(--hairline)] text-xs w-full">
          <button
            onClick={() => setActiveTab('total')}
            className={`flex-1 py-2 rounded-md font-medium transition-all cursor-pointer text-center text-xs ${
              activeTab === 'total'
                ? 'bg-[var(--surface-card)] text-[var(--ink)] font-semibold border border-[var(--hairline)]'
                : 'text-[var(--muted)] hover:text-[var(--ink)]'
            }`}
          >
            전체 메뉴 합계
          </button>
          <button
            onClick={() => setActiveTab('department')}
            className={`flex-1 py-2 rounded-md font-medium transition-all cursor-pointer text-center text-xs ${
              activeTab === 'department'
                ? 'bg-[var(--surface-card)] text-[var(--ink)] font-semibold border border-[var(--hairline)]'
                : 'text-[var(--muted)] hover:text-[var(--ink)]'
            }`}
          >
            직종별 합계
          </button>
        </div>
      </div>

      {/* 3. Main Content Area */}
      {totalAggregated.length === 0 ? (
        <div className="py-12 text-center text-[var(--muted)] space-y-1">
          <p className="text-xs font-mono uppercase tracking-wider">NO ORDER DATA</p>
          <p className="text-xs">왼쪽 입력창에 대화를 복사하고 분석하세요</p>
        </div>
      ) : activeTab === 'total' ? (
        /* Total Aggregation Tab */
        <div className="space-y-4">
          <div className="space-y-2">
            {totalAggregated.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-lg bg-[var(--canvas-soft)] border border-[var(--hairline-soft)] text-xs"
              >
                <span className="font-mono text-[var(--ink)]">{item.menuName}</span>
                <span className="pill-done text-xs tabular-nums font-mono">
                  {item.quantity}개
                </span>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-[var(--hairline)] flex justify-between items-center text-xs font-bold text-[var(--ink)]">
            <span className="uppercase font-mono tracking-wider">TOTAL COUNT</span>
            <span className="text-[var(--primary)] text-sm tabular-nums font-mono">{grandTotalCount}개</span>
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
                className="p-4 rounded-lg bg-[var(--canvas-soft)] border border-[var(--hairline-soft)] space-y-2 text-xs"
              >
                <div className="flex items-center justify-between border-b border-[var(--hairline-soft)] pb-2">
                  <span className="font-semibold text-[var(--ink)]">
                    {dept}
                  </span>
                  <span className="pill-grep text-[10px] tabular-nums font-mono">
                    {summary.totalCount}개
                  </span>
                </div>

                <div className="space-y-1 pt-1">
                  {summary.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs">
                      <span className="text-[var(--body)] font-mono">{item.menuName}</span>
                      <span className="font-bold text-[var(--ink)] tabular-nums font-mono">{item.quantity}개</span>
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
