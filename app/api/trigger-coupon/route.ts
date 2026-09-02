import { NextResponse } from 'next/server';
import { checkThresholdAndTriggerCoupon, getState, setPhoneDWatching } from '@/lib/store';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (body.action === 'set_watching') {
      setPhoneDWatching(body.prompt || 'buy this for me only if the price drops, ask before you pay');
    } else if (body.action === 'force_trigger') {
      checkThresholdAndTriggerCoupon(true);
    }
    const state = getState();
    return NextResponse.json({ success: true, state });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
