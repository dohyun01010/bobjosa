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
  rawText: string;               // 원본 텍스트 (예: "망고스파클링1", "마마세트 1개 추가해줘")
  matchedMenuId: string | null;  // 매칭된 메뉴 ID
  matchedMenuName: string | null;
  quantity: number;
  status: 'confirmed' | 'ambiguous' | 'error';
  candidates?: { menuId: string; menuName: string; similarity: number }[];
}

// AI 추천 기존 메뉴 연동 후보
export interface ExistingMatchCandidate {
  menuId: string;
  menuName: string;
  similarity?: number;
}

// AI가 유추한 DB 미등록 메뉴 항목
export interface UnregisteredItem {
  id: string;
  userName: string;              // 주문한 사람 (예: "윤준영")
  departmentName?: string;       // 속한 직종 (예: "메카트로닉스")
  rawText: string;               // 원본 텍스트 ("마마치킨버거 세트 1개")
  suggestedName: string;         // AI가 유추한 메뉴명 ("마마치킨버거(세트)")
  suggestedAliases: string[];    // AI가 유추한 별칭 목록
  suggestedExistingMatches?: ExistingMatchCandidate[]; // 기존 DB 메뉴 중 이것일 가능성이 높은 후보들
  quantity: number;
}

// 사람별 주문
export interface UserOrder {
  id: string;
  userName: string;              // 예: "조예성", "김현수"
  departmentName: string;        // 예: "메카트로닉스", "IT"
  time?: string;                 // 예: "오후 8:21"
  rawText: string;               // 원본 텍스트 구절
  items: ParsedOrderItem[];
}

// 직종별 그룹화된 주문
export interface DepartmentGroupOrder {
  departmentName: string;
  userOrders: UserOrder[];
  totalCount: number;
}

// AI 전체 분석 결과
export interface AiParseResult {
  userOrders: UserOrder[];
  unregisteredItems: UnregisteredItem[];
}

// 주문 세션
export interface OrderSession {
  date: string;
  restaurantId: string;
  rawChatText: string;           // 카카오톡 채팅 전문
  userOrders: UserOrder[];       // 사람별 분석 내역
  unregisteredItems: UnregisteredItem[]; // 유추된 미등록 메뉴 목록
}

// 합산 결과 항목
export interface AggregatedItem {
  menuName: string;
  quantity: number;
}

// 직종별 요약
export interface DepartmentSummary {
  departmentName: string;
  items: AggregatedItem[];
  totalCount: number;
}
