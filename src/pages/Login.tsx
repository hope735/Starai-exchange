import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { toast } from '../components/ui/Toast';
import Logo from '../components/ui/Logo';
import Spinner from '../components/ui/Spinner';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((s) => s.login);
  const isLoading = useAuthStore((s) => s.isLoading);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const res = await login(email, password);
    if (!res.ok) {
      toast(res.error ?? 'Login failed', 'error');
      return;
    }
    toast('Signed in', 'success');
    const state = location.state as { from?: { pathname: string } } | null;
    navigate(state?.from?.pathname ?? '/', { replace: true });
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-3">
      <div className="card w-full max-w-md p-6 space-y-4">
        <div className="text-center space-y-2">
          <Logo size={36} />
          <h1 className="text-2xl font-bold">Welcome back</h1>
          <p className="text-text-tertiary text-sm">Sign in to access your wallet and orders.</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-3">
          <label className="block">
            <span className="label">Email</span>
            <input
              type="email"
              className="input mt-1"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </label>
          <label className="block">
            <span className="label">Password</span>
            <input
              type="password"
              className="input mt-1"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="current-password"
            />
          </label>
          <button type="submit" disabled={isLoading} className="btn-primary w-full">
            {isLoading ? <Spinner size={16} /> : 'Sign in'}
          </button>
        </form>
        <p className="text-center text-sm text-text-tertiary">
          Don't have an account?{' '}
          <Link to="/register" className="text-brand-gold hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
