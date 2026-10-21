import { resolve } from 'node:path';
import { SessionStore } from './store.mjs';
import { CodexTeachingProvider } from './codex.mjs';
import { createSchoolApi } from './http.mjs';

export function schoolApiPlugin(env) {
  const api = createSchoolApi({ store: new SessionStore(resolve('.school-data')),
    provider: new CodexTeachingProvider({ executable: env.SCHOOL_CODEX_EXE || undefined, model: env.SCHOOL_CODEX_MODEL || undefined }) });
  return { name: 'school-local-api',
    configureServer(server) { server.middlewares.use(api); },
    configurePreviewServer(server) { server.middlewares.use(api); },
  };
}
