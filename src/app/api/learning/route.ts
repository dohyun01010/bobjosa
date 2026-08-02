import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';

const DB_FILE_PATH = path.join(process.cwd(), 'src/data/db_learning_rules.json');
let memoryRules: { learnedAliasMap: Record<string, string> } = { learnedAliasMap: {} };

function readRulesFromFile() {
  try {
    if (fs.existsSync(DB_FILE_PATH)) {
      const content = fs.readFileSync(DB_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(content);
      if (parsed && typeof parsed === 'object') {
        memoryRules = parsed;
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to read db_learning_rules.json:', e);
  }
  return memoryRules;
}

function writeRulesToFile(data: { learnedAliasMap: Record<string, string> }) {
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

export async function GET() {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('bobjosa_learning_rules')
        .select('*')
        .eq('id', 'main_rules')
        .single();

      if (!error && data && data.data) {
        return NextResponse.json(data.data);
      }
    } catch (err) {
      console.warn('Supabase learning fetch notice:', err);
    }
  }

  const rules = readRulesFromFile();
  return NextResponse.json(rules);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { alias, targetMenu } = body;

    if (!alias || !targetMenu) {
      return NextResponse.json({ success: false, error: 'Missing parameters' }, { status: 400 });
    }

    const currentRules = isSupabaseConfigured && supabase
      ? (await (async () => {
          const { data } = await supabase.from('bobjosa_learning_rules').select('*').eq('id', 'main_rules').single();
          return data?.data || readRulesFromFile();
        })())
      : readRulesFromFile();

    const updatedRules = {
      learnedAliasMap: {
        ...(currentRules.learnedAliasMap || {}),
        [alias.trim()]: targetMenu.trim(),
      },
    };

    writeRulesToFile(updatedRules);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('bobjosa_learning_rules')
          .upsert({ id: 'main_rules', data: updatedRules, updated_at: new Date().toISOString() });
      } catch (sErr) {
        console.error('Supabase learning write error:', sErr);
      }
    }

    return NextResponse.json({ success: true, rules: updatedRules });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
