# 🍚 밥조사 (Bobjosa) - 스마트 카카오톡 주문 집계 시스템

카카오톡 대화방의 무분별한 식사 주문 메시지를 AI(Gemini 1.5 Flash)로 자동 정제하고, 직종별/메뉴별로 스마트하게 이중 재검증하여 합산해 주는 웹 어플리케이션입니다.

---

## 🔗 주요 관련 링크 (Useful Links)

- 🔑 **Google AI Studio API Keys**: [https://aistudio.google.com/app/api-keys?project=gen-lang-client-0101333658](https://aistudio.google.com/app/api-keys?project=gen-lang-client-0101333658)
- 🚀 **Vercel 대시보드 / 배포 관리**: [https://vercel.com/dohyun01010s-projects/bobjosa](https://vercel.com/dohyun01010s-projects/bobjosa)

---

## 🌟 주요 기능 (Key Features)

1. **카카오톡 대화 AI 파싱 & 이중 자동 재검증**:
   - 무분별한 대화 텍스트에서 주문자, 메뉴, 수량을 정밀 추출합니다.
   - 타임스탬프(`오후 3:36` 등) 제거 및 사람별 메뉴 한 줄씩 정렬.
2. **양방향 실시간 동기화 (Two-Way Sync Architecture)**:
   - 유저가 파싱 카드에서 단품/세트 클릭 및 수량 수정 시 카톡 대화 원문에 실시간 자동 연동.
3. **스마트 맵기 & 옵션 태그 정제**:
   - `안맵게`, `엄청 안맵게`, `매우 안맵게` ➔ `떡볶이(안맵게)` 통일.
   - `치즈버거 치즈 2번추가 1` ➔ `치즈버거 1 (치즈 2번추가)` 옵션 태그화.
4. **사람 개입 질문 카드 (Human-in-the-Loop)**:
   - AI 확신도가 낮은 애매한 어휘는 유저가 클릭 한 번으로 `[메뉴로 확정]` 또는 `[잡담/제외]` 판단.
5. **실시간 공유 DB 동기화 & 셀프 러닝 자율 학습**:
   - 식당/메뉴 DB 및 구성원 명단 공유 DB 실시간 동기화.

---

## 🚀 개발 및 실행 (Getting Started)

```bash
npm run dev
```

브라우저에서 `http://localhost:3000` 접속 후 사용 가능합니다.
