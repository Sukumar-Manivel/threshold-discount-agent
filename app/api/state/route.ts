import { NextResponse } from 'next/server';
import { getState, switchProduct, updateRazorpayKeys } from '@/lib/store';

export async function GET() {
  const state = getState();
  return NextResponse.json(state);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (body.action === 'update_keys') {
      updateRazorpayKeys(body.keyId || '', body.keySecret || '');
    } else if (body.action === 'switch_product') {
      switchProduct(body.productId);
    }
    const state = getState();
    return NextResponse.json(state);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

