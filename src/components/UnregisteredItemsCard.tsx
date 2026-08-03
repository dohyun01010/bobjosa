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
    <div className="p-4 rounded-xl bg-[#2b2d31] border border-[var(--primary-blurple)] space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-extrabold uppercase tracking-wider text-[var(--primary-blurple)] flex items-center gap-2">
          <span>✨</span>
          <span>미등록 신규 메뉴 DB 추가 제안</span>
        </h4>
      </div>

      <div className="space-y-3">
        {unregisteredItems.map(item => (
          <div
            key={item.id}
            className="p-3 rounded bg-[#313338] border border-[#1e1f22] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
          >
            <div className="flex items-center gap-2">
              <span className="font-bold text-[var(--text-primary)] text-xs">&ldquo;{item.rawText}&rdquo;</span>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => onAddToDb(item.suggestedName, item.suggestedAliases)}
                className="btn-discord-green text-[11px] h-7 py-1 px-2.5 font-bold"
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
                  className="discord-select text-[11px] h-7 py-0 px-2"
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
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-[11px] ml-1 font-bold"
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
