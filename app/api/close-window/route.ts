import { NextResponse } from 'next/server';
import { closeWindowEngine, getState } from '@/lib/store';

export async function POST() {
  try {
    const updatedState = await closeWindowEngine();
    return NextResponse.json({ success: true, state: updatedState });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
