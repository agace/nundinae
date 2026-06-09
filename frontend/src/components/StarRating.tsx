import { IconStar } from './Icons';

interface StarRatingProps {
  value: number;
  max?: number;
  size?: number;
  onChange?: (v: number) => void;
  showValue?: boolean;
}

export function StarRating({ value, max = 5, size = 16, onChange, showValue }: StarRatingProps) {
  const interactive = Boolean(onChange);
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
      <span style={{ display: 'inline-flex', gap: '2px' }}>
        {Array.from({ length: max }).map((_, i) => {
          const filled = i < Math.round(value);
          return (
            <button
              key={i}
              type="button"
              aria-label={`${i + 1} estrelas`}
              onClick={interactive ? () => onChange!(i + 1) : undefined}
              style={{
                color: filled ? 'var(--gold-500)' : 'rgba(212, 164, 58, 0.3)',
                padding: 0,
                display: 'inline-flex',
                cursor: interactive ? 'pointer' : 'default',
                transition: 'transform 0.15s ease, color 0.2s ease',
              }}
            >
              <IconStar filled={filled} size={size} />
            </button>
          );
        })}
      </span>
      {showValue && (
        <span style={{ fontSize: '0.8rem', color: 'var(--stone-400)' }}>
          {value > 0 ? value.toFixed(1) : '—'}
        </span>
      )}
    </span>
  );
}
