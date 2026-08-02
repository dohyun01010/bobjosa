import { MenuItem, AiParseResult, ParsedOrderItem, UserOrder } from '../types';
import { DepartmentName, MEMBER_DEPARTMENT_MAP } from '../constants';
import { matchAllEntries } from './matcher';

const DEFAULT_FIXED_GEMINI_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "AQ.Ab8RN6L6TrLv1CcNx-2rK0oOVPnsubAtg06rFLhPJt-iv0WqvQ";

export function cleanMenuText(text: string): string {
  if (!text) return '';
  return text
    .replace(/^(메카|앱|웹|IT|모바일|로보틱스|산업)\s+/g, '')
    .trim();
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

  const prompt = `
You are an expert KakaoTalk meal order aggregation parser.
Parse the following raw KakaoTalk chat logs into structured order JSON.

[Department & Member Roster Reference]
${JSON.stringify(activeMemberMap, null, 2)}

[Registered Menu Items Reference]
${JSON.stringify(
  menuItems.map(m => ({ id: m.id, name: m.name, aliases: m.aliases })),
  null,
  2
)}

Return ONLY a valid JSON object matching this TypeScript interface:
{
  "userOrders": [
    {
      "id": "user-1",
      "userName": "Name",
      "departmentName": "모바일 앱 개발",
      "rawText": "original text line",
      "items": [
        {
          "id": "item-1",
          "rawText": "menu text",
          "matchedMenuId": null,
          "matchedMenuName": null,
          "quantity": 1,
          "status": "confirmed"
        }
      ]
    }
  ],
  "unregisteredItems": []
}

Raw Chat Log:
"""
${rawChatText}
"""
`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${activeKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    if (!res.ok) {
      throw new Error(`Gemini API Error: ${res.statusText}`);
    }

    const data = await res.json();
    const responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('AI응답에서 JSON 형식을 추출하지 못했습니다.');
    }

    const parsedData = JSON.parse(jsonMatch[0]) as AiParseResult;

    const refinedUserOrders: UserOrder[] = parsedData.userOrders.map((u, uIdx) => {
      const deptName = activeMemberMap[u.userName.trim()] || resolveDepartmentName(u.userName, u.rawText, activeMemberMap);
      const items: ParsedOrderItem[] = u.items.map((item, iIdx) => {
        const cleanedText = cleanMenuText(item.rawText);
        const rawEntries = [{ text: cleanedText, quantity: item.quantity }];
        const matchedList = matchAllEntries(rawEntries, menuItems);
        if (matchedList.length > 0) {
          return {
            ...matchedList[0],
            quantity: item.quantity,
          };
        }
        return {
          id: `item-${Date.now()}-${uIdx}-${iIdx}`,
          rawText: item.rawText,
          matchedMenuId: null,
          matchedMenuName: null,
          quantity: item.quantity,
          status: 'error',
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
      unregisteredItems: parsedData.unregisteredItems || [],
    };
  } catch (e) {
    console.warn('AI parsing notice, using local matcher:', e);
    return fallbackLocalParse(rawChatText, menuItems, activeMemberMap);
  }
}

function fallbackLocalParse(
  rawText: string,
  menuItems: MenuItem[],
  memberMap: Record<string, DepartmentName>
): AiParseResult {
  const lines = rawText.split('\n').filter(l => l.trim().length > 0);
  const userOrders: UserOrder[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const match = line.match(/(?:오전|오후)?\s*\d+:\d+\s+([가-힣a-zA-Z0-9]+)\s+(.+)/);
    if (match) {
      const userName = match[1].trim();
      const content = match[2].trim();
      const dept = resolveDepartmentName(userName, line, memberMap);

      const items = matchAllEntries(
        content.split(/\s+/).map(text => ({ text: cleanMenuText(text), quantity: 1 })),
        menuItems
      );

      userOrders.push({
        id: `local-user-${i}`,
        userName,
        departmentName: dept,
        rawText: line,
        items,
      });
    }
  }

  return {
    userOrders,
    unregisteredItems: [],
  };
}
