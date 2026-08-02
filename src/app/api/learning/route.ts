import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const learningFilePath = path.join(process.cwd(), 'src', 'data', 'db_learning_rules.json');

export interface LearningRules {
  learnedAliasMap: Record<string, string>; // e.g. "불고기치즈" -> "불고기치즈버거"
}

function getLearningData(): LearningRules {
  try {
    if (fs.existsSync(learningFilePath)) {
      const content = fs.readFileSync(learningFilePath, 'utf-8');
      return JSON.parse(content);
    }
  } catch (e) {
    console.error('Failed to read learning DB:', e);
  }
  return { learnedAliasMap: {} };
}

function saveLearningData(data: LearningRules) {
  try {
    const dir = path.dirname(learningFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(learningFilePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to save learning DB:', e);
  }
}

export async function GET() {
  const data = getLearningData();
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const current = getLearningData();

    if (body.type === 'LEARN_ALIAS') {
      const { rawText, targetMenuName } = body;
      if (rawText && targetMenuName) {
        current.learnedAliasMap[rawText.trim()] = targetMenuName.trim();
      }
    }

    saveLearningData(current);
    return NextResponse.json({ success: true, learningRules: current });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message }, { status: 500 });
  }
}
