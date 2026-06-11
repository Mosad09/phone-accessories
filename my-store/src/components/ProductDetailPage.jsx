import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { createPortal } from "react-dom";
import { useParams } from "react-router-dom";
import ProductCard from "./ProductCard";
import { getProductById } from "../services/firestoreService";
import { toTitleCase } from "../utils/textUtils";
import { getLocalizedField } from "../utils/localization";

function formatPrice(price) {
  if (!price && price !== 0) return "0";
  return Number(price).toLocaleString("en-EG");
}

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

const PRODUCT_TRANSITION_MS = 180;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
      <div className="skeleton detail-skeleton-line detail-skeleton-related-title mt-5"></div>
      <div className="row mt-3">
        {[...Array(4)].map((_, index) => (
          <div key={index} className="col-12 col-sm-6 col-md-4 col-lg-3 mb-4">
            <div className="skeleton skeleton-card"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProductDetailPage({
  products,
  addToCart,
  addToWishlist,
  isInWishlist,
  navigate,
}) {
  const { id } = useParams();
  const { t } = useTranslation();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeImage, setActiveImage] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [toast, setToast] = useState({ show: false, message: "" });
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const [isZoomed, setIsZoomed] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadProduct = async () => {
      const startedAt = Date.now();
      window.scrollTo({ top: 0, behavior: "smooth" });
      setLoading(true);
      setProduct(null);
      setActiveImage("");
      setQuantity(1);
      setToast({ show: false, message: "" });
      setNotFound(false);

      const revealProduct = async (nextProduct) => {
        const elapsed = Date.now() - startedAt;
        if (elapsed < PRODUCT_TRANSITION_MS) {
          await wait(PRODUCT_TRANSITION_MS - elapsed);
        }
        if (cancelled) return;
        setProduct(nextProduct);
        setActiveImage(nextProduct.image);
        setQuantity(1);
      };

      const productFromState = products.find((item) => item.id === id);
      if (productFromState) {
        const normalized = normalizeProduct(productFromState);
        await revealProduct(normalized);
        if (!cancelled) setLoading(false);
        return;
      }

      try {
        const firestoreProduct = await getProductById(id);
        if (cancelled) return;

        if (!firestoreProduct) {
          setProduct(null);
          setNotFound(true);
          return;
        }

        const normalized = normalizeProduct(firestoreProduct);
        await revealProduct(normalized);
      } catch (error) {
        console.error("Failed to load product:", error);
        if (!cancelled) {
          setProduct(null);
          setNotFound(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadProduct();

    return () => {
      cancelled = true;
    };
  }, [id, products]);

  useEffect(() => {
    if (!toast.show) return undefined;
    const timer = setTimeout(() => setToast({ show: false, message: "" }), 2000);
    return () => clearTimeout(timer);
  }, [toast.show]);

  const handleMouseMove = (e) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setZoomPos({ x, y });
  };

  const handleMouseEnter = () => {
    setIsZoomed(true);
  };

  const handleMouseLeave = () => {
    setIsZoomed(false);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setIsLightboxOpen(false);
      }
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

  if (loading) {
    return <ProductDetailSkeleton />;
  }

  if (notFound || !product) {
    return (
      <div className="container py-5 text-center">
        <i className="bi bi-exclamation-circle fs-1 text-muted-custom"></i>
        <h3 className="mt-3">Product not found</h3>
        <p className="text-muted-custom mb-4">The product you are looking for is no longer available.</p>
        <button className="btn btn-primary-custom rounded-pill px-4" onClick={() => navigate("home")}>
          Back to Store
        </button>
      </div>
    );
  }

  const inStock = product.stock > 0;
  const colors = toArray(product.colors);
  const sizes = toArray(product.sizes);
  const currentPrice = product.discountPrice || product.price;
  const canIncreaseQuantity = inStock && quantity < product.stock;
  const localizedName = toTitleCase(getLocalizedField(product, "name")) || t("product.untitled", "Untitled Product");
  const localizedCategory = getLocalizedField(product, "category");
  const localizedDescription = getLocalizedField(product, "description") || getLocalizedField(product, "details");

  return (
    <div className="container mt-4 mb-5 product-detail-shell" key={product.id}>
      <div className="d-flex align-items-center mb-4">
        <button className="btn btn-link text-decoration-none text-muted-custom p-0 me-3" onClick={() => navigate("home")}>
          <i className="bi bi-arrow-left fs-4"></i>
        </button>
        <span className="text-muted-custom">Product Details</span>
      </div>

      <div className="row g-4 align-items-start product-detail-content">
        <div className="col-lg-6">
          <div className="product-card p-3 product-detail-media">
            <div
              className="product-img-wrapper rounded-3 border-0"
              style={{
                minHeight: "300px",
                position: "relative",
                overflow: "hidden",
                cursor: "zoom-in"
              }}
              onMouseMove={handleMouseMove}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              onClick={() => setIsLightboxOpen(true)}
            >
              {activeImage ? (
                <img
                  src={activeImage}
                  alt={localizedName}
                  className="product-img img-fluid product-detail-main-image"
                  style={{
                    height: "240px",
                    transform: isZoomed ? "scale(1.8)" : "scale(1)",
                    transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
                  }}
                />
              ) : (
                <i className="bi bi-image text-muted-custom" style={{ fontSize: "4rem" }}></i>
              )}
            </div>

            {gallery.length > 1 && (
              <div className="d-flex gap-2 flex-wrap mt-3">
                {gallery.map((image) => (
                  <button
                    key={image}
                    className={`btn p-1 rounded-3 ${activeImage === image ? "border-primary" : "border"}`}
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
          <div className="product-card p-4 h-100 product-detail-info">
            <div className="d-flex flex-column h-100">
              <div className="d-flex gap-2 flex-wrap align-items-center mb-2">
                {localizedCategory && <span className="category-badge mb-0">{localizedCategory}</span>}
                {product.featured && <span className="badge bg-warning text-dark rounded-pill px-3 py-2">Featured</span>}
              </div>

              <h1 className="fw-bold mb-3 fs-3 product-detail-title">{localizedName}</h1>

              <div className="d-flex align-items-baseline gap-3 mb-3 product-detail-price-row">
                <span className="product-price">{t("navbar.currency")} {formatPrice(currentPrice)}</span>
                {product.discountPrice && (
                  <span className="text-muted-custom text-decoration-line-through">
                    {t("navbar.currency")} {formatPrice(product.price)}
                  </span>
                )}
              </div>

              <span className={`badge rounded-pill align-self-start mb-4 ${inStock ? "bg-success-subtle text-success border border-success-subtle" : "bg-danger-subtle text-danger border border-danger-subtle"}`}>
                {inStock ? `${product.stock} in stock` : "Out of stock"}
              </span>

              {localizedDescription && (
                <div className="mb-3 product-detail-description">
                  <h5 className="fw-bold">{t("product.description", "Description")}</h5>
                  <p className="text-muted-custom lh-lg mb-0">{localizedDescription}</p>
                </div>
              )}

              {features.length > 0 && (
                <div className="mb-3">
                  <h5 className="fw-bold">Features & Specifications</h5>
                  <ul className="text-muted-custom mb-0 ps-3">
                    {features.map((feature) => (
                      <li key={feature} className="mb-2">{feature}</li>
                    ))}
                  </ul>
                </div>
              )}

              {colors.length > 0 && (
                <div className="mb-3">
                  <h6 className="fw-bold">Available Colors</h6>
                  <div className="d-flex gap-2 flex-wrap">
                    {colors.map((color) => (
                      <span key={color} className="badge bg-light text-dark border px-3 py-2">{color}</span>
                    ))}
                  </div>
                </div>
              )}

              {sizes.length > 0 && (
                <div className="mb-3">
                  <h6 className="fw-bold">Available Sizes</h6>
                  <div className="d-flex gap-2 flex-wrap">
                    {sizes.map((size) => (
                      <span key={size} className="badge bg-light text-dark border px-3 py-2">{size}</span>
                    ))}
                  </div>
                </div>
              )}

              <div className="d-flex align-items-center justify-content-between gap-3 mt-auto pt-3 price-row product-detail-actions">
                <div className="qty-controls d-flex align-items-center border rounded px-2 py-1 bg-white">
                  <button
                    className="btn btn-sm btn-link text-decoration-none text-dark p-1"
                    onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                    disabled={quantity <= 1}
                    aria-label="Decrease quantity"
                  >
                    <i className="bi bi-dash"></i>
                  </button>
                  <span className="mx-3 fw-semibold">{quantity}</span>
                  <button
                    className="btn btn-sm btn-link text-decoration-none text-dark p-1"
                    onClick={() => setQuantity((prev) => Math.min(product.stock || prev + 1, prev + 1))}
                    disabled={!canIncreaseQuantity}
                    aria-label="Increase quantity"
                  >
                    <i className="bi bi-plus"></i>
                  </button>
                </div>

                <div className="d-flex gap-2">
                  <button
                    className={`btn ${isInWishlist(product.id) ? "btn-danger" : "btn-outline-danger"} add-btn-sm border-0`}
                    onClick={() => {
                      addToWishlist(product);
                      setToast({ show: true, message: "Added to wishlist" });
                    }}
                    disabled={isInWishlist(product.id)}
                    title={isInWishlist(product.id) ? t("product.already_in_wishlist") : t("product.add_to_wishlist")}
                  >
                    <i className={`bi ${isInWishlist(product.id) ? "bi-heart-fill" : "bi-heart"}`}></i>
                  </button>
                  <button
                    className="btn btn-primary-custom add-btn-sm"
                    onClick={() => {
                      addToCart(product, quantity);
                      setToast({ show: true, message: "Added to cart" });
                    }}
                    disabled={!inStock}
                    title={t("product.add_to_cart")}
                  >
                    <i className="bi bi-cart-plus"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <section className="mt-5 product-detail-related">
        <div className="d-flex align-items-center justify-content-between mb-3">
          <h3 className="fw-bold mb-0">Related Products</h3>
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
              />
            ))}
          </div>
        ) : (
          <div className="text-muted-custom small">No related products found in this category.</div>
        )}
      </section>

      <div className={`cart-toast ${toast.show ? "show" : ""}`}>
        {toast.message}
      </div>

      {isLightboxOpen && createPortal(
        <div className={`lightbox-modal ${isLightboxOpen ? "show" : ""}`} onClick={() => setIsLightboxOpen(false)}>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <button className="lightbox-close" onClick={() => setIsLightboxOpen(false)} aria-label="Close preview">
              <i className="bi bi-x-lg"></i>
            </button>
            <img src={activeImage} alt={localizedName} className="lightbox-img" />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default ProductDetailPage;
