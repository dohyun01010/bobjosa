import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { DepartmentName, MEMBER_DEPARTMENT_MAP } from '@/constants';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';

const DB_FILE_PATH = path.join(process.cwd(), 'src/data/db_members.json');
let memoryMemberMap: Record<string, DepartmentName> = MEMBER_DEPARTMENT_MAP;

function readMemberMapFromFile(): Record<string, DepartmentName> {
  try {
    if (fs.existsSync(DB_FILE_PATH)) {
      const fileData = fs.readFileSync(DB_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(fileData);
      if (parsed && typeof parsed === 'object') {
        memoryMemberMap = parsed;
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to read db_members.json:', e);
  }
  return memoryMemberMap;
}

function writeMemberMapToFile(map: Record<string, DepartmentName>): boolean {
  try {
    memoryMemberMap = map;
    const dirPath = path.dirname(DB_FILE_PATH);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(map, null, 2), 'utf-8');
    return true;
  } catch (e) {
    console.error('Failed to write db_members.json:', e);
    return false;
  }
}

export async function GET() {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('bobjosa_members')
        .select('*')
        .eq('id', 'main_members')
        .single();

      if (!error && data && data.data) {
        return NextResponse.json({ success: true, memberMap: data.data, source: 'supabase' });
      }
    } catch (err) {
      console.warn('Supabase members fetch notice:', err);
    }
  }

  const memberMap = readMemberMapFromFile();
  return NextResponse.json({ success: true, memberMap, source: 'file' });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (body.memberName && body.departmentName) {
      const currentMap = isSupabaseConfigured && supabase
        ? (await (async () => {
            const { data } = await supabase.from('bobjosa_members').select('*').eq('id', 'main_members').single();
            return data?.data || readMemberMapFromFile();
          })())
        : readMemberMapFromFile();

      const updatedMap = {
        ...currentMap,
        [body.memberName.trim()]: body.departmentName,
      };

      writeMemberMapToFile(updatedMap);

      if (isSupabaseConfigured && supabase) {
        try {
          await supabase
            .from('bobjosa_members')
            .upsert({ id: 'main_members', data: updatedMap, updated_at: new Date().toISOString() });
        } catch (sErr) {
          console.error('Supabase members write error:', sErr);
        }
      }

      return NextResponse.json({ success: true, memberMap: updatedMap });
    }
    return NextResponse.json({ success: false, error: 'Invalid payload' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
