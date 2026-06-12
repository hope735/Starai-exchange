import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-3">
      <p className="text-7xl font-bold text-brand-gold">404</p>
      <h1 className="text-2xl font-bold mt-2">Page not found</h1>
      <p className="text-text-tertiary mt-1">The page you're looking for doesn't exist or has moved.</p>
      <Link to="/" className="btn-primary mt-4">
        Back to dashboard
      </Link>
    </div>
  );
}
