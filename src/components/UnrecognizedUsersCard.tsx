'use client';

import React, { useState } from 'react';
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
  // Local state to instantly dismiss user card upon button click
  const [dismissedUsers, setDismissedUsers] = useState<string[]>([]);

  const activeUsers = (unrecognizedUsers || []).filter(
    u => !dismissedUsers.includes(u)
  );

  if (activeUsers.length === 0) return null;

  const handleSelect = (userName: string, dept: DepartmentName) => {
    setDismissedUsers(prev => [...prev, userName]);
    onSelectDepartment(userName, dept);
    onDismiss(userName);
  };

  const handleDismissUser = (userName: string) => {
    setDismissedUsers(prev => [...prev, userName]);
    onDismiss(userName);
  };

  return (
    <div className="glass-card p-4 border border-accent-info/30 bg-accent-info/5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-accent-info flex items-center gap-1.5">
          <span>❓</span> 명단에 없는 신규 주문자가 발견되었습니다 ({activeUsers.length}명)
        </h3>
        <span className="text-[11px] text-text-muted">직종을 선택하면 DB에 영구적으로 등록되어 다음에도 유지됩니다</span>
      </div>

      <div className="space-y-2.5">
        {activeUsers.map(userName => (
          <div
            key={userName}
            className="p-3 rounded-lg bg-bg-card border border-border-primary space-y-2 text-xs"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-text-primary text-sm">
                👤 신규 주문자: &ldquo;{userName}&rdquo;
              </span>
              <button
                type="button"
                onClick={() => handleDismissUser(userName)}
                className="text-text-muted hover:text-text-primary text-xs p-1 cursor-pointer"
                title="무시"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1.5 pt-1 border-t border-border-primary/40">
              <p className="text-[11px] text-text-secondary">
                이 분의 소속 직종을 선택하세요 (클릭 시 전역 DB에 영구 등록):
              </p>
              <div className="flex flex-wrap gap-1.5">
                {DEPARTMENTS.map(dept => (
                  <button
                    key={dept}
                    type="button"
                    onClick={() => handleSelect(userName, dept)}
                    className="px-2.5 py-1.5 rounded-md bg-bg-input border border-border-primary text-text-primary hover:border-accent-primary hover:text-accent-primary hover:bg-accent-primary/10 transition-all font-medium text-xs cursor-pointer active:scale-95"
                  >
                    🏢 {dept}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
