import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { MEMBER_DEPARTMENT_MAP as DEFAULT_MEMBER_MAP, DepartmentName } from '@/constants';

const DB_FILE_PATH = path.join(process.cwd(), 'src/data/db_members.json');

let memoryMemberMap: Record<string, DepartmentName> = DEFAULT_MEMBER_MAP;

function readMemberMapFromFile(): Record<string, DepartmentName> {
  try {
    if (fs.existsSync(DB_FILE_PATH)) {
      const fileData = fs.readFileSync(DB_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(fileData);
      if (typeof parsed === 'object' && parsed !== null) {
        memoryMemberMap = { ...DEFAULT_MEMBER_MAP, ...parsed };
        return memoryMemberMap;
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
  const memberMap = readMemberMapFromFile();
  return NextResponse.json({ success: true, memberMap });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (body.memberMap && typeof body.memberMap === 'object') {
      writeMemberMapToFile(body.memberMap as Record<string, DepartmentName>);
      return NextResponse.json({ success: true, memberMap: body.memberMap });
    }
    return NextResponse.json({ success: false, error: 'Invalid data format' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
