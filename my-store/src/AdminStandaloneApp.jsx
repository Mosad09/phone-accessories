import { useEffect, useState } from "react";
import { onAuthStateChanged } from "@firebase/auth";
import "bootstrap/dist/css/bootstrap.min.css";
import { auth, loginWithGoogle, logout } from "./utils/firebase";
import {
  getCachedStoreSettings,
  isUserAdmin,
  subscribeToStoreSettings,
} from "./services/firestoreService";
import { applyThemeToDocument } from "./services/storeSettings";
import AdminPanel from "./components/admin/AdminPanel";
import BrandLogo from "./components/BrandLogo";

function AdminStandaloneApp() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);
  const [storeSettings, setStoreSettings] = useState(() => getCachedStoreSettings());
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "light");

  useEffect(() => {
    if (theme === "dark") {
      document.body.classList.add("dark-mode");
    } else {
      document.body.classList.remove("dark-mode");
    }
    localStorage.setItem("theme", theme);
    applyThemeToDocument(storeSettings.theme, theme === "dark");
  }, [theme, storeSettings.theme]);

  useEffect(() => {
    return subscribeToStoreSettings(setStoreSettings);
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const adminStatus = await isUserAdmin(currentUser.uid, currentUser.email);
          setIsAdmin(adminStatus);
        } catch {
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
      setChecking(false);
    });
    return unsub;
  }, []);

  return (
    <div className="app-shell">
      <nav className="navbar navbar-custom py-3">
        <div className="container d-flex align-items-center justify-content-between gap-3">
          <div className="d-flex align-items-center gap-2 fw-bold fs-5">
            <BrandLogo admin size={36} />
            <span>
              {storeSettings.brand?.namePrimary || "Vel"}
              <span className="text-primary-custom">{storeSettings.brand?.nameAccent || "trix"}</span>
              <span className="badge bg-dark text-white ms-2 rounded-pill small">ADMIN</span>
            </span>
          </div>

          <div className="d-flex align-items-center gap-2">
            <button
              type="button"
              className="cart-btn-nav border-0"
              onClick={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))}
              aria-label="Toggle theme"
            >
              <i className={`bi ${theme === "dark" ? "bi-sun" : "bi-moon"} fs-5`}></i>
            </button>
            {user && (
              <button
                type="button"
                className="btn btn-sm btn-outline-danger rounded-pill px-3"
                onClick={logout}
              >
                <i className="bi bi-box-arrow-right me-1"></i>
                Sign Out
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className="app-main">
        {checking ? (
          <div className="container py-5 text-center">
            <div className="spinner-border text-primary-custom" role="status"></div>
          </div>
        ) : !user ? (
          <div className="container py-5 d-flex justify-content-center">
            <div className="card border-0 shadow-sm p-4 p-md-5 text-center rounded-4" style={{ maxWidth: 440 }}>
              <div className="mb-3 d-flex justify-content-center">
                <BrandLogo admin size={64} />
              </div>
              <h3 className="fw-bold mb-2">Veltrix Admin Console</h3>
              <p className="text-muted-custom small mb-4">
                Sign in with your administrator Google account to manage products, orders, offers, and site settings.
              </p>
              <button
                type="button"
                className="btn btn-primary-custom rounded-pill py-2 px-4 fw-bold d-inline-flex align-items-center justify-content-center gap-2"
                onClick={loginWithGoogle}
              >
                <i className="bi bi-google"></i>
                Sign In with Google
              </button>
              <a href="/" className="btn btn-link btn-sm text-muted-custom mt-3 text-decoration-none">
                Visit Public Storefront
              </a>
            </div>
          </div>
        ) : !isAdmin ? (
          <div className="container py-5 text-center">
            <i className="bi bi-shield-lock fs-1 text-danger"></i>
            <h3 className="mt-3">Admin Access Required</h3>
            <p className="text-muted-custom mb-4">
              Signed in as {user.email}, which does not have admin privileges.
            </p>
            <div className="d-flex justify-content-center gap-2">
              <button type="button" className="btn btn-outline-secondary rounded-pill px-4" onClick={logout}>
                Switch Account
              </button>
              <a href="/" className="btn btn-primary-custom rounded-pill px-4">
                Go to Store
              </a>
            </div>
          </div>
        ) : (
          <AdminPanel standalone />
        )}
      </main>
    </div>
  );
}

export default AdminStandaloneApp;
