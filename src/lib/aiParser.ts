import { GoogleGenerativeAI } from '@google/generative-ai';
import { MenuItem, AiParseResult, ParsedOrderItem, UserOrder, LearningRules } from '../types';
import { DepartmentName, MEMBER_DEPARTMENT_MAP } from '../constants';
import { matchAllEntries } from './matcher';

const DEFAULT_FIXED_GEMINI_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "AQ.Ab8RN6L6TrLv1CcNx-2rK0oOVPnsubAtg06rFLhPJt-iv0WqvQ";

export type { LearningRules };

let cachedLearningRules: LearningRules = {
  learnedAliasMap: {
    '고국': '고기국수',
  },
  fewShotExamples: [],
  customPromptInstructions: [],
};

export async function fetchLearningRules(): Promise<LearningRules> {
  try {
    const res = await fetch('/api/learning', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      cachedLearningRules = data;
      return data;
    }
  } catch (e) {
    console.warn('Using cached learning rules:', e);
  }
  return cachedLearningRules;
}

/**
 * Standardize spicy modifiers & option additions (e.g. "치즈버거 치즈 2번추가" -> "치즈버거(치즈 2번추가)")
 */
export function cleanMenuText(text: string): string {
  if (!text) return '';
  let cleaned = text
    .replace(/^(메카|앱|웹|IT|모바일|로보틱스|산업)\s+/g, '')
    .replace(/@\S+/g, '')
    .trim();

  let optionTag = '';

  // Extract topping/option additions like "치즈 2번추가", "치즈추가", "샷추가", "소스추가"
  const optionMatch = cleaned.match(/(치즈\s*\d*번?\s*추가|샷\s*추가|소스\s*추가|토핑\s*추가|패티\s*추가)/i);
  if (optionMatch) {
    optionTag = optionMatch[1].trim();
    cleaned = cleaned.replace(optionMatch[0], '').trim();
  }

  let isMild = false;
  let isSpicy = false;

  if (/(엄청\s*|매우\s*)?안맵게|안매운맛|순한맛|안\s*맵게/i.test(cleaned)) {
    isMild = true;
    cleaned = cleaned
      .replace(/\((엄청\s*|매우\s*)?안맵게|안매운맛|순한맛|안\s*맵게\)/gi, '')
      .replace(/(엄청\s*|매우\s*)?안맵게|안매운맛|순한맛|안\s*맵게/gi, '');
  } else if (/매운맛|매콤|더\s*맵게|아주\s*맵게/i.test(cleaned) && !/안맵/i.test(cleaned)) {
    isSpicy = true;
    cleaned = cleaned
      .replace(/\(매운맛|매콤|더\s*맵게|아주\s*맵게\)/gi, '')
      .replace(/매운맛|매콤|더\s*맵게|아주\s*맵게/gi, '');
  }

  cleaned = cleaned
    .replace(/[()]+$/g, '')
    .replace(/^[()]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  let finalName = cleaned;
  if (isMild) finalName = `${cleaned}(안맵게)`;
  else if (isSpicy) finalName = `${cleaned}(매운맛)`;

  if (optionTag) {
    finalName = `${finalName}(${optionTag})`;
  }

  return finalName;
}

export function resolveDepartmentName(
  userName: string,
  rawText: string = '',
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

function isMemberName(text: string, memberMap: Record<string, DepartmentName>): boolean {
  const t = text.trim();
  if (memberMap[t]) return true;
  const rosterNames = Object.keys(memberMap);
  return rosterNames.some(name => name === t || t.startsWith(name + ' '));
}

function isChatterLine(text: string, memberMap?: Record<string, DepartmentName>): boolean {
  const t = text.trim();
  if (!t) return true;
  if (/^@/.test(t)) return true;
  if (/받을게|오늘저녁|잠시만|승제|왜|안녕|저리가|ㅋㅋㅋㅋ|단품이야\??|세트입니다|동일/i.test(t)) return true;
  if (/\b\d+분\b|\b\d+시\b/i.test(t) && !/\d+개|\d+세트|\d+단품/i.test(t)) return true;
  if (!/\d/.test(t) && /^(응|네|아니|어|오케이|ok|입금|완료|잠시만|받을게)$/i.test(t)) return true;

  if (memberMap && isMemberName(t, memberMap)) return true;

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
  const learningRules = await fetchLearningRules();

  const aliasInstructionSection = learningRules.learnedAliasMap && Object.keys(learningRules.learnedAliasMap).length > 0
    ? `\n[CRITICAL LEARNED ALIAS MAPPINGS - HIGH PRIORITY]\nThe user has explicitly taught the following vocabulary mappings. You MUST substitute these aliases with their exact target menu names:\n${JSON.stringify(learningRules.learnedAliasMap, null, 2)}\n`
    : '';

  const fewShotSection = learningRules.fewShotExamples && learningRules.fewShotExamples.length > 0
    ? `\n[LEARNED FEW-SHOT TRAINING EXAMPLES]\n${learningRules.fewShotExamples.map((ex, idx) => `Example ${idx + 1} (${ex.description}):\nInput: """${ex.inputChat}"""\nExpected Parsing Rule: ${ex.expectedOutput}`).join('\n\n')}\n`
    : '';

  const customInstructionsSection = learningRules.customPromptInstructions && learningRules.customPromptInstructions.length > 0
    ? `\n[USER CUSTOM INSTRUCTIONS]\n${learningRules.customPromptInstructions.map(instr => `- ${instr}`).join('\n')}\n`
    : '';

  const promptStep1 = `
You are an expert KakaoTalk meal order aggregation parser.
Parse the raw KakaoTalk chat logs into a clean structured JSON.

[CRITICAL INSTRUCTIONS]
1. PERSON NAMES ARE NOT FOOD MENUS! Never extract member names as food items.
2. OPTION ADDITIONS FORMATTING:
   - Format "치즈버거 치즈 2번추가" as "치즈버거(치즈 2번추가)".
   - Format "치즈버거 치즈추가" as "치즈버거(치즈추가)".
3. SPICY MODIFIERS:
   - ALL non-spicy variations ("안맵게", "엄청 안맵게", "매우 안맵게", "순한맛") MUST be standardized into "(안맵게)".
${aliasInstructionSection}${customInstructionsSection}${fewShotSection}
[Roster Reference - PEOPLE NAMES ARE NOT FOOD]
${JSON.stringify(activeMemberMap, null, 2)}

[Registered Menu Items]
${JSON.stringify(menuItems.map(m => ({ id: m.id, name: m.name, aliases: m.aliases })), null, 2)}

Raw Chat Log:
"""
${rawChatText}
"""
`;

  // Model fallback chain for maximum performance & accuracy (Gemini 2.5 Flash -> Gemini 2.5 Pro -> Gemini 1.5 Flash)
  const candidateModels = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-1.5-flash'];

  for (const modelName of candidateModels) {
    try {
      const genAI = new GoogleGenerativeAI(activeKey);
      const model = genAI.getGenerativeModel({ model: modelName });

      const responseStep1 = await model.generateContent(promptStep1);
      const textStep1 = responseStep1.response.text();
      const jsonMatch1 = textStep1.match(/\{[\s\S]*\}/);
      let parsed1: AiParseResult | null = null;
      if (jsonMatch1) {
        parsed1 = JSON.parse(jsonMatch1[0]) as AiParseResult;
      }

      if (parsed1 && parsed1.userOrders && parsed1.userOrders.length > 0) {
        return refineAiParsedResult(parsed1, menuItems, activeMemberMap, learningRules);
      }
    } catch (e) {
      console.warn(`Model ${modelName} attempt notice:`, e);
    }
  }

  return fallbackSmartParse(rawChatText, menuItems, activeMemberMap, learningRules);
}


function refineAiParsedResult(
  parsedData: AiParseResult,
  menuItems: MenuItem[],
  memberMap: Record<string, DepartmentName>,
  learningRules: LearningRules
): AiParseResult {
  const excludedWords: string[] = [];
  const instructionAliasMap: Record<string, string> = { ...(learningRules.learnedAliasMap || {}) };

  if (learningRules.customPromptInstructions) {
    for (const instr of learningRules.customPromptInstructions) {
      // 1. Exclusion pattern: "X는 메뉴가 아니다", "X는 잡담이다", "X 제외"
      const exclMatch = instr.match(/['"]?([^'"]+?)['"]?\s*(?:은|는)?\s*(?:메뉴가\s*아니다|잡담|제외|불가)/);
      if (exclMatch) {
        excludedWords.push(exclMatch[1].trim());
      }

      // 2. Alias pattern: "X는 Y다", "X -> Y"
      const aliasMatch = instr.match(/['"]?([^'"]+?)['"]?\s*(?:은|는|->|=>|=|으로)\s*['"]?([^'"]+?)['"]?(?:다|\.|$)/);
      if (aliasMatch) {
        const src = aliasMatch[1].trim();
        const tgt = aliasMatch[2].replace(/(?:이다|다|로)$/, '').trim();
        if (src && tgt && src !== tgt) {
          instructionAliasMap[src] = tgt;
        }
      }
    }
  }

  const refinedUserOrders: UserOrder[] = parsedData.userOrders
    .filter(u => u.userName && u.items && u.items.length > 0)
    .map((u, uIdx) => {
      const deptName = memberMap[u.userName.trim()] || resolveDepartmentName(u.userName, u.rawText || '', memberMap);

      const items: ParsedOrderItem[] = u.items
        .filter(item => {
          const raw = item.rawText.trim();
          const matched = item.matchedMenuName?.trim() || '';
          if (excludedWords.some(w => w && (raw.includes(w) || matched.includes(w)))) {
            return false;
          }
          return (
            raw &&
            !isChatterLine(raw, memberMap) &&
            !DEPT_KEYWORDS.includes(raw) &&
            !isMemberName(raw, memberMap)
          );
        })
        .map((item, iIdx) => {
          let rawTrimmed = item.rawText.trim();
          let matchedNameCandidate = item.matchedMenuName ? item.matchedMenuName.trim() : rawTrimmed;

          if (instructionAliasMap[rawTrimmed]) {
            matchedNameCandidate = instructionAliasMap[rawTrimmed];
            rawTrimmed = instructionAliasMap[rawTrimmed];
          } else if (instructionAliasMap[matchedNameCandidate]) {
            matchedNameCandidate = instructionAliasMap[matchedNameCandidate];
            rawTrimmed = instructionAliasMap[matchedNameCandidate];
          }

          const cleanedText = cleanMenuText(matchedNameCandidate);
          const isBurgerMeal = /버거|치킨/i.test(cleanedText);
          const hasOptionSpecified = /단품|세트|단\b/i.test(item.rawText);

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

          const matchedList = matchAllEntries([{ text: cleanedText, quantity: item.quantity || 1 }], menuItems);
          if (matchedList.length > 0 && matchedList[0].matchedMenuName) {
            return {
              ...matchedList[0],
              quantity: item.quantity || 1,
            };
          }

          if (item.status === 'uncertain' || /보내|메뉴|어|응|왜/i.test(rawTrimmed)) {
            return {
              id: `item-${Date.now()}-${uIdx}-${iIdx}`,
              rawText: item.rawText,
              matchedMenuId: null,
              matchedMenuName: cleanedText,
              quantity: item.quantity || 1,
              status: 'uncertain',
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

function extractRulesFromLearning(learningRules?: LearningRules): {
  aliasMap: Record<string, string>;
  excludedWords: string[];
} {
  const aliasMap: Record<string, string> = { ...(learningRules?.learnedAliasMap || {}) };
  const excludedWords: string[] = [];

  if (learningRules?.customPromptInstructions) {
    for (const instr of learningRules.customPromptInstructions) {
      const exclMatch = instr.match(/['"]?([^'"]+?)['"]?\s*(?:은|는)?\s*(?:메뉴가\s*아니다|잡담|제외|불가)/);
      if (exclMatch) {
        excludedWords.push(exclMatch[1].trim());
      }

      const aliasMatch = instr.match(/['"]?([^'"]+?)['"]?\s*(?:은|는|->|=>|=|으로)\s*['"]?([^'"]+?)['"]?(?:다|\.|$)/);
      if (aliasMatch) {
        const src = aliasMatch[1].trim();
        const tgt = aliasMatch[2].replace(/(?:이다|다|로)$/, '').trim();
        if (src && tgt && src !== tgt) {
          aliasMap[src] = tgt;
        }
      }
    }
  }

  return { aliasMap, excludedWords };
}

export function fallbackSmartParse(
  rawText: string,
  menuItems: MenuItem[],
  memberMap: Record<string, DepartmentName>,
  learningRules?: LearningRules
): AiParseResult {
  const activeLearning = learningRules || cachedLearningRules;
  const { aliasMap, excludedWords } = extractRulesFromLearning(activeLearning);

  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  const userMap = new Map<string, { userName: string; dept: DepartmentName; items: ParsedOrderItem[]; rawLines: string[] }>();

  let currentUserName = '';

  for (const line of lines) {
    if (line.startsWith('---') || line.startsWith('===')) continue;

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

      if (restContent && !isChatterLine(restContent, memberMap)) {
        parseLineToItems(restContent, userMap.get(currentUserName)!.items, menuItems, aliasMap, excludedWords, memberMap);
      }
    } else if (isMemberName(line, memberMap) || (line.length <= 10 && !/\d/.test(line) && !isChatterLine(line, memberMap))) {
      currentUserName = line.replace(/^[\[\s]+|[\]\s]+$/g, '').trim();
      if (!userMap.has(currentUserName)) {
        const dept = memberMap[currentUserName] || resolveDepartmentName(currentUserName, line, memberMap);
        userMap.set(currentUserName, { userName: currentUserName, dept, items: [], rawLines: [line] });
      }
    } else if (currentUserName && userMap.has(currentUserName)) {
      if (!isChatterLine(line, memberMap)) {
        const currentUserData = userMap.get(currentUserName)!;
        currentUserData.rawLines.push(line);
        parseLineToItems(line, currentUserData.items, menuItems, aliasMap, excludedWords, memberMap);
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
  menuItems: MenuItem[],
  aliasMap: Record<string, string>,
  excludedWords: string[],
  memberMap?: Record<string, DepartmentName>
) {
  let text = lineText.replace(/@\S+/g, '').trim();
  if (!text || isChatterLine(text, memberMap)) return;

  text = text.replace(/단\s*([0-9]+)/g, '단품 $1');

  const foodQtyRegex = /([가-힣a-zA-Z0-9()\s-]+?)\s*([0-9]+)(?=$|\s|[가-힣])/g;

  let match;
  let hasMatches = false;

  while ((match = foodQtyRegex.exec(text)) !== null) {
    let foodName = match[1].trim();
    const qty = parseInt(match[2], 10) || 1;

    if (
      !foodName ||
      isChatterLine(foodName, memberMap) ||
      DEPT_KEYWORDS.includes(foodName) ||
      /^[0-9]+$/.test(foodName) ||
      (memberMap && isMemberName(foodName, memberMap))
    ) {
      continue;
    }

    if (excludedWords.some(w => w && (foodName.includes(w) || cleanMenuText(foodName).includes(w)))) {
      continue;
    }

    hasMatches = true;

    if (aliasMap[foodName]) {
      foodName = aliasMap[foodName];
    }

    const cleanedFoodName = cleanMenuText(foodName);
    const isBurgerMeal = /버거|치킨/i.test(cleanedFoodName);
    const hasOptionSpecified = /단품|세트/i.test(foodName);

    if (isBurgerMeal && !hasOptionSpecified) {
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
      continue;
    }

    const matchedList = matchAllEntries([{ text: cleanedFoodName, quantity: qty }], menuItems);
    if (matchedList.length > 0 && matchedList[0].matchedMenuName) {
      targetItemList.push({
        ...matchedList[0],
        quantity: qty,
      });
    } else if (/보내|메뉴|어|응|왜/i.test(foodName)) {
      targetItemList.push({
        id: `item-${Date.now()}-${Math.random()}`,
        rawText: foodName,
        matchedMenuId: null,
        matchedMenuName: cleanedFoodName,
        quantity: qty,
        status: 'uncertain',
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

  if (!hasMatches && text && !isChatterLine(text, memberMap) && !DEPT_KEYWORDS.includes(text) && !/^[0-9]+$/.test(text)) {
    if (memberMap && isMemberName(text, memberMap)) return;
    if (excludedWords.some(w => w && (text.includes(w) || cleanMenuText(text).includes(w)))) return;

    let foodName = text;
    if (aliasMap[foodName]) {
      foodName = aliasMap[foodName];
    }

    const cleanedFoodName = cleanMenuText(foodName);
    const isBurgerMeal = /버거|치킨/i.test(cleanedFoodName);
    const hasOptionSpecified = /단품|세트/i.test(text);

    if (isBurgerMeal && !hasOptionSpecified) {
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
      return;
    }

    const matchedList = matchAllEntries([{ text: cleanedFoodName, quantity: 1 }], menuItems);
    if (matchedList.length > 0 && matchedList[0].matchedMenuName) {
      targetItemList.push({
        ...matchedList[0],
        quantity: 1,
      });
    } else if (/보내|메뉴|어|응|왜/i.test(text)) {
      targetItemList.push({
        id: `item-${Date.now()}-${Math.random()}`,
        rawText: text,
        matchedMenuId: null,
        matchedMenuName: cleanedFoodName,
        quantity: 1,
        status: 'uncertain',
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
