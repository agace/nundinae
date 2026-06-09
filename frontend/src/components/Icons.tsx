interface IconProps {
  size?: number;
  stroke?: string;
  fill?: string;
  className?: string;
  style?: React.CSSProperties;
}

function Svg({ size = 18, stroke = 'currentColor', fill = 'none', children, style, className }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke={stroke}
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{ flexShrink: 0, ...style }}
    >
      {children}
    </svg>
  );
}

export const IconCart = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="9" cy="20" r="1.4" />
    <circle cx="18" cy="20" r="1.4" />
    <path d="M3 4h2.2l2.1 11a2 2 0 0 0 2 1.6h8.7a2 2 0 0 0 2-1.6L21.5 8H6.3" />
  </Svg>
);

export const IconStore = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 9 4.5 4h15L21 9" />
    <path d="M4 9v11h16V9" />
    <path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0" />
    <path d="M10 20v-6h4v6" />
  </Svg>
);

export const IconPackage = (p: IconProps) => (
  <Svg {...p}>
    <path d="M21 8 12 3 3 8v8l9 5 9-5Z" />
    <path d="M3 8l9 5 9-5" />
    <path d="M12 13v8" />
  </Svg>
);

export const IconStar = ({ filled = false, ...p }: IconProps & { filled?: boolean }) => (
  <Svg {...p} fill={filled ? 'currentColor' : 'none'}>
    <path d="m12 2 2.9 6.1 6.6.9-4.8 4.6 1.2 6.5L12 17l-5.9 3.1 1.2-6.5L2.5 9l6.6-.9L12 2Z" />
  </Svg>
);

export const IconCheck = (p: IconProps) => (
  <Svg {...p}><path d="m4 12 5 5L20 6" /></Svg>
);

export const IconPlus = (p: IconProps) => (
  <Svg {...p}><path d="M12 5v14M5 12h14" /></Svg>
);

export const IconMinus = (p: IconProps) => (
  <Svg {...p}><path d="M5 12h14" /></Svg>
);

export const IconSearch = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </Svg>
);

export const IconInfo = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8h.01M11 12h1v5h1" />
  </Svg>
);

export const IconColumn = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 3h16v3H4z" />
    <path d="M4 18h16v3H4z" />
    <path d="M6 6v12M10 6v12M14 6v12M18 6v12" />
  </Svg>
);

export const IconCreditCard = (p: IconProps) => (
  <Svg {...p}>
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <path d="M2 10h20" />
    <path d="M6 15h3" />
  </Svg>
);

export const IconBolt = (p: IconProps) => (
  <Svg {...p}>
    <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />
  </Svg>
);

export const IconDocument = (p: IconProps) => (
  <Svg {...p}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
    <path d="M14 2v6h6" />
    <path d="M8 13h8M8 17h5" />
  </Svg>
);

export const IconTrash = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 6h18" />
    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <path d="M5 6v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6" />
    <path d="M10 11v6M14 11v6" />
  </Svg>
);

export const IconLogout = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="m16 17 5-5-5-5" />
    <path d="M21 12H9" />
  </Svg>
);

export const IconSparkle = (p: IconProps) => (
  <Svg {...p} fill="currentColor" stroke="none">
    <path d="M12 2 13.5 8.5 20 10l-6.5 1.5L12 18l-1.5-6.5L4 10l6.5-1.5Z" />
  </Svg>
);

export const IconHeart = ({ filled = false, ...p }: IconProps & { filled?: boolean }) => (
  <Svg {...p} fill={filled ? 'currentColor' : 'none'}>
    <path d="M12 20.5 4.2 12.7a4.5 4.5 0 0 1 0-6.4 4.5 4.5 0 0 1 6.4 0l1.4 1.4 1.4-1.4a4.5 4.5 0 0 1 6.4 0 4.5 4.5 0 0 1 0 6.4Z" />
  </Svg>
);

export const IconBell = ({ filled = false, ...p }: IconProps & { filled?: boolean }) => (
  <Svg {...p} fill={filled ? 'currentColor' : 'none'}>
    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.7 21a2 2 0 0 1-3.4 0" />
  </Svg>
);

export const IconTruck = (p: IconProps) => (
  <Svg {...p}>
    <path d="M1 3h15v13H1z" />
    <path d="M16 8h4l3 3v5h-7V8Z" />
    <circle cx="5.5" cy="18.5" r="2" />
    <circle cx="18.5" cy="18.5" r="2" />
  </Svg>
);

export const IconChat = (p: IconProps) => (
  <Svg {...p}>
    <path d="M21 11.5a8.4 8.4 0 0 1-8.5 8.5 8.6 8.6 0 0 1-3.8-.9L3 21l1.9-5.7A8.4 8.4 0 0 1 4 11.5 8.5 8.5 0 0 1 12.5 3 8.5 8.5 0 0 1 21 11.5Z" />
  </Svg>
);

export const IconTag = (p: IconProps) => (
  <Svg {...p}>
    <path d="M20.6 13.4 12 22l-9-9V4h9l8.6 8.6a1.4 1.4 0 0 1 0 2Z" />
    <circle cx="7.5" cy="7.5" r="1.4" fill="currentColor" stroke="none" />
  </Svg>
);

export const IconLaurel = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 21c-5-2-7-6-7-10 2 0 4 1 6 3" />
    <path d="M12 21c5-2 7-6 7-10-2 0-4 1-6 3" />
    <path d="M12 21V10" />
    <path d="M9 14c-1-1-2-1-3-1" />
    <path d="M15 14c1-1 2-1 3-1" />
    <path d="M10 17c-1-1-2-1-3-1" />
    <path d="M14 17c1-1 2-1 3-1" />
  </Svg>
);
