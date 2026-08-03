// 메뉴 항목
export interface MenuItem {
  id: string;
  name: string;
  aliases: string[];
}

// 식당
export interface Restaurant {
  id: string;
  name: string;
  menuItems: MenuItem[];
}

// 파싱된 개별 주문 항목
export interface ParsedOrderItem {
  id: string;
  rawText: string;
  matchedMenuId: string | null;
  matchedMenuName: string | null;
  quantity: number;
  status: 'confirmed' | 'ambiguous' | 'uncertain' | 'error';
  candidates?: { menuId: string; menuName: string; similarity: number }[];
}

// 사용자별 주문
export interface UserOrder {
  id: string;
  userName: string;
  departmentName: string;
  rawText?: string;
  items: ParsedOrderItem[];
}

// 미등록/신규 메뉴 제안
export interface UnregisteredItem {
  id: string;
  rawText: string;
  suggestedName: string;
  suggestedAliases: string[];
  userName?: string;
  departmentName?: string;
  quantity?: number;
  suggestedExistingMatches?: { menuId: string; menuName: string }[];
}

// AI 파싱 전체 결과
export interface AiParseResult {
  userOrders: UserOrder[];
  unregisteredItems?: UnregisteredItem[];
}

// 주문 세션
export interface OrderSession {
  date?: string;
  restaurantId: string;
  rawChatText: string;
  userOrders: UserOrder[];
  unregisteredItems?: UnregisteredItem[];
}

// 합산 결과 항목
export interface AggregatedItem {
  menuName: string;
  quantity: number;
}

// 직종별 합산 결과
export interface DepartmentSummary {
  departmentName: string;
  items: AggregatedItem[];
  totalCount: number;
}

// 직종별 주문 그룹
export interface DepartmentGroupOrder {
  departmentName: string;
  userOrders: UserOrder[];
  totalCount: number;
}

// Few-shot 학습 예시
export interface FewShotExample {
  id: string;
  inputChat: string;
  expectedOutput: string;
  description: string;
  createdAt: string;
}

// AI 학습 작업 이력
export interface LearningLogItem {
  id: string;
  timestamp: string;
  action: 'ALIAS_ADD' | 'ALIAS_DELETE' | 'FEW_SHOT_ADD' | 'FEW_SHOT_DELETE' | 'PROMPT_UPDATE';
  detail: string;
}

// AI 자율 학습 데이터 스키마
export interface LearningRules {
  learnedAliasMap: Record<string, string>;
  fewShotExamples?: FewShotExample[];
  customPromptInstructions?: string[];
  learningLogs?: LearningLogItem[];
}

