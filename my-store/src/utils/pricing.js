/**
 * Shared pricing, discount, coupon, and cart calculation utilities.
 */

export const FREE_SHIPPING_THRESHOLD = 1000;
export const STANDARD_SHIPPING_FEE = 60;

export const PROMO_CODES = {
  VELTRIX10: {
    code: "VELTRIX10",
    type: "percent",
    value: 10,
    minSubtotal: 0,
    labelKey: "cart.promo_veltrix10",
  },
  SAVE50: {
    code: "SAVE50",
    type: "fixed",
    value: 50,
    minSubtotal: 300,
    labelKey: "cart.promo_save50",
  },
  FREESHIP: {
    code: "FREESHIP",
    type: "shipping",
    value: 0,
    minSubtotal: 0,
    labelKey: "cart.promo_freeship",
  },
};

export function hasDiscount(product) {
  if (!product) return false;
  const price = Number(product.sellPrice ?? product.price) || 0;
  const discountPrice = Number(product.discountPrice) || 0;
  return discountPrice > 0 && discountPrice < price;
}

export function getEffectivePrice(product) {
  if (!product) return 0;
  const basePrice = Number(product.sellPrice ?? product.price) || 0;
  return hasDiscount(product) ? Number(product.discountPrice) : basePrice;
}

export function getOriginalPrice(product) {
  if (!product) return 0;
  return Number(product.sellPrice ?? product.price) || 0;
}

export function getDiscountPercent(product) {
  if (!hasDiscount(product)) return 0;
  const original = getOriginalPrice(product);
  const effective = getEffectivePrice(product);
  if (original <= 0) return 0;
  return Math.round(((original - effective) / original) * 100);
}

export function formatPrice(price, language = "en") {
  if (!price && price !== 0) return "0";
  const locale = language === "ar" ? "ar-EG" : "en-EG";
  return Number(price).toLocaleString(locale);
}

export function buildCartItemKey(productId, options = {}) {
  const color = String(options.selectedColor || "").trim();
  const size = String(options.selectedSize || "").trim();
  if (!color && !size) return productId;
  return `${productId}__${color}__${size}`;
}

export function getCartItemKey(item) {
  return item?.cartKey || buildCartItemKey(item?.id, item);
}

export function validatePromoCode(code, subtotal) {
  const normalized = String(code || "").trim().toUpperCase();
  if (!normalized) return { valid: false, reason: "empty" };

  const promo = PROMO_CODES[normalized];
  if (!promo) return { valid: false, reason: "invalid" };

  if (subtotal < promo.minSubtotal) {
    return { valid: false, reason: "min_not_met", minSubtotal: promo.minSubtotal, promo };
  }

  return { valid: true, promo };
}

export function calculateCartTotals(cart = [], couponCode = "") {
  const safeCart = Array.isArray(cart) ? cart : [];
  const originalSubtotal = safeCart.reduce(
    (sum, item) => sum + getOriginalPrice(item) * Math.max(1, Number(item.qty) || 1),
    0
  );
  const subtotal = safeCart.reduce(
    (sum, item) => sum + getEffectivePrice(item) * Math.max(1, Number(item.qty) || 1),
    0
  );
  const itemDiscountSavings = Math.max(0, originalSubtotal - subtotal);

  const validation = couponCode ? validatePromoCode(couponCode, subtotal) : { valid: false };
  const appliedPromo = validation.valid ? validation.promo : null;

  let couponDiscount = 0;
  if (appliedPromo) {
    if (appliedPromo.type === "percent") {
      couponDiscount = Math.round((subtotal * appliedPromo.value) / 100);
    } else if (appliedPromo.type === "fixed") {
      couponDiscount = Math.min(subtotal, appliedPromo.value);
    }
  }

  const discountedSubtotal = Math.max(0, subtotal - couponDiscount);
  const isFreeShipping =
    safeCart.length === 0 ||
    discountedSubtotal >= FREE_SHIPPING_THRESHOLD ||
    appliedPromo?.type === "shipping";
  const shipping = safeCart.length === 0 || isFreeShipping ? 0 : STANDARD_SHIPPING_FEE;
  const total = Math.max(0, discountedSubtotal + shipping);

  const freeShippingProgress = Math.min(
    100,
    Math.round((discountedSubtotal / FREE_SHIPPING_THRESHOLD) * 100)
  );
  const amountToFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD - discountedSubtotal);

  return {
    subtotal,
    originalSubtotal,
    itemDiscountSavings,
    coupon: appliedPromo,
    couponDiscount,
    shipping,
    isFreeShipping,
    freeShippingProgress,
    amountToFreeShipping,
    total,
  };
}
