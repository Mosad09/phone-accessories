import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { updateUserProfile, getUserProfile } from "../services/db";

const EGYPT_LOCATIONS = {
  "Cairo": ["Nasr City", "New Cairo", "Maadi", "Heliopolis", "Downtown", "Zamalek", "Shoubra", "Rehab", "Madinaty", "Mokattam"],
  "Giza": ["6th of October", "Sheikh Zayed", "Dokki", "Mohandeseen", "Haram", "Faisal", "Imbaba", "Agouza"],
  "Alexandria": ["Smouha", "Sidi Gaber", "Gleem", "Miami", "Mandara", "Agami", "Borg El Arab", "Montaza"],
  "Dakahlia": ["Mansoura", "Talkha", "Mit Ghamr", "Dekernes", "Aga"],
  "Red Sea": ["Hurghada", "El Gouna", "Safaga", "Marsa Alam", "Ras Gharib"],
  "Beheira": ["Damanhour", "Kafr El Dawwar", "Rashid", "Edku"],
  "Gharbia": ["Tanta", "El Mahalla El Kubra", "Zifta", "Kafr El Zayat"],
  "Kafr El Sheikh": ["Kafr El Sheikh", "Desouk", "Baltim", "Metoubes"],
  "Monufia": ["Shibin El Kom", "Sadat City", "Menouf", "Ashmoun"],
  "Qalyubia": ["Banha", "Shubra El Kheima", "Qalyub", "El Obour"],
  "Sharqia": ["Zagazig", "10th of Ramadan", "Minya El Qamh", "Belbeis"],
  "Ismailia": ["Ismailia", "Fayed", "Qantara"],
  "Port Said": ["Port Said", "Port Fouad"],
  "Suez": ["Suez", "Ain Sokhna"],
  "South Sinai": ["Sharm El Sheikh", "Dahab", "Nuweiba", "Toor Sinai"],
  "North Sinai": ["Arish", "Rafah", "Bir al-Abed"],
  "Beni Suef": ["Beni Suef", "Nasser", "Biba"],
  "Faiyum": ["Faiyum", "Senooris", "Ibsheway"],
  "Minya": ["Minya", "Mallawi", "Samalut", "Beni Mazar"],
  "Asyut": ["Asyut", "Dairut", "Manfalut", "Abnub"],
  "Sohag": ["Sohag", "Akhmim", "Girga", "Tahta"],
  "Qena": ["Qena", "Nag Hammadi", "Qus", "Dishna"],
  "Luxor": ["Luxor", "Esna", "Armant"],
  "Aswan": ["Aswan", "Edfu", "Kom Ombo", "Daraw"],
  "New Valley": ["Kharga", "Dakhla", "Farafra"],
  "Matrouh": ["Marsa Matrouh", "El Alamein", "Siwa", "Sidi Abdel Rahman"],
  "Other": []
};

function Profile({ user, dbUser, setDbUser }) {
  const { t } = useTranslation();
  const [governorate, setGovernorate] = useState("");
  const [city, setCity] = useState("");
  const [detail, setDetail] = useState("");
  const [phone, setPhone] = useState("");

  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (dbUser) {
      if (dbUser.address && typeof dbUser.address === "object") {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setGovernorate(dbUser.address.governorate || "");
        setCity(dbUser.address.city || "");
        setDetail(dbUser.address.detail || "");
      } else {
        setGovernorate("");
        setCity("");
        setDetail(dbUser.address || "");
      }
      setPhone(dbUser.phone || "");
    }
  }, [dbUser]);

  const handleGeolocation = () => {
    if (!navigator.geolocation) {
      setError(t("profile.geo_unsupported"));
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`
          );
          const data = await res.json();

          if (data && data.address) {
            const fetchedGov = data.address.state || data.address.region || data.address.city || "Other";
            const fetchedCity = data.address.city || data.address.town || data.address.suburb || data.address.county || "";

            const matchedGov = Object.keys(EGYPT_LOCATIONS).find((g) => fetchedGov.includes(g)) || "Other";
            setGovernorate(matchedGov);
            setCity(fetchedCity);
            setDetail(data.display_name || "");
          }
        } catch (err) {
          console.error("Geocoding failed", err);
          setError(t("profile.geo_failed"));
        }
        setGeoLoading(false);
      },
      (err) => {
        console.error(err);
        setError(t("profile.geo_denied"));
        setGeoLoading(false);
      }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    setError(null);
    try {
      await updateUserProfile(user.uid, {
        address: { governorate, city, detail },
        phone,
      });
      const updated = await getUserProfile(user.uid);
      setDbUser(updated);
      setSuccess(true);
    } catch (err) {
      console.error(err);
      setError(t("profile.update_error"));
    }
    setLoading(false);
  };

  if (!user) {
    return (
      <div className="container text-center py-5">
        <i className="bi bi-person-lock fs-1 text-muted-custom d-block mb-3"></i>
        <p className="text-muted-custom">{t("profile.sign_in_prompt")}</p>
      </div>
    );
  }

  const availableCities = EGYPT_LOCATIONS[governorate] || [];

  return (
    <div className="container py-5 max-w-md mx-auto" style={{ maxWidth: "600px" }}>
      <h2 className="mb-4 fw-bold">{t("profile.title")}</h2>
      <div className="card shadow-sm border-0 p-4">
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label text-muted-custom">{t("profile.name")}</label>
            <input type="text" className="form-control" value={dbUser?.name || user.displayName || ""} disabled />
          </div>
          <div className="mb-3">
            <label className="form-label text-muted-custom">{t("profile.email")}</label>
            <input type="email" className="form-control" value={dbUser?.email || user.email || ""} disabled />
          </div>

          <hr className="my-4" />
          <div className="d-flex justify-content-between align-items-center mb-3 profile-address-heading">
            <h5 className="fw-bold mb-0">{t("profile.delivery_address")}</h5>
            <button
              type="button"
              className="btn btn-sm btn-outline-primary-custom d-flex align-items-center gap-2"
              onClick={handleGeolocation}
              disabled={geoLoading}
            >
              {geoLoading ? (
                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
              ) : (
                <i className="bi bi-geo-alt"></i>
              )}
              {t("profile.use_location")}
            </button>
          </div>

          <div className="row mb-3">
            <div className="col-md-6 mb-3 mb-md-0">
              <label className="form-label fw-semibold">
                {t("profile.governorate")} <span className="text-danger">*</span>
              </label>
              <select
                className="form-select"
                value={governorate}
                onChange={(e) => {
                  setGovernorate(e.target.value);
                  setCity("");
                }}
                required
              >
                <option value="" disabled>{t("profile.select_governorate")}</option>
                {Object.keys(EGYPT_LOCATIONS).map((gov) => (
                  <option key={gov} value={gov}>{gov}</option>
                ))}
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label fw-semibold">
                {t("profile.city")} <span className="text-danger">*</span>
              </label>
              <input
                className="form-control"
                list="cityOptions"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder={governorate ? t("profile.city_placeholder") : t("profile.select_gov_first")}
                required
                disabled={!governorate}
              />
              <datalist id="cityOptions">
                {availableCities.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="mb-3">
            <label className="form-label fw-semibold">
              {t("profile.detailed_address")} <span className="text-danger">*</span>
            </label>
            <textarea
              className="form-control"
              rows="3"
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              placeholder={t("profile.address_placeholder")}
              required
            />
          </div>

          <div className="mb-4">
            <label className="form-label fw-semibold">
              {t("profile.phone")} <span className="text-danger">*</span>
            </label>
            <input
              type="tel"
              className="form-control"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t("profile.phone_placeholder")}
              required
            />
          </div>

          {error && <div className="alert alert-danger py-2">{error}</div>}
          {success && <div className="alert alert-success py-2">{t("profile.updated_success")}</div>}

          <button type="submit" className="btn btn-primary-custom w-100 py-2 fw-bold" disabled={loading || geoLoading}>
            {loading ? t("profile.saving") : t("profile.save")}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Profile;
