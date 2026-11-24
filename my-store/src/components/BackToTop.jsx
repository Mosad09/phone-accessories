import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

function BackToTop({ hasCompareBar = false }) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > 360);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      className={`back-to-top-btn ${hasCompareBar ? "with-compare-bar" : ""}`}
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label={t("common.back_to_top")}
      title={t("common.back_to_top")}
    >
      <i className="bi bi-arrow-up" aria-hidden="true"></i>
    </button>
  );
}

export default BackToTop;
