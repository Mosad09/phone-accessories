function BrandLogo({ type = "bag-spark", customUrl = "", size = 34, admin = false }) {
  if (type === "custom" && customUrl) {
    return (
      <img
        src={customUrl}
        alt=""
        style={{
          width: size,
          height: size,
          objectFit: "contain",
          borderRadius: 10,
        }}
      />
    );
  }

  if (admin) {
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id="brandAdminBg" x1="6" y1="6" x2="58" y2="58" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#13222b" />
            <stop offset="100%" stopColor="#0d9488" />
          </linearGradient>
        </defs>
        <rect x="2" y="2" width="60" height="60" rx="16" fill="url(#brandAdminBg)" />
        <path
          d="M32 13 48 19.5v11.2c0 10.4-6.7 19.3-16 22.3-9.3-3-16-11.9-16-22.3V19.5L32 13Z"
          fill="rgba(255,255,255,0.12)"
          stroke="#5eead4"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <rect x="24" y="25" width="7" height="7" rx="1.8" fill="#ffffff" />
        <rect x="33" y="25" width="7" height="7" rx="1.8" fill="#fde68a" />
        <rect x="24" y="34" width="7" height="7" rx="1.8" fill="#5eead4" />
        <rect x="33" y="34" width="7" height="7" rx="1.8" fill="#ffffff" />
      </svg>
    );
  }

  if (type === "tech-cart") {
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
        <rect x="2" y="2" width="60" height="60" rx="16" fill="var(--primary-color, #0d9488)" />
        <path
          d="M15 20h6l4.5 19h20l3.5-13H23"
          stroke="#ffffff"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="28" cy="46" r="3.4" fill="#fde68a" />
        <circle cx="43" cy="46" r="3.4" fill="#fde68a" />
      </svg>
    );
  }

  if (type === "shop-crown") {
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
        <rect x="2" y="2" width="60" height="60" rx="16" fill="var(--primary-color, #0d9488)" />
        <path
          d="M16 42h32l3-17-9.5 7L32 19l-9.5 13L13 25l3 17Z"
          fill="rgba(255,255,255,0.18)"
          stroke="#ffffff"
          strokeWidth="3.2"
          strokeLinejoin="round"
        />
        <rect x="18" y="45" width="28" height="4" rx="2" fill="#fde68a" />
      </svg>
    );
  }

  // Default: E-commerce Shopping Bag + Spark
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="60" height="60" rx="16" fill="var(--primary-color, #0d9488)" />
      <path d="M23 24V20a9 9 0 0 1 18 0v4" stroke="#ffffff" strokeWidth="3.4" strokeLinecap="round" />
      <path
        d="M17.5 24h29a2.5 2.5 0 0 1 2.48 2.82l-2.3 18.2A5 5 0 0 1 41.72 49H22.28a5 5 0 0 1-4.96-3.98l-2.3-18.2A2.5 2.5 0 0 1 17.5 24Z"
        fill="rgba(255,255,255,0.16)"
        stroke="#ffffff"
        strokeWidth="3.2"
        strokeLinejoin="round"
      />
      <path d="M33.5 29 27.5 37h4.5l-1.5 6.5 6.5-8.5h-4.5L33.5 29Z" fill="#fde68a" />
    </svg>
  );
}

export default BrandLogo;
