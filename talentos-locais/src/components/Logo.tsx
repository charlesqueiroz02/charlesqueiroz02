export function Logo({ light }: { light?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <svg viewBox="0 0 512 512" className="size-8" aria-hidden>
        <rect width="512" height="512" rx="112" fill="#0f4a32" />
        <path d="M256 96c-70 0-126 55-126 124 0 92 126 196 126 196s126-104 126-196c0-69-56-124-126-124z" fill="#22b35e" />
        <circle cx="256" cy="214" r="50" fill="#0f4a32" />
        <path d="M232 214l17 17 33-35" stroke="#fff" strokeWidth="16" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className={`text-[19px] font-extrabold tracking-tight ${light ? 'text-white' : 'text-brand-800'}`}>
        Talentos<span className="text-lime-500">Locais</span>
      </span>
    </span>
  );
}
