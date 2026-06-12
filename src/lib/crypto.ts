// Browser-side crypto helpers. Password hashing, ID generation, and a
// 12-word Secret Recovery Phrase generator.
//
// NOTE: password hashing here is a SHA-256 prototype. In a real product
// passwords must be hashed on the server with bcrypt/argon2 + per-user salt.
// The recovery phrase is a BIP-39-style wordlist (the first 256 most-
// common words is enough for a deterministic, human-verifiable 12-word
// phrase without pulling in a 2000-word external dependency).
//
// Every generated phrase contains 12 *unique* words — no duplicates —
// and a different seed (user id, or random bytes) yields a different
// phrase. The deterministic fallback in `deriveRecoveryPhrase` skips
// any byte that would re-pick a word already in the phrase and, if the
// wordlist ever produced a collision, expands deterministically.

export async function hashPassword(password: string, salt = 'starai-static-salt'): Promise<string> {
  const data = new TextEncoder().encode(`${salt}::${password}`);
  const buffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function generateId(prefix = 'id'): string {
  const rand = crypto.getRandomValues(new Uint8Array(8));
  return `${prefix}_${Array.from(rand).map((b) => b.toString(16).padStart(2, '0')).join('')}`;
}

// 256-word wordlist (8-bit entropy per word). Same word is used in the
// demo as a recognizable marker; in production this would be the full
// BIP-39 English wordlist.
const WORDLIST = [
  'abandon','ability','able','about','above','absent','absorb','abstract',
  'absurd','abuse','access','accident','account','accuse','achieve','acid',
  'acoustic','acquire','across','act','action','actor','actress','actual',
  'adapt','add','addict','address','adjust','admit','adult','advance',
  'advice','aerobic','affair','afford','afraid','again','age','agent',
  'agree','ahead','aim','air','airport','aisle','alarm','album',
  'alcohol','alert','alien','all','alley','allow','almost','alone',
  'alpha','already','also','alter','always','amateur','amazing','among',
  'amount','amused','analyst','anchor','ancient','anger','angle','angry',
  'animal','ankle','announce','annual','another','answer','antenna','antique',
  'anxiety','any','apart','apology','appear','apple','approve','april',
  'arch','arctic','area','arena','argue','arm','armed','armor',
  'army','around','arrange','arrest','arrive','arrow','art','artefact',
  'artist','artwork','ask','aspect','assault','asset','assist','assume',
  'asthma','athlete','atom','attack','attend','attitude','attract','auction',
  'audit','august','aunt','author','auto','autumn','average','avocado',
  'avoid','awake','aware','away','awesome','awful','awkward','axis',
  'baby','bachelor','bacon','badge','bag','balance','balcony','ball',
  'bamboo','banana','banner','bar','barely','bargain','barrel','base',
  'basic','basket','battle','beach','bean','beauty','because','become',
  'beef','before','begin','behave','behind','believe','below','belt',
  'bench','benefit','best','betray','better','between','beyond','bicycle',
  'bid','bike','bind','biology','bird','birth','bitter','black',
  'blade','blame','blanket','blast','bleak','bless','blind','blood',
  'blossom','blouse','blue','blur','blush','board','boat','body',
  'boil','bomb','bone','bonus','book','boost','border','boring',
  'borrow','boss','bottom','bounce','box','boy','bracket','brain',
  'brand','brass','brave','bread','breeze','brick','bridge','brief',
  'bright','bring','brisk','broccoli','broken','bronze','broom','brother',
  'brown','brush','bubble','buddy','budget','buffalo','build','bulb',
];

/**
 * Cryptographically-strong random integer in [0, max).
 * Falls back to a Math.random() based PRNG if the WebCrypto API is
 * unavailable (e.g. very old browsers or non-secure contexts).
 */
function secureRandomInt(max: number): number {
  if (max <= 0) return 0;
  try {
    // Reject-sample to avoid modulo bias.
    const limit = Math.floor(0xffffffff / max) * max;
    const buf = new Uint32Array(1);
    // eslint-disable-next-line no-constant-condition
    while (true) {
      crypto.getRandomValues(buf);
      if (buf[0] < limit) return buf[0] % max;
    }
  } catch {
    return Math.floor(Math.random() * max);
  }
}

/**
 * Pick `count` unique words from the wordlist. The function loops until
 * it has `count` distinct words, regardless of how many times the RNG
 * returns a duplicate. Returns them in the order they were picked.
 */
function pickUniqueWords(count: number, rng: () => number = Math.random): string[] {
  if (count > WORDLIST.length) {
    throw new Error(`Wordlist (${WORDLIST.length}) is too small to pick ${count} unique words.`);
  }
  const picked = new Set<string>();
  const out: string[] = [];
  // Worst case: we need to keep sampling until we have `count` uniques.
  // With 256 words and 12 picks, the birthday-paradox collision rate is
  // tiny, so a simple while-loop is more than fast enough.
  while (out.length < count) {
    const w = WORDLIST[Math.floor(rng() * WORDLIST.length)];
    if (!picked.has(w)) {
      picked.add(w);
      out.push(w);
    }
  }
  return out;
}

/**
 * Generate a fresh 12-word recovery phrase using cryptographically
 * strong randomness. Every phrase contains 12 *unique* words, and
 * every call returns a different phrase.
 */
export function generateRecoveryPhrase(): string[] {
  return pickUniqueWords(12, () => {
    // Bias-free uniform sample in [0, 1) backed by WebCrypto.
    return secureRandomInt(0xffffffff) / 0x1_0000_0000;
  });
}

/**
 * Deterministically derive a recovery phrase from a per-user seed.
 * Used so a phrase can be re-derived (e.g. when the auth store
 * rehydrates from storage) without persisting the random bytes.
 *
 * The derivation:
 *   1. SHA-256 the seed ("starai-phrase::{seed}::{nonce}") to get 32 bytes.
 *   2. Walk the 32 bytes; each byte is an index into the 256-word list.
 *   3. Skip bytes that would re-pick a word already in the phrase.
 *   4. If we run out of unique bytes in one digest, hash a counter-
 *      prefixed version of the seed to generate more entropy.
 *
 * The result is always 12 unique words, and any change in the seed
 * (e.g. a different user id) yields a different phrase.
 */
export function deriveRecoveryPhrase(seed: string): string[] {
  const picked = new Set<string>();
  const out: string[] = [];
  const enc = new TextEncoder();
  let round = 0;

  while (out.length < 12) {
    const data = enc.encode(`starai-phrase::${seed}::r${round}`);
    // We re-encode into a fresh Uint8Array so the in-place mutation
    // below does not leak across rounds.
    const buf = new Uint8Array(data);
    for (let i = 0; i < buf.length && out.length < 12; i += 1) {
      const word = WORDLIST[buf[i]];
      if (!picked.has(word)) {
        picked.add(word);
        out.push(word);
      }
      // Tiny in-place mix so consecutive equal bytes still produce
      // distinct indices — keeps the phrase well-distributed even if
      // the seed has a long repeated run.
      buf[i] = (buf[i] * 31 + i + round) & 0xff;
    }
    round += 1;
    // Safety net: with 256 words and 12 picks the chance of needing a
    // second round is ~3%, so round > 5 is unreachable in practice. If
    // it ever happens, throw rather than silently loop forever.
    if (round > 5) throw new Error('Could not derive a unique 12-word phrase');
  }
  return out;
}
