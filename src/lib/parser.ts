import { MenuItem, UserOrder, ParsedOrderItem } from '../types';
import { MEMBER_DEPARTMENT_MAP, DepartmentName } from '../constants';
import { matchMenu } from './matcher';
import { cleanMenuText, resolveDepartmentName } from './aiParser';

export interface RawOrderEntry {
  text: string;
  quantity: number;
}

export function parseOrderText(rawText: string): RawOrderEntry[] {
  if (!rawText.trim()) return [];
  const segments = rawText.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
  const results: RawOrderEntry[] = [];

  for (const seg of segments) {
    const tokens = seg.split(/\s+/);
    for (const token of tokens) {
      if (token.trim()) {
        results.push({ text: token.trim(), quantity: 1 });
      }
    }
  }

  return results;
}

/**
 * Fallback parser using regex and string matching if AI is disabled or fails.
 */
export function parseKakaoTextFallback(
  rawText: string,
  menuItems: MenuItem[],
  memberMapParam?: Record<string, DepartmentName>
): UserOrder[] {
  const activeMap = memberMapParam || MEMBER_DEPARTMENT_MAP;
  const lines = rawText.split('\n').filter(l => l.trim().length > 0);
  const userOrders: UserOrder[] = [];

  let currentUser = '주문자';
  let currentItems: ParsedOrderItem[] = [];
  let userCount = 0;
  let currentRawLine = '';

  const commitCurrentUser = () => {
    if (currentItems.length > 0) {
      const deptName = resolveDepartmentName(currentUser, currentRawLine, activeMap);
      userOrders.push({
        id: `uorder-fb-${Date.now()}-${userCount++}`,
        userName: currentUser,
        departmentName: deptName,
        rawText: currentRawLine || currentUser,
        items: currentItems,
      });
      currentItems = [];
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();

    const matchLine = trimmed.match(/(?:오전|오후)?\s*\d+:\d+\s+([가-힣a-zA-Z0-9]+)\s+(.+)/);

    if (matchLine) {
      commitCurrentUser();
      currentUser = matchLine[1].trim();
      currentRawLine = line;
      const content = matchLine[2].trim();

      const tokens = content.split(/\s+/);
      for (const token of tokens) {
        const clean = cleanMenuText(token);
        if (clean) {
          const item = matchMenu({ text: clean, quantity: 1 }, menuItems);
          currentItems.push(item);
        }
      }
    } else {
      const tokens = trimmed.split(/\s+/);
      for (const token of tokens) {
        const clean = cleanMenuText(token);
        if (clean) {
          const item = matchMenu({ text: clean, quantity: 1 }, menuItems);
          currentItems.push(item);
        }
      }
    }
  }

  commitCurrentUser();
  return userOrders;
}
