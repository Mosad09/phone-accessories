const fs = require('fs');

let c = fs.readFileSync('src/components/ProductCard.jsx', 'utf8');

c = c.replace(
  'import { toTitleCase } from "../utils/textUtils";',
  'import { toTitleCase } from "../utils/textUtils";\nimport { useTranslation } from "react-i18next";'
);

c = c.replace(
  'function ProductCard({ product, addToCart, addToWishlist, isInWishlist }) {',
  'function ProductCard({ product, addToCart, addToWishlist, isInWishlist }) {\n  const { t, i18n } = useTranslation();'
);

c = c.replace(
  'message: "Added to cart ✅"',
  'message: t("product.added_to_cart_toast")'
);

c = c.replace(
  'message: "Added to wishlist ❤️"',
  'message: t("product.added_to_wishlist_toast")'
);

c = c.replace(
  /EGP /g,
  '{t("navbar.currency")} '
);

c = c.replace(
  'title={isInWishlist ? "Already in Wishlist" : "Add to Wishlist"}',
  'title={isInWishlist ? t("product.already_in_wishlist") : t("product.add_to_wishlist")}'
);

c = c.replace(
  'title="Add to Cart"',
  'title={t("product.add_to_cart")}'
);

fs.writeFileSync('src/components/ProductCard.jsx', c);
