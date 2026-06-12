// KYC (identity verification) form. Walks the user through the typical
// fields a regulated exchange needs and supports uploading a document
// image (file picker) or capturing it directly with the device camera
// via getUserMedia. The KYC store tracks submissions, and the auth
// store's kycStatus is updated. The auto-review takes a few seconds and
// either approves the submission or rejects it with a reason.


import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useKycStore, type KycSubmission } from '../../store/kycStore';
import { useTransactionStore } from '../../store/transactionStore';
import { toast } from '../ui/Toast';

const COUNTRIES = [
  'United States', 'United Kingdom', 'Canada', 'Germany', 'France', 'Spain',
  'Italy', 'Netherlands', 'Sweden', 'Switzerland', 'Singapore', 'Japan',
  'Australia', 'Brazil', 'India', 'South Africa', 'Kenya', 'Nigeria',
  'United Arab Emirates', 'Other',
];

const DOC_TYPES: Array<{ value: KycSubmission['documentType']; label: string }> = [
  { value: 'passport', label: 'Passport' },
  { value: 'id_card', label: 'National ID card' },
  { value: 'drivers_license', label: "Driver's licence" },
];

interface UploadedDoc {
  dataUrl: string;
  fileName: string;
  size: number;
  source: 'file' | 'camera';
}

export default function KycForm() {
  const user = useAuthStore((s) => s.user);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const submission = useKycStore((s) => (user ? s.submissions[user.id] : undefined));
  const submit = useKycStore((s) => s.submit);
  const markVerified = useKycStore((s) => s.markVerified);
  const reject = useKycStore((s) => s.reject);
  const resetFor = useKycStore((s) => s.resetFor);
  const addTrade = useTransactionStore((s) => s.addTrade);

  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [country, setCountry] = useState(COUNTRIES[0]);
  const [address, setAddress] = useState('');
  const [docType, setDocType] = useState<KycSubmission['documentType']>('passport');
  const [docNumber, setDocNumber] = useState('');
  const [touched, setTouched] = useState(false);
  const [front, setFront] = useState<UploadedDoc | null>(null);
  const [back, setBack] = useState<UploadedDoc | null>(null);
  const [selfie, setSelfie] = useState<UploadedDoc | null>(null);
  const [cameraOpen, setCameraOpen] = useState<null | 'front' | 'back' | 'selfie'>(null);

  const fileInputFront = useRef<HTMLInputElement | null>(null);
  const fileInputBack = useRef<HTMLInputElement | null>(null);
  const fileInputSelfie = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (submission) {
      setFullName(submission.fullName);
      setDob(submission.dateOfBirth);
      setCountry(submission.country);
      setAddress(submission.address);
      setDocType(submission.documentType);
      setDocNumber(submission.documentNumber);
    }
  }, [submission]);

  // Auto-review after submission
  useEffect(() => {
    if (!submission || submission.status !== 'pending' || !user) return;
    const id = window.setTimeout(() => {
      if (Math.random() < 0.9) {
        markVerified(user.id);
        updateProfile({ kycStatus: 'verified' });
        addTrade(user.id, 'USDT', 0, 0, 'KYC verification approved');
        toast('Identity verified — withdrawals unlocked', 'success');
      } else {
        reject(user.id, 'Document image could not be read. Please resubmit with a clearer photo.');
        updateProfile({ kycStatus: 'unverified' });
        toast('KYC submission was rejected — please retry with clearer images', 'error');
      }
    }, 4000);
    return () => window.clearTimeout(id);
  }, [submission, user, markVerified, updateProfile, reject, addTrade]);

  // Stop the camera when the modal closes or component unmounts
  useEffect(() => {
    if (!cameraOpen) {
      stopCamera();
      return;
    }
    startCamera();
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraOpen]);

  if (!user) return null;
  const currentUser = user;

  const isVerified = submission?.status === 'verified' || currentUser.kycStatus === 'verified';
  const isPending = submission?.status === 'pending' || currentUser.kycStatus === 'pending';
  const isRejected = submission?.status === 'rejected';

  function validate() {
    if (fullName.trim().length < 3) return 'Please enter your full legal name';
    if (!dob) return 'Date of birth is required';
    if (!country) return 'Country is required';
    if (address.trim().length < 5) return 'Address is too short';
    if (docNumber.trim().length < 4) return 'Document number is too short';
    if (!front) return 'Please upload a photo of the front of your document';
    if (docType !== 'passport' && !back) return 'Please upload a photo of the back of your document';
    if (!selfie) return 'Please capture or upload a selfie holding your document';
    return null;
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    const err = validate();
    if (err) { toast(err, 'error'); return; }
    submit({
      userId: currentUser.id,
      fullName: fullName.trim(),
      dateOfBirth: dob,
      country,
      address: address.trim(),
      documentType: docType,
      documentNumber: docNumber.trim(),
    });
    updateProfile({ kycStatus: 'pending' });
    toast('KYC submission received — review in progress', 'info');
  }

  function restart() {
    resetFor(currentUser.id);
    updateProfile({ kycStatus: 'unverified' });
    setTouched(false);
    setFullName('');
    setDob('');
    setAddress('');
    setDocNumber('');
    setFront(null);
    setBack(null);
    setSelfie(null);
    toast('KYC data cleared. You can re-submit a new application.', 'info');
  }

  function handleFile(slot: 'front' | 'back' | 'selfie', file: File) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast('Please choose an image file (JPG, PNG, HEIC)', 'error');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast('Image must be smaller than 10 MB', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      const doc: UploadedDoc = { dataUrl, fileName: file.name, size: file.size, source: 'file' };
      if (slot === 'front') setFront(doc);
      if (slot === 'back') setBack(doc);
      if (slot === 'selfie') setSelfie(doc);
      toast(`${slot} image uploaded`, 'success');
    };
    reader.readAsDataURL(file);
  }

  async function startCamera() {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        toast('Camera not supported on this device', 'error');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 },
        audio: false,
      });
      cameraStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (e) {
      toast('Could not access the camera. Use "Upload" instead.', 'error');
      setCameraOpen(null);
    }
  }

  function stopCamera() {
    const s = cameraStreamRef.current;
    if (s) {
      s.getTracks().forEach((t) => t.stop());
      cameraStreamRef.current = null;
    }
  }

  function capture() {
    const slot = cameraOpen;
    if (!slot) return;
    const v = videoRef.current;
    const c = canvasRef.current;
    if (!v || !c) return;
    c.width = v.videoWidth || 640;
    c.height = v.videoHeight || 480;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(v, 0, 0, c.width, c.height);
    const dataUrl = c.toDataURL('image/jpeg', 0.85);
    const doc: UploadedDoc = {
      dataUrl,
      fileName: `${slot}-capture-${Date.now()}.jpg`,
      size: Math.round((dataUrl.length * 3) / 4),
      source: 'camera',
    };
    if (slot === 'front') setFront(doc);
    if (slot === 'back') setBack(doc);
    if (slot === 'selfie') setSelfie(doc);
    setCameraOpen(null);
    toast(`${slot} photo captured`, 'success');
  }

  function DocumentUploader({ slot, label, doc, required }: { slot: 'front' | 'back' | 'selfie'; label: string; doc: UploadedDoc | null; required?: boolean }) {
    return (
      <div className="card p-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium">
            {label} {required && <span className="text-down">*</span>}
          </p>
          {doc && <span className="pill text-up">✓ {doc.source === 'camera' ? 'captured' : 'uploaded'}</span>}
        </div>
        {doc ? (
          <div className="space-y-2">
            <img src={doc.dataUrl} alt={label} className="w-full max-h-48 object-cover rounded border border-border" />
            <div className="flex flex-wrap gap-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  if (slot === 'front') setFront(null);
                  if (slot === 'back') setBack(null);
                  if (slot === 'selfie') setSelfie(null);
                }}
                className="btn-ghost"
              >
                Remove
              </button>
              {slot !== 'selfie' && (
                <button type="button" onClick={() => setCameraOpen(slot)} className="btn-outline">
                  Retake with camera
                </button>
              )}
            </div>
            <p className="text-text-tertiary text-[11px]">
              {doc.fileName} · {(doc.size / 1024).toFixed(1)} KB · source: {doc.source}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                if (slot === 'front') fileInputFront.current?.click();
                if (slot === 'back') fileInputBack.current?.click();
                if (slot === 'selfie') fileInputSelfie.current?.click();
              }}
              className="btn-outline text-sm"
            >
              {slot === 'selfie' ? 'Upload selfie' : 'Upload photo'}
            </button>
            <button type="button" onClick={() => setCameraOpen(slot)} className="btn-primary text-sm">
              Use camera
            </button>
          </div>
        )}
        <input
          ref={slot === 'front' ? fileInputFront : slot === 'back' ? fileInputBack : fileInputSelfie}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(slot, f);
            e.target.value = '';
          }}
        />
      </div>
    );
  }

  return (
    <section className="card p-5 space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold">Identity Verification (KYC)</h2>
          <p className="text-text-tertiary text-xs">
            Upload a photo of your government-issued ID and a selfie. You can also use
            your device camera to capture them directly.
          </p>
        </div>
        <KycBadge status={isVerified ? 'verified' : isPending ? 'pending' : isRejected ? 'rejected' : 'unverified'} />
      </header>

      {isVerified && (
        <div className="rounded-md border border-up/30 bg-up/10 p-3 text-sm flex items-start gap-2">
          <span className="text-up text-lg leading-none">✓</span>
          <div>
            <p className="font-semibold text-up">You are verified</p>
            <p className="text-text-secondary text-xs">
              Withdrawals are unlocked and your daily limit is 100,000 USDT equivalent.
            </p>
          </div>
        </div>
      )}

      {isPending && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm flex items-start gap-2">
          <span className="text-amber-400 text-lg leading-none animate-pulse-soft">⏳</span>
          <div>
            <p className="font-semibold text-amber-300">Review in progress</p>
            <p className="text-text-secondary text-xs">
              Our automated system is reviewing your submission. This usually takes less
              than a minute.
            </p>
          </div>
        </div>
      )}

      {isRejected && (
        <div className="rounded-md border border-down/30 bg-down/10 p-3 text-sm flex items-start gap-2">
          <span className="text-down text-lg leading-none">!</span>
          <div>
            <p className="font-semibold text-down">Submission rejected</p>
            <p className="text-text-secondary text-xs">
              {submission?.rejectionReason || 'Please update the form and resubmit.'}
            </p>
          </div>
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-3" noValidate>
        <fieldset className="grid gap-3 sm:grid-cols-2" disabled={isPending || isVerified}>
          <label className="block">
            <span className="label">Full legal name</span>
            <input
              className="input mt-1"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="As shown on your government ID"
            />
            {touched && fullName.trim().length < 3 && (
              <p className="text-down text-xs mt-1">Name must be at least 3 characters</p>
            )}
          </label>
          <label className="block">
            <span className="label">Date of birth</span>
            <input
              type="date"
              className="input mt-1"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              max={new Date().toISOString().slice(0, 10)}
            />
          </label>
          <label className="block">
            <span className="label">Country of residence</span>
            <select
              className="input mt-1"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            >
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="label">Document type</span>
            <select
              className="input mt-1"
              value={docType}
              onChange={(e) => setDocType(e.target.value as KycSubmission['documentType'])}
            >
              {DOC_TYPES.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </label>
          <label className="block sm:col-span-2">
            <span className="label">Residential address</span>
            <input
              className="input mt-1"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Street, city, postal code"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="label">Document number</span>
            <input
              className="input mt-1"
              value={docNumber}
              onChange={(e) => setDocNumber(e.target.value)}
              placeholder="Passport / ID / Licence number"
            />
          </label>
        </fieldset>

        <div className="space-y-2">
          <p className="label">Document images</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <DocumentUploader slot="front" label="Front of document" doc={front} required />
            {docType !== 'passport' && (
              <DocumentUploader slot="back" label="Back of document" doc={back} required />
            )}
            <DocumentUploader slot="selfie" label="Selfie holding document" doc={selfie} required />
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-2 pt-1">
          {(isVerified || isPending || isRejected) && (
            <button
              type="button"
              onClick={restart}
              className="btn-ghost text-sm"
              disabled={isPending}
            >
              {isPending ? 'Reviewing…' : isVerified ? 'Re-verify' : 'Restart verification'}
            </button>
          )}
          <button
            type="submit"
            className="btn-primary text-sm"
            disabled={isPending || isVerified}
          >
            {isPending ? 'Submitted' : isVerified ? 'Verified' : 'Submit for review'}
          </button>
        </div>
      </form>

      {/* Camera capture overlay */}
      {cameraOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6 bg-black/80"
          role="dialog"
          aria-modal="true"
          aria-label="Capture document image"
        >
          <div className="card p-4 w-full max-w-md space-y-3">
            <h3 className="font-semibold text-sm">Capture {cameraOpen === 'selfie' ? 'selfie' : cameraOpen === 'front' ? 'front of document' : 'back of document'}</h3>
            <div className="relative bg-black rounded overflow-hidden aspect-[4/3]">
              <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
              <canvas ref={canvasRef} className="hidden" />
            </div>
            <p className="text-text-tertiary text-xs">
              Position the {cameraOpen === 'selfie' ? 'selfie' : 'document'} inside the frame and tap Capture.
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setCameraOpen(null)} className="btn-outline text-sm flex-1">
                Cancel
              </button>
              <button type="button" onClick={capture} className="btn-primary text-sm flex-1">
                Capture
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function KycBadge({ status }: { status: KycSubmission['status'] }) {
  const styles: Record<KycSubmission['status'], string> = {
    unverified: 'bg-bg-tertiary text-text-tertiary',
    pending: 'bg-amber-500/15 text-amber-300 border border-amber-500/30',
    verified: 'bg-up/15 text-up border border-up/30',
    rejected: 'bg-down/15 text-down border border-down/30',
  };
  return (
    <span className={`pill capitalize ${styles[status]}`}>
      {status === 'verified' ? '✓ ' : status === 'pending' ? '⏳ ' : status === 'rejected' ? '✕ ' : ''}
      {status}
    </span>
  );
}
