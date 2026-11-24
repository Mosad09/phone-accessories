import { DEFAULT_STORE_SETTINGS } from "../services/storeSettings";

/**
 * Shared pricing, discount, coupon, and dynamic shipping calculation utilities.
 */

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

export function getActivePromoCodes(shippingAndOffers) {
  const config = shippingAndOffers || DEFAULT_STORE_SETTINGS.shippingAndOffers;
  if (config.promoCodesEnabled === false) return [];
  return (config.promoCodes || []).filter((p) => p && p.active !== false && String(p.code || "").trim());
}

export function validatePromoCode(code, subtotal, shippingAndOffers) {
  const normalized = String(code || "").trim().toUpperCase();
  if (!normalized) return { valid: false, reason: "empty" };

  const activeCodes = getActivePromoCodes(shippingAndOffers);
  const promo = activeCodes.find((p) => String(p.code || "").trim().toUpperCase() === normalized);
  if (!promo) return { valid: false, reason: "invalid" };

  const minSubtotal = Number(promo.minSubtotal) || 0;
  if (subtotal < minSubtotal) {
    return { valid: false, reason: "min_not_met", minSubtotal, promo };
  }

  return { valid: true, promo };
}

export function calculateCartTotals(cart = [], couponCode = "", shippingAndOffers = null) {
  const safeCart = Array.isArray(cart) ? cart : [];
  const offerConfig = shippingAndOffers || DEFAULT_STORE_SETTINGS.shippingAndOffers;

  const originalSubtotal = safeCart.reduce(
    (sum, item) => sum + getOriginalPrice(item) * Math.max(1, Number(item.qty) || 1),
    0
  );
  const subtotal = safeCart.reduce(
    (sum, item) => sum + getEffectivePrice(item) * Math.max(1, Number(item.qty) || 1),
    0
  );
  const itemDiscountSavings = Math.max(0, originalSubtotal - subtotal);

  const validation = couponCode ? validatePromoCode(couponCode, subtotal, offerConfig) : { valid: false };
  const appliedPromo = validation.valid ? validation.promo : null;

  let couponDiscount = 0;
  if (appliedPromo) {
    const val = Number(appliedPromo.value) || 0;
    if (appliedPromo.type === "percent") {
      couponDiscount = Math.round((subtotal * val) / 100);
    } else if (appliedPromo.type === "fixed") {
      couponDiscount = Math.min(subtotal, val);
    }
  }

  const discountedSubtotal = Math.max(0, subtotal - couponDiscount);
  const freeShippingEnabled = offerConfig.freeShippingEnabled !== false;
  const threshold = Math.max(0, Number(offerConfig.freeShippingThreshold) || 0);
  const baseShippingFee = Math.max(0, Number(offerConfig.standardShippingFee) || 0);

  const qualifiedByThreshold = freeShippingEnabled && threshold > 0 && discountedSubtotal >= threshold;
  const qualifiedByCoupon = appliedPromo?.type === "shipping";
  const isFreeShipping =
    safeCart.length === 0 ||
    baseShippingFee === 0 ||
    qualifiedByThreshold ||
    qualifiedByCoupon;

  const shipping = safeCart.length === 0 || isFreeShipping ? 0 : baseShippingFee;
  const total = Math.max(0, discountedSubtotal + shipping);

  const freeShippingProgress = threshold > 0
    ? Math.min(100, Math.round((discountedSubtotal / threshold) * 100))
    : 100;
  const amountToFreeShipping = threshold > 0 ? Math.max(0, threshold - discountedSubtotal) : 0;

  return {
    subtotal,
    originalSubtotal,
    itemDiscountSavings,
    coupon: appliedPromo,
    couponDiscount,
    shipping,
    isFreeShipping,
    freeShippingEnabled: freeShippingEnabled && threshold > 0,
    freeShippingThreshold: threshold,
    freeShippingProgress,
    amountToFreeShipping,
    total,
  };
}
