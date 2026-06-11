const fs = require('fs');

function fixHooks(file, funcNames) {
  if (!fs.existsSync(file)) return;
  let c = fs.readFileSync(file, 'utf8');
  for (const name of funcNames) {
    const hookRegex = new RegExp(`function ${name}\\((.*?)\\) \\{\\s*const \\{ t, i18n \\} = useTranslation\\(\\);`);
    c = c.replace(hookRegex, `function ${name}($1) {`);
  }
  fs.writeFileSync(file, c);
}

fixHooks('src/components/CartPage.jsx', ['formatPrice']);
fixHooks('src/components/CheckoutModal.jsx', ['formatPrice', 'addressToString', 'formatDate']);
fixHooks('src/components/Orders.jsx', ['formatPrice', 'formatDate']);
fixHooks('src/components/ProductDetailPage.jsx', ['formatPrice']);
fixHooks('src/components/WishlistPage.jsx', ['formatPrice']);

// Fix JSX error in ProductDetailPage
let pdp = fs.readFileSync('src/components/ProductDetailPage.jsx', 'utf8');
pdp = pdp.replace(/title=t\("product\.add_to_cart"\)/g, 'title={t("product.add_to_cart")}');
pdp = pdp.replace(/title=t\("product\.add_to_wishlist"\)/g, 'title={t("product.add_to_wishlist")}');
pdp = pdp.replace(/title=t\("product\.already_in_wishlist"\)/g, 'title={t("product.already_in_wishlist")}');
fs.writeFileSync('src/components/ProductDetailPage.jsx', pdp);
