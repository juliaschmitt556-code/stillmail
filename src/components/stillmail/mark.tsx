export function StillmailMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      aria-hidden="true"
      fill="none"
    >
      <rect x="3.5" y="5.5" width="25" height="21" rx="2.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="7" y="9" width="18" height="14" fill="currentColor" opacity="0.16" />
      <path d="M7 20.5 13.5 14l4 4 2.5-2.5L25 21" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
