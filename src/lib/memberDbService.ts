import { MEMBER_DEPARTMENT_MAP as DEFAULT_MEMBER_MAP, DepartmentName } from '../constants';

const LOCAL_MEMBERS_KEY = 'bobjosa_members_map_server_master_v1';

export function getLocalMemberMap(): Record<string, DepartmentName> {
  if (typeof window === 'undefined') return DEFAULT_MEMBER_MAP;
  try {
    const cached = localStorage.getItem(LOCAL_MEMBERS_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (typeof parsed === 'object' && parsed !== null) {
        return { ...DEFAULT_MEMBER_MAP, ...parsed };
      }
    }
  } catch (e) {
    console.error('Failed to parse local member map:', e);
  }
  return DEFAULT_MEMBER_MAP;
}

export function setLocalMemberMap(map: Record<string, DepartmentName>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_MEMBERS_KEY, JSON.stringify(map));
  } catch (e) {
    console.error('Failed to cache member map locally:', e);
  }
}

export async function fetchMemberMapFromDb(): Promise<Record<string, DepartmentName>> {
  const localMap = getLocalMemberMap();
  try {
    const res = await fetch('/api/members', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.memberMap) {
        setLocalMemberMap(data.memberMap);
        return data.memberMap;
      }
    }
  } catch (e) {
    console.warn('Server member map fetch notice:', e);
  }
  return localMap;
}

export function subscribeMemberMapDb(
  onUpdate: (map: Record<string, DepartmentName>) => void
): () => void {
  if (typeof window === 'undefined') return () => {};

  const intervalId = setInterval(async () => {
    try {
      const res = await fetch('/api/members', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.memberMap) {
          setLocalMemberMap(data.memberMap);
          onUpdate(data.memberMap);
        }
      }
    } catch {}
  }, 5000);

  return () => clearInterval(intervalId);
}

export async function saveMemberDepartmentToDb(
  memberName: string,
  departmentName: DepartmentName,
  currentMap: Record<string, DepartmentName>
): Promise<Record<string, DepartmentName>> {
  const updatedMap = {
    ...currentMap,
    [memberName.trim()]: departmentName,
  };

  setLocalMemberMap(updatedMap);

  try {
    await fetch('/api/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberMap: updatedMap }),
    });
  } catch (e) {
    console.warn('Failed to commit member map to Server DB:', e);
  }

  return updatedMap;
}
