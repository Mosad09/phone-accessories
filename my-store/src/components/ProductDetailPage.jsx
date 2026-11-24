import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { createPortal } from "react-dom";
import { useParams } from "react-router-dom";
import ProductCard from "./ProductCard";
import {
  addProductReview,
  getProductById,
  subscribeToProductReviews,
} from "../services/firestoreService";
import { toTitleCase } from "../utils/textUtils";
import { getLocalizedField } from "../utils/localization";
import { loginWithGoogle } from "../utils/firebase";
import {
  formatPrice,
  getDiscountPercent,
  getEffectivePrice,
  getOriginalPrice,
  hasDiscount,
} from "../utils/pricing";

function normalizeProduct(product) {
  if (!product) return null;
  return {
    ...product,
    name: toTitleCase(product.name || ""),
    nameAr: product.nameAr || "",
    costPrice: parseFloat(product.costPrice) || 0,
    sellPrice: parseFloat(product.sellPrice ?? product.price) || 0,
    price: parseFloat(product.sellPrice ?? product.price) || 0,
    discountPrice: product.discountPrice ? parseFloat(product.discountPrice) : null,
    image: product.image || product.images?.[0] || "",
    images: product.images || (product.image ? [product.image] : []),
    details: product.details || product.description || "",
    description: product.description || product.details || "",
    descriptionAr: product.descriptionAr || "",
    categoryAr: product.categoryAr || "",
    stock: Number(product.stock) || 0,
    sizes: product.sizes || [],
    colors: product.colors || [],
    featured: Boolean(product.featured),
  };
}

function toArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string") {
    return value.split(",").map((item) => item.trim()).filter(Boolean);
  }
  if (typeof value === "object") {
    return Object.entries(value)
      .filter(([, val]) => val !== undefined && val !== null && val !== "")
      .map(([key, val]) => `${key}: ${val}`);
  }
  return [];
}

function ProductDetailSkeleton() {
  return (
    <div className="container mt-4 mb-5 product-detail-shell">
      <div className="skeleton detail-skeleton-line detail-skeleton-breadcrumb mb-4"></div>
      <div className="row g-4 align-items-start">
        <div className="col-lg-6">
          <div className="product-card p-3">
            <div className="skeleton detail-skeleton-image"></div>
            <div className="d-flex gap-2 mt-3">
              {[...Array(4)].map((_, index) => (
                <div key={index} className="skeleton detail-skeleton-thumb"></div>
              ))}
            </div>
          </div>
        </div>
        <div className="col-lg-6">
          <div className="product-card p-4 detail-skeleton-panel">
            <div className="skeleton detail-skeleton-line detail-skeleton-badge"></div>
            <div className="skeleton detail-skeleton-line detail-skeleton-title"></div>
            <div className="skeleton detail-skeleton-line detail-skeleton-price"></div>
            <div className="skeleton detail-skeleton-line w-100"></div>
            <div className="skeleton detail-skeleton-line w-75"></div>
            <div className="skeleton detail-skeleton-line w-50"></div>
            <div className="d-flex justify-content-between align-items-center mt-auto pt-4">
              <div className="skeleton detail-skeleton-qty"></div>
              <div className="d-flex gap-2">
                <div className="skeleton detail-skeleton-action"></div>
                <div className="skeleton detail-skeleton-action"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProductDetailContent({
  productId,
  products,
  addToCart,
  addToWishlist,
  isInWishlist,
  onQuickView,
  onToggleCompare,
  isInCompare,
  navigate,
  user,
  dbUser,
}) {
  const { t, i18n } = useTranslation();

  const stateProduct = useMemo(() => {
    const found = products.find((item) => item.id === productId);
    return found ? normalizeProduct(found) : null;
  }, [products, productId]);

  const [fetchedProduct, setFetchedProduct] = useState(null);
  const [fetchDone, setFetchDone] = useState(() => Boolean(stateProduct));
  const product = stateProduct || fetchedProduct;

  const colors = useMemo(() => toArray(product?.colors), [product?.colors]);
  const sizes = useMemo(() => toArray(product?.sizes), [product?.sizes]);

  const [activeImage, setActiveImage] = useState(() => product?.image || "");
  const [selectedColor, setSelectedColor] = useState(() => colors[0] || "");
  const [selectedSize, setSelectedSize] = useState(() => sizes[0] || "");
  const [quantity, setQuantity] = useState(1);
  const [toast, setToast] = useState({ show: false, message: "" });
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const [isZoomed, setIsZoomed] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [touchStartX, setTouchStartX] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [ratingInput, setRatingInput] = useState(5);
  const [commentInput, setCommentInput] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [recentIds] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("recently_viewed_products") || "[]");
      return stored.filter((itemId) => itemId !== productId).slice(0, 4);
    } catch {
      return [];
    }
  });

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [productId]);

  useEffect(() => {
    if (stateProduct) return undefined;
    let cancelled = false;
    getProductById(productId)
      .then((firestoreProduct) => {
        if (cancelled) return;
        const normalized = normalizeProduct(firestoreProduct);
        setFetchedProduct(normalized);
        setFetchDone(true);
      })
      .catch(() => {
        if (!cancelled) setFetchDone(true);
      });
    return () => {
      cancelled = true;
    };
  }, [productId, stateProduct]);

  useEffect(() => {
    return subscribeToProductReviews(productId, setReviews);
  }, [productId]);

  useEffect(() => {
    if (!product?.id) return;
    try {
      const stored = JSON.parse(localStorage.getItem("recently_viewed_products") || "[]");
      const next = [product.id, ...stored.filter((itemId) => itemId !== product.id)].slice(0, 8);
      localStorage.setItem("recently_viewed_products", JSON.stringify(next));
    } catch {
      // Ignore storage errors
    }
  }, [product?.id]);

  useEffect(() => {
    if (!toast.show) return undefined;
    const timer = setTimeout(() => setToast({ show: false, message: "" }), 2000);
    return () => clearTimeout(timer);
  }, [toast.show]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setIsLightboxOpen(false);
    };
    if (isLightboxOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isLightboxOpen]);

  const gallery = useMemo(() => {
    if (!product) return [];
    return [...new Set([product.image, ...product.images].filter(Boolean))];
  }, [product]);

  const displayImage = activeImage || gallery[0] || "";
  const effectiveColor = selectedColor || colors[0] || "";
  const effectiveSize = selectedSize || sizes[0] || "";

  const features = useMemo(() => {
    if (!product) return [];
    return [
      ...toArray(product.features),
      ...toArray(product.specifications || product.specs),
    ];
  }, [product]);

  const relatedProducts = useMemo(() => {
    if (!product?.category) return [];
    return products
      .filter((item) => item.id !== product.id && item.category === product.category)
      .slice(0, 4);
  }, [product, products]);

  const recentlyViewedProducts = useMemo(() => {
    return recentIds
      .map((recentId) => products.find((item) => item.id === recentId))
      .filter(Boolean)
      .slice(0, 4);
  }, [products, recentIds]);

  const avgRating = useMemo(() => {
    if (reviews.length === 0) return 0;
    const total = reviews.reduce((sum, r) => sum + (Number(r.rating) || 0), 0);
    return (total / reviews.length).toFixed(1);
  }, [reviews]);

  const handleMouseMove = (e) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setZoomPos({ x, y });
  };

  const showAdjacentImage = (direction) => {
    if (gallery.length < 2) return;
    const activeIndex = gallery.indexOf(displayImage);
    const nextIndex = (activeIndex + direction + gallery.length) % gallery.length;
    setActiveImage(gallery[nextIndex]);
  };

  const handleTouchEnd = (event) => {
    if (touchStartX === null) return;
    const deltaX = event.changedTouches[0].clientX - touchStartX;
    if (Math.abs(deltaX) > 40) {
      showAdjacentImage(deltaX > 0 ? -1 : 1);
    }
    setTouchStartX(null);
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: product?.name || "Veltrix", url });
        return;
      } catch {
        // Fallback to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setToast({ show: true, message: t("product.link_copied") });
    } catch {
      // Clipboard blocked
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!user || !commentInput.trim()) return;
    setSubmittingReview(true);
    try {
      await addProductReview(product.id, {
        userId: user.uid,
        userName: dbUser?.name || user.displayName || user.email,
        userPhoto: user.photoURL || "",
        rating: ratingInput,
        comment: commentInput.trim(),
      });
      setCommentInput("");
      setRatingInput(5);
      setToast({ show: true, message: t("product.review_submitted") });
    } finally {
      setSubmittingReview(false);
    }
  };

  if (!product && !fetchDone) {
    return <ProductDetailSkeleton />;
  }

  if (!product) {
    return (
      <div className="container py-5 text-center">
        <i className="bi bi-exclamation-circle fs-1 text-muted-custom"></i>
        <h3 className="mt-3">{t("product.not_found_title")}</h3>
        <p className="text-muted-custom mb-4">{t("product.not_found_desc")}</p>
        <button type="button" className="btn btn-primary-custom rounded-pill px-4" onClick={() => navigate("home")}>
          {t("product.back_to_store")}
        </button>
      </div>
    );
  }

  const inStock = product.stock > 0;
  const currentPrice = getEffectivePrice(product);
  const originalPrice = getOriginalPrice(product);
  const onSale = hasDiscount(product);
  const discountPercent = getDiscountPercent(product);
  const canIncreaseQuantity = inStock && quantity < product.stock;
  const localizedName = toTitleCase(getLocalizedField(product, "name")) || t("product.untitled");
  const localizedCategory = getLocalizedField(product, "category");
  const localizedDescription = getLocalizedField(product, "description") || getLocalizedField(product, "details");

  return (
    <div className="container mt-4 mb-5 product-detail-shell">
      {/* Breadcrumb Bar */}
      <nav aria-label="breadcrumb" className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
        <div className="d-flex align-items-center gap-2 small text-muted-custom">
          <button type="button" className="btn btn-link text-decoration-none text-muted-custom p-0" onClick={() => navigate("home")}>
            <i className="bi bi-house me-1"></i>
            {t("navbar.home")}
          </button>
          {localizedCategory && (
            <>
              <span>/</span>
              <span>{localizedCategory}</span>
            </>
          )}
          <span>/</span>
          <span className="text-main fw-semibold text-truncate" style={{ maxWidth: "240px" }}>{localizedName}</span>
        </div>

        <button type="button" className="btn btn-sm btn-outline-custom rounded-pill px-3" onClick={handleShare}>
          <i className="bi bi-share me-1"></i>
          {t("product.share")}
        </button>
      </nav>

      <div className="row g-4 align-items-start product-detail-content">
        <div className="col-lg-6">
          <div className="product-card p-3 product-detail-media">
            <div
              className="product-img-wrapper rounded-3 border-0"
              style={{
                minHeight: "320px",
                position: "relative",
                overflow: "hidden",
                cursor: "zoom-in",
              }}
              onMouseMove={handleMouseMove}
              onMouseEnter={() => setIsZoomed(true)}
              onMouseLeave={() => setIsZoomed(false)}
              onClick={() => setIsLightboxOpen(true)}
              onTouchStart={(event) => setTouchStartX(event.touches[0].clientX)}
              onTouchEnd={handleTouchEnd}
            >
              {onSale && (
                <div className="product-card-badges">
                  <span className="product-sale-badge">-{discountPercent}%</span>
                </div>
              )}

              {displayImage ? (
                <img
                  src={displayImage}
                  alt={localizedName}
                  className="product-img img-fluid product-detail-main-image"
                  style={{
                    height: "260px",
                    transform: isZoomed ? "scale(1.8)" : "scale(1)",
                    transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
                  }}
                />
              ) : (
                <i className="bi bi-image text-muted-custom" style={{ fontSize: "4rem" }}></i>
              )}

              {gallery.length > 1 && (
                <>
                  <button
                    type="button"
                    className="gallery-nav-btn prev"
                    onClick={(e) => {
                      e.stopPropagation();
                      showAdjacentImage(-1);
                    }}
                    aria-label={t("filters.prev")}
                  >
                    <i className="bi bi-chevron-left"></i>
                  </button>
                  <button
                    type="button"
                    className="gallery-nav-btn next"
                    onClick={(e) => {
                      e.stopPropagation();
                      showAdjacentImage(1);
                    }}
                    aria-label={t("filters.next")}
                  >
                    <i className="bi bi-chevron-right"></i>
                  </button>
                </>
              )}
            </div>

            {gallery.length > 1 && (
              <div className="d-flex gap-2 flex-wrap mt-3">
                {gallery.map((image) => (
                  <button
                    type="button"
                    key={image}
                    className={`btn p-1 rounded-3 ${displayImage === image ? "border-primary" : "border"}`}
                    onClick={() => setActiveImage(image)}
                    aria-label="View product image"
                  >
                    <img src={image} alt="" style={{ width: "64px", height: "64px", objectFit: "contain" }} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="col-lg-6">
          <div className="product-card p-4 h-100 product-detail-info product-purchase-card">
            <div className="d-flex flex-column h-100">
              <div className="d-flex gap-2 flex-wrap align-items-center mb-2">
                {localizedCategory && <span className="category-badge mb-0">{localizedCategory}</span>}
                {product.featured && (
                  <span className="badge bg-warning text-dark rounded-pill px-3 py-2">
                    {t("product.featured")}
                  </span>
                )}
                {reviews.length > 0 && (
                  <span className="badge bg-light text-dark border rounded-pill px-3 py-2">
                    <i className="bi bi-star-fill text-warning me-1"></i>
                    {avgRating} ({reviews.length})
                  </span>
                )}
              </div>

              <h1 className="fw-bold mb-3 fs-3 product-detail-title">{localizedName}</h1>

              <div className="d-flex align-items-baseline gap-3 mb-3 product-detail-price-row flex-wrap">
                <span className="product-price">
                  {t("navbar.currency")} {formatPrice(currentPrice, i18n.language)}
                </span>
                {onSale && (
                  <>
                    <span className="text-muted-custom text-decoration-line-through">
                      {t("navbar.currency")} {formatPrice(originalPrice, i18n.language)}
                    </span>
                    <span className="badge bg-danger-subtle text-danger rounded-pill px-2 py-1">
                      {t("product.save_percent", { percent: discountPercent })}
                    </span>
                  </>
                )}
              </div>

              <span className={`badge rounded-pill align-self-start mb-4 ${inStock ? "bg-success-subtle text-success border border-success-subtle" : "bg-danger-subtle text-danger border border-danger-subtle"}`}>
                {inStock ? t("product.in_stock_count", { count: product.stock }) : t("product.out_of_stock")}
              </span>

              {localizedDescription && (
                <div className="mb-3 product-detail-description">
                  <h5 className="fw-bold">{t("product.description")}</h5>
                  <p className="text-muted-custom lh-lg mb-0">{localizedDescription}</p>
                </div>
              )}

              {features.length > 0 && (
                <div className="mb-3">
                  <h5 className="fw-bold">{t("product.features")}</h5>
                  <ul className="text-muted-custom mb-0 ps-3">
                    {features.map((feature) => (
                      <li key={feature} className="mb-2">{feature}</li>
                    ))}
                  </ul>
                </div>
              )}

              {colors.length > 0 && (
                <div className="mb-3">
                  <h6 className="fw-bold">{t("product.select_color")}</h6>
                  <div className="d-flex gap-2 flex-wrap">
                    {colors.map((color) => (
                      <button
                        type="button"
                        key={color}
                        className={`variant-chip ${effectiveColor === color ? "active" : ""}`}
                        onClick={() => setSelectedColor(color)}
                      >
                        {color}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {sizes.length > 0 && (
                <div className="mb-3">
                  <h6 className="fw-bold">{t("product.select_size")}</h6>
                  <div className="d-flex gap-2 flex-wrap">
                    {sizes.map((size) => (
                      <button
                        type="button"
                        key={size}
                        className={`variant-chip ${effectiveSize === size ? "active" : ""}`}
                        onClick={() => setSelectedSize(size)}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="d-flex align-items-center justify-content-between gap-3 mt-auto pt-3 price-row product-detail-actions flex-wrap">
                <div className="qty-controls d-flex align-items-center border rounded px-2 py-1 bg-white">
                  <button
                    type="button"
                    className="btn btn-sm btn-link text-decoration-none text-dark p-1"
                    onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                    disabled={quantity <= 1}
                    aria-label="Decrease quantity"
                  >
                    <i className="bi bi-dash"></i>
                  </button>
                  <span className="mx-3 fw-semibold">{quantity}</span>
                  <button
                    type="button"
                    className="btn btn-sm btn-link text-decoration-none text-dark p-1"
                    onClick={() => setQuantity((prev) => Math.min(product.stock || prev + 1, prev + 1))}
                    disabled={!canIncreaseQuantity}
                    aria-label="Increase quantity"
                  >
                    <i className="bi bi-plus"></i>
                  </button>
                </div>

                <div className="d-flex gap-2 align-items-center flex-grow-1 justify-content-end">
                  {onToggleCompare && (
                    <button
                      type="button"
                      className={`btn ${isInCompare?.(product.id) ? "btn-primary-custom" : "btn-outline-custom"} add-btn-sm`}
                      onClick={() => onToggleCompare(product)}
                      title={t("product.compare")}
                    >
                      <i className="bi bi-arrow-left-right"></i>
                    </button>
                  )}
                  <button
                    type="button"
                    className={`btn ${isInWishlist(product.id) ? "btn-danger" : "btn-outline-danger"} add-btn-sm border-0`}
                    onClick={() => {
                      addToWishlist(product);
                      setToast({ show: true, message: t("product.added_to_wishlist_toast") });
                    }}
                    disabled={isInWishlist(product.id)}
                    title={isInWishlist(product.id) ? t("product.already_in_wishlist") : t("product.add_to_wishlist")}
                  >
                    <i className={`bi ${isInWishlist(product.id) ? "bi-heart-fill" : "bi-heart"}`}></i>
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary-custom rounded-pill px-4 py-2 fw-bold d-flex align-items-center gap-2"
                    onClick={() => {
                      addToCart(product, quantity, {
                        selectedColor: effectiveColor,
                        selectedSize: effectiveSize,
                      });
                      setToast({ show: true, message: t("product.added_to_cart_toast") });
                    }}
                    disabled={!inStock}
                  >
                    <i className="bi bi-cart-plus"></i>
                    {inStock ? t("product.add_to_cart") : t("product.out_of_stock")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Reviews Section */}
      <section className="mt-5 reviews-section">
        <div className="card border-0 shadow-sm p-4 rounded-4">
          <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
            <div>
              <h3 className="fw-bold mb-1">{t("product.reviews_title")}</h3>
              <span className="text-muted-custom small">
                {reviews.length > 0
                  ? `★ ${avgRating} · ${t("product.reviews_count", { count: reviews.length })}`
                  : t("product.no_reviews")}
              </span>
            </div>
          </div>

          <div className="row g-4">
            <div className="col-lg-5">
              {user ? (
                <form className="review-form-box p-3 rounded-4 border" onSubmit={handleReviewSubmit}>
                  <h6 className="fw-bold mb-3">{t("product.write_review")}</h6>
                  <div className="mb-3">
                    <div className="small fw-semibold mb-1">{t("product.your_rating")}</div>
                    <div className="d-flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          className="btn btn-link p-1 text-warning fs-5"
                          onClick={() => setRatingInput(star)}
                          aria-label={`${star} stars`}
                        >
                          <i className={`bi ${star <= ratingInput ? "bi-star-fill" : "bi-star"}`}></i>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold" htmlFor="review-comment">
                      {t("product.your_comment")}
                    </label>
                    <textarea
                      id="review-comment"
                      className="form-control"
                      rows="3"
                      required
                      value={commentInput}
                      onChange={(e) => setCommentInput(e.target.value)}
                      placeholder={t("product.comment_placeholder")}
                    />
                  </div>
                  <button type="submit" className="btn btn-primary-custom rounded-pill px-4 fw-semibold" disabled={submittingReview}>
                    {submittingReview ? t("common.loading") : t("product.submit_review")}
                  </button>
                </form>
              ) : (
                <div className="review-form-box p-4 rounded-4 border text-center">
                  <i className="bi bi-chat-square-quote fs-2 text-primary-custom d-block mb-2"></i>
                  <p className="text-muted-custom small mb-3">{t("product.sign_in_to_review")}</p>
                  <button type="button" className="btn btn-sm btn-primary-custom rounded-pill px-4" onClick={loginWithGoogle}>
                    <i className="bi bi-google me-2"></i>
                    {t("navbar.sign_in")}
                  </button>
                </div>
              )}
            </div>

            <div className="col-lg-7">
              {reviews.length === 0 ? (
                <div className="text-muted-custom py-4 text-center">{t("product.no_reviews")}</div>
              ) : (
                <div className="d-flex flex-column gap-3">
                  {reviews.map((review) => (
                    <div key={review.id} className="review-item-card p-3 rounded-3 border">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <div className="d-flex align-items-center gap-2">
                          {review.userPhoto ? (
                            <img src={review.userPhoto} alt="" width="28" height="28" className="rounded-circle" />
                          ) : (
                            <i className="bi bi-person-circle fs-5 text-muted-custom"></i>
                          )}
                          <strong className="small">{review.userName}</strong>
                        </div>
                        <div className="text-warning small">
                          {[...Array(5)].map((_, i) => (
                            <i key={i} className={`bi ${i < Number(review.rating) ? "bi-star-fill" : "bi-star"}`}></i>
                          ))}
                        </div>
                      </div>
                      <p className="mb-1 small text-muted-custom">{review.comment}</p>
                      <small className="text-muted-custom opacity-75" style={{ fontSize: "0.72rem" }}>
                        {review.createdAt ? new Date(review.createdAt).toLocaleDateString(i18n.language === "ar" ? "ar-EG" : "en-EG") : ""}
                      </small>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Related Products */}
      <section className="mt-5 product-detail-related">
        <div className="d-flex align-items-center justify-content-between mb-3">
          <h3 className="fw-bold mb-0">{t("product.related_products")}</h3>
          {localizedCategory && <span className="text-muted-custom small">{localizedCategory}</span>}
        </div>

        {relatedProducts.length > 0 ? (
          <div className="row product-grid-animated">
            {relatedProducts.map((relatedProduct) => (
              <ProductCard
                key={relatedProduct.id}
                product={relatedProduct}
                addToCart={addToCart}
                addToWishlist={addToWishlist}
                isInWishlist={isInWishlist(relatedProduct.id)}
                onQuickView={onQuickView}
                onToggleCompare={onToggleCompare}
                isInCompare={isInCompare?.(relatedProduct.id)}
              />
            ))}
          </div>
        ) : (
          <div className="text-muted-custom small">{t("product.no_related")}</div>
        )}
      </section>

      {/* Recently Viewed Products */}
      {recentlyViewedProducts.length > 0 && (
        <section className="mt-5 product-detail-related">
          <div className="d-flex align-items-center justify-content-between mb-3">
            <h3 className="fw-bold mb-0">{t("product.recently_viewed")}</h3>
          </div>
          <div className="row product-grid-animated">
            {recentlyViewedProducts.map((recentProduct) => (
              <ProductCard
                key={recentProduct.id}
                product={recentProduct}
                addToCart={addToCart}
                addToWishlist={addToWishlist}
                isInWishlist={isInWishlist(recentProduct.id)}
                onQuickView={onQuickView}
                onToggleCompare={onToggleCompare}
                isInCompare={isInCompare?.(recentProduct.id)}
              />
            ))}
          </div>
        </section>
      )}

      <div className={`cart-toast ${toast.show ? "show" : ""}`}>
        {toast.message}
      </div>

      {isLightboxOpen && createPortal(
        <div className="lightbox-modal show" onClick={() => setIsLightboxOpen(false)}>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="lightbox-close" onClick={() => setIsLightboxOpen(false)} aria-label={t("common.close")}>
              <i className="bi bi-x-lg"></i>
            </button>
            <img src={displayImage} alt={localizedName} className="lightbox-img" />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

function ProductDetailPage(props) {
  const { id } = useParams();
  return <ProductDetailContent key={id} productId={id} {...props} />;
}

export default ProductDetailPage;
