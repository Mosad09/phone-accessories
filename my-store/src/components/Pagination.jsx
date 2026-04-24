function Pagination({
  currentPage,
  totalPages,
  perPage,
  onPageChange,
  onPerPageChange,
}) {
  if (totalPages <= 1 && perPage === 12) return null;

  // Generate page numbers with ellipsis
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);

      if (currentPage > 3) pages.push("...");

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) pages.push(i);

      if (currentPage < totalPages - 2) pages.push("...");

      pages.push(totalPages);
    }

    return pages;
  };

  const handlePageChange = (page) => {
    if (page < 1 || page > totalPages) return;
    onPageChange(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="pagination-container">
      <div className="pagination-controls">
        {/* Previous */}
        <button
          className="pagination-btn pagination-nav"
          disabled={currentPage === 1}
          onClick={() => handlePageChange(currentPage - 1)}
          aria-label="Previous page"
        >
          <i className="bi bi-chevron-left"></i>
          <span className="pagination-nav-text">Prev</span>
        </button>

        {/* Page Numbers */}
        <div className="pagination-numbers">
          {getPageNumbers().map((page, idx) =>
            page === "..." ? (
              <span key={`ellipsis-${idx}`} className="pagination-ellipsis">
                …
              </span>
            ) : (
              <button
                key={page}
                className={`pagination-btn pagination-num ${
                  currentPage === page ? "active" : ""
                }`}
                onClick={() => handlePageChange(page)}
              >
                {page}
              </button>
            )
          )}
        </div>

        {/* Next */}
        <button
          className="pagination-btn pagination-nav"
          disabled={currentPage === totalPages}
          onClick={() => handlePageChange(currentPage + 1)}
          aria-label="Next page"
        >
          <span className="pagination-nav-text">Next</span>
          <i className="bi bi-chevron-right"></i>
        </button>
      </div>

      {/* Per Page Selector */}
      <div className="per-page-selector">
        <span className="per-page-label">Show:</span>
        {[12, 24, 48].map((n) => (
          <button
            key={n}
            className={`per-page-btn ${perPage === n ? "active" : ""}`}
            onClick={() => onPerPageChange(n)}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

export default Pagination;
