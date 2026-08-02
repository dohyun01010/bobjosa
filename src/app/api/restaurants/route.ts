import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { Restaurant } from '@/types';
import { DEFAULT_RESTAURANTS } from '@/constants';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';

const DB_FILE_PATH = path.join(process.cwd(), 'src/data/db_restaurants.json');
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
  // 1. If Supabase is configured, fetch from Supabase Cloud DB
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('bobjosa_restaurants')
        .select('*')
        .eq('id', 'main_restaurants')
        .single();

      if (!error && data && Array.isArray(data.data) && data.data.length > 0) {
        return NextResponse.json({ success: true, restaurants: data.data, source: 'supabase' });
      }
    } catch (err) {
      console.warn('Supabase fetch notice, falling back to local storage:', err);
    }
  }

  // 2. Fallback to local file / memory
  const restaurants = readRestaurantsFromFile();
  return NextResponse.json({ success: true, restaurants, source: 'file' });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (body.restaurants && Array.isArray(body.restaurants)) {
      const restaurantsData = body.restaurants;

      // Always save to file/memory local fallback
      writeRestaurantsToFile(restaurantsData);

      // Save to Supabase Cloud DB if configured
      if (isSupabaseConfigured && supabase) {
        try {
          const { error } = await supabase
            .from('bobjosa_restaurants')
            .upsert({ id: 'main_restaurants', data: restaurantsData, updated_at: new Date().toISOString() });

          if (error) {
            console.error('Supabase restaurants upsert error:', error);
          }
        } catch (sErr) {
          console.error('Supabase write exception:', sErr);
        }
      }

      return NextResponse.json({ success: true, restaurants: restaurantsData });
    }
    return NextResponse.json({ success: false, error: 'Invalid data format' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
