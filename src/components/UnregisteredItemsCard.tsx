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
    <div className="p-4 rounded-[var(--rounded-lg)] bg-gradient-to-r from-[var(--colors-surface-indigo)] to-[#2d1b4e] border-2 border-[var(--colors-magenta)] space-y-3 shadow-xl">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-display font-extrabold uppercase tracking-wider text-[var(--colors-magenta)] flex items-center gap-2">
          <span>✨</span>
          <span>미등록 신규 메뉴 DB 자동 추천</span>
        </h4>
        <span className="badge-magenta text-[10px]">NEW ITEM</span>
      </div>

      <div className="space-y-3">
        {unregisteredItems.map(item => (
          <div
            key={item.id}
            className="p-3.5 rounded-[var(--rounded-sm)] bg-[var(--colors-surface-onyx)] border border-[var(--colors-hairline)] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs shadow-inner"
          >
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-[var(--colors-ink)] text-sm">&ldquo;{item.rawText}&rdquo;</span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => onAddToDb(item.suggestedName, item.suggestedAliases)}
                className="button-green text-[11px] h-7 py-1 px-3 font-bold"
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
                  className="discord-select text-[11px] h-7 py-0 px-2 bg-[var(--colors-surface-indigo)] border-[var(--border-primary)]"
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
                className="text-[var(--colors-muted)] hover:text-white text-[11px] font-bold px-1"
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
