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
    <div className="glass-card p-6 space-y-5 sticky top-6 w-full">
      {/* 1. Full-width Prominent "복사 하기" Button */}
      {totalAggregated.length > 0 && (
        <button
          onClick={handleCopy}
          className={`btn-primary w-full py-3 text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all rounded-xl block ${
            copied ? 'bg-emerald-600' : ''
          }`}
        >
          {copied ? '복사 완료' : '복사 하기'}
        </button>
      )}

      {/* 2. Tabs */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex p-1 rounded-xl bg-bg-input/60 border border-border-primary/40 text-xs w-full">
          <button
            onClick={() => setActiveTab('total')}
            className={`flex-1 py-1.5 rounded-lg font-medium transition-all cursor-pointer text-center text-xs ${
              activeTab === 'total'
                ? 'bg-bg-card text-text-primary shadow-sm font-bold'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            전체 메뉴 합계
          </button>
          <button
            onClick={() => setActiveTab('department')}
            className={`flex-1 py-1.5 rounded-lg font-medium transition-all cursor-pointer text-center text-xs ${
              activeTab === 'department'
                ? 'bg-bg-card text-text-primary shadow-sm font-bold'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            직종별 합계
          </button>
        </div>
      </div>

      {/* 3. Main Content Area */}
      {totalAggregated.length === 0 ? (
        <div className="py-12 text-center text-text-muted space-y-1">
          <p className="text-xs font-medium">주문 데이터가 없습니다</p>
          <p className="text-[11px]">왼쪽 입력창에 대화를 복사하고 분석하세요</p>
        </div>
      ) : activeTab === 'total' ? (
        /* Total Aggregation Tab */
        <div className="space-y-3">
          <div className="space-y-1.5">
            {totalAggregated.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-xl bg-bg-card border border-border-primary/50 text-xs"
              >
                <span className="font-semibold text-text-primary">{item.menuName}</span>
                <span className="badge badge-primary text-xs px-2.5 py-0.5 tabular-nums font-bold">
                  {item.quantity}개
                </span>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-border-primary/50 flex justify-between items-center text-xs font-bold text-text-primary">
            <span>총 수량</span>
            <span className="text-accent-primary text-sm tabular-nums">{grandTotalCount}개</span>
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
                className="p-3.5 rounded-xl bg-bg-card border border-border-primary/50 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between border-b border-border-primary/40 pb-2">
                  <span className="font-bold text-text-primary">
                    {dept}
                  </span>
                  <span className="badge badge-success text-[10px] font-bold tabular-nums">
                    {summary.totalCount}개
                  </span>
                </div>

                <div className="space-y-1 pt-1">
                  {summary.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-[11px]">
                      <span className="text-text-secondary">{item.menuName}</span>
                      <span className="font-bold text-text-primary tabular-nums">{item.quantity}개</span>
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
