import { NextResponse } from 'next/server';
import { addSimulatedOrders, getState } from '@/lib/store';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const count = body.count || 1;
    await addSimulatedOrders(count);
    const state = getState();
    return NextResponse.json({ success: true, state });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
