import { NextResponse } from 'next/server';
import { getState, resetState } from '@/lib/store';

export async function POST() {
  const state = resetState();
  return NextResponse.json({ success: true, state });
}
