# 🍚 밥조사 (Bobjosa) - 스마트 카카오톡 주문 집계 시스템

카카오톡 대화방의 무분별한 식사 주문 메시지를 AI(Gemini 1.5 Flash)로 자동 정제하고, 직종별/메뉴별로 스마트하게 이중 재검증하여 합산해 주는 웹 어플리케이션입니다.

---

## 🔗 주요 관련 링크 (Useful Links)

- 🔑 **Google AI Studio API Keys**: [https://aistudio.google.com/app/api-keys?project=gen-lang-client-0101333658](https://aistudio.google.com/app/api-keys?project=gen-lang-client-0101333658)
- 🚀 **Vercel 대시보드 / 배포 관리**: [https://vercel.com/dohyun01010s-projects/bobjosa](https://vercel.com/dohyun01010s-projects/bobjosa)

---

## ⚡ Supabase 클라우드 DB 연동 가이드 (Real-time Multi-User Cloud Sync)

모든 사용자가 24시간 동기화되는 실시간 공유 DB를 사용하려면 Supabase 대시보드의 **SQL Editor**에 아래 쿼리를 복사하여 한 번만 실행하세요:

```sql
-- 1. 식당 & 메뉴 정보 테이블
CREATE TABLE IF NOT EXISTS bobjosa_restaurants (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 구성원 직종 명단 테이블
CREATE TABLE IF NOT EXISTS bobjosa_members (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. AI 자율 학습 별칭 테이블
CREATE TABLE IF NOT EXISTS bobjosa_learning_rules (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 보안 허용 정책
ALTER TABLE bobjosa_restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE bobjosa_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE bobjosa_learning_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow Public Access Restaurants" ON bobjosa_restaurants FOR ALL USING (true);
CREATE POLICY "Allow Public Access Members" ON bobjosa_members FOR ALL USING (true);
CREATE POLICY "Allow Public Access Learning" ON bobjosa_learning_rules FOR ALL USING (true);
```

그리고 `.env.local` 또는 Vercel Environment Variables 설정에 아래 변수를 추가하면 즉시 100% 클라우드 DB 모드로 전환됩니다:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

---

## 🌟 주요 기능 (Key Features)

1. **Supabase 클라우드 실시간 동기화 & 하이브리드 Fallback**:
   - Supabase가 설정되면 전 세계 모든 사용자가 동일한 식당/메뉴/명단 DB를 실시간 100% 공유합니다.
   - 키가 없더라도 기존 로컬 하이브리드 DB 시스템으로 자동 자동전환되어 오류 없이 동작합니다.
2. **카카오톡 대화 AI 파싱 & 이중 자동 재검증**:
   - 대화 텍스트에서 주문자, 메뉴, 수량을 정밀 추출합니다.
   - 타임스탬프(`오후 3:36` 등) 제거 및 사람별 메뉴 한 줄씩 정렬.
3. **양방향 실시간 동기화 (Two-Way Sync Architecture)**:
   - 유저가 파싱 카드에서 단품/세트 클릭 및 수량 수정 시 카톡 대화 원문에 실시간 자동 연동.
4. **스마트 맵기 & 옵션 태그 정제**:
   - `안맵게`, `엄청 안맵게` ➔ `떡볶이(안맵게)` 통일.
   - `치즈버거 치즈 2번추가 1` ➔ `치즈버거 1 (치즈 2번추가)` 옵션 태그화.
5. **사람 개입 질문 카드 (Human-in-the-Loop)**:
   - AI 확신도가 낮은 애매한 어휘는 유저가 클릭 한 번으로 `[메뉴로 확정]` 또는 `[잡담/제외]` 판단.

---

## 🚀 개발 및 실행 (Getting Started)

```bash
npm run dev
```

브라우저에서 `http://localhost:3000` 접속 후 사용 가능합니다.
