import { useState, useEffect } from "react";
import { updateUserProfile, getUserProfile } from "../services/db";

const EGYPT_LOCATIONS = {
  "Cairo": ["Nasr City", "New Cairo", "Maadi", "Heliopolis", "Downtown", "Zamalek", "Shoubra"],
  "Giza": ["6th of October", "Sheikh Zayed", "Dokki", "Mohandeseen", "Haram", "Faisal"],
  "Alexandria": ["Smouha", "Sidi Gaber", "Gleem", "Miami", "Mandara", "Agami"],
  "Dakahlia": ["Mansoura", "Talkha", "Mit Ghamr"],
  "Red Sea": ["Hurghada", "El Gouna", "Safaga"],
  "Other": []
};

function Profile({ user, dbUser, setDbUser }) {
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
      if (dbUser.address && typeof dbUser.address === 'object') {
        setGovernorate(dbUser.address.governorate || "");
        setCity(dbUser.address.city || "");
        setDetail(dbUser.address.detail || "");
      } else {
        // Fallback for legacy string address
        setGovernorate("");
        setCity("");
        setDetail(dbUser.address || "");
      }
      setPhone(dbUser.phone || "");
    }
  }, [dbUser]);

  const handleGeolocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        const { latitude, longitude } = position.coords;
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`);
        const data = await res.json();
        
        if (data && data.address) {
          const fetchedGov = data.address.state || data.address.region || data.address.city || "Other";
          const fetchedCity = data.address.city || data.address.town || data.address.suburb || data.address.county || "";
          
          // Try to match governorate
          const matchedGov = Object.keys(EGYPT_LOCATIONS).find(g => fetchedGov.includes(g)) || "Other";
          setGovernorate(matchedGov);
          setCity(fetchedCity);
          setDetail(data.display_name || "");
        }
      } catch (err) {
        console.error("Geocoding failed", err);
        setError("Failed to get location details.");
      }
      setGeoLoading(false);
    }, (err) => {
      console.error(err);
      setError("Location access denied or failed.");
      setGeoLoading(false);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    setError(null);
    try {
      await updateUserProfile(user.uid, { 
        address: { governorate, city, detail }, 
        phone 
      });
      const updated = await getUserProfile(user.uid);
      setDbUser(updated);
      setSuccess(true);
    } catch (err) {
      console.error(err);
      setError("Failed to update profile.");
    }
    setLoading(false);
  };

  if (!user) {
    return <div className="text-center py-5">Please sign in to view your profile.</div>;
  }

  const availableCities = EGYPT_LOCATIONS[governorate] || [];

  return (
    <div className="container py-5 max-w-md mx-auto" style={{ maxWidth: '600px' }}>
      <h2 className="mb-4 fw-bold">My Profile</h2>
      <div className="card shadow-sm border-0 p-4">
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label text-muted-custom">Name</label>
            <input type="text" className="form-control" value={dbUser?.name || user.displayName || ""} disabled />
          </div>
          <div className="mb-3">
            <label className="form-label text-muted-custom">Email</label>
            <input type="email" className="form-control" value={dbUser?.email || user.email || ""} disabled />
          </div>

          <hr className="my-4" />
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="fw-bold mb-0">Delivery Address</h5>
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
              Use my current location
            </button>
          </div>

          <div className="row mb-3">
            <div className="col-md-6 mb-3 mb-md-0">
              <label className="form-label fw-semibold">Governorate <span className="text-danger">*</span></label>
              <select 
                className="form-select" 
                value={governorate} 
                onChange={(e) => {
                  setGovernorate(e.target.value);
                  setCity("");
                }} 
                required
              >
                <option value="" disabled>Select Governorate</option>
                {Object.keys(EGYPT_LOCATIONS).map(gov => (
                  <option key={gov} value={gov}>{gov}</option>
                ))}
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label fw-semibold">City <span className="text-danger">*</span></label>
              <input 
                className="form-control" 
                list="cityOptions"
                value={city} 
                onChange={(e) => setCity(e.target.value)} 
                placeholder={governorate ? "Select or type city" : "Select governorate first"}
                required
                disabled={!governorate}
              />
              <datalist id="cityOptions">
                {availableCities.map(c => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="mb-3">
            <label className="form-label fw-semibold">Detailed Address <span className="text-danger">*</span></label>
            <textarea 
              className="form-control" 
              rows="3" 
              value={detail} 
              onChange={(e) => setDetail(e.target.value)} 
              placeholder="Street name, building number, apartment..."
              required 
            />
          </div>
          
          <div className="mb-4">
            <label className="form-label fw-semibold">Phone Number <span className="text-danger">*</span></label>
            <input 
              type="tel" 
              className="form-control" 
              value={phone} 
              onChange={(e) => setPhone(e.target.value)} 
              placeholder="e.g. 01012345678"
              required 
            />
          </div>
          
          {error && <div className="alert alert-danger py-2">{error}</div>}
          {success && <div className="alert alert-success py-2">Profile updated successfully!</div>}

          <button type="submit" className="btn btn-primary-custom w-100 py-2 fw-bold" disabled={loading || geoLoading}>
            {loading ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Profile;
