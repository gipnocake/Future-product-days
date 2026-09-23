export function Rating({ value, label }: { value: number; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 font-semibold text-amber-600" aria-label={label}>
      <svg viewBox="0 0 20 20" className="h-4 w-4 fill-current" aria-hidden="true">
        <path d="M10 1.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L10 14.9l-5.2 2.7 1-5.8L1.5 7.7l5.9-.8z" />
      </svg>
      {value.toFixed(1)}
    </span>
  );
}
