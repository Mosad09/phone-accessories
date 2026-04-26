import React, { useState, useEffect } from "react";

function formatPrice(price) {
  if (!price && price !== 0) return "0";
  return Number(price).toLocaleString("en-EG");
}

function WishlistPage({ wishlist, removeFromWishlist, addToCart, navigate }) {
  const [toast, setToast] = useState({ show: false, message: "" });

  // Auto-hide toast after 2s
  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => setToast({ show: false, message: "" }), 2000);
      return () => clearTimeout(timer);
    }
  }, [toast.show]);

  const handleAddToCart = (item) => {
    addToCart(item);
    removeFromWishlist(item.id);
    setToast({ show: true, message: "Item added to cart successfully ✅" });
  };
  return (
    <div className="container mt-4 mb-5">
      <div className="d-flex align-items-center mb-4">
        <button className="btn btn-link text-decoration-none text-muted-custom p-0 me-3" onClick={() => navigate("home")}>
          <i className="bi bi-arrow-left fs-4"></i>
        </button>
        <h2 className="fw-bold mb-0">My Wishlist</h2>
      </div>

      {wishlist.length === 0 ? (
        <div className="text-center py-5">
          <i className="bi bi-heart fs-1 text-muted-custom mb-3 d-block opacity-50"></i>
          <h4 className="text-muted-custom">Your wishlist is empty</h4>
          <p className="text-muted-custom opacity-75">Save items you love here and buy them later.</p>
          <button className="btn btn-outline-custom mt-3 px-4 py-2" onClick={() => navigate("home")}>
            Discover Products
          </button>
        </div>
      ) : (
        <div className="row g-4">
          {wishlist.map((item) => (
            <div key={item.id} className="col-12 col-sm-6 col-md-4 col-lg-3">
              <div className="card shadow-sm border-0 h-100 product-card">
                <div className="product-img-wrapper" style={{ cursor: 'default' }}>
                  <img
                    src={item.image}
                    alt={item.name}
                    className="card-img-top product-img img-fluid"
                  />
                  <button
                    className="btn btn-light position-absolute top-0 end-0 m-2 rounded-circle shadow-sm"
                    style={{ 
                      width: "36px", 
                      height: "36px", 
                      display: "flex", 
                      alignItems: "center", 
                      justifyContent: "center",
                      zIndex: 10,
                      pointerEvents: "auto"
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFromWishlist(item.id);
                    }}
                    title="Remove from wishlist"
                  >
                    <i className="bi bi-trash text-danger"></i>
                  </button>
                </div>
                <div className="card-body d-flex flex-column p-3">
                  <h5 className="card-title fw-bold fs-6 mb-1 text-truncate" title={item.name}>
                    {item.name}
                  </h5>
                  {item.category && (
                    <span className="text-muted small mb-2 d-block">{item.category}</span>
                  )}
                  <div className="mt-auto pt-3 d-flex align-items-center justify-content-between border-top">
                    <span className="fw-bold text-primary-custom">EGP {formatPrice(item.price)}</span>
                    <button
                      className="btn btn-sm btn-primary-custom px-3 py-1 rounded-pill shadow-sm"
                      onClick={() => handleAddToCart(item)}
                    >
                      <i className="bi bi-cart-plus me-1"></i> Add
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Toast Notification */}
      <div className={`cart-toast ${toast.show ? "show" : ""}`}>
        {toast.message}
      </div>
    </div>
  );
}

export default WishlistPage;
