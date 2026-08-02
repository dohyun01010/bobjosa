'use client';

import React, { useState, useMemo } from 'react';
import { UserOrder, AggregatedItem } from '../types';
import { groupOrdersByDepartment, aggregateDepartment, aggregateTotal, formatForKakao } from '../lib/aggregator';

interface OrderSummaryProps {
  userOrders: UserOrder[];
  restaurantName: string;
}

type TabType = 'total' | 'departments';

export default function OrderSummary({ userOrders, restaurantName }: OrderSummaryProps) {
  const [activeTab, setActiveTab] = useState<TabType>('total');
  const [copySuccess, setCopySuccess] = useState(false);

  const departmentGroups = useMemo(
    () => groupOrdersByDepartment(userOrders),
    [userOrders]
  );

  const totalItems = useMemo(() => aggregateTotal(userOrders), [userOrders]);
  const grandTotal = totalItems.reduce((sum, item) => sum + item.quantity, 0);

  const handleCopy = async () => {
    const text = formatForKakao(restaurantName, userOrders);
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const hasAnyOrders = totalItems.length > 0;

  return (
    <div className="glass-card overflow-hidden h-fit lg:sticky lg:top-6">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border-primary/50">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-text-primary flex items-center gap-2">
            <span>📊</span>
            주문 총 합산
          </h2>
          {grandTotal > 0 && (
            <span className="badge badge-success">총 {grandTotal}개</span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border-primary/50">
        <button
          className={`tab-button flex-1 ${activeTab === 'total' ? 'active' : ''}`}
          onClick={() => setActiveTab('total')}
        >
          전체 메뉴 합계
        </button>
        <button
          className={`tab-button flex-1 ${activeTab === 'departments' ? 'active' : ''}`}
          onClick={() => setActiveTab('departments')}
        >
          직종별 합계
        </button>
      </div>

      {/* Content */}
      <div className="p-5">
        {!hasAnyOrders ? (
          <div className="text-center py-8">
            <div className="text-3xl mb-3 opacity-50">📋</div>
            <p className="text-sm text-text-muted">
              주문 데이터가 없습니다
            </p>
            <p className="text-xs text-text-muted mt-1">
              왼쪽 입력창에 카카오톡 대화를 붙여넣고 분석하세요
            </p>
          </div>
        ) : (
          <>
            {activeTab === 'total' && (
              <div className="space-y-1.5">
                {totalItems.map((item, idx) => (
                  <SummaryRow key={idx} item={item} />
                ))}
                <div className="flex items-center justify-between pt-3 mt-3 border-t border-border-primary/50">
                  <span className="text-sm font-semibold text-text-primary">최종 수량 합계</span>
                  <span className="text-sm font-bold text-accent-primary">{grandTotal}개</span>
                </div>
              </div>
            )}

            {activeTab === 'departments' && (
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                {departmentGroups.map((group, idx) => {
                  if (group.userOrders.length === 0) return null;
                  const deptItems = aggregateDepartment(group.userOrders);

                  return (
                    <div key={idx}>
                      <div className="flex items-center justify-between mb-1.5">
                        <h4 className="text-xs font-bold text-text-secondary flex items-center gap-1">
                          <span>🏢</span> {group.departmentName}
                        </h4>
                        {group.totalCount > 0 && (
                          <span className="text-xs font-semibold text-text-accent">
                            {group.totalCount}개
                          </span>
                        )}
                      </div>

                      {/* People list under department */}
                      <div className="space-y-1 pl-2 mb-2">
                        {group.userOrders.map((u, uIdx) => (
                          <div key={uIdx} className="text-[11px] text-text-muted flex justify-between">
                            <span>- {u.userName}:</span>
                            <span className="text-text-primary">
                              {u.items
                                .filter(i => i.status === 'confirmed')
                                .map(i => `${i.matchedMenuName} ${i.quantity}`)
                                .join(', ')}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Aggregated totals for department */}
                      <div className="space-y-0.5 bg-bg-input/40 p-2 rounded-md border border-border-primary/30">
                        {deptItems.map((item, jdx) => (
                          <SummaryRow key={jdx} item={item} compact />
                        ))}
                      </div>

                      {idx < departmentGroups.length - 1 && (
                        <div className="border-b border-border-primary/30 mt-3" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Copy Button */}
      {hasAnyOrders && (
        <div className="px-5 pb-4">
          <button
            onClick={handleCopy}
            className={`w-full py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all duration-200 ${
              copySuccess
                ? 'bg-accent-success/15 text-accent-success border border-accent-success/30'
                : 'btn-primary'
            }`}
          >
            {copySuccess ? (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                복사 완료!
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                카카오톡용 텍스트 복사 (메뉴/수량)
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

function SummaryRow({ item, compact }: { item: AggregatedItem; compact?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${compact ? 'py-1 px-2' : 'py-1.5 px-3'} rounded-md hover:bg-bg-card-hover/50 transition-colors duration-150`}>
      <span className={`${compact ? 'text-xs' : 'text-sm'} text-text-primary`}>{item.menuName}</span>
      <span className={`${compact ? 'text-xs' : 'text-sm'} font-semibold text-text-accent tabular-nums`}>
        {item.quantity}
      </span>
    </div>
  );
}
