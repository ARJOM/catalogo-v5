import { defineConfig } from 'vitest/config'

/**
 * Testes das Security Rules: rodam em Node, contra o emulador, e só via `npm run test:rules`
 * (que sobe os emuladores com `firebase emulators:exec`). Não entram em `npx vitest run`.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/rules/**/*.spec.ts'],
    // Os arquivos compartilham o mesmo emulador e limpam os dados a cada teste.
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 30_000,
  },
})
