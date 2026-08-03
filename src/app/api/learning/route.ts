import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import { LearningRules, FewShotExample, LearningLogItem } from '@/types';

const DB_FILE_PATH = path.join(process.cwd(), 'src/data/db_learning_rules.json');

const DEFAULT_RULES: LearningRules = {
  learnedAliasMap: {
    '고국': '고기국수',
  },
  fewShotExamples: [
    {
      id: 'fs-default-1',
      inputChat: '오후 12:15 김철수 고국 하나요',
      expectedOutput: '김철수: 고기국수 1개',
      description: '줄임말 "고국" -> "고기국수" 자동 매핑 예시',
      createdAt: new Date().toISOString(),
    },
  ],
  customPromptInstructions: [
    '메뉴명의 줄임말(예: "고국" -> "고기국수", "불싸이" -> "싸이버거")이 들어오면 등록된 학습 별칭 규칙을 최우선으로 적용할 것.',
  ],
  learningLogs: [
    {
      id: 'log-init',
      timestamp: new Date().toISOString(),
      action: 'ALIAS_ADD',
      detail: '기본 AI 학습 규칙 "고국" ➔ "고기국수" 초기화 완료',
    },
  ],
};

let memoryRules: LearningRules = DEFAULT_RULES;

function normalizeRules(raw: any): LearningRules {
  if (!raw || typeof raw !== 'object') return DEFAULT_RULES;
  return {
    learnedAliasMap: raw.learnedAliasMap && typeof raw.learnedAliasMap === 'object' ? raw.learnedAliasMap : {},
    fewShotExamples: Array.isArray(raw.fewShotExamples) ? raw.fewShotExamples : (DEFAULT_RULES.fewShotExamples || []),
    customPromptInstructions: Array.isArray(raw.customPromptInstructions) ? raw.customPromptInstructions : (DEFAULT_RULES.customPromptInstructions || []),
    learningLogs: Array.isArray(raw.learningLogs) ? raw.learningLogs : (DEFAULT_RULES.learningLogs || []),
  };
}

function readRulesFromFile(): LearningRules {
  try {
    if (fs.existsSync(DB_FILE_PATH)) {
      const content = fs.readFileSync(DB_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(content);
      if (parsed && typeof parsed === 'object') {
        memoryRules = normalizeRules(parsed);
        return memoryRules;
      }
    }
  } catch (e) {
    console.error('Failed to read db_learning_rules.json:', e);
  }
  return memoryRules;
}

function writeRulesToFile(data: LearningRules) {
  try {
    memoryRules = data;
    const dir = path.dirname(DB_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to write db_learning_rules.json:', e);
  }
}

async function getMergedRules(): Promise<LearningRules> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('bobjosa_learning_rules')
        .select('*')
        .eq('id', 'main_rules')
        .single();

      if (!error && data && data.data) {
        return normalizeRules(data.data);
      }
    } catch (err) {
      console.warn('Supabase learning fetch notice:', err);
    }
  }
  return readRulesFromFile();
}

export async function GET() {
  const rules = await getMergedRules();
  return NextResponse.json(rules);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, alias, targetMenu, fewShot, id, customInstructions } = body;

    let currentRules = await getMergedRules();
    let updatedAliasMap = { ...(currentRules.learnedAliasMap || {}) };
    let updatedFewShot = [...(currentRules.fewShotExamples || [])];
    let updatedInstructions = [...(currentRules.customPromptInstructions || [])];
    let updatedLogs = [...(currentRules.learningLogs || [])];

    const nowIso = new Date().toISOString();

    if (action === 'add_alias' || (!action && alias && targetMenu)) {
      const cleanAlias = alias?.trim();
      const cleanTarget = targetMenu?.trim();
      if (!cleanAlias || !cleanTarget) {
        return NextResponse.json({ success: false, error: 'Alias and targetMenu are required' }, { status: 400 });
      }
      updatedAliasMap[cleanAlias] = cleanTarget;
      updatedLogs.unshift({
        id: `log-${Date.now()}`,
        timestamp: nowIso,
        action: 'ALIAS_ADD',
        detail: `별칭 추가: "${cleanAlias}" ➔ "${cleanTarget}"`,
      });
    } else if (action === 'delete_alias') {
      const cleanAlias = alias?.trim();
      if (cleanAlias && updatedAliasMap[cleanAlias]) {
        delete updatedAliasMap[cleanAlias];
        updatedLogs.unshift({
          id: `log-${Date.now()}`,
          timestamp: nowIso,
          action: 'ALIAS_DELETE',
          detail: `별칭 삭제: "${cleanAlias}"`,
        });
      }
    } else if (action === 'add_fewshot') {
      if (!fewShot || !fewShot.inputChat || !fewShot.expectedOutput) {
        return NextResponse.json({ success: false, error: 'Invalid fewShot data' }, { status: 400 });
      }
      const newExample: FewShotExample = {
        id: `fs-${Date.now()}`,
        inputChat: fewShot.inputChat.trim(),
        expectedOutput: fewShot.expectedOutput.trim(),
        description: fewShot.description?.trim() || '사용자 정의 학습 예시',
        createdAt: nowIso,
      };
      updatedFewShot.unshift(newExample);
      updatedLogs.unshift({
        id: `log-${Date.now()}`,
        timestamp: nowIso,
        action: 'FEW_SHOT_ADD',
        detail: `대화 학습 예시 추가: "${newExample.inputChat.substring(0, 20)}..."`,
      });
    } else if (action === 'delete_fewshot') {
      if (id) {
        updatedFewShot = updatedFewShot.filter(item => item.id !== id);
        updatedLogs.unshift({
          id: `log-${Date.now()}`,
          timestamp: nowIso,
          action: 'FEW_SHOT_DELETE',
          detail: `대화 학습 예시 삭제 (ID: ${id})`,
        });
      }
    } else if (action === 'update_instructions') {
      if (Array.isArray(customInstructions)) {
        updatedInstructions = customInstructions.map((s: string) => s.trim()).filter(Boolean);
        updatedLogs.unshift({
          id: `log-${Date.now()}`,
          timestamp: nowIso,
          action: 'PROMPT_UPDATE',
          detail: `AI 프롬프트 특수 지시사항 업데이트 (${updatedInstructions.length}개 규칙)`,
        });
      }
    }

    // Max 50 log items
    if (updatedLogs.length > 50) {
      updatedLogs = updatedLogs.slice(0, 50);
    }

    const updatedRules: LearningRules = {
      learnedAliasMap: updatedAliasMap,
      fewShotExamples: updatedFewShot,
      customPromptInstructions: updatedInstructions,
      learningLogs: updatedLogs,
    };

    writeRulesToFile(updatedRules);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('bobjosa_learning_rules')
          .upsert({ id: 'main_rules', data: updatedRules, updated_at: nowIso });
      } catch (sErr) {
        console.error('Supabase learning write error:', sErr);
      }
    }

    return NextResponse.json({ success: true, rules: updatedRules });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

