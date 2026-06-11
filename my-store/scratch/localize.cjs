const fs = require('fs');

function repl(file, replacements) {
  if (!fs.existsSync(file)) return;
  let c = fs.readFileSync(file, 'utf8');
  if (!c.includes('useTranslation')) {
    c = c.replace(/import \{.*\} from "react";/g, `$&
import { useTranslation } from "react-i18next";`);
    c = c.replace(/function ([a-zA-Z0-9_]+)\((.*)\) \{/g, `function $1($2) {
  const { t, i18n } = useTranslation();`);
  }
  
  for (const [search, replace] of replacements) {
    if (search instanceof RegExp) {
      c = c.replace(search, replace);
    } else {
      c = c.split(search).join(replace);
    }
  }
  
  fs.writeFileSync(file, c);
}

repl('src/components/CartPage.jsx', [
  ['"Your Cart"', 't("cart.title")'],
  ['"Your cart is empty."', 't("cart.empty")'],
  ['"Continue Shopping"', 't("cart.continue_shopping")'],
  ['"Subtotal"', 't("cart.subtotal")'],
  ['"Taxes calculated at checkout"', 't("cart.taxes")'],
  ['"Proceed to Checkout"', 't("cart.checkout")'],
  [/EGP /g, '{t("navbar.currency")} ']
]);

repl('src/components/WishlistPage.jsx', [
  ['"My Wishlist"', 't("wishlist.title")'],
  ['"Your wishlist is empty."', 't("wishlist.empty")'],
  ['"Add to Cart"', 't("product.add_to_cart")'],
  ['"Out of Stock"', 't("product.out_of_stock")'],
  [/EGP /g, '{t("navbar.currency")} ']
]);

repl('src/components/FilterSidebar.jsx', [
  ['"Categories"', 't("filters.categories")'],
  ['"Price Range"', 't("filters.price_range")'],
  ['"Min"', 't("filters.min")'],
  ['"Max"', 't("filters.max")'],
  ['"Sort By"', 't("filters.sort_by")'],
  ['"Featured"', 't("filters.sort_default")'],
  ['"Price: Low to High"', 't("filters.sort_price_asc")'],
  ['"Price: High to Low"', 't("filters.sort_price_desc")'],
  ['"Name: A to Z"', 't("filters.sort_name_asc")'],
  ['"Clear Filters"', 't("app.clear_filters")']
]);

repl('src/components/CheckoutModal.jsx', [
  ['"Checkout"', 't("checkout.title")'],
  ['"Full Name"', 't("checkout.name")'],
  ['"Phone Number"', 't("checkout.phone")'],
  ['"Email"', 't("checkout.email")'],
  ['"Shipping Address"', 't("checkout.address")'],
  ['"Confirm Order"', 't("checkout.confirm")'],
  ['"Cancel"', 't("checkout.cancel")'],
  ['"Total"', 't("checkout.total")'],
  [/EGP /g, '{t("navbar.currency")} ']
]);

repl('src/components/Orders.jsx', [
  ['"My Orders"', 't("orders.title")'],
  ['"You have no orders yet."', 't("orders.empty")'],
  ['"Order"', 't("orders.order_id")'],
  ['"Date"', 't("orders.date")'],
  ['"Total"', 't("orders.total")'],
  ['"Status"', 't("orders.status")'],
  [/EGP /g, '{t("navbar.currency")} ']
]);

repl('src/components/Profile.jsx', [
  ['"My Profile"', 't("profile.title")'],
  ['"Name"', 't("profile.name")'],
  ['"Email"', 't("profile.email")'],
  ['"Phone"', 't("profile.phone")'],
  ['"Address"', 't("profile.address")'],
  ['"Save Changes"', 't("profile.save")'],
  ['"Saving..."', 't("profile.saving")']
]);

repl('src/components/ProductDetailPage.jsx', [
  ['"Added to cart ✅"', 't("product.added_to_cart_toast")'],
  ['"Added to wishlist ❤️"', 't("product.added_to_wishlist_toast")'],
  ['"Already in Wishlist"', 't("product.already_in_wishlist")'],
  ['"Add to Wishlist"', 't("product.add_to_wishlist")'],
  ['"Add to Cart"', 't("product.add_to_cart")'],
  ['"Out of Stock"', 't("product.out_of_stock")'],
  ['"Product Details"', 't("product.details")'],
  ['"Available Colors"', 't("product.colors")'],
  ['"Available Sizes"', 't("product.sizes")'],
  ['"Back"', 't("product.back")'],
  [/EGP /g, '{t("navbar.currency")} ']
]);

console.log('done');
