import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useKycStore } from '../store/kycStore';
import { formatDateTime } from '../lib/format';
import { toast } from '../components/ui/Toast';
import KycForm from '../components/kyc/KycForm';

export default function Profile() {
  const user = useAuthStore((s) => s.user);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const logout = useAuthStore((s) => s.logout);
  const submission = useKycStore((s) => (user ? s.submissions[user.id] : undefined));
  const [name, setName] = useState(user?.name ?? '');
  const [twoFA, setTwoFA] = useState(user?.twoFactorEnabled ?? false);

  if (!user) return null;

  function save() {
    if (!name.trim()) {
      toast('Name cannot be empty', 'error');
      return;
    }
    updateProfile({ name: name.trim(), twoFactorEnabled: twoFA });
    toast('Profile updated', 'success');
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <header>
        <h1 className="text-2xl font-bold">Profile & Security</h1>
        <p className="text-text-tertiary text-sm">Manage your account information, security and verification.</p>

      </header>

      <section className="card p-5 space-y-4">
        <h2 className="font-semibold">Account</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="label">Email</p>
            <p className="font-medium">{user.email}</p>
          </div>
          <div>
            <p className="label">Member since</p>
            <p className="font-medium">{formatDateTime(user.createdAt)}</p>
          </div>
          <div>
            <p className="label">User ID</p>
            <p className="font-mono text-xs text-text-tertiary break-all">{user.id}</p>
          </div>
          <div>
            <p className="label">KYC status</p>
            <span className="pill capitalize">
              {submission?.status ?? user.kycStatus}
            </span>
            {submission?.reviewedAt && (
              <p className="text-text-tertiary text-xs mt-1">
                Last reviewed {formatDateTime(submission.reviewedAt)}
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="card p-5 space-y-4">
        <h2 className="font-semibold">Personal info</h2>
        <label className="block">
          <span className="label">Display name</span>
          <input
            className="input mt-1"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={twoFA}
            onChange={(e) => setTwoFA(e.target.checked)}
          />
          Enable two-factor authentication
        </label>

        <div className="flex justify-end gap-2">
          <button onClick={save} className="btn-primary">Save changes</button>
          <button
            onClick={() => {
              logout();
              toast('Signed out', 'info');
            }}
            className="btn-outline"
          >
            Sign out
          </button>
        </div>
      </section>

      <KycForm />

      <section className="card p-5 space-y-2">
        <h2 className="font-semibold">Security tips</h2>
        <ul className="text-sm text-text-secondary list-disc pl-5 space-y-1">
          <li>Never share your password or 2FA codes.</li>
          <li>Use a strong, unique password for every exchange account.</li>
          <li>Enable two-factor authentication for an extra layer of safety.</li>
          <li>Complete KYC verification to unlock fiat withdrawals and higher trading limits.</li>
          <li>Your data is securely associated with your authenticated account and stored in your browser.</li>
        </ul>

      </section>
    </div>
  );
}
