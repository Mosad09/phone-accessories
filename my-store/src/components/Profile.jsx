import { useState, useEffect } from "react";
import { updateUserProfile, getUserProfile } from "../services/db";

function Profile({ user, dbUser, setDbUser }) {
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (dbUser) {
      setAddress(dbUser.address || "");
      setPhone(dbUser.phone || "");
    }
  }, [dbUser]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    setError(null);
    try {
      await updateUserProfile(user.uid, { address, phone });
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
          <div className="mb-3">
            <label className="form-label fw-semibold">Delivery Address <span className="text-danger">*</span></label>
            <textarea 
              className="form-control" 
              rows="3" 
              value={address} 
              onChange={(e) => setAddress(e.target.value)} 
              placeholder="Enter your full address"
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

          <button type="submit" className="btn btn-primary-custom w-100 py-2 fw-bold" disabled={loading}>
            {loading ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Profile;
