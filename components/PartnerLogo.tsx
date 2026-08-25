import Image from 'next/image';

function PartnerPlaceholderIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 2h8" />
      <path d="M9 2v2.5c0 .8-.4 1.5-1 2L6 8.5C5.4 9 5 9.7 5 10.5V20a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-9.5c0-.8-.4-1.5-1-2L16 6.5c-.6-.5-1-1.2-1-2V2" />
    </svg>
  );
}

export default function PartnerLogo({
  name,
  logo,
  sizes,
}: {
  name:  string;
  logo?: string;
  sizes: string;
}) {
  if (logo) {
    return <Image src={logo} alt={name} fill className="object-contain p-6" sizes={sizes} />;
  }
  return (
    <div className="w-full h-full flex items-center justify-center text-[#731515]/30">
      <PartnerPlaceholderIcon />
    </div>
  );
}
