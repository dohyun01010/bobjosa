import { MenuItem, UserOrder, ParsedOrderItem, UnregisteredItem, AiParseResult } from '../types';
import { MEMBER_DEPARTMENT_MAP as DEFAULT_MEMBER_MAP, DEPARTMENT_ALIASES, DEPARTMENTS, DepartmentName } from '../constants';
import { matchMenu, similarity } from './matcher';

export interface RawAiResponse {
  userOrders: {
    userName: string;
    departmentName?: string;
    time?: string;
    items: {
      menuName: string;
      quantity: number;
    }[];
  }[];
  unregisteredItems?: {
    userName: string;
    departmentName?: string;
    rawText: string;
    suggestedName: string;
    suggestedAliases: string[];
    quantity: number;
  }[];
}

/**
 * Helper to determine department name based on user name using current memberMap.
 */
export function resolveDepartmentName(
  userName: string,
  currentMemberMap: Record<string, DepartmentName>,
  aiDept?: string
): string {
  const cleanUser = userName.trim();

  // 1. Check in active memberMap (DB + Local)
  if (currentMemberMap[cleanUser]) {
    return currentMemberMap[cleanUser];
  }

  // Check partial match for names
  for (const [member, dept] of Object.entries(currentMemberMap)) {
    if (cleanUser.includes(member) || member.includes(cleanUser)) {
      return dept;
    }
  }

  // 2. Fallback to default constants
  if (DEFAULT_MEMBER_MAP[cleanUser]) {
    return DEFAULT_MEMBER_MAP[cleanUser];
  }

  // 3. AI department hint resolution
  if (aiDept) {
    const normAiDept = aiDept.trim();
    for (const [dept, aliases] of Object.entries(DEPARTMENT_ALIASES)) {
      if (dept === normAiDept || aliases.some(a => a.toLowerCase() === normAiDept.toLowerCase())) {
        return dept;
      }
    }
  }

  return '모바일 앱 개발';
}

/**
 * Strip department prefixes like "메카", "앱", "IT", "산업", "모바일" from menu raw text.
 */
export function cleanMenuText(rawText: string): { cleanedText: string; detectedDept?: string } {
  let cleaned = rawText.trim();
  let detectedDept: string | undefined = undefined;

  for (const [dept, aliases] of Object.entries(DEPARTMENT_ALIASES)) {
    for (const alias of [dept, ...aliases]) {
      const regexStr = `^(${alias})[\\s\\-_/:]*`;
      const regex = new RegExp(regexStr, 'i');
      if (regex.test(cleaned)) {
        detectedDept = dept;
        cleaned = cleaned.replace(regex, '').trim();
        break;
      }
    }
    if (detectedDept) break;
  }

  return { cleanedText: cleaned || rawText, detectedDept };
}

/**
 * Parses KakaoTalk chat log using Gemini API with dynamic DB memberMap & department mapping.
 */
export async function parseChatWithAi(
  rawChatText: string,
  menuItems: MenuItem[],
  apiKey: string,
  memberMap: Record<string, DepartmentName>
): Promise<AiParseResult> {
  const cleanKey = apiKey ? apiKey.trim() : '';
  if (!cleanKey) {
    throw new Error('Gemini API Key가 설정되지 않았습니다.');
  }

  const menuDetails = menuItems
    .map(m => `- ${m.name}${m.aliases.length ? ` (별칭: ${m.aliases.join(', ')})` : ''}`)
    .join('\n');

  // Dynamic member list including user-added DB members
  const activeMemberMap = { ...DEFAULT_MEMBER_MAP, ...memberMap };
  const memberDetails = Object.entries(activeMemberMap)
    .map(([name, dept]) => `- ${name}: ${dept}`)
    .join('\n');

  const deptAliasDetails = Object.entries(DEPARTMENT_ALIASES)
    .map(([dept, aliases]) => `- ${dept} (약어: ${aliases.join(', ')})`)
    .join('\n');

  const prompt = `
당신은 카카오톡 식사 주문 대화 내용을 분석하여 직종별 및 메뉴별로 정교하게 주문 내역을 추출하는 AI 시스템입니다.

[선택된 식당의 기존 등록된 메뉴 목록]
${menuDetails}

[직종명 및 약어 정의]
${deptAliasDetails}

[구성원 명단 및 소속 직종 (최신 DB 포함)]
${memberDetails}

[분석할 카카오톡 대화 내용]
${rawChatText}

[핵심 분석 지침]
1. **직종 접두어 제거 규칙 (중요)**:
   - 메뉴 텍스트나 주문 메시지에 "메카 마마세트", "메카마마세트", "앱 치킨마요", "IT 짜장면"처럼 **직종 약어(메카, 앱, IT, 모바일, 산업 등)가 메뉴 이름 앞에 붙어있는 경우, 메뉴 이름에서 직종 약어("메카", "앱" 등)를 반드시 깨끗이 제거**하고 순수한 메뉴 이름("마마세트", "치킨마요")만 남기세요.
   - 떼어낸 직종 약어("메카" -> "메카트로닉스")를 바탕으로 해당 주문의 직종(departmentName)으로 할당하세요.

2. **소속 직종 자동 매핑**:
   - 주문한 사람 이름이 [구성원 명단 및 소속 직종]에 있으면 해당 직종으로 지정하세요 (예: 조예성 -> IT, 윤준영 -> 메카트로닉스, 김도현 -> 모바일 앱 개발).
   - 명단에 없는 경우 텍스트에 포함된 직종 약어나 문맥을 보고 5개 직종 중 하나로 지정하세요.

3. **잡담 제거 & 수량 처리**:
   - "네", "어디야", "ㅋㅋ" 같은 잡담은 무시하세요. "추가해줘"는 기존 수량에 더하고 "취소"는 수량을 빼세요.

4. **신규/미등록 메뉴 분류**:
   - 주문한 메뉴가 기존 메뉴 목록이나 별칭에 없으면 userOrders에도 포함시키고, 동시에 unregisteredItems 배열에도 포함시키세요.

반드시 아래와 같은 JSON 구조로만 응답하세요:
{
  "userOrders": [
    {
      "userName": "윤준영",
      "departmentName": "메카트로닉스",
      "time": "오후 8:28",
      "items": [
        { "menuName": "마마통살버거(세트)", "quantity": 1 }
      ]
    }
  ],
  "unregisteredItems": [
    {
      "userName": "박상우",
      "departmentName": "모바일 앱 개발",
      "rawText": "마마치킨버거 세트",
      "suggestedName": "마마치킨버거(세트)",
      "suggestedAliases": ["마마치킨세트"],
      "quantity": 1
    }
  ]
}
`;

  const candidateModels = [
    'gemini-flash-latest',
    'gemini-2.0-flash-lite',
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-flash-lite-latest',
    'gemini-pro-latest',
  ];

  let lastErrorDetail = '';

  for (const model of candidateModels) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(cleanKey)}`;

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': cleanKey,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.1,
          },
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.warn(`Model ${model} failed (${res.status}):`, errText);
        try {
          const parsedErr = JSON.parse(errText);
          lastErrorDetail = parsedErr?.error?.message || errText;
        } catch {
          lastErrorDetail = errText;
        }
        continue;
      }

      const data = await res.json();
      const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!candidateText) {
        throw new Error('AI 응답 내용이 비어있습니다.');
      }

      const parsedJson: RawAiResponse = JSON.parse(candidateText);

      const userOrders: UserOrder[] = [];
      let userIdCount = 0;

      for (const uOrder of parsedJson.userOrders || []) {
        if (!uOrder.items || uOrder.items.length === 0) continue;

        const resolvedDept = resolveDepartmentName(
          uOrder.userName || '주문자',
          activeMemberMap,
          uOrder.departmentName
        );

        const items: ParsedOrderItem[] = [];
        for (const item of uOrder.items) {
          const { cleanedText } = cleanMenuText(item.menuName);
          const matched = matchMenu({ text: cleanedText, quantity: item.quantity }, menuItems);
          matched.quantity = item.quantity;
          items.push(matched);
        }

        if (items.length > 0) {
          userOrders.push({
            id: `uorder-${Date.now()}-${userIdCount++}`,
            userName: uOrder.userName || '주문자',
            departmentName: resolvedDept,
            time: uOrder.time || '',
            rawText: uOrder.items.map(i => `${i.menuName} ${i.quantity}`).join('\n'),
            items,
          });
        }
      }

      const unregisteredItems: UnregisteredItem[] = (parsedJson.unregisteredItems || []).map(
        (unreg, idx) => {
          const { cleanedText } = cleanMenuText(unreg.rawText || unreg.suggestedName);
          const resolvedDept = resolveDepartmentName(
            unreg.userName || '주문자',
            activeMemberMap,
            unreg.departmentName
          );

          const matches = menuItems
            .map(m => {
              const nameSim = similarity(cleanedText, m.name);
              const aliasSims = m.aliases.map(a => similarity(cleanedText, a));
              const maxSim = Math.max(nameSim, ...aliasSims);
              return { menuId: m.id, menuName: m.name, similarity: maxSim };
            })
            .filter(c => c.similarity >= 0.35)
            .sort((a, b) => (b.similarity || 0) - (a.similarity || 0));

          return {
            id: `unreg-${Date.now()}-${idx}`,
            userName: unreg.userName || '주문자',
            departmentName: resolvedDept,
            rawText: unreg.rawText || cleanedText,
            suggestedName: unreg.suggestedName || cleanedText,
            suggestedAliases: Array.isArray(unreg.suggestedAliases) ? unreg.suggestedAliases : [],
            suggestedExistingMatches: matches,
            quantity: unreg.quantity || 1,
          };
        }
      );

      return {
        userOrders,
        unregisteredItems,
      };
    } catch (err: any) {
      lastErrorDetail = err.message || String(err);
    }
  }

  throw new Error(`Gemini API 호출 실패: ${lastErrorDetail}`);
}
