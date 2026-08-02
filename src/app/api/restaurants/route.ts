import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { Restaurant } from '@/types';
import { DEFAULT_RESTAURANTS } from '@/constants';

const DB_FILE_PATH = path.join(process.cwd(), 'src/data/db_restaurants.json');

// In-memory fallback if file system is read-only
let memoryRestaurants: Restaurant[] = DEFAULT_RESTAURANTS;

function readRestaurantsFromFile(): Restaurant[] {
  try {
    if (fs.existsSync(DB_FILE_PATH)) {
      const fileData = fs.readFileSync(DB_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(fileData);
      if (Array.isArray(parsed) && parsed.length > 0) {
        memoryRestaurants = parsed;
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to read db_restaurants.json:', e);
  }
  return memoryRestaurants;
}

function writeRestaurantsToFile(restaurants: Restaurant[]): boolean {
  try {
    memoryRestaurants = restaurants;
    const dirPath = path.dirname(DB_FILE_PATH);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(restaurants, null, 2), 'utf-8');
    return true;
  } catch (e) {
    console.error('Failed to write db_restaurants.json:', e);
    return false;
  }
}

export async function GET() {
  const restaurants = readRestaurantsFromFile();
  return NextResponse.json({ success: true, restaurants });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (body.restaurants && Array.isArray(body.restaurants)) {
      writeRestaurantsToFile(body.restaurants);
      return NextResponse.json({ success: true, restaurants: body.restaurants });
    }
    return NextResponse.json({ success: false, error: 'Invalid data format' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
