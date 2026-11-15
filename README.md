# Catálogo V5

Sistema web interno para uma imobiliária gerir imóveis e leads. Corretores cadastram imóveis com fotos,
consultam o catálogo com filtros e registram leads; administradores acompanham todos os imóveis, excluem
registros definitivamente e gerenciam usuários. Toda alteração de imóvel fica registrada em um histórico.

É uma SPA sem backend próprio: o navegador fala direto com o Firebase, e a proteção dos dados vem das
Security Rules (`firestore.rules` e `storage.rules`).

## Stack

- Vue 3 (Composition API) + TypeScript, Vite, Pinia e Vue Router
- vee-validate + yup nos formulários
- Firebase: Authentication (e-mail/senha), Firestore, Storage e Hosting
- Vitest (testes unitários, de regras e de integração) com o Firebase Emulator Suite
- Fonte DM Sans e ícones Tabler instalados por npm (sem CDN)

## Requisitos

- Node.js 22.18 ou superior (ver `engines` no `package.json`; o `npm run seed` executa TypeScript direto pelo Node)
- Java 21 ou compatível, necessário para os emuladores do Firebase
- Firebase CLI (já vem como dependência de desenvolvimento; use `npx firebase ...` ou instale globalmente com
  `npm install -g firebase-tools`)

## Setup local

```bash
npm install
cp .env.example .env
```

Preencha o `.env` com a configuração do app web do projeto Firebase (console do Firebase → Configurações do
projeto → Seus apps). O `.env` nunca é versionado.

| Variável | Conteúdo |
|---|---|
| `VITE_FIREBASE_API_KEY` | chave de API do app web |
| `VITE_FIREBASE_AUTH_DOMAIN` | domínio de autenticação |
| `VITE_FIREBASE_PROJECT_ID` | ID do projeto |
| `VITE_FIREBASE_STORAGE_BUCKET` | bucket do Storage |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | ID do remetente |
| `VITE_FIREBASE_APP_ID` | ID do app |

Essas variáveis são embutidas no bundle em `npm run build`. São identificadores públicos por design; o que
protege os dados são as Security Rules. Ainda assim, restrinja a chave de API aos domínios do Hosting e de
desenvolvimento no console do Google Cloud.

## Desenvolvimento com o emulador

Em desenvolvimento (`npm run dev`) a aplicação **só fala com o Emulator Suite**, nunca com o projeto real
(ver `src/firebase.ts`). Use três terminais:

```bash
npm run emulators   # Auth :9099, Firestore :8080, Storage :9199, UI :4000
npm run seed        # popula o emulador (apaga e recria os dados dele)
npm run dev         # servidor Vite; o endereço aparece no terminal
```

Usuários criados pelo seed (senha de todos: `senha123`, válida só no emulador):

| E-mail | Perfil | Situação |
|---|---|---|
| `admin@imoveispro.com` | admin | ativo |
| `joao@imoveispro.com` | corretor | ativo |
| `ana@imoveispro.com` | corretor | inativo (acesso bloqueado) |

O seed também cria imóveis (ativos e inativos), histórico e leads. A interface do emulador fica em
`http://localhost:4000`.

## Scripts npm

| Script | O que faz |
|---|---|
| `npm run dev` | servidor de desenvolvimento (usa o emulador) |
| `npm run build` | verifica tipos e gera `dist/` |
| `npm run preview` | serve o `dist/` localmente |
| `npm run type-check` | `vue-tsc` |
| `npm run lint` | oxlint + eslint (com `--fix`) |
| `npm run format` | prettier em `src/` |
| `npm run test` | suíte unitária, uma vez |
| `npm run test:unit` | suíte unitária em modo watch |
| `npm run test:rules` | testes das Security Rules (sobe Firestore e Storage) |
| `npm run test:integracao` | testes de integração dos serviços (sobe Auth, Firestore e Storage) |
| `npm run emulators` | Firebase Emulator Suite |
| `npm run seed` | popula o emulador |

## Testes

- **Unitários** (`tests/unit`): utilitários (`diffImovel`, filtros, formatadores, máscaras), stores, componentes
  e router. `npm run test`.
- **Regras** (`tests/rules`): matriz de permissões de Firestore e Storage contra o emulador, usando um projeto
  `demo-*` isolado. `npm run test:rules`. Requer Java.
- **Integração** (`tests/integration`): serviços (cadastro, histórico, fotos, exclusão em cascata, usuários)
  contra Auth, Firestore e Storage emulados. `npm run test:integracao`. Requer Java.

Os testes de regras e de integração usam `firebase emulators:exec` com projetos `demo-*` e não tocam o
projeto real.

## Estrutura de diretórios

```
src/
  assets/styles/   tokens.css e base.css (tema claro/escuro, variáveis do protótipo)
  components/      Base*, ImovelCard/Row, FotoUploader, FotoCarrossel, HistoricoList, LeadTable, modais
  views/           Login, Catalogo, ImovelForm, ImovelDetalhe, Leads, Admin, Usuarios
  router/          rotas e guards (autenticação e perfil admin)
  stores/          auth, imoveis, leads, usuarios, estatisticas (Pinia)
  services/        única camada que importa o SDK do Firebase
  composables/     lógica reutilizável de componentes
  utils/           diffImovel, filtros, formatadores, máscaras
  types/           tipos do domínio
  firebase.ts      inicialização do SDK (e conexão com o emulador em dev)
tests/             unit/, rules/, integration/
scripts/seed.ts    dados do emulador
firestore.rules · storage.rules · firestore.indexes.json · firebase.json · .firebaserc
```

## Deploy

Pré-requisitos: projeto no plano Blaze (o bucket `*.firebasestorage.app` exige), Authentication (e-mail/senha),
Firestore, Storage e Hosting habilitados no console, e um alerta de orçamento configurado.

```bash
firebase login
firebase use            # confirme o projeto (alias default em .firebaserc)
```

Ordem de publicação:

```bash
# 1. regras, índices e storage
firebase deploy --only firestore:rules,firestore:indexes,storage

# 2. build (usa o .env de produção)
npm run build

# 3. hosting
firebase deploy --only hosting
```

O `firebase.json` reescreve todas as rotas para `index.html`, então recarregar uma rota interna (por exemplo
`/leads`) funciona. Não há CI/CD: o deploy é manual.

## Primeiro admin em produção

O cadastro de usuários pela interface exige um admin já existente, então o primeiro é criado à mão:

1. No console do Firebase → Authentication → Usuários, adicione uma conta com e-mail e senha e copie o **UID**.
2. No console do Firebase → Firestore, crie o documento `users/{uid}` (o ID do documento é o UID copiado) com:
   - `uid` (string): o mesmo UID
   - `nome` (string) e `email` (string)
   - `perfil`: `admin` (string)
   - `ativo`: `true` (booleano)
   - `criadoEm` e `atualizadoEm` (timestamp), com a data atual
3. Entre na aplicação com essa conta. Os demais usuários são criados em **Admin → Usuários**.

A redefinição de senha é feita pelo admin no console do Firebase Authentication.

## Backup: export manual do Firestore

Não há backup automático. Faça um export periódico (por exemplo, semanal) e antes de operações de risco.

1. Crie uma vez um bucket do Cloud Storage para backups (console do Google Cloud → Cloud Storage), de
   preferência separado do bucket das fotos e na mesma região do Firestore.
2. Pelo console do Google Cloud → Firestore → **Importar/Exportar** → Exportar, escolha o bucket e exporte todas
   as coleções. O mesmo pode ser feito pela linha de comando:

   ```bash
   gcloud firestore export gs://NOME-DO-BUCKET-DE-BACKUP/AAAA-MM-DD --project=ID-DO-PROJETO
   ```

3. Confira que a pasta do export apareceu no bucket.
4. As fotos ficam no bucket do Storage; para copiá-las:
   `gcloud storage cp -r gs://BUCKET-DAS-FOTOS gs://NOME-DO-BUCKET-DE-BACKUP/fotos-AAAA-MM-DD`.
5. Para restaurar, use Importar no mesmo menu (ou `gcloud firestore import gs://.../AAAA-MM-DD`).

## Limitações conhecidas

- Os filtros do catálogo rodam no cliente sobre todos os imóveis do status consultado; adequado a alguns
  milhares de imóveis. Acima disso, migrar para paginação e consultas indexadas.
- `imovelEndereco` do lead não acompanha edições posteriores do endereço do imóvel.
- A exclusão real (admin) roda no cliente em cascata (Storage, histórico, documento) e pode ser interrompida;
  repetir a operação conclui.
- Inativar um usuário não desativa a conta no Authentication; as regras negam o acesso aos dados e o cliente
  encerra a sessão.
- Sem backup automático e sem CI/CD.
