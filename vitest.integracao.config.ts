import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

/**
 * Testes de integração: os serviços reais contra o Emulator Suite (Auth, Firestore e Storage),
 * com as Security Rules ativas. Só rodam via `npm run test:integracao`, que sobe os emuladores
 * com `firebase emulators:exec`. Não entram em `npx vitest run`.
 */
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    environment: 'node',
    include: ['tests/integration/**/*.spec.ts'],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
})
