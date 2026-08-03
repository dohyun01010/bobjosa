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
    <div className="p-4 rounded-xl bg-[#2b2d31] border border-[var(--discord-yellow)] space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-extrabold uppercase tracking-wider text-[var(--discord-yellow)] flex items-center gap-2">
          <span>⚠️</span>
          <span>신규 멤버 직종 설정</span>
        </h4>
      </div>

      <div className="space-y-3">
        {unrecognizedUsers.map(name => (
          <div
            key={name}
            className="p-3 rounded bg-[#313338] border border-[#1e1f22] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
          >
            <span className="font-bold text-[var(--text-primary)] text-xs">{name}</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {DEPARTMENTS.map(dept => (
                <button
                  key={dept}
                  onClick={() => onSelectDepartment(name, dept as DepartmentName)}
                  className="btn-discord-blurple text-[11px] h-7 py-1 px-2.5 font-semibold"
                >
                  {dept}
                </button>
              ))}
              <button
                onClick={() => onDismiss(name)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-[11px] ml-1 font-bold"
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
