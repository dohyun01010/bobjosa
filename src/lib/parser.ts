import { MenuItem, UserOrder, ParsedOrderItem } from '../types';
import { MEMBER_DEPARTMENT_MAP, DepartmentName } from '../constants';
import { matchMenu } from './matcher';
import { cleanMenuText, resolveDepartmentName } from './aiParser';

export interface RawOrderEntry {
  text: string;
  quantity: number;
}

/**
 * Fallback parser for KakaoTalk chat log when AI is not available.
 */
export function parseChatTextFallback(
  rawChatText: string,
  menuItems: MenuItem[],
  memberMap?: Record<string, DepartmentName>
): UserOrder[] {
  if (!rawChatText.trim()) return [];

  const activeMap = memberMap ? { ...MEMBER_DEPARTMENT_MAP, ...memberMap } : MEMBER_DEPARTMENT_MAP;
  const lines = rawChatText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const userOrders: UserOrder[] = [];

  let currentUser: string = '주문자';
  let currentTime: string = '';
  let currentItems: ParsedOrderItem[] = [];
  let userCount = 0;

  const commitCurrentUser = () => {
    if (currentItems.length > 0) {
      const deptName = resolveDepartmentName(currentUser, activeMap);
      userOrders.push({
        id: `uorder-fb-${Date.now()}-${userCount++}`,
        userName: currentUser,
        departmentName: deptName,
        time: currentTime,
        rawText: currentItems.map(i => `${i.rawText} ${i.quantity}`).join(', '),
        items: [...currentItems],
      });
      currentItems = [];
    }
  };

  const timeRegex = /^(오전|오후)?\s*\d{1,2}:\d{2}/;

  for (const line of lines) {
    let textToParse = line;
    let extractedTime = '';
    let extractedUser = '';

    const timeMatch = line.match(timeRegex);
    if (timeMatch) {
      extractedTime = timeMatch[0];
      const remainder = line.substring(extractedTime.length).trim();
      const parts = remainder.split(/\s+/);

      if (parts.length > 0 && !containsDigit(parts[0])) {
        extractedUser = parts[0];
        textToParse = parts.slice(1).join(' ');
      } else {
        textToParse = remainder;
      }

      if (extractedUser && extractedUser !== currentUser) {
        commitCurrentUser();
        currentUser = extractedUser;
        currentTime = extractedTime;
      } else if (extractedTime && !extractedUser) {
        commitCurrentUser();
        currentTime = extractedTime;
      }
    }

    if (!textToParse.trim()) continue;
    if (isNoiseText(textToParse)) continue;

    const entries = parseOrderText(textToParse);
    for (const entry of entries) {
      const { cleanedText } = cleanMenuText(entry.text);
      const matched = matchMenu({ text: cleanedText, quantity: entry.quantity }, menuItems);
      currentItems.push(matched);
    }
  }

  commitCurrentUser();
  return userOrders;
}

function containsDigit(str: string): boolean {
  return /\d/.test(str);
}

function isNoiseText(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (['네', '예', '응', '오케이', 'ok', 'ㅇㅋ', 'ㅋㅋ', 'ㅋㅋㅋ', 'ㅎㅎ'].includes(t)) {
    return true;
  }
  return false;
}

export function parseOrderText(rawText: string): RawOrderEntry[] {
  if (!rawText.trim()) return [];

  const results: RawOrderEntry[] = [];
  const segments = rawText.split(/[\n,]+/).map(s => s.trim()).filter(s => s.length > 0);

  for (const segment of segments) {
    const cleaned = segment
      .replace(/(개|주문|추가해줘|추가|해줘|부탁해)/g, ' ')
      .replace(/:/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const tokens = cleaned.split(/\s+/);
    let i = 0;

    while (i < tokens.length) {
      let menuParts: string[] = [];
      let quantity = 1;

      while (i < tokens.length && !isNumericToken(tokens[i])) {
        const trailingMatch = tokens[i].match(/^(.+?)([0-9]+)$/);
        if (trailingMatch && trailingMatch[1].length > 0) {
          menuParts.push(trailingMatch[1]);
          quantity = parseInt(trailingMatch[2], 10);
          i++;
          break;
        }
        menuParts.push(tokens[i]);
        i++;
      }

      if (i < tokens.length && isNumericToken(tokens[i])) {
        quantity = parseInt(tokens[i], 10);
        i++;
      }

      const menuName = menuParts.join(' ').trim();
      if (menuName.length > 0) {
        results.push({ text: menuName, quantity: Math.max(1, quantity) });
      }
    }
  }

  return results;
}

function isNumericToken(token: string): boolean {
  return /^[0-9]+$/.test(token);
}
