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

fixHooks('src/components/ProductDetailPage.jsx', ['normalizeProduct', 'wait', 'toArray']);

// Fix t is not defined in ProductDetailPage
let pdp = fs.readFileSync('src/components/ProductDetailPage.jsx', 'utf8');
if (!pdp.includes('const { t, i18n } = useTranslation();') || pdp.indexOf('const { t, i18n } = useTranslation();') > pdp.indexOf('function ProductDetailPage')) {
    // ensure t is in the component
    pdp = pdp.replace(/function ProductDetailPage\(\{(.*?)\}\) \{/g, `function ProductDetailPage({$1}) {
  const { t, i18n } = useTranslation();`);
}
fs.writeFileSync('src/components/ProductDetailPage.jsx', pdp);
