import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useNotificationStore, seedDefaultNotifications } from '../store/notificationStore';
import { toast } from '../components/ui/Toast';
import Logo from '../components/ui/Logo';
import Spinner from '../components/ui/Spinner';
import RecoveryPhraseFlow from '../components/auth/RecoveryPhraseFlow';

export default function Register() {
  const navigate = useNavigate();
  const register = useAuthStore((s) => s.register);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const isLoading = useAuthStore((s) => s.isLoading);
  const pushNotification = useNotificationStore((s) => s.push);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [phrase, setPhrase] = useState<string[] | null>(null);
  const [phraseDone, setPhraseDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!agreed) {
      toast('Please agree to the Terms of Service first', 'error');
      return;
    }
    const res = await register(name, email, password);
    if (!res.ok || !res.recoveryPhrase) {
      toast(res.error ?? 'Registration failed', 'error');
      return;
    }
    // Show the recovery phrase backup & verification flow.
    setPhrase(res.recoveryPhrase);
  }

  function finishSetup() {
    if (phrase) {
      updateProfile({ phraseConfirmed: true });
      const user = useAuthStore.getState().user;
      if (user) {
        pushNotification({
          userId: user.id,
          category: 'account',
          title: 'Wallet created',
          body: 'Your secure wallet has been generated. Your 12-word Secret Recovery Phrase is the only way to recover access — keep it safe.',
        });
        seedDefaultNotifications(user.id);
      }
    }
    setPhrase(null);
    setPhraseDone(true);
    toast('Welcome to StarAI', 'success');
    navigate('/', { replace: true });
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-3 py-6">
      <div className="card w-full max-w-md p-6 space-y-4">
        <div className="text-center space-y-2">
          <Logo size={36} />
          <h1 className="text-2xl font-bold">Create your account</h1>
          <p className="text-text-tertiary text-sm">
            It only takes a minute. A secure wallet is generated automatically.
          </p>
        </div>
        <form onSubmit={onSubmit} className="space-y-3">
          <label className="block">
            <span className="label">Full name</span>
            <input
              className="input mt-1"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
              autoComplete="name"
            />
          </label>
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
              autoComplete="new-password"
            />
            <span className="text-xs text-text-tertiary mt-1 block">
              At least 6 characters. Use a mix of letters, numbers and symbols.
            </span>
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
            />
            <span className="text-text-secondary">
              I agree to the StarAI Terms of Service and Privacy Policy. I
              understand that my wallet is secured by a 12-word Secret Recovery
              Phrase that I am responsible for keeping safe.
            </span>
          </label>
          <button type="submit" disabled={isLoading} className="btn-primary w-full">
            {isLoading ? <Spinner size={16} /> : 'Create account & secure wallet'}
          </button>
        </form>
        <p className="text-center text-sm text-text-tertiary">
          Already have an account?{' '}
          <Link to="/login" className="text-brand-gold hover:underline">
            Sign in
          </Link>
        </p>
        <p className="text-center text-[11px] text-text-tertiary">
          By creating an account you agree to the StarAI Terms of Service.
        </p>
      </div>

      <RecoveryPhraseFlow
        open={!!phrase && !phraseDone}
        phrase={phrase}
        onConfirmed={finishSetup}
        onClose={() => {
          if (window.confirm('Skip the recovery-phrase backup? You will need it to recover your wallet if you forget your password.')) {
            finishSetup();
          }
        }}
      />
    </div>
  );
}
