import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { subscribeToProducts, createProductWithId, updateProduct, deleteProduct, uploadProductImage } from "../../services/firestoreService";

const initialForm = {
  name: "",
  description: "",
  price: "",
  discountPrice: "",
  category: "",
  stock: "100",
  featured: false,
  image: ""
};

function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [imageFiles, setImageFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState("");
  const [currentImagePublicId, setCurrentImagePublicId] = useState("");
  const modalRef = useRef(null);
  const previouslyFocusedElementRef = useRef(null);
  
  const [formData, setFormData] = useState(initialForm);

  useEffect(() => {
    const unsub = subscribeToProducts((data) => {
      setProducts(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  const handleOpenModal = (product = null) => {
    setUploadError("");
    setUploadProgress(0);
    if (product) {
      setEditingId(product.id);
      setCurrentImagePublicId(product.imagePublicIds?.[0] || "");
      setFormData({
        name: product.name || "",
        description: product.description || product.details || "",
        price: product.price || "",
        discountPrice: product.discountPrice || "",
        category: product.category || "",
        stock: product.stock !== undefined ? product.stock : "100",
        featured: product.featured || false,
        image: product.image || ""
      });
    } else {
      setEditingId(null);
      setCurrentImagePublicId("");
      setFormData(initialForm);
    }
    setImageFiles([]);
    setShowModal(true);
  };

  const handleCloseModal = useCallback(() => {
    setShowModal(false);
    setEditingId(null);
    setFormData(initialForm);
    setImageFiles([]);
    setUploadError("");
    setUploadProgress(0);
    setCurrentImagePublicId("");
  }, []);

  useEffect(() => {
    if (!showModal) return undefined;

    previouslyFocusedElementRef.current = document.activeElement;
    const originalBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusableSelector = [
      "a[href]",
      "button:not([disabled])",
      "textarea:not([disabled])",
      "input:not([disabled])",
      "select:not([disabled])",
      "[tabindex]:not([tabindex='-1'])",
    ].join(",");

    const focusFirstControl = () => {
      const focusableElements = Array.from(
        modalRef.current?.querySelectorAll(focusableSelector) || []
      );
      (focusableElements[0] || modalRef.current)?.focus();
    };

    const handleKeyDown = (e) => {
      if (e.key === "Escape" && !isSaving) {
        handleCloseModal();
        return;
      }

      if (e.key !== "Tab") return;

      const focusableElements = Array.from(
        modalRef.current?.querySelectorAll(focusableSelector) || []
      );
      if (focusableElements.length === 0) {
        e.preventDefault();
        modalRef.current?.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    };

    requestAnimationFrame(focusFirstControl);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalBodyOverflow;
      previouslyFocusedElementRef.current?.focus?.();
    };
  }, [showModal, isSaving, handleCloseModal]);

  const getUploadErrorMessage = (error) => {
    switch (error?.code) {
      case "cloudinary/config-missing":
        return "Cloudinary config is missing. Please set cloud name and upload preset.";
      case "cloudinary/canceled":
        return "Image upload was canceled.";
      case "cloudinary/timeout":
        return "Upload timed out. Check your network and try again.";
      case "cloudinary/invalid-format":
        return "Invalid image file. Please choose a valid JPG, PNG, or WEBP file.";
      default:
        return error?.message || "Image upload failed. Please try again.";
    }
  };

  const validateImageFile = (file) => {
    if (!file) return "";
    if (!file.type?.startsWith("image/")) {
      return "Only image files are allowed.";
    }
    if (file.size > 8 * 1024 * 1024) {
      return "Image size must be 8MB or less.";
    }
    return "";
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setUploadError("");
    setUploadProgress(0);
    
    try {
      let imageUrl = formData.image;
      let imageUrls = imageUrl ? [imageUrl] : [];
      let imagePublicIds = currentImagePublicId ? [currentImagePublicId] : [];
      for (const file of imageFiles) {
        const fileError = validateImageFile(file);
        if (fileError) {
          throw new Error(fileError);
        }
      }
      
      const payload = {
        name: formData.name,
        description: formData.description,
        price: Number(formData.price),
        discountPrice: formData.discountPrice ? Number(formData.discountPrice) : null,
        category: formData.category,
        stock: Number(formData.stock),
        featured: formData.featured,
      };

      if (editingId) {
        if (imageFiles.length > 0) {
          const totalFiles = imageFiles.length;
          const uploaded = [];
          for (let i = 0; i < totalFiles; i += 1) {
            const result = await uploadProductImage(imageFiles[i], editingId, (singleProgress) => {
              const overall = Math.round(((i + singleProgress / 100) / totalFiles) * 100);
              setUploadProgress(overall);
            });
            uploaded.push(result);
          }
          imageUrls = uploaded.map((item) => item.url);
          imageUrl = imageUrls[0] || "";
          imagePublicIds = uploaded.map((item) => item.publicId).filter(Boolean);
        }
        await updateProduct(editingId, {
          ...payload,
          image: imageUrl,
          images: imageUrls,
          imagePublicIds,
        });
      } else {
        const productId = `product_${Date.now()}`;
        if (imageFiles.length > 0) {
          const totalFiles = imageFiles.length;
          const uploaded = [];
          for (let i = 0; i < totalFiles; i += 1) {
            const result = await uploadProductImage(imageFiles[i], productId, (singleProgress) => {
              const overall = Math.round(((i + singleProgress / 100) / totalFiles) * 100);
              setUploadProgress(overall);
            });
            uploaded.push(result);
          }
          imageUrls = uploaded.map((item) => item.url);
          imageUrl = imageUrls[0] || "";
          imagePublicIds = uploaded.map((item) => item.publicId).filter(Boolean);
        }
        await createProductWithId(productId, {
          ...payload,
          image: imageUrl,
          images: imageUrls,
          imagePublicIds,
        });
      }
      
      handleCloseModal();
    } catch (err) {
      console.error("Failed to save product:", err);
      setUploadError(getUploadErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (product) => {
    if (window.confirm("Are you sure you want to delete this product?")) {
      try {
        await deleteProduct(product);
      } catch (err) {
        console.error("Delete failed:", err);
        alert("Error deleting product.");
      }
    }
  };

  const filteredProducts = products.filter(p => 
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="text-center py-5"><div className="spinner-border text-primary-custom"></div></div>;
  }

  return (
    <div>
      {/* Controls */}
      <div className="row g-3 mb-4">
        <div className="col-md-6">
          <div className="input-group">
            <span className="input-group-text bg-white border-end-0">
              <i className="bi bi-search text-muted"></i>
            </span>
            <input 
              type="text" 
              className="form-control border-start-0 ps-0" 
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="col-md-6 text-md-end">
          <button className="btn btn-primary-custom rounded-pill px-4" onClick={() => handleOpenModal()}>
            <i className="bi bi-plus-lg me-2"></i>Add Product
          </button>
        </div>
      </div>

      {/* Products Table */}
      <div className="table-responsive">
        <table className="table table-hover align-middle admin-table">
          <thead className="table-light">
            <tr>
              <th>Product</th>
              <th>Category</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Status</th>
              <th className="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map(product => (
              <tr key={product.id}>
                <td>
                  <div className="d-flex align-items-center">
                    {product.image ? (
                      <img src={product.image} alt="" width="48" height="48" className="rounded object-fit-cover me-3 border" />
                    ) : (
                      <div className="bg-light rounded me-3 d-flex align-items-center justify-content-center border" style={{width: 48, height: 48}}>
                        <i className="bi bi-image text-muted"></i>
                      </div>
                    )}
                    <div>
                      <div className="fw-medium text-truncate" style={{maxWidth: "200px"}}>{product.name}</div>
                      {product.featured && <span className="badge bg-warning text-dark mt-1" style={{fontSize: "0.65rem"}}>FEATURED</span>}
                    </div>
                  </div>
                </td>
                <td><span className="badge bg-light text-dark border px-2 py-1">{product.category}</span></td>
                <td>
                  <div className="fw-bold">{Number(product.price).toLocaleString()} EGP</div>
                  {product.discountPrice && <small className="text-decoration-line-through text-muted">{Number(product.discountPrice).toLocaleString()} EGP</small>}
                </td>
                <td>
                  <span className={`badge ${product.stock > 0 ? "bg-success-subtle text-success border border-success-subtle" : "bg-danger-subtle text-danger border border-danger-subtle"} rounded-pill`}>
                    {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
                  </span>
                </td>
                <td>
                  <span className="badge bg-success rounded-pill">Active</span>
                </td>
                <td className="text-end">
                  <button className="btn btn-sm btn-light me-2" onClick={() => handleOpenModal(product)} title="Edit">
                    <i className="bi bi-pencil"></i>
                  </button>
                  <button className="btn btn-sm btn-light text-danger" onClick={() => handleDelete(product)} title="Delete">
                    <i className="bi bi-trash"></i>
                  </button>
                </td>
              </tr>
            ))}
            {filteredProducts.length === 0 && (
              <tr><td colSpan="6" className="text-center py-5 text-muted">No products found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {showModal && createPortal(
        <div className="modal-backdrop-custom d-flex align-items-center justify-content-center position-fixed inset-0" style={{background: "rgba(15,23,42,0.5)", backdropFilter: "blur(4px)"}}>
          <div
            ref={modalRef}
            className="modal-content-custom bg-white rounded-4 shadow-lg w-100 mx-3 d-flex flex-column"
            role="dialog"
            aria-modal="true"
            aria-labelledby="productModalTitle"
            tabIndex="-1"
            style={{maxWidth: "800px", maxHeight: "90vh", animation: "modalSlideUp 0.3s ease"}}
          >
            
            <div className="p-4 border-bottom d-flex justify-content-between align-items-center">
              <h5 id="productModalTitle" className="fw-bold mb-0">{editingId ? "Edit Product" : "Add New Product"}</h5>
              <button className="btn-close" onClick={handleCloseModal}></button>
            </div>
            
            <div className="p-4 overflow-auto flex-grow-1">
              <form id="productForm" onSubmit={handleSave}>
                <div className="row g-4">
                  
                  {/* Basic Info */}
                  <div className="col-12">
                    <label className="form-label fw-medium">Product Name *</label>
                    <input type="text" className="form-control" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                  </div>
                  
                  <div className="col-md-6">
                    <label className="form-label fw-medium">Category *</label>
                    <input type="text" className="form-control" required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} placeholder="e.g. Headphones" />
                  </div>
                  
                  <div className="col-md-6">
                    <label className="form-label fw-medium">Stock Quantity *</label>
                    <input type="number" className="form-control" required min="0" value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} />
                  </div>
                  
                  <div className="col-md-6">
                    <label className="form-label fw-medium">Regular Price (EGP) *</label>
                    <input type="number" className="form-control" required min="0" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} />
                  </div>
                  
                  <div className="col-md-6">
                    <label className="form-label fw-medium">Discount Price (Optional)</label>
                    <input type="number" className="form-control" min="0" value={formData.discountPrice} onChange={e => setFormData({...formData, discountPrice: e.target.value})} />
                  </div>
                  
                  <div className="col-12">
                    <label className="form-label fw-medium">Description</label>
                    <textarea className="form-control" rows="4" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}></textarea>
                  </div>
                  
                  <div className="col-12">
                    <label className="form-label fw-medium">Product Image</label>
                    <div className="d-flex align-items-center gap-3">
                      {(imageFiles[0] || formData.image) && (
                        <img 
                          src={imageFiles[0] ? URL.createObjectURL(imageFiles[0]) : formData.image} 
                          alt="Preview" 
                          className="rounded border object-fit-cover" 
                          style={{width: "80px", height: "80px"}} 
                        />
                      )}
                      <input 
                        type="file" 
                        className="form-control" 
                        accept="image/*" 
                        multiple
                        onChange={e => {
                          const files = Array.from(e.target.files || []);
                          const validationError = files.map(validateImageFile).find(Boolean) || "";
                          setUploadError(validationError);
                          if (!validationError && files.length > 0) {
                            setImageFiles(files);
                            setUploadProgress(0);
                          } else {
                            setImageFiles([]);
                          }
                        }} 
                      />
                    </div>
                    {isSaving && imageFiles.length > 0 && (
                      <div className="mt-2">
                        <div className="progress" role="progressbar" aria-label="Upload progress" aria-valuenow={uploadProgress} aria-valuemin="0" aria-valuemax="100">
                          <div className="progress-bar progress-bar-striped progress-bar-animated" style={{ width: `${uploadProgress}%` }}>
                            {uploadProgress}%
                          </div>
                        </div>
                        <small className="text-muted">Uploading image to Cloudinary...</small>
                      </div>
                    )}
                    {!isSaving && imageFiles.length > 1 && (
                      <small className="text-muted d-block mt-2">
                        {imageFiles.length} images selected. The first image will be used as the main thumbnail.
                      </small>
                    )}
                    {uploadError && (
                      <div className="alert alert-danger mt-2 mb-0 py-2" role="alert">
                        <i className="bi bi-exclamation-triangle me-2"></i>
                        {uploadError}
                      </div>
                    )}
                  </div>
                  
                  <div className="col-12">
                    <div className="form-check form-switch mt-2">
                      <input className="form-check-input" type="checkbox" id="featuredSwitch" checked={formData.featured} onChange={e => setFormData({...formData, featured: e.target.checked})} />
                      <label className="form-check-label ms-2" htmlFor="featuredSwitch">Mark as Featured Product</label>
                    </div>
                  </div>
                  
                </div>
              </form>
            </div>
            
            <div className="p-4 border-top d-flex justify-content-end gap-3 bg-light rounded-bottom-4">
              <button type="button" className="btn btn-outline-secondary rounded-pill px-4" onClick={handleCloseModal} disabled={isSaving}>Cancel</button>
              <button type="submit" form="productForm" className="btn btn-primary-custom rounded-pill px-4 d-flex align-items-center gap-2" disabled={isSaving}>
                {isSaving ? <><span className="spinner-border spinner-border-sm"></span> Saving...</> : <><i className="bi bi-check2"></i> Save Product</>}
              </button>
            </div>
            
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default AdminProducts;
