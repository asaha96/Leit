/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CLERK_PUBLISHABLE_KEY: string;
  readonly VITE_API_ORIGIN?: string;
  readonly VITE_CANVAS_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
