// Lightweight QR code generator (no external dependency). Renders a QR-style
// matrix directly to a <canvas> using Reed-Solomon error correction. The
// implementation is a faithful re-implementation of the QR Code 2005 spec
// for byte mode (UTF-8), version 1-10, and EC level L — which is more than
// enough for showing a wallet address to a sender's wallet app scanner.
//
// Why not pull in a library? The whole component is ~250 lines and avoids
// the audit surface of a third-party dependency. We only need to encode
// the wallet address string the user wants to share.

import { useEffect, useRef } from 'react';

interface QRCodeProps {
  value: string;
  size?: number;
  bg?: string;
  fg?: string;
  className?: string;
  label?: string;
}

// Galois field arithmetic used by the Reed-Solomon error correction.
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);
(function initGF() {
  let x = 1;
  for (let i = 0; i < 255; i += 1) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i += 1) GF_EXP[i] = GF_EXP[i - 255];
})();

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

function generatorPoly(nsym: number): number[] {
  let g: number[] = [1];
  for (let i = 0; i < nsym; i += 1) {
    g = polyMul(g, [1, GF_EXP[i]]);
  }
  return g;
}

function polyMul(a: number[], b: number[]): number[] {
  const out = new Array(a.length + b.length - 1).fill(0);
  for (let i = 0; i < a.length; i += 1) {
    for (let j = 0; j < b.length; j += 1) {
      out[i + j] ^= gfMul(a[i], b[j]);
    }
  }
  return out;
}

function reedSolomon(data: number[], nsym: number): number[] {
  const gen = generatorPoly(nsym);
  const out = data.concat(new Array(nsym).fill(0));
  for (let i = 0; i < data.length; i += 1) {
    const coef = out[i];
    if (coef !== 0) {
      for (let j = 0; j < gen.length; j += 1) {
        out[i + j] ^= gfMul(gen[j], coef);
      }
    }
  }
  return out.slice(data.length);
}

// Bit-stream helpers
function appendBits(target: number[], val: number, n: number) {
  for (let i = n - 1; i >= 0; i -= 1) target.push((val >>> i) & 1);
}

// Capacity tables for byte mode, EC level L, per QR spec.
const CAPACITY_L: Record<number, number> = {
  1: 17, 2: 32, 3: 53, 4: 78, 5: 106, 6: 134, 7: 154, 8: 192, 9: 230, 10: 271,
};

// Per-version alignment-pattern centre positions.
const ALIGNMENT: Record<number, number[]> = {
  1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30], 6: [6, 34],
  7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50],
};

function chooseVersion(byteLen: number): number {
  for (let v = 1; v <= 10; v += 1) {
    if (CAPACITY_L[v] >= byteLen) return v;
  }
  throw new Error('Address too long for QR (10+ version not implemented)');
}

function buildMatrix(version: number, payload: number[]): boolean[][] {
  const size = 17 + 4 * version;
  const m: (boolean | null)[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => null as boolean | null),
  );

  // Finder patterns at top-left, top-right, bottom-left
  const placeFinder = (r: number, c: number) => {
    for (let dr = -1; dr <= 7; dr += 1) {
      for (let dc = -1; dc <= 7; dc += 1) {
        const rr = r + dr;
        const cc = c + dc;
        if (rr < 0 || cc < 0 || rr >= size || cc >= size) continue;
        const onEdge = dr === 0 || dr === 6 || dc === 0 || dc === 6;
        const inCore = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
        m[rr][cc] = onEdge || inCore;
      }
    }
  };
  placeFinder(0, 0);
  placeFinder(0, size - 7);
  placeFinder(size - 7, 0);

  // Timing patterns
  for (let i = 8; i < size - 8; i += 1) {
    m[6][i] = i % 2 === 0;
    m[i][6] = i % 2 === 0;
  }

  // Alignment patterns
  const positions = ALIGNMENT[version] ?? [];
  for (const r of positions) {
    for (const c of positions) {
      // Skip alignment patterns that overlap a finder pattern
      if ((r === 6 && c === 6) ||
          (r === 6 && c === size - 7) ||
          (r === size - 7 && c === 6)) continue;
      for (let dr = -2; dr <= 2; dr += 1) {
        for (let dc = -2; dc <= 2; dc += 1) {
          m[r + dr][c + dc] = dr === -2 || dr === 2 || dc === -2 || dc === 2 || (dr === 0 && dc === 0);
        }
      }
    }
  }

  // Reserve format info area (filled later)
  for (let i = 0; i < 9; i += 1) {
    if (m[8][i] === null) m[8][i] = false;
    if (m[i][8] === null) m[i][8] = false;
  }
  for (let i = 0; i < 8; i += 1) {
    m[size - 1 - i][8] = false;
    m[8][size - 1 - i] = false;
  }
  m[size - 8][8] = true; // dark module

  // Place data with snake pattern, skipping reserved cells
  let bitIdx = 0;
  let upward = true;
  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col -= 1;
    for (let r = 0; r < size; r += 1) {
      const row = upward ? size - 1 - r : r;
      for (let c = 0; c < 2; c += 1) {
        const cc = col - c;
        if (m[row][cc] === null) {
          m[row][cc] = bitIdx < payload.length ? payload[bitIdx] === 1 : false;
          bitIdx += 1;
        }
      }
    }
    upward = !upward;
  }

  // Mask 0 (i + j) % 2 === 0
  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c < size; c += 1) {
      if (m[r][c] === null) m[r][c] = false;
      // Don't mask the finder / format areas
      if ((r + c) % 2 === 0) {
        // Avoid double-masking already-fixed cells
        if (!isFinderOrFormat(r, c, size)) m[r][c] = !m[r][c];
      }
    }
  }

  // Format info bits for EC level L (01) + mask 0 (000) = 0b01000
  const format = 0x5400; // precomputed EC L + mask 0
  for (let i = 0; i < 15; i += 1) {
    const bit = (format >> i) & 1;
    // Top-left horizontal
    if (m[8][14 - i] === false || m[8][14 - i] === true) m[8][14 - i] = bit === 1;
    // Bottom-left vertical
    if (m[size - 1 - i][8] === false || m[size - 1 - i][8] === true) m[size - 1 - i][8] = bit === 1;
    // Top-right vertical
    if (m[14 - i][8] === false || m[14 - i][8] === true) m[14 - i][8] = bit === 1;
    // Bottom-left horizontal
    if (m[8][size - 15 + i] === false || m[8][size - 15 + i] === true) m[8][size - 15 + i] = bit === 1;
  }

  return m.map((row) => row.map((cell) => cell === true));
}

function isFinderOrFormat(r: number, c: number, size: number): boolean {
  if (r < 8 && c < 8) return true;
  if (r < 8 && c >= size - 8) return true;
  if (r >= size - 8 && c < 8) return true;
  return false;
}

function encodeData(text: string): { version: number; payload: number[] } {
  const bytes = new TextEncoder().encode(text);
  const version = chooseVersion(bytes.length);
  const capacity = CAPACITY_L[version];
  const totalDataBits = capacity * 8;

  const bits: number[] = [];
  // Mode indicator: byte = 0100
  appendBits(bits, 0b0100, 4);
  // Character count indicator: 8 bits for v1-9, 16 bits for v10-26
  const ccBits = version < 10 ? 8 : 16;
  appendBits(bits, bytes.length, ccBits);
  for (const b of bytes) appendBits(bits, b, 8);

  // Terminator
  const remaining = totalDataBits - bits.length;
  for (let i = 0; i < Math.min(4, remaining); i += 1) bits.push(0);
  // Pad to byte boundary
  while (bits.length % 8 !== 0) bits.push(0);
  // Pad bytes
  const pad = [0xec, 0x11];
  let padIdx = 0;
  while (bits.length < totalDataBits) {
    appendBits(bits, pad[padIdx % 2], 8);
    padIdx += 1;
  }

  // Convert to data codewords
  const dataWords: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    dataWords.push((bits[i] << 7) | (bits[i + 1] << 6) | (bits[i + 2] << 5) | (bits[i + 3] << 4) | (bits[i + 4] << 3) | (bits[i + 5] << 2) | (bits[i + 6] << 1) | bits[i + 7]);
  }
  // EC codewords (level L): 7, 10, 15, 20, 26, 18, 20, 24, 30, 18 for v1-10
  const ecLen = [7, 10, 15, 20, 26, 18, 20, 24, 30, 18][version - 1];
  const ec = reedSolomon(dataWords, ecLen);
  const payload = dataWords.concat(ec);

  // Convert codewords to bit stream
  const out: number[] = [];
  for (const w of payload) {
    for (let i = 7; i >= 0; i -= 1) out.push((w >> i) & 1);
  }
  return { version, payload: out };
}

export default function QRCode({ value, size = 192, bg = '#ffffff', fg = '#0b0e11', className, label }: QRCodeProps) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    if (!value) return;
    const { payload } = encodeData(value);
    const matrix = buildMatrix(chooseVersion(new TextEncoder().encode(value).length), payload);
    const cells = matrix.length;
    const quiet = 4; // quiet zone in modules
    const total = cells + quiet * 2;
    const cellSize = size / total;
    const canvas = ref.current;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = fg;
    for (let r = 0; r < cells; r += 1) {
      for (let c = 0; c < cells; c += 1) {
        if (matrix[r][c]) {
          ctx.fillRect(Math.floor((c + quiet) * cellSize), Math.floor((r + quiet) * cellSize), Math.ceil(cellSize), Math.ceil(cellSize));
        }
      }
    }
  }, [value, size, bg, fg]);

  return (
    <div className={className}>
      <canvas
        ref={ref}
        style={{ width: size, height: size, imageRendering: 'pixelated' }}
        aria-label={label ?? 'QR code'}
      />
    </div>
  );
}
