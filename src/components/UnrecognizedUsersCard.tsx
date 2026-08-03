'use client';

import React from 'react';
import { DEPARTMENTS, DepartmentName } from '../constants';

interface UnrecognizedUsersCardProps {
  unrecognizedUsers: string[];
  onSelectDepartment: (memberName: string, departmentName: DepartmentName) => void;
  onDismiss: (memberName: string) => void;
}

export default function UnrecognizedUsersCard({
  unrecognizedUsers,
  onSelectDepartment,
  onDismiss,
}: UnrecognizedUsersCardProps) {
  if (unrecognizedUsers.length === 0) return null;

  return (
    <div className="p-4 rounded-[var(--rounded-lg)] bg-[var(--colors-surface-indigo)] border-2 border-[var(--discord-yellow)] space-y-3 shadow-xl">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-display font-extrabold uppercase tracking-wider text-[var(--discord-yellow)] flex items-center gap-2">
          <span>⚠️</span>
          <span>신규 멤버 직종 지정 필요</span>
        </h4>
        <span className="badge-discord-yellow text-[10px]">NEW MEMBER</span>
      </div>

      <div className="space-y-3">
        {unrecognizedUsers.map(name => (
          <div
            key={name}
            className="p-3.5 rounded-[var(--rounded-sm)] bg-[var(--colors-surface-onyx)] border border-[var(--colors-hairline)] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs shadow-inner"
          >
            <span className="font-extrabold text-[var(--colors-ink)] text-sm">{name}</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {DEPARTMENTS.map(dept => (
                <button
                  key={dept}
                  onClick={() => onSelectDepartment(name, dept as DepartmentName)}
                  className="button-primary text-[11px] h-7 py-1 px-3 font-semibold"
                >
                  {dept}
                </button>
              ))}
              <button
                onClick={() => onDismiss(name)}
                className="text-[var(--colors-muted)] hover:text-white text-[11px] font-bold px-1"
              >
                닫기
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
