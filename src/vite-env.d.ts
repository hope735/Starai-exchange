/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_COINGECKO_API?: string;
  readonly VITE_COINGECKO_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
