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
    <div className="p-4 rounded-xl bg-[var(--canvas-soft)] border border-[var(--timeline-thinking)] space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--ink)] flex items-center gap-2">
          <span className="pill-thinking">NEW MEMBERS</span>
          <span>신규 주문자 직종 설정</span>
        </h4>
      </div>

      <div className="space-y-3">
        {unrecognizedUsers.map(name => (
          <div
            key={name}
            className="p-3 rounded-lg bg-[var(--surface-card)] border border-[var(--hairline)] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
          >
            <span className="font-semibold text-[var(--ink)] text-xs">{name}</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {DEPARTMENTS.map(dept => (
                <button
                  key={dept}
                  onClick={() => onSelectDepartment(name, dept as DepartmentName)}
                  className="btn-cursor-secondary text-[11px] h-7 py-1 px-2.5"
                >
                  {dept}
                </button>
              ))}
              <button
                onClick={() => onDismiss(name)}
                className="text-[var(--muted)] hover:text-[var(--ink)] text-[11px] ml-1"
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
