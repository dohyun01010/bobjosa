import { GoogleGenerativeAI } from '@google/generative-ai';
import { MenuItem, AiParseResult, ParsedOrderItem, UserOrder } from '../types';
import { DepartmentName, MEMBER_DEPARTMENT_MAP } from '../constants';
import { matchAllEntries } from './matcher';

const DEFAULT_FIXED_GEMINI_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "AQ.Ab8RN6L6TrLv1CcNx-2rK0oOVPnsubAtg06rFLhPJt-iv0WqvQ";

/**
 * Standardize spicy option variations into single clean labels:
 * - "떡볶이(안맵게)", "떡볶이 매우 안맵게", "떡볶이 순한맛" -> "떡볶이(안맵게)"
 * - "떡볶이" (기냥 떡볶이) -> "떡볶이" (유지)
 */
export function cleanMenuText(text: string): string {
  if (!text) return '';
  let cleaned = text
    .replace(/^(메카|앱|웹|IT|모바일|로보틱스|산업)\s+/g, '')
    .replace(/@\S+/g, '')
    .trim();

  // Standardize non-spicy / mild variations into "(안맵게)"
  if (/(매우\s*)?안맵게|안매운맛|순한맛|안\s*맵게/i.test(cleaned)) {
    const baseName = cleaned
      .replace(/\((매우\s*)?안맵게|안매운맛|순한맛|안\s*맵게\)/gi, '')
      .replace(/(매우\s*)?안맵게|안매운맛|순한맛|안\s*맵게/gi, '')
      .trim();
    return `${baseName}(안맵게)`;
  }

  // Standardize extra spicy variations into "(매운맛)"
  if (/매운맛|매콤|더\s*맵게|아주\s*맵게/i.test(cleaned) && !/안맵/i.test(cleaned)) {
    const baseName = cleaned
      .replace(/\(매운맛|매콤|더\s*맵게|아주\s*맵게\)/gi, '')
      .replace(/매운맛|매콤|더\s*맵게|아주\s*맵게/gi, '')
      .trim();
    return `${baseName}(매운맛)`;
  }

  return cleaned;
}

export function resolveDepartmentName(
  userName: string,
  rawText: string,
  memberMap?: Record<string, DepartmentName>
): DepartmentName {
  const map = memberMap || MEMBER_DEPARTMENT_MAP;
  const cleanName = userName.trim();
  if (map[cleanName]) return map[cleanName];

  if (/메카/i.test(rawText)) return '메카트로닉스';
  if (/모바일|로보틱스/i.test(rawText)) return '모바일 로보틱스';
  if (/앱|웹/i.test(rawText)) return '모바일 앱 개발';
  if (/IT|네트워크/i.test(rawText)) return 'IT';
  if (/산업/i.test(rawText)) return '산업용 로봇';

  return '모바일 앱 개발';
}

const DEPT_KEYWORDS = ['산업', '메카', 'IT', '모바일', '앱', '웹', '로보틱스', '산업용'];

function isChatterLine(text: string): boolean {
  const t = text.trim();
  if (!t) return true;
  if (/^@/.test(t)) return true;
  if (/받을게|보내라|메뉴|오늘저녁|잠시만|승제|왜|안녕|저리가|ㅋㅋㅋㅋ|메뉴나|보내|단품이야\??|세트입니다|메카도|동일/i.test(t)) return true;
  if (/\b\d+분\b|\b\d+시\b/i.test(t) && !/\d+개|\d+세트|\d+단품/i.test(t)) return true;
  if (!/\d/.test(t) && /^(응|네|아니|어|오케이|ok|입금|완료|잠시만|보내|받을게)$/i.test(t)) return true;
  return false;
}

export async function parseChatWithAi(
  rawChatText: string,
  menuItems: MenuItem[],
  providedApiKey?: string,
  memberMapParam?: Record<string, DepartmentName>
): Promise<AiParseResult> {
  const activeKey = (providedApiKey && providedApiKey.trim())
    ? providedApiKey.trim()
    : DEFAULT_FIXED_GEMINI_KEY;

  const activeMemberMap = memberMapParam || MEMBER_DEPARTMENT_MAP;

  try {
    const genAI = new GoogleGenerativeAI(activeKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `
You are an expert KakaoTalk meal order aggregation parser.
Parse the raw KakaoTalk chat logs into a clean structured JSON.

[CRITICAL INSTRUCTIONS]
1. IGNORE ALL CHATTER / QUESTIONS / GREETINGS / MENTIONS like "오늘저녁 마미쿡 메뉴 보내라", "40분까지 받을게", "안녕", "왜", "잠시만", "ㅋㅋㅋㅋㅋㅋㅋㅋ", "버거 단품이야?", "세트입니다".
2. SPICY MODIFIERS:
   - Plain "떡볶이" remains "떡볶이".
   - Mild/Non-spicy options ("안맵게", "매우 안맵게", "순한맛") MUST be standardized into "떡볶이(안맵게)".
3. BURGER SET VS SINGLE (단품/세트):
   - If a burger/meal is specified WITH "단품" or "세트", set status to "confirmed".
   - If a burger/meal has NO mention of "단품" or "세트", set status to "ambiguous" and provide candidates: ["(단품)", "(세트)"].

[Roster Reference]
${JSON.stringify(activeMemberMap, null, 2)}

[Registered Menu Items]
${JSON.stringify(menuItems.map(m => ({ id: m.id, name: m.name, aliases: m.aliases })), null, 2)}

Return ONLY valid JSON.
`;

    const response = await model.generateContent(prompt);
    const responseText = response.response.text();

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsedData = JSON.parse(jsonMatch[0]) as AiParseResult;
      if (parsedData.userOrders && Array.isArray(parsedData.userOrders) && parsedData.userOrders.length > 0) {
        return refineAiParsedResult(parsedData, menuItems, activeMemberMap);
      }
    }
  } catch (e) {
    console.warn('AI Parsing fallback notice:', e);
  }

  return fallbackSmartParse(rawChatText, menuItems, activeMemberMap);
}

function refineAiParsedResult(
  parsedData: AiParseResult,
  menuItems: MenuItem[],
  memberMap: Record<string, DepartmentName>
): AiParseResult {
  const refinedUserOrders: UserOrder[] = parsedData.userOrders
    .filter(u => u.userName && u.items && u.items.length > 0)
    .map((u, uIdx) => {
      const deptName = memberMap[u.userName.trim()] || resolveDepartmentName(u.userName, u.rawText, memberMap);

      const items: ParsedOrderItem[] = u.items
        .filter(item => {
          const raw = item.rawText.trim();
          return raw && !isChatterLine(raw) && !DEPT_KEYWORDS.includes(raw);
        })
        .map((item, iIdx) => {
          const cleanedText = cleanMenuText(item.rawText);
          const isBurgerMeal = /버거|치킨|세트|단품/i.test(item.rawText);
          const hasOptionSpecified = /단품|세트|단\b/i.test(item.rawText);

          const matchedList = matchAllEntries([{ text: cleanedText, quantity: item.quantity || 1 }], menuItems);

          if (matchedList.length > 0 && matchedList[0].matchedMenuName) {
            return {
              ...matchedList[0],
              quantity: item.quantity || 1,
            };
          }

          if (isBurgerMeal && !hasOptionSpecified) {
            return {
              id: `item-${Date.now()}-${uIdx}-${iIdx}`,
              rawText: item.rawText,
              matchedMenuId: null,
              matchedMenuName: null,
              quantity: item.quantity || 1,
              status: 'ambiguous',
              candidates: [
                { menuId: 'c1', menuName: `${cleanedText}(단품)`, similarity: 0.9 },
                { menuId: 'c2', menuName: `${cleanedText}(세트)`, similarity: 0.9 },
              ],
            };
          }

          return {
            id: `item-${Date.now()}-${uIdx}-${iIdx}`,
            rawText: item.rawText,
            matchedMenuId: null,
            matchedMenuName: cleanedText,
            quantity: item.quantity || 1,
            status: 'confirmed',
          };
        });

      return {
        ...u,
        id: `user-${Date.now()}-${uIdx}`,
        departmentName: deptName,
        items,
      };
    });

  return {
    userOrders: refinedUserOrders,
    unregisteredItems: [],
  };
}

export function fallbackSmartParse(
  rawText: string,
  menuItems: MenuItem[],
  memberMap: Record<string, DepartmentName>
): AiParseResult {
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  const userMap = new Map<string, { userName: string; dept: DepartmentName; items: ParsedOrderItem[]; rawLines: string[] }>();

  let currentUserName = '';

  for (const line of lines) {
    const matchHeader = line.match(/(?:오전|오후)?\s*\d+:\d+\s+([가-힣a-zA-Z0-9]+)(?:\s+(.*))?/);

    if (matchHeader) {
      const nameCandidate = matchHeader[1].trim();
      let restContent = (matchHeader[2] || '').trim();

      for (const kw of DEPT_KEYWORDS) {
        if (restContent === kw || restContent.startsWith(kw + ' ')) {
          restContent = restContent.substring(kw.length).trim();
          break;
        }
      }

      currentUserName = nameCandidate;
      if (!userMap.has(currentUserName)) {
        const dept = memberMap[currentUserName] || resolveDepartmentName(currentUserName, line, memberMap);
        userMap.set(currentUserName, { userName: currentUserName, dept, items: [], rawLines: [line] });
      }

      if (restContent && !isChatterLine(restContent)) {
        parseLineToItems(restContent, userMap.get(currentUserName)!.items, menuItems);
      }
    } else if (currentUserName && userMap.has(currentUserName)) {
      if (!isChatterLine(line)) {
        const currentUserData = userMap.get(currentUserName)!;
        currentUserData.rawLines.push(line);
        parseLineToItems(line, currentUserData.items, menuItems);
      }
    }
  }

  const userOrders: UserOrder[] = [];
  userMap.forEach((data, key) => {
    if (data.items.length > 0) {
      userOrders.push({
        id: `user-${Date.now()}-${key}`,
        userName: data.userName,
        departmentName: data.dept,
        rawText: data.rawLines.join(' '),
        items: data.items,
      });
    }
  });

  return {
    userOrders,
    unregisteredItems: [],
  };
}

function parseLineToItems(
  lineText: string,
  targetItemList: ParsedOrderItem[],
  menuItems: MenuItem[]
) {
  let text = lineText.replace(/@\S+/g, '').trim();
  if (!text || isChatterLine(text)) return;

  text = text.replace(/단\s*([0-9]+)/g, '단품 $1');

  const foodQtyRegex = /([가-힣a-zA-Z0-9()\s-]+?)\s*([0-9]+)(?=$|\s|[가-힣])/g;

  let match;
  let hasMatches = false;

  while ((match = foodQtyRegex.exec(text)) !== null) {
    let foodName = match[1].trim();
    const qty = parseInt(match[2], 10) || 1;

    if (!foodName || isChatterLine(foodName) || DEPT_KEYWORDS.includes(foodName) || /^[0-9]+$/.test(foodName)) {
      continue;
    }

    hasMatches = true;

    const cleanedFoodName = cleanMenuText(foodName);
    const isBurgerMeal = /버거|치킨/i.test(cleanedFoodName);
    const hasOptionSpecified = /단품|세트/i.test(foodName);

    const matchedList = matchAllEntries([{ text: cleanedFoodName, quantity: qty }], menuItems);
    if (matchedList.length > 0 && matchedList[0].matchedMenuName) {
      targetItemList.push({
        ...matchedList[0],
        quantity: qty,
      });
    } else if (isBurgerMeal && !hasOptionSpecified) {
      targetItemList.push({
        id: `item-${Date.now()}-${Math.random()}`,
        rawText: foodName,
        matchedMenuId: null,
        matchedMenuName: null,
        quantity: qty,
        status: 'ambiguous',
        candidates: [
          { menuId: 'c1', menuName: `${cleanedFoodName}(단품)`, similarity: 0.9 },
          { menuId: 'c2', menuName: `${cleanedFoodName}(세트)`, similarity: 0.9 },
        ],
      });
    } else {
      targetItemList.push({
        id: `item-${Date.now()}-${Math.random()}`,
        rawText: foodName,
        matchedMenuId: null,
        matchedMenuName: cleanedFoodName,
        quantity: qty,
        status: 'confirmed',
      });
    }
  }

  if (!hasMatches && text && !isChatterLine(text) && !DEPT_KEYWORDS.includes(text) && !/^[0-9]+$/.test(text)) {
    const cleanedFoodName = cleanMenuText(text);
    const isBurgerMeal = /버거|치킨/i.test(cleanedFoodName);
    const hasOptionSpecified = /단품|세트/i.test(text);

    const matchedList = matchAllEntries([{ text: cleanedFoodName, quantity: 1 }], menuItems);
    if (matchedList.length > 0 && matchedList[0].matchedMenuName) {
      targetItemList.push({
        ...matchedList[0],
        quantity: 1,
      });
    } else if (isBurgerMeal && !hasOptionSpecified) {
      targetItemList.push({
        id: `item-${Date.now()}-${Math.random()}`,
        rawText: text,
        matchedMenuId: null,
        matchedMenuName: null,
        quantity: 1,
        status: 'ambiguous',
        candidates: [
          { menuId: 'c1', menuName: `${cleanedFoodName}(단품)`, similarity: 0.9 },
          { menuId: 'c2', menuName: `${cleanedFoodName}(세트)`, similarity: 0.9 },
        ],
      });
    } else {
      targetItemList.push({
        id: `item-${Date.now()}-${Math.random()}`,
        rawText: text,
        matchedMenuId: null,
        matchedMenuName: cleanedFoodName,
        quantity: 1,
        status: 'confirmed',
      });
    }
  }
}
