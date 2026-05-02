import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-04-22.dahlia',
});

interface CartItem {
  id: number;
  name: string;
  price: number;   // euros, integer (e.g. 35)
  quantity: number;
  icon: string;
}

export async function POST(request: Request) {
  try {
    const { items }: { items: CartItem[] } = await request.json();

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: items.map((item) => ({
        quantity: item.quantity,
        price_data: {
          currency: 'eur',
          unit_amount: Math.round(item.price * 100), // cents
          product_data: {
            name: item.name,
            description: `Vivo Wine Club — ${item.name}`,
          },
        },
      })),
      success_url: 'https://vivowineclub.com/checkout/success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://vivowineclub.com/wear-the-club',
      shipping_address_collection: {
        allowed_countries: ['IT', 'FR', 'DE', 'ES', 'GB', 'CH', 'AT', 'BE', 'NL', 'PT'],
      },
      billing_address_collection: 'required',
      phone_number_collection: { enabled: true },
      locale: 'auto',
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('Stripe checkout error:', err);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}
