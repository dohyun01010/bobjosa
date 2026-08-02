'use client';

import React from 'react';
import { UnregisteredItem, MenuItem } from '../types';

interface UnregisteredItemsCardProps {
  unregisteredItems: UnregisteredItem[];
  existingMenuItems: MenuItem[];
  onAddToDb: (suggestedName: string, aliases: string[]) => void;
  onAddAsAlias: (menuId: string, alias: string) => void;
  onDismiss: (id: string) => void;
}

export default function UnregisteredItemsCard({
  unregisteredItems,
  existingMenuItems,
  onAddToDb,
  onAddAsAlias,
  onDismiss,
}: UnregisteredItemsCardProps) {
  if (unregisteredItems.length === 0) return null;

  return (
    <div className="p-4 rounded-xl bg-[var(--canvas-soft)] border border-[var(--timeline-read)] space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--ink)] flex items-center gap-2">
          <span className="pill-read">NEW MENUS</span>
          <span>미등록 신규 메뉴 제안</span>
        </h4>
      </div>

      <div className="space-y-3">
        {unregisteredItems.map(item => (
          <div
            key={item.id}
            className="p-3 rounded-lg bg-[var(--surface-card)] border border-[var(--hairline)] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
          >
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[var(--ink)] text-xs">&ldquo;{item.rawText}&rdquo;</span>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => onAddToDb(item.suggestedName, item.suggestedAliases)}
                className="btn-cursor-primary text-[11px] h-7 py-1 px-2.5"
              >
                + 신규 메뉴 추가
              </button>

              {existingMenuItems.length > 0 && (
                <select
                  onChange={e => {
                    if (e.target.value) {
                      onAddAsAlias(e.target.value, item.rawText);
                      onDismiss(item.id);
                    }
                  }}
                  className="cursor-select text-[11px] h-7 py-0 px-2"
                  defaultValue=""
                >
                  <option value="" disabled>
                    기존 메뉴 별칭 연결...
                  </option>
                  {existingMenuItems.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name}의 별칭으로 추가
                    </option>
                  ))}
                </select>
              )}

              <button
                onClick={() => onDismiss(item.id)}
                className="text-[var(--muted)] hover:text-[var(--ink)] text-[11px] ml-1"
              >
                무시
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
