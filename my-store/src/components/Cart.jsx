function Cart({ cart, updateQuantity, removeFromCart, closeCart, totalPrice }) {
  return (
    <>
      <div className="cart-overlay" onClick={closeCart}></div>
      <div className="cart-drawer">
        {/* Header */}
        <div className="cart-header">
          <h5 className="mb-0 fw-bold d-flex align-items-center">
            <i className="bi bi-bag-check me-2 text-primary-custom fs-4"></i>
            Your Cart
          </h5>
          <button
            className="btn-close"
            onClick={closeCart}
            aria-label="Close"
          ></button>
        </div>

        {/* Body */}
        <div className="cart-body">
          {cart.length === 0 ? (
            <div className="text-center mt-5 text-muted-custom">
              <i className="bi bi-cart-x fs-1 mb-3 d-block opacity-50"></i>
              <p>Your cart is empty.</p>
              <button className="btn btn-outline-custom mt-3" onClick={closeCart}>
                Continue Shopping
              </button>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.id} className="cart-item">
                <img src={item.image} alt={item.name} className="cart-item-img" />
                <div className="flex-grow-1">
                  <h6 className="mb-1 text-truncate" style={{ maxWidth: '180px' }} title={item.name}>
                    {item.name}
                  </h6>
                  <div className="text-primary-custom fw-bold">{item.price} EGP</div>
                  
                  <div className="d-flex align-items-center justify-content-between mt-2">
                    <div className="qty-controls">
                      <button
                        className="qty-btn"
                        onClick={() => updateQuantity(item.id, item.qty - 1)}
                        disabled={item.qty <= 1}
                      >
                        <i className="bi bi-dash"></i>
                      </button>
                      <span className="qty-val">{item.qty}</span>
                      <button
                        className="qty-btn"
                        onClick={() => updateQuantity(item.id, item.qty + 1)}
                      >
                        <i className="bi bi-plus"></i>
                      </button>
                    </div>
                    <button
                      className="btn btn-link text-danger p-0"
                      onClick={() => removeFromCart(item.id)}
                    >
                      <i className="bi bi-trash"></i>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {cart.length > 0 && (
          <div className="cart-footer">
            <div className="d-flex justify-content-between mb-3 fs-5">
              <span className="text-muted-custom">Subtotal</span>
              <span className="fw-bold text-main">{totalPrice} EGP</span>
            </div>
            <button className="btn btn-primary-custom w-100 py-2 fs-6">
              Proceed to Checkout
            </button>
          </div>
        )}
      </div>
    </>
  );
}

export default Cart;