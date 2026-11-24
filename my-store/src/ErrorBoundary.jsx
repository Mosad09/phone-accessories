import React from 'react';
import i18n from './i18n';
import { attemptChunkRecovery, clearSwCaches, isChunkLoadError } from './utils/chunkRecovery';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    console.error("ErrorBoundary caught an error", error, errorInfo);
    if (isChunkLoadError(error)) {
      attemptChunkRecovery();
    }
  }

  handleReset = async () => {
    await clearSwCaches();
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = window.location.pathname.startsWith('/admin') ? '/admin/' : '/';
  };

  render() {
    if (this.state.hasError) {
      const title = i18n.t('app.error_title', 'Oops! Something went wrong');
      const desc = i18n.t('app.error_desc', 'An unexpected error occurred. Please reload or return to the store.');
      const btnText = i18n.t('app.reload_page', 'Reload Store');

      return (
        <div className="container py-5 d-flex justify-content-center align-items-center" style={{ minHeight: '75vh' }}>
          <div className="card border-0 shadow-lg p-4 p-md-5 text-center" style={{ maxWidth: '520px', borderRadius: '20px' }}>
            <div className="mb-3 text-danger">
              <i className="bi bi-exclamation-triangle-fill" style={{ fontSize: '3rem' }}></i>
            </div>
            <h3 className="fw-bold mb-2">{title}</h3>
            <p className="text-muted-custom mb-4">{desc}</p>
            <button type="button" className="btn btn-primary-custom px-4 py-2 rounded-pill fw-bold" onClick={this.handleReset}>
              <i className="bi bi-arrow-clockwise me-2"></i>
              {btnText}
            </button>
            {this.state.error && (
              <details className="mt-4 text-start small text-muted-custom" style={{ whiteSpace: 'pre-wrap' }}>
                <summary className="cursor-pointer fw-semibold">Technical Details</summary>
                <div className="mt-2 p-2 bg-light rounded">
                  {this.state.error.message || this.state.error.toString()}
                  {import.meta.env.DEV && this.state.errorInfo?.componentStack && (
                    <>
                      <br />
                      {this.state.errorInfo.componentStack}
                    </>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
