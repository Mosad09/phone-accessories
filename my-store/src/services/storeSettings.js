/**
 * Dynamic Storefront Settings Schema, Theme Presets & Merge Helpers.
 * Edited exclusively via the Admin Panel and synced live via Firestore (`settings/storefront`).
 */

export const THEME_PRESETS = {
  "ocean-teal": {
    id: "ocean-teal",
    label: "Warm Stone & Ocean Teal",
    primaryColor: "#0d9488",
    primaryHover: "#0f766e",
    bgColor: "#f7f6f2",
    heroBgStart: "#10232a",
    heroBgMid: "#13363f",
    heroBgEnd: "#0f1b22",
  },
  "sage-emerald": {
    id: "sage-emerald",
    label: "Soft Cream & Sage Emerald",
    primaryColor: "#059669",
    primaryHover: "#047857",
    bgColor: "#f6f8f5",
    heroBgStart: "#11241d",
    heroBgMid: "#16382b",
    heroBgEnd: "#0e1c16",
  },
  "royal-slate": {
    id: "royal-slate",
    label: "Soft Mist & Calm Slate Blue",
    primaryColor: "#2563eb",
    primaryHover: "#1d4ed8",
    bgColor: "#f6f7fa",
    heroBgStart: "#131c2e",
    heroBgMid: "#1b2e4b",
    heroBgEnd: "#0f1726",
  },
  "warm-terracotta": {
    id: "warm-terracotta",
    label: "Warm Linen & Amber Bronze",
    primaryColor: "#d97706",
    primaryHover: "#b45309",
    bgColor: "#faf7f2",
    heroBgStart: "#261b14",
    heroBgMid: "#3b281c",
    heroBgEnd: "#1a130f",
  },
};

export const DEFAULT_STORE_SETTINGS = {
  brand: {
    namePrimary: "Vel",
    nameAccent: "trix",
    nameArPrimary: "فيل",
    nameArAccent: "تريكس",
    logoType: "bag-spark",
    logoUrl: "",
    siteUrl: "https://veltrix-store.web.app",
    trackingPrefix: "VTX",
  },
  theme: {
    preset: "ocean-teal",
    primaryColor: "#0d9488",
    primaryHover: "#0f766e",
    bgColor: "#f7f6f2",
    heroBgStart: "#10232a",
    heroBgMid: "#13363f",
    heroBgEnd: "#0f1b22",
  },
  announcement: {
    enabled: true,
    textEn: "Free delivery on orders over 1,000 EGP · Use promo code",
    textAr: "شحن مجاني للطلبات فوق 1,000 ج.م · استخدم كود الخصم",
    highlightCode: "VELTRIX10",
    suffixEn: "for 10% OFF",
    suffixAr: "لخصم 10%",
    showCopyButton: true,
  },
  shippingAndOffers: {
    freeShippingEnabled: true,
    freeShippingThreshold: 1000,
    standardShippingFee: 60,
    promoCodesEnabled: true,
    promoCodes: [
      {
        id: "promo_veltrix10",
        code: "VELTRIX10",
        type: "percent",
        value: 10,
        minSubtotal: 0,
        active: true,
        labelEn: "10% Off Everything",
        labelAr: "خصم 10% على كل الطلب",
      },
      {
        id: "promo_save50",
        code: "SAVE50",
        type: "fixed",
        value: 50,
        minSubtotal: 300,
        active: true,
        labelEn: "50 EGP Off (Orders 300+ EGP)",
        labelAr: "خصم 50 ج.م (للطلبات فوق 300 ج.م)",
      },
      {
        id: "promo_freeship",
        code: "FREESHIP",
        type: "shipping",
        value: 0,
        minSubtotal: 0,
        active: true,
        labelEn: "Free Express Shipping",
        labelAr: "شحن سريع مجاني",
      },
    ],
  },
  hero: {
    kickerEn: "Next-Gen Mobile Ecosystem",
    kickerAr: "منظومة ملحقات الجيل الجديد",
    titleEn: "Discover Premium Tech.",
    titleAr: "اكتشف أحدث التقنيات.",
    sloganEn: "Engineered for speed, protection & pure audio.",
    sloganAr: "مصممة للسرعة والحماية وصوت فائق النقاء.",
    descEn: "Elevate your everyday setup with curated cases, GaN fast chargers, power banks, and crystal-clear wireless audio gear.",
    descAr: "ارتقِ بتجربة أجهزتك مع مجموعتنا المختارة من الأغطية والشواحن السريعة وباور بانك وسماعات الصوت اللاسلكية.",
    shopCtaEn: "Shop Now",
    shopCtaAr: "تسوق الآن",
    trackCtaEn: "Track Order",
    trackCtaAr: "تتبع طلبك",
    showFeaturedCard: true,
    showStatsStrip: true,
    stat1En: "100% Authentic Gear",
    stat1Ar: "منتجات أصلية 100%",
    stat2En: "Fast Egypt Delivery",
    stat2Ar: "شحن سريع لكل مصر",
    stat3En: "Cash on Delivery",
    stat3Ar: "الدفع عند الاستلام",
  },
  sections: [
    { id: "hero", visible: true },
    { id: "categories", visible: true },
    { id: "deals", visible: true },
    { id: "catalog", visible: true },
    { id: "recent", visible: true },
    { id: "trust", visible: true },
  ],
  trustBadges: {
    enabled: true,
    items: [
      {
        id: "trust_1",
        icon: "bi-truck",
        titleEn: "Fast Egypt Delivery",
        titleAr: "توصيل سريع لكل مصر",
        descEn: "Same-day dispatch across all 27 governorates",
        descAr: "شحن سريع لجميع المحافظات في مصر",
      },
      {
        id: "trust_2",
        icon: "bi-patch-check",
        titleEn: "100% Genuine Tech",
        titleAr: "منتجات أصلية 100%",
        descEn: "Tested chargers, cables & audio gear with warranty",
        descAr: "شواحن وكابلات وسماعات مختبرة بضمان حقيقي",
      },
      {
        id: "trust_3",
        icon: "bi-wallet2",
        titleEn: "Flexible Payment",
        titleAr: "دفع مرن وآمن",
        descEn: "Cash on Delivery, Vodafone Cash & InstaPay",
        descAr: "الدفع عند الاستلام أو فودافون كاش أو إنستا باي",
      },
      {
        id: "trust_4",
        icon: "bi-headset",
        titleEn: "24/7 WhatsApp Support",
        titleAr: "دعم فوري عبر واتساب",
        descEn: "Instant help with sizing & order tracking",
        descAr: "مساعدة مستمرة ومتابعة الشحنات عبر واتساب",
      },
    ],
  },
  footer: {
    enabled: true,
    taglineEn: "Your trusted destination for flagship phone accessories, ultra-fast GaN charging, protective cases & wireless audio across Egypt.",
    taglineAr: "وجهتك الموثوقة لأفضل إكسسوارات الهواتف، شواحن GaN السريعة، الأغطية الواقية، والسماعات اللاسلكية في مصر.",
    locationEn: "Delivering across all 27 Governorates in Egypt",
    locationAr: "توصيل لجميع الـ 27 محافظة في مصر",
    whatsappNumber: "201125522130",
    phoneDisplay: "+20 112 552 2130",
    supportEmail: "",
    facebookUrl: "",
    instagramUrl: "",
    tiktokUrl: "",
    showShopLinks: true,
    showAccountLinks: true,
    showNewsletter: true,
    newsletterTitleEn: "Exclusive Drops & Coupons",
    newsletterTitleAr: "عروض حصرية وكوبونات خصم",
    newsletterDescEn: "Subscribe for new arrivals and early access to flash sales.",
    newsletterDescAr: "اشترك ليصلك كل جديد وأقوى تخفيضات المتجر أولاً بأول.",
    showPaymentPills: true,
    paymentMethods: ["Cash on Delivery", "Vodafone Cash", "InstaPay"],
    copyrightEn: "Veltrix Store. All rights reserved.",
    copyrightAr: "متجر فيل تريكس. جميع الحقوق محفوظة.",
  },
};

export function mergeStoreSettings(incoming = {}) {
  if (!incoming || typeof incoming !== "object") {
    return DEFAULT_STORE_SETTINGS;
  }

  const defaultSectionIds = DEFAULT_STORE_SETTINGS.sections.map((s) => s.id);
  const incomingSections = Array.isArray(incoming.sections)
    ? incoming.sections.filter((s) => defaultSectionIds.includes(s?.id))
    : [];
  const presentIds = new Set(incomingSections.map((s) => s.id));
  const mergedSections = [
    ...incomingSections,
    ...DEFAULT_STORE_SETTINGS.sections.filter((s) => !presentIds.has(s.id)),
  ];

  const mergedOffers = {
    ...DEFAULT_STORE_SETTINGS.shippingAndOffers,
    ...(incoming.shippingAndOffers || {}),
  };
  if (Array.isArray(incoming.shippingAndOffers?.promoCodes)) {
    mergedOffers.promoCodes = incoming.shippingAndOffers.promoCodes;
  }

  const mergedTrust = {
    ...DEFAULT_STORE_SETTINGS.trustBadges,
    ...(incoming.trustBadges || {}),
  };
  if (Array.isArray(incoming.trustBadges?.items)) {
    mergedTrust.items = incoming.trustBadges.items;
  }

  const mergedFooter = {
    ...DEFAULT_STORE_SETTINGS.footer,
    ...(incoming.footer || {}),
  };
  if (Array.isArray(incoming.footer?.paymentMethods)) {
    mergedFooter.paymentMethods = incoming.footer.paymentMethods;
  }

  return {
    brand: { ...DEFAULT_STORE_SETTINGS.brand, ...(incoming.brand || {}) },
    theme: { ...DEFAULT_STORE_SETTINGS.theme, ...(incoming.theme || {}) },
    announcement: { ...DEFAULT_STORE_SETTINGS.announcement, ...(incoming.announcement || {}) },
    shippingAndOffers: mergedOffers,
    hero: { ...DEFAULT_STORE_SETTINGS.hero, ...(incoming.hero || {}) },
    sections: mergedSections,
    trustBadges: mergedTrust,
    footer: mergedFooter,
  };
}

export function applyThemeToDocument(themeConfig = {}, darkMode = false) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const theme = { ...DEFAULT_STORE_SETTINGS.theme, ...themeConfig };
  root.style.setProperty("--primary-color", theme.primaryColor || "#0d9488");
  root.style.setProperty("--primary-hover", theme.primaryHover || "#0f766e");
  root.style.setProperty("--hero-bg-start", theme.heroBgStart || "#10232a");
  root.style.setProperty("--hero-bg-mid", theme.heroBgMid || "#13363f");
  root.style.setProperty("--hero-bg-end", theme.heroBgEnd || "#0f1b22");

  if (!darkMode && theme.bgColor) {
    root.style.setProperty("--bg-color", theme.bgColor);
  } else {
    root.style.removeProperty("--bg-color");
  }
}
