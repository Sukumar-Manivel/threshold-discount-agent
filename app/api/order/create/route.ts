import { NextResponse } from 'next/server';
import { authorizeBuyerOrder, getState } from '@/lib/store';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { buyerId, buyerName, authorizedPrice, isDiscountedOnAuth } = body;

    if (!buyerId || !buyerName) {
      return NextResponse.json({ error: 'buyerId and buyerName are required' }, { status: 400 });
    }

    const order = await authorizeBuyerOrder(
      buyerId,
      buyerName,
      authorizedPrice || 79900,
      isDiscountedOnAuth || false
    );

    const state = getState();
    return NextResponse.json({ success: true, order, state });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
