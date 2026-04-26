import React from "react";

function CartPage({ cart, updateQuantity, removeFromCart, totalPrice, handleCheckout, isSubmitting, navigate }) {
  return (
    <div className="container mt-4 mb-5">
      <div className="d-flex align-items-center mb-4">
        <button className="btn btn-link text-decoration-none text-muted-custom p-0 me-3" onClick={() => navigate("home")}>
          <i className="bi bi-arrow-left fs-4"></i>
        </button>
        <h2 className="fw-bold mb-0">Shopping Cart</h2>
      </div>

      {cart.length === 0 ? (
        <div className="text-center py-5">
          <i className="bi bi-cart-x fs-1 text-muted-custom mb-3 d-block opacity-50"></i>
          <h4 className="text-muted-custom">Your cart is empty</h4>
          <p className="text-muted-custom opacity-75">Looks like you haven't added anything yet.</p>
          <button className="btn btn-primary-custom mt-3 px-4 py-2" onClick={() => navigate("home")}>
            Continue Shopping
          </button>
        </div>
      ) : (
        <div className="row g-4">
          <div className="col-lg-8">
            <div className="card shadow-sm border-0">
              <div className="card-body p-0">
                <ul className="list-group list-group-flush">
                  {cart.map((item) => (
                    <li key={item.id} className="list-group-item p-3 p-md-4">
                      <div className="row align-items-center">
                        <div className="col-auto">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="rounded"
                            style={{ width: "80px", height: "80px", objectFit: "cover" }}
                          />
                        </div>
                        <div className="col">
                          <h6 className="mb-1 text-truncate" title={item.name}>
                            {item.name}
                          </h6>
                          <div className="text-primary-custom fw-bold">{item.price} EGP</div>
                        </div>
                        <div className="col-12 col-md-auto mt-3 mt-md-0 d-flex align-items-center justify-content-between gap-4">
                          <div className="qty-controls d-flex align-items-center border rounded px-2 py-1">
                            <button
                              className="btn btn-sm btn-link text-decoration-none text-dark p-1"
                              onClick={() => updateQuantity(item.id, item.qty - 1)}
                              disabled={item.qty <= 1}
                            >
                              <i className="bi bi-dash"></i>
                            </button>
                            <span className="mx-3 fw-semibold">{item.qty}</span>
                            <button
                              className="btn btn-sm btn-link text-decoration-none text-dark p-1"
                              onClick={() => updateQuantity(item.id, item.qty + 1)}
                            >
                              <i className="bi bi-plus"></i>
                            </button>
                          </div>
                          <button
                            className="btn btn-link text-danger p-2"
                            onClick={() => removeFromCart(item.id)}
                            title="Remove"
                          >
                            <i className="bi bi-trash fs-5"></i>
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
          
          <div className="col-lg-4">
            <div className="card shadow-sm border-0 sticky-top" style={{ top: "2rem" }}>
              <div className="card-body p-4">
                <h5 className="fw-bold mb-4">Order Summary</h5>
                <div className="d-flex justify-content-between mb-3">
                  <span className="text-muted-custom">Subtotal ({cart.reduce((acc, curr) => acc + curr.qty, 0)} items)</span>
                  <span className="fw-semibold">{totalPrice} EGP</span>
                </div>
                <hr className="my-3 opacity-25" />
                <div className="d-flex justify-content-between mb-4 fs-5">
                  <span className="fw-bold">Total</span>
                  <span className="fw-bold text-primary-custom">{totalPrice} EGP</span>
                </div>
                <button
                  className="btn btn-primary-custom w-100 py-3 rounded-3 fw-bold shadow-sm"
                  onClick={handleCheckout}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Processing...
                    </>
                  ) : (
                    "Proceed to Checkout"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CartPage;
