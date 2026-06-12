import { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useWalletStore } from '../../store/walletStore';
import Modal from '../ui/Modal';
import QRCode from '../ui/QRCode';
import { toast } from '../ui/Toast';

function copy(text: string, label: string) {
  try {
    if (navigator.clipboard) {
      void navigator.clipboard.writeText(text);
    } else {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    toast(label, 'success');
  } catch {
    toast('Copy failed', 'error');
  }
}

interface Props {
  open: boolean;
  onClose: () => void;
  initialSymbol?: string;
}

export default function ReceiveModal({ open, onClose, initialSymbol = 'BTC' }: Props) {
  const userId = useAuthStore((s) => s.user?.id ?? 'default');
  const listCoins = useWalletStore((s) => s.listCoins);
  const getAddress = useWalletStore((s) => s.getAddress);
  const getCoin = useWalletStore((s) => s.getCoin);
  const [symbol, setSymbol] = useState(initialSymbol);

  useEffect(() => { if (open) setSymbol(initialSymbol); }, [open, initialSymbol]);

  const coins = listCoins();
  const coin = useMemo(() => getCoin(symbol) ?? coins[0], [symbol, coins, getCoin]);
  const address = coin ? getAddress(userId, coin.symbol) : '';

  return (
    <Modal open={open} onClose={onClose} title="Receive crypto">
      <p className="text-text-tertiary text-sm mb-4">
        Share your deposit address or QR code. The sender's wallet will credit your
        account automatically once the network confirms the transaction.
      </p>
      <label className="block mb-3">
        <span className="label">Asset</span>
        <select className="input mt-1" value={symbol} onChange={(e) => setSymbol(e.target.value)}>
          {coins.map((c) => (
            <option key={c.symbol} value={c.symbol}>
              {c.name} ({c.symbol}) · {c.network}
            </option>
          ))}
        </select>
      </label>

      {coin && (
        <>
          <div className="flex flex-col items-center bg-white p-4 rounded-lg my-3">
            <QRCode value={address} size={192} bg="#ffffff" fg="#0b0e11" />
          </div>
          <div className="card p-3 mt-2">
            <p className="label">Your {coin.symbol} address ({coin.network})</p>
            <p className="font-mono text-xs break-all text-text-primary mt-1">{address}</p>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            <button
              onClick={() => copy(address, 'Address copied to clipboard')}
              className="btn-primary text-sm flex-1"
            >
              Copy address
            </button>
            <button
              onClick={() => copy(`${coin.symbol.toLowerCase()}:${address}`, 'Payment URI copied')}
              className="btn-outline text-sm flex-1"
            >
              Copy payment URI
            </button>
          </div>
          <p className="text-xs text-text-tertiary mt-3">
            Minimum deposit: <b>{coin.minDeposit} {coin.symbol}</b>. Funds credit
            after {coin.symbol === 'BTC' ? 2 : coin.symbol === 'ETH' ? 12 : 1} network
            confirmations.
          </p>
        </>
      )}
    </Modal>
  );
}
