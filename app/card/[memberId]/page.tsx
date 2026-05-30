import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import CardShareView from './CardShareView';

interface Props {
  params: Promise<{ memberId: string }>;
}

async function getCardData(memberId: string) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = getSupabaseAdmin() as any;

    const { data: profile } = await db
      .from('profiles')
      .select('full_name, tier, member_since')
      .eq('member_id', memberId)
      .maybeSingle();

    if (!profile) return null;

    return {
      memberId,
      name:        profile.full_name ?? 'Vivo Member',
      tier:        profile.tier ?? 'Member',
      memberSince: profile.member_since ?? new Date().getFullYear(),
    };
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { memberId } = await params;
  const card = await getCardData(memberId);

  if (!card) return { title: 'Vivo Wine Club' };

  return {
    title:       `${card.name} — Vivo Wine Club`,
    description: `${card.name} is a ${card.tier} of Vivo Wine Club, member since ${card.memberSince}.`,
    openGraph: {
      title:       `${card.name} — Vivo Wine Club`,
      description: `${card.tier} · Member since ${card.memberSince}`,
      siteName:    'Vivo Wine Club',
    },
  };
}

export default async function CardPage({ params }: Props) {
  const { memberId } = await params;
  const card = await getCardData(memberId);

  if (!card) notFound();

  return <CardShareView card={card} />;
}
