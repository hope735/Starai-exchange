// Recovery-phrase backup & verification modal. Shown right after a
// successful signup so the new user can write down their 12-word
// Secret Recovery Phrase, confirm it, and complete the wallet setup.
//
// The modal walks through three steps:
//   1. Backup — show the 12 words, copy button, "I've saved it"
//   2. Verify — ask the user to retype 3 random words from the phrase
//   3. Done — confirm with a clear "Setup complete" message

import { useEffect, useMemo, useState } from 'react';
import Modal from '../ui/Modal';
import { toast } from '../ui/Toast';

interface Props {
  open: boolean;
  phrase: string[] | null;
  onConfirmed: () => void;
  onClose: () => void;
}

function pickIndices(total: number, count: number): number[] {
  const out = new Set<number>();
  while (out.size < count) out.add(Math.floor(Math.random() * total));
  return Array.from(out).sort((a, b) => a - b);
}

function copy(text: string, label: string) {
  try {
    navigator.clipboard?.writeText(text);
    toast(label, 'success');
  } catch {
    toast('Copy failed', 'error');
  }
}

export default function RecoveryPhraseFlow({ open, phrase, onConfirmed, onClose }: Props) {
  const [step, setStep] = useState<'backup' | 'verify' | 'done'>('backup');
  const [confirmedBackup, setConfirmedBackup] = useState(false);
  const [picks, setPicks] = useState<number[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});

  useEffect(() => {
    if (open && phrase) {
      setStep('backup');
      setConfirmedBackup(false);
      setPicks(pickIndices(phrase.length, 3));
      setAnswers({});
    }
  }, [open, phrase]);

  const valid = useMemo(() => {
    if (!phrase) return false;
    return picks.every((i) => (answers[i] ?? '').trim().toLowerCase() === phrase[i].toLowerCase());
  }, [picks, answers, phrase]);

  if (!phrase) return null;

  return (
    <Modal
      open={open}
      onClose={() => {
        if (step === 'done') onClose();
        else if (window.confirm('Skip recovery-phrase backup? You can do it later from your profile, but you may lose access to your wallet if you forget your password.')) {
          onClose();
        }
      }}
      title="Secure your wallet"
      maxWidth="max-w-2xl"
    >
      <Stepper step={step} />

      {step === 'backup' && (
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            Your <b>12-word Secret Recovery Phrase</b> is the only way to recover
            your wallet if you forget your password. Write it down on paper and
            store it somewhere safe. Never share it with anyone.
          </p>
          <div className="rounded-md border border-brand-gold/30 bg-brand-gold/5 p-3 text-xs text-brand-gold">
            <b>Important:</b> we do not store this phrase. If you lose it, no one —
            not even StarAI support — can recover your account.
          </div>

          <ol className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {phrase.map((w, i) => (
              <li
                key={i}
                className="card p-2 flex items-center gap-2 text-sm"
              >
                <span className="w-6 h-6 rounded-full bg-bg-tertiary text-text-tertiary text-[10px] flex items-center justify-center font-mono">
                  {i + 1}
                </span>
                <span className="font-mono">{w}</span>
              </li>
            ))}
          </ol>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => copy(phrase.join(' '), 'Recovery phrase copied')}
              className="btn-primary text-sm flex-1"
            >
              Copy to clipboard
            </button>
            <button
              onClick={() => {
                const blob = new Blob(
                  [
                    `StarAI — Secret Recovery Phrase\nAccount: ${phrase.slice(0, 1).join('')}…\n\n${phrase.map((w, i) => `${i + 1}. ${w}`).join('\n')}\n\nKeep this file in a secure offline location. Do not share it with anyone.`,
                  ],
                  { type: 'text/plain' },
                );
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `starai-recovery-phrase-${Date.now()}.txt`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                toast('Recovery phrase downloaded', 'success');
              }}
              className="btn-outline text-sm flex-1"
            >
              Download as .txt
            </button>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={confirmedBackup}
              onChange={(e) => setConfirmedBackup(e.target.checked)}
            />
            <span>
              I have written down or securely stored my 12-word Secret Recovery
              Phrase.
            </span>
          </label>

          <div className="flex justify-end gap-2">
            <button
              onClick={() => setStep('verify')}
              disabled={!confirmedBackup}
              className="btn-primary text-sm"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {step === 'verify' && (
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            To make sure you have saved your recovery phrase correctly, please
            retype the highlighted words below.
          </p>

          <div className="space-y-3">
            {picks.map((i) => (
              <label key={i} className="block">
                <span className="label">Word #{i + 1}</span>
                <input
                  className="input mt-1 font-mono"
                  value={answers[i] ?? ''}
                  onChange={(e) => setAnswers({ ...answers, [i]: e.target.value })}
                  placeholder={`The ${i + 1}th word of your phrase`}
                />
              </label>
            ))}
          </div>

          {Object.keys(answers).length === picks.length && !valid && (
            <p className="text-down text-xs">One or more words don't match. Check your backup and try again.</p>
          )}

          <div className="flex justify-between gap-2">
            <button onClick={() => setStep('backup')} className="btn-outline text-sm">
              Back
            </button>
            <button
              onClick={() => {
                if (valid) {
                  setStep('done');
                  onConfirmed();
                }
              }}
              disabled={!valid}
              className="btn-primary text-sm"
            >
              Verify & complete setup
            </button>
          </div>
        </div>
      )}

      {step === 'done' && (
        <div className="space-y-4 text-center">
          <div className="w-16 h-16 rounded-full bg-up/15 text-up mx-auto flex items-center justify-center text-3xl">✓</div>
          <h3 className="text-xl font-bold">Your wallet is ready</h3>
          <p className="text-sm text-text-secondary">
            You can now send, receive, buy, transfer and trade crypto. Your
            100 USDT sign-up bonus has been credited to your Bonus balance.
          </p>
          <div className="flex justify-center gap-2 pt-2">
            <button onClick={onClose} className="btn-primary text-sm">
              Go to dashboard
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function Stepper({ step }: { step: 'backup' | 'verify' | 'done' }) {
  const steps: Array<{ key: typeof step; label: string }> = [
    { key: 'backup', label: 'Backup' },
    { key: 'verify', label: 'Verify' },
    { key: 'done', label: 'Done' },
  ];
  const idx = steps.findIndex((s) => s.key === step);
  return (
    <ol className="flex items-center gap-2 text-xs text-text-tertiary mb-4">
      {steps.map((s, i) => (
        <li key={s.key} className="flex items-center gap-2 flex-1">
          <span
            className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
              i < idx
                ? 'bg-up text-bg-primary'
                : i === idx
                  ? 'bg-brand-gold text-bg-primary'
                  : 'bg-bg-tertiary text-text-tertiary'
            }`}
          >
            {i < idx ? '✓' : i + 1}
          </span>
          <span className={i === idx ? 'text-text-primary font-medium' : ''}>{s.label}</span>
          {i < steps.length - 1 && <span className="flex-1 h-px bg-border" />}
        </li>
      ))}
    </ol>
  );
}
