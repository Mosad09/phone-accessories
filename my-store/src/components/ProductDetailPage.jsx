import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { getProductById } from "../services/firestoreService";

function formatPrice(price) {
  if (!price && price !== 0) return "0";
  return Number(price).toLocaleString("en-EG");
}

function normalizeProduct(product) {
  if (!product) return null;
  return {
    ...product,
    price: parseFloat(product.price) || 0,
    discountPrice: product.discountPrice ? parseFloat(product.discountPrice) : null,
    image: product.image || product.images?.[0] || "",
    images: product.images || (product.image ? [product.image] : []),
    details: product.details || product.description || "",
    description: product.description || product.details || "",
    stock: Number(product.stock) || 0,
    sizes: product.sizes || [],
    colors: product.colors || [],
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

function ProductDetailPage({
  products,
  addToCart,
  addToWishlist,
  isInWishlist,
  navigate,
}) {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeImage, setActiveImage] = useState("");
  const [toast, setToast] = useState({ show: false, message: "" });

  useEffect(() => {
    let cancelled = false;

    const loadProduct = async () => {
      setNotFound(false);

      const productFromState = products.find((item) => item.id === id);
      if (productFromState) {
        const normalized = normalizeProduct(productFromState);
        if (!cancelled) {
          setProduct(normalized);
          setActiveImage(normalized.image);
          setLoading(false);
        }
        return;
      }

      try {
        setLoading(true);
        const firestoreProduct = await getProductById(id);
        if (cancelled) return;

        if (!firestoreProduct) {
          setProduct(null);
          setNotFound(true);
          return;
        }

        const normalized = normalizeProduct(firestoreProduct);
        setProduct(normalized);
        setActiveImage(normalized.image);
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

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-primary-custom" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
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

  return (
    <div className="container mt-4 mb-5">
      <div className="d-flex align-items-center mb-4">
        <button className="btn btn-link text-decoration-none text-muted-custom p-0 me-3" onClick={() => navigate("home")}>
          <i className="bi bi-arrow-left fs-4"></i>
        </button>
        <span className="text-muted-custom">Product Details</span>
      </div>

      <div className="row g-4 g-lg-5">
        <div className="col-lg-6">
          <div className="product-card p-3">
            <div className="product-img-wrapper rounded-3 border-0" style={{ minHeight: "360px" }}>
              {activeImage ? (
                <img src={activeImage} alt={product.name} className="product-img img-fluid" style={{ height: "300px" }} />
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
                    <img src={image} alt="" style={{ width: "72px", height: "72px", objectFit: "contain" }} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="col-lg-6">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body p-4 p-lg-5 d-flex flex-column">
              {product.category && <span className="category-badge">{product.category}</span>}
              <h1 className="fw-bold mb-3">{product.name}</h1>

              <div className="d-flex align-items-baseline gap-3 mb-3">
                <span className="product-price">EGP {formatPrice(product.discountPrice || product.price)}</span>
                {product.discountPrice && (
                  <span className="text-muted-custom text-decoration-line-through">
                    EGP {formatPrice(product.price)}
                  </span>
                )}
              </div>

              <span className={`badge rounded-pill align-self-start mb-4 ${inStock ? "bg-success-subtle text-success border border-success-subtle" : "bg-danger-subtle text-danger border border-danger-subtle"}`}>
                {inStock ? `${product.stock} in stock` : "Out of stock"}
              </span>

              {product.description && (
                <div className="mb-4">
                  <h5 className="fw-bold">Description</h5>
                  <p className="text-muted-custom lh-lg mb-0">{product.description}</p>
                </div>
              )}

              {features.length > 0 && (
                <div className="mb-4">
                  <h5 className="fw-bold">Features & Specifications</h5>
                  <ul className="text-muted-custom mb-0 ps-3">
                    {features.map((feature) => (
                      <li key={feature} className="mb-2">{feature}</li>
                    ))}
                  </ul>
                </div>
              )}

              {colors.length > 0 && (
                <div className="mb-4">
                  <h6 className="fw-bold">Available Colors</h6>
                  <div className="d-flex gap-2 flex-wrap">
                    {colors.map((color) => (
                      <span key={color} className="badge bg-light text-dark border px-3 py-2">{color}</span>
                    ))}
                  </div>
                </div>
              )}

              {sizes.length > 0 && (
                <div className="mb-4">
                  <h6 className="fw-bold">Available Sizes</h6>
                  <div className="d-flex gap-2 flex-wrap">
                    {sizes.map((size) => (
                      <span key={size} className="badge bg-light text-dark border px-3 py-2">{size}</span>
                    ))}
                  </div>
                </div>
              )}

              <div className="d-flex gap-3 mt-auto pt-3">
                <button
                  className="btn btn-primary-custom flex-grow-1 py-3"
                  onClick={() => {
                    addToCart(product);
                    setToast({ show: true, message: "Added to cart" });
                  }}
                  disabled={!inStock}
                >
                  <i className="bi bi-cart-plus me-2"></i>Add to Cart
                </button>
                <button
                  className={`btn ${isInWishlist(product.id) ? "btn-danger" : "btn-outline-danger"} px-4`}
                  onClick={() => {
                    addToWishlist(product);
                    setToast({ show: true, message: "Added to wishlist" });
                  }}
                  disabled={isInWishlist(product.id)}
                  title={isInWishlist(product.id) ? "Already in Wishlist" : "Add to Wishlist"}
                >
                  <i className={`bi ${isInWishlist(product.id) ? "bi-heart-fill" : "bi-heart"}`}></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={`cart-toast ${toast.show ? "show" : ""}`}>
        {toast.message}
      </div>
    </div>
  );
}

export default ProductDetailPage;
