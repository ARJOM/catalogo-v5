# Plano de Implementação — Catálogo V5

Versão 2.0 · Novembro de 2026 · substitui o plano em 11 fases de abril de 2026

## 1. Contexto

Sistema web responsivo de uso interno para gestão de imóveis e leads de uma imobiliária. A aplicação é uma SPA em Vue 3 + TypeScript hospedada integralmente no Firebase (Authentication, Firestore, Storage e Hosting), sem backend próprio. A lógica de negócio roda no cliente e a segurança é garantida pelas Security Rules.

O repositório ainda não tem código. Este plano organiza a construção em nove epics e incorpora as correções levantadas na leitura cruzada dos documentos de referência.

### Documentos de referência

| Documento | Papel |
|---|---|
| `especificacoes_tecnicas_catalogo_v5.docx` (v1.0, abril de 2026) | Arquitetura, modelo de dados e regras de negócio. Está no `.gitignore`, portanto não é versionado. |
| `prototipo_responsivo_catalogo_v5.html` | Referência visual e funcional das seis telas (Login, Catálogo, Detalhe, Cadastro, Leads, Admin). |

Quando os dois divergem, **o protótipo prevalece** nas funcionalidades visíveis e **este plano prevalece** sobre a especificação nos pontos listados na seção 2.

---

## 2. Desvios da especificação v1.0

### Segurança

| Item | Especificação v1.0 | Neste plano | Motivo |
|---|---|---|---|
| Escrita em `users` | Corretor escreve no próprio perfil | Corretor altera só `nome`; `perfil` e `ativo` só o admin | Do contrário o corretor se promove a admin ou se reativa |
| Usuário inativo | Deslogado pelo cliente | Bloqueado também nas regras (`isActive()`) | Controle só no cliente é contornável |
| Leitura de `users` | Corretor lê só o próprio perfil | Qualquer usuário ativo lê a lista | O filtro e o campo "Captador" precisam dos nomes dos corretores |
| Histórico | Somente leitura, mas regra permitia qualquer escrita | Só `create`; `update` negado; `delete` só admin | Imutabilidade garantida nas regras; a exclusão pelo admin existe apenas para a exclusão real em cascata |
| Upload de fotos | "Imóvel existente", sem verificação na regra | Regra verifica existência do imóvel, tipo de imagem e limite de 5 MB | Regra do plano anterior não aplicava a restrição |
| Admin | — | Admin não altera o próprio `perfil` nem `ativo` | Evita o sistema ficar sem administrador |

### Funcionalidades e dados

| Item | Especificação v1.0 | Neste plano | Motivo |
|---|---|---|---|
| Quartos | Só texto livre em `caracteristicas` | Campo opcional `quartos` | Os cards do protótipo exibem a quantidade de quartos |
| Busca e faixa de valor | Não previstas | Filtros de busca textual e valor mínimo/máximo | Presentes no protótipo |
| Filtros do catálogo | Um índice composto por filtro | Servidor consulta por `status`; demais filtros no cliente | Os índices só cobriam um filtro por vez, e o Firestore não faz busca textual |
| Eventos do histórico | Só diff de campos | Também criação do imóvel e inclusão/remoção de fotos | Presentes no protótipo |
| Estados | — | As 27 UFs | O protótipo lista apenas PB, CE e RN |

### Infraestrutura

| Item | Especificação v1.0 | Neste plano | Motivo |
|---|---|---|---|
| Plano Firebase | Spark, migrando para Blaze acima de 1 GB | **Blaze desde o início**, com alerta de orçamento | O Cloud Storage for Firebase deixou de funcionar no plano Spark ([FAQ oficial](https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024)) |
| Criação de usuários | Não detalhada | Instância secundária do Firebase App | `createUserWithEmailAndPassword` na instância principal troca a sessão do admin pela do novo usuário |
| Índices | Sete, incluindo campo único | Dois compostos | Índices de campo único são automáticos e o deploy os rejeita |
| Exclusão real | "Exclui documento e arquivos" | Cascata explícita no cliente: Storage, histórico, documento | O Firestore não apaga subcoleções automaticamente |
| Versões | Faixas fixas (`vue ^3.4`, `firebase ^10`, `vite ^5`, `pinia ^2`) | Versões estáveis atuais | As faixas de abril de 2026 já estão defasadas |
| Testes | Não previstos | Vitest e testes de regras no emulador | As regras são a única barreira de segurança do sistema |

O Blaze mantém a cota gratuita; para o uso interno previsto o custo esperado continua próximo de zero, mas o projeto passa a exigir uma conta de faturamento com cartão.

---

## 3. Modelo de dados

Tipos centralizados em `src/types/index.ts`.

```ts
import type { Timestamp } from 'firebase/firestore'

export type Perfil = 'admin' | 'corretor'
export type TipoImovel = 'Casa' | 'Apartamento' | 'Terreno' | 'Comercial' | 'Rural' | 'Outros'
export type Finalidade = 'Venda' | 'Aluguel'
export type StatusImovel = 'ativo' | 'inativo'

export interface Usuario {
  uid: string
  nome: string
  email: string
  perfil: Perfil
  ativo: boolean
  criadoEm: Timestamp
  atualizadoEm: Timestamp
}

export interface Imovel {
  id: string
  tipo: TipoImovel
  finalidade: Finalidade
  valor: number
  areaM2: number
  quartos?: number | null
  caracteristicas: string
  rua: string
  bairro: string
  cidade: string
  estado: string            // sigla da UF
  captadorId: string
  vendedorNome: string
  vendedorTelefone: string
  status: StatusImovel
  fotos: string[]           // URLs de download do Storage
  criadoEm: Timestamp
  criadoPor: string
  atualizadoEm: Timestamp
  atualizadoPor: string
  deletadoEm?: Timestamp | null
}

export type TipoHistorico = 'criacao' | 'edicao' | 'foto_adicionada' | 'foto_removida'

export interface HistoricoRegistro {
  id: string
  tipo: TipoHistorico
  campo?: string            // só em 'edicao'
  valorAnterior?: unknown   // só em 'edicao'
  valorNovo?: unknown       // só em 'edicao'
  usuarioId: string
  usuarioNome: string
  timestamp: Timestamp
}

export interface Lead {
  id: string
  imovelId: string
  imovelEndereco: string    // desnormalizado no momento do cadastro
  nomeComprador: string
  telefone: string
  criadoEm: Timestamp
  criadoPor: string
  atualizadoEm: Timestamp
  atualizadoPor: string
}
```

Coleções: `users/{uid}`, `imoveis/{id}`, `imoveis/{id}/historico/{id}`, `leads/{id}`. Fotos em `imoveis/{imovelId}/{arquivo}` no Storage.

---

## 4. Regras de segurança

### Matriz de permissões

| Recurso | Corretor ativo | Admin ativo | Inativo ou não autenticado |
|---|---|---|---|
| `users` — leitura | Todos | Todos | Só o próprio documento (se autenticado) |
| `users` — criação | Negado | Sim | Negado |
| `users` — atualização | Só o próprio `nome` | Todos; no próprio documento, exceto `perfil` e `ativo` | Negado |
| `users` — exclusão | Negado | Negado | Negado |
| `imoveis` — leitura, criação, edição | Sim | Sim | Negado |
| `imoveis` — exclusão real | Negado | Sim | Negado |
| `historico` — leitura e criação | Sim | Sim | Negado |
| `historico` — edição | Negado | Negado | Negado |
| `historico` — exclusão | Negado | Sim (cascata) | Negado |
| `leads` — leitura, criação, edição | Sim | Sim | Negado |
| `leads` — exclusão | Negado | Negado | Negado |
| Fotos — leitura, upload, exclusão | Sim (upload só em imóvel existente) | Sim | Negado |

### `firestore.rules`

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isAuth() { return request.auth != null; }
    function me() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data;
    }
    function isActive() { return isAuth() && me().ativo == true; }
    function isAdmin() { return isActive() && me().perfil == 'admin'; }
    function changed() {
      return request.resource.data.diff(resource.data).affectedKeys();
    }

    match /users/{userId} {
      allow read: if isAuth() && (request.auth.uid == userId || isActive());
      allow create: if isAdmin()
        && request.resource.data.uid == userId
        && request.resource.data.perfil in ['admin', 'corretor'];
      allow update: if
        (isAdmin()
          && (request.auth.uid != userId || !changed().hasAny(['perfil', 'ativo'])))
        || (isActive()
          && request.auth.uid == userId
          && changed().hasOnly(['nome', 'atualizadoEm']));
      allow delete: if false;
    }

    match /imoveis/{imovelId} {
      allow read: if isActive();
      allow create: if isActive()
        && request.resource.data.criadoPor == request.auth.uid
        && request.resource.data.status in ['ativo', 'inativo'];
      allow update: if isActive()
        && !changed().hasAny(['criadoEm', 'criadoPor'])
        && request.resource.data.atualizadoPor == request.auth.uid
        && request.resource.data.status in ['ativo', 'inativo'];
      allow delete: if isAdmin();

      match /historico/{registroId} {
        allow read: if isActive();
        allow create: if isActive()
          && request.resource.data.usuarioId == request.auth.uid
          && request.resource.data.timestamp == request.time;
        allow update: if false;
        allow delete: if isAdmin();
      }
    }

    match /leads/{leadId} {
      allow read: if isActive();
      allow create: if isActive()
        && request.resource.data.criadoPor == request.auth.uid;
      allow update: if isActive()
        && !changed().hasAny(['criadoEm', 'criadoPor'])
        && request.resource.data.atualizadoPor == request.auth.uid;
      allow delete: if false;
    }
  }
}
```

### `storage.rules`

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {

    function isActive() {
      return request.auth != null
        && firestore.get(/databases/(default)/documents/users/$(request.auth.uid)).data.ativo == true;
    }

    match /imoveis/{imovelId}/{arquivo} {
      allow read: if isActive();
      allow create: if isActive()
        && firestore.exists(/databases/(default)/documents/imoveis/$(imovelId))
        && request.resource.contentType.matches('image/.*')
        && request.resource.size < 5 * 1024 * 1024;
      allow update: if false;
      allow delete: if isActive();
    }
  }
}
```

Observações:

- As regras do Storage consultam o Firestore (`firestore.get` / `firestore.exists`). No primeiro deploy a Firebase CLI pede autorização para conceder essa permissão entre serviços; é preciso aceitar.
- `serverTimestamp()` no cliente satisfaz a condição `timestamp == request.time` do histórico.
- As URLs de download guardadas em `fotos[]` carregam um token e funcionam para quem tiver o link. A regra de leitura protege a obtenção da URL, não o link já emitido.

### `firestore.indexes.json`

| Coleção | Campos | Uso |
|---|---|---|
| `imoveis` | `status` ASC + `criadoEm` DESC | Listagem do catálogo e contadores do mês |
| `leads` | `imovelId` ASC + `criadoEm` DESC | Leads de um imóvel |

Ordenações por um único campo (`leads.criadoEm`, `historico.timestamp`, `imoveis.criadoEm` no painel admin) usam os índices automáticos.

---

## 5. Decisões de implementação

Valem para todos os epics.

- **Serviços isolados:** só `src/services/` importa o SDK do Firebase. Views e componentes usam stores e composables.
- **Filtros do catálogo:** o serviço busca por `status == 'ativo'` ordenado por `criadoEm DESC` (o admin busca sem filtro de status). Busca textual, tipo, finalidade, faixa de valor e captador são aplicados em um getter da store sobre a lista carregada. Revisar com paginação se o acervo passar de alguns milhares de imóveis.
- **Edição com histórico:** `runTransaction` lê o imóvel, compara campo a campo e grava a atualização junto com um registro de histórico por campo alterado. A comparação fica em uma função pura (`diffImovel`) testável sem Firebase.
- **Cadastro com fotos:** cria o documento com `fotos: []` e o registro `criacao` em um batch; depois faz upload das fotos; depois atualiza `fotos[]` e grava os registros `foto_adicionada`. Se o upload falhar, o imóvel permanece salvo e as fotos podem ser enviadas na edição.
- **Remoção de foto:** remove a URL de `fotos[]` e grava `foto_removida` em um batch; em seguida apaga o arquivo do Storage.
- **Exclusão lógica:** `status = 'inativo'` e `deletadoEm = serverTimestamp()`.
- **Exclusão real (admin):** apaga os arquivos de `imoveis/{id}/` no Storage (`listAll`), depois os documentos de `historico` (batch), depois o imóvel. Os leads são mantidos e exibem o endereço desnormalizado.
- **Criação de usuário:** `initializeApp(config, 'secundaria')` → `createUserWithEmailAndPassword` nessa instância → grava `users/{uid}` com a sessão do admin → `signOut` e `deleteApp` da instância secundária.
- **Bloqueio de inativo:** a store `auth` mantém um `onSnapshot` no próprio documento em `users`. Se `ativo` virar `false`, faz `signOut` e mostra a mensagem de acesso suspenso.
- **"Lembrar acesso":** `browserLocalPersistence` quando marcado, `browserSessionPersistence` quando desmarcado.
- **Senha:** redefinição feita pelo admin no console do Firebase Authentication, como na especificação.
- **Primeiro admin:** em produção, criar a conta no console do Authentication e o documento `users/{uid}` no console do Firestore com `perfil: 'admin'` e `ativo: true`. No emulador, o script de seed faz isso.
- **Visual:** variáveis CSS, tipografia (DM Sans) e ícones (Tabler) vêm do protótipo, instalados por npm em versão fixa, sem CDN. O breakpoint é 680px: acima, sidebar e grid; abaixo, bottom nav e listas. O dark mode segue `prefers-color-scheme`.

### Projeto Firebase

O projeto já está criado no Firebase com o ID `catalogo-v5` e um app web registrado. A configuração abaixo vai para o `.env` local (e, sem valores, para o `.env.example`):

```
VITE_FIREBASE_API_KEY=AIzaSyA4W0ZNb7N0X84cbNhGto07n3BauVp7Z3E
VITE_FIREBASE_AUTH_DOMAIN=catalogo-v5.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=catalogo-v5
VITE_FIREBASE_STORAGE_BUCKET=catalogo-v5.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=718857618021
VITE_FIREBASE_APP_ID=1:718857618021:web:760ae29ea8a1e0c993bc8c
```

`src/firebase.ts` monta o objeto de configuração a partir dessas variáveis:

```ts
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}
```

- O `.firebaserc` aponta o alias `default` para `catalogo-v5`.
- Esses valores são identificadores públicos por design (seção 8.2 da especificação): acabam no bundle entregue ao navegador, e a proteção dos dados vem das Security Rules. Ainda assim, vale restringir a chave de API no console do Google Cloud aos domínios do Hosting e de desenvolvimento.
- O bucket usa o domínio novo `*.firebasestorage.app`, que só funciona com o projeto no plano Blaze.

### Estrutura de diretórios

```
src/
  assets/styles/    # tokens.css, base.css (extraídos do protótipo)
  components/       # Base*, AppLayout, ImovelCard, ImovelRow, FotoUploader,
                    # FotoCarrossel, HistoricoList, LeadTable, LeadForm
  views/            # LoginView, CatalogoView, ImovelFormView, ImovelDetalheView,
                    # LeadsView, AdminView, UsuariosView
  router/           # index.ts — rotas e guards
  stores/           # auth.ts, usuarios.ts, imoveis.ts, leads.ts
  services/         # users.ts, imoveis.ts, leads.ts, storage.ts
  composables/      # useAuth.ts, useImovel.ts, useLead.ts
  utils/            # diffImovel.ts, filtros.ts, formatadores.ts
  types/            # index.ts
  firebase.ts
tests/
  rules/            # testes das Security Rules
  unit/             # testes de utils
scripts/
  seed.ts           # dados do emulador
firestore.rules · storage.rules · firestore.indexes.json · firebase.json · .firebaserc
.env.example      # .env e .env.local nunca são versionados
```

### Rotas

| Rota | View | Acesso |
|---|---|---|
| `/login` | LoginView | Público; redireciona para `/` se autenticado |
| `/` | CatalogoView | Autenticado |
| `/imoveis/novo` | ImovelFormView | Autenticado |
| `/imoveis/:id` | ImovelDetalheView | Autenticado |
| `/imoveis/:id/editar` | ImovelFormView | Autenticado |
| `/leads` | LeadsView | Autenticado |
| `/admin` | AdminView | Admin |
| `/admin/usuarios` | UsuariosView | Admin |

---

## 6. Epics

Cada história vira uma branch `feature/e<N>-<nome-curto>` e entra na `main` por Pull Request revisado. Um epic está concluído quando todos os seus critérios de aceite passam no emulador.

| Epic | Nome | Depende de |
|---|---|---|
| E0 | Fundação | — |
| E1 | Autenticação e sessão | E0 |
| E2 | Regras de segurança | E1 |
| E3 | Catálogo | E2 |
| E4 | Cadastro e fotos | E3 |
| E5 | Histórico e exclusão | E4 |
| E6 | Leads | E3 |
| E7 | Administração | E5, E6 |
| E8 | Qualidade e deploy | E7 |

E6 pode ser desenvolvido em paralelo com E4 e E5.

### E0 — Fundação

**Objetivo:** projeto rodando localmente contra o emulador, com a base visual do protótipo.

| ID | História |
|---|---|
| E0.1 | Criar o projeto com `npm create vue@latest .`, selecionando TypeScript, Vue Router, Pinia, Vitest, ESLint e Prettier. |
| E0.2 | Instalar dependências: `firebase`, `vee-validate`, `yup`, `browser-image-compression`, `@tabler/icons-webfont`, `@fontsource-variable/dm-sans`; em desenvolvimento, `firebase-tools`, `firebase-admin` e `@firebase/rules-unit-testing`. |
| E0.3 | No projeto `catalogo-v5` (já criado), confirmar o plano Blaze, configurar alerta de orçamento e habilitar Authentication (e-mail/senha), Firestore, Storage e Hosting. |
| E0.4 | Criar `firebase.json` (hosting em `dist` com rewrite de SPA para `/index.html`, regras, índices e emuladores), `.firebaserc` com o alias `default` em `catalogo-v5`, `.env.example` com as chaves `VITE_FIREBASE_*` sem valores e o `.env` local com a configuração da seção 5. |
| E0.5 | Criar `scripts/seed.ts`, que popula o emulador com um admin, dois corretores (um deles inativo), imóveis ativos e inativos e alguns leads. |
| E0.6 | Extrair do protótipo `tokens.css` e `base.css`; criar `BaseButton`, `BaseInput`, `BaseSelect`, `BaseModal` e `BaseBadge`. |
| E0.7 | Criar `AppLayout` com topbar, sidebar (desktop) e bottom nav (mobile). |

**Critérios de aceite**

- `npm run dev`, `npm run build` e `npm run lint` terminam sem erros.
- `firebase emulators:start` sobe Auth, Firestore e Storage, e o seed roda sem erros.
- O layout base reproduz o protótipo em 1280px e em 375px, nos temas claro e escuro.
- `.env` não aparece em `git status`.

### E1 — Autenticação e sessão

**Objetivo:** só usuários ativos entram, e cada perfil alcança apenas as suas rotas.

| ID | História |
|---|---|
| E1.1 | Criar `src/firebase.ts` (app, auth, firestore e storage; conecta aos emuladores em desenvolvimento) e `src/types/index.ts`. |
| E1.2 | Criar `services/users.ts` com `getUser` e a store `auth` com `init()`, `login()`, `logout()` e o `onSnapshot` do próprio perfil. |
| E1.3 | Criar a LoginView conforme o protótipo, com validação de e-mail e senha, mensagens de erro em português e a opção "Lembrar acesso neste dispositivo". |
| E1.4 | Criar as rotas e os guards `requiresAuth` e `requiresAdmin`; o guard espera `auth.init()` terminar antes de decidir. |
| E1.5 | Exibir nome, perfil e iniciais do usuário na topbar, com ação de sair. |

**Critérios de aceite**

- Login com credenciais válidas leva ao catálogo; credenciais inválidas mostram erro sem recarregar a página.
- Usuário com `ativo: false` é deslogado no login com a mensagem de acesso suspenso.
- Usuário logado que é inativado pelo admin perde a sessão sem precisar recarregar.
- Corretor que acessa `/admin` é redirecionado para `/`; visitante que acessa qualquer rota protegida vai para `/login`.
- Com "Lembrar acesso" desmarcado, fechar o navegador encerra a sessão.

### E2 — Regras de segurança

**Objetivo:** a matriz de permissões da seção 4 garantida pelo backend e coberta por testes.

| ID | História |
|---|---|
| E2.1 | Escrever `firestore.rules` e `firestore.indexes.json` conforme a seção 4. |
| E2.2 | Escrever `storage.rules` conforme a seção 4. |
| E2.3 | Escrever testes em `tests/rules/` para os quatro perfis (corretor ativo, admin, usuário inativo, não autenticado), cobrindo cada linha da matriz. |
| E2.4 | Criar o script `npm run test:rules`, que executa os testes dentro de `firebase emulators:exec`. |

**Critérios de aceite**

- Corretor não consegue alterar `perfil` nem `ativo` no próprio documento.
- Admin não consegue alterar `perfil` nem `ativo` no próprio documento.
- Usuário inativo não lê nem escreve em `imoveis`, `leads`, `historico` ou Storage.
- Registro de histórico não pode ser editado por ninguém nem excluído por corretor.
- Upload para um `imovelId` inexistente, de arquivo que não é imagem ou maior que 5 MB é negado.
- `npm run test:rules` passa.

### E3 — Catálogo

**Objetivo:** listar, filtrar e visualizar imóveis.

| ID | História |
|---|---|
| E3.1 | Criar `services/imoveis.ts` (`listImoveis`, `getImovel`) e a store `imoveis` com a lista e o getter de filtragem. |
| E3.2 | Criar a store `usuarios`, que carrega a lista de usuários uma vez para resolver nomes de captadores. |
| E3.3 | Criar `utils/filtros.ts` (busca sem distinção de acentos e maiúsculas em rua, bairro e cidade; tipo; finalidade; faixa de valor; captador) e `utils/formatadores.ts` (moeda, área, telefone, data). |
| E3.4 | Criar a CatalogoView com a barra de filtros, `ImovelCard` em grid no desktop e `ImovelRow` em lista no mobile, além dos estados de carregamento e de lista vazia. |
| E3.5 | Criar a ImovelDetalheView com `FotoCarrossel` (setas e miniaturas), dados do imóvel, captador e cliente vendedor. |

**Critérios de aceite**

- O corretor vê apenas imóveis ativos; o admin tem um filtro de status e vê todos.
- Os filtros combinam entre si e atualizam a lista sem nova consulta ao servidor.
- Valor de aluguel aparece com o sufixo "/mês"; quartos só aparecem quando preenchidos.
- Imóvel sem foto mostra o placeholder do protótipo.
- Clicar em um card abre o detalhe; o botão voltar retorna ao catálogo mantendo os filtros.

### E4 — Cadastro e fotos

**Objetivo:** criar e editar imóveis com upload de fotos.

| ID | História |
|---|---|
| E4.1 | Adicionar `createImovel` e `updateImovel` ao serviço e `salvar()` à store. |
| E4.2 | Criar a ImovelFormView nas quatro seções do protótipo (Fotos, Informações, Endereço, Responsáveis), com validação, máscaras de valor e telefone e as 27 UFs. |
| E4.3 | Criar `services/storage.ts` (`uploadFoto`, `deleteFoto`) e o `FotoUploader`, com seleção múltipla, compressão, pré-visualização, progresso e remoção. |
| E4.4 | Implementar o fluxo de cadastro em três passos (documento, upload, atualização de `fotos[]`) com tratamento de falha parcial. |
| E4.5 | Reutilizar o formulário na rota de edição, carregando os dados e as fotos existentes. |

**Critérios de aceite**

- Campos obrigatórios vazios impedem o envio e mostram a mensagem junto ao campo.
- O captador vem preenchido com o usuário logado e pode ser trocado por outro corretor ativo.
- Fotos são comprimidas antes do upload e a URL entra em `fotos[]`.
- Remover uma foto a retira de `fotos[]` e apaga o arquivo do Storage.
- Se o upload de uma foto falhar, o imóvel continua salvo e o usuário é avisado de quais fotos não subiram.

### E5 — Histórico e exclusão

**Objetivo:** rastrear toda alteração e permitir inativar ou excluir imóveis.

| ID | História |
|---|---|
| E5.1 | Criar `utils/diffImovel.ts` e mover `updateImovel` para uma transação que grava a edição e os registros de histórico juntos. |
| E5.2 | Gravar os registros `criacao`, `foto_adicionada` e `foto_removida` nos fluxos do E4. |
| E5.3 | Criar `HistoricoList` no detalhe do imóvel, em ordem cronológica inversa, com textos como "Valor alterado de R$ 500.000 para R$ 480.000". |
| E5.4 | Implementar `softDeleteImovel` e o botão "Inativar" no detalhe, com confirmação. |
| E5.5 | Implementar `hardDeleteImovel` em cascata e o botão "Excluir" no painel admin, com confirmação que exige digitar o endereço. |

**Critérios de aceite**

- Editar três campos gera exatamente três registros; salvar sem alterações não gera nenhum.
- Campos de auditoria (`atualizadoEm`, `atualizadoPor`) não geram registro de histórico.
- Imóvel inativado sai do catálogo do corretor e ganha `deletadoEm`.
- Após a exclusão real não sobram arquivos em `imoveis/{id}/` no Storage nem documentos em `historico`.
- O corretor não vê o botão "Excluir".

### E6 — Leads

**Objetivo:** cadastrar e consultar compradores interessados.

| ID | História |
|---|---|
| E6.1 | Criar `services/leads.ts` (`listLeads`, `listLeadsPorImovel`, `createLead`, `updateLead`) e a store `leads`. |
| E6.2 | Criar a LeadsView com o formulário inline, `LeadTable` no desktop, cards no mobile e filtro por imóvel. |
| E6.3 | Adicionar o bloco "Leads interessados" ao detalhe do imóvel, com o botão "Novo" já vinculado ao imóvel. |
| E6.4 | Implementar a edição de lead em modal. |

**Critérios de aceite**

- O lead exige imóvel vinculado, nome e telefone válido.
- `imovelEndereco` é gravado no formato "Tipo — Rua" do protótipo.
- O lead criado no detalhe do imóvel aparece também na listagem geral.
- Lead de imóvel excluído continua visível, sem link para o detalhe.

### E7 — Administração

**Objetivo:** painel do admin e gestão de usuários.

| ID | História |
|---|---|
| E7.1 | Criar a AdminView com os quatro contadores (imóveis ativos, inativos, leads, corretores ativos) e as variações do mês, usando `getCountFromServer`. |
| E7.2 | Adicionar à AdminView a tabela "Todos os imóveis", com as ações "Ver" e "Excluir". |
| E7.3 | Completar `services/users.ts` com `listUsers`, `createUser` (instância secundária), `updateUser` e `toggleAtivo`. |
| E7.4 | Criar a UsuariosView com a tabela de usuários, o modal de criação (nome, e-mail, senha inicial, perfil) e as ações de editar, inativar e reativar. |
| E7.5 | Exibir o item "Usuários" na sidebar e o item "Admin" na bottom nav apenas para o admin. |

**Critérios de aceite**

- Criar um usuário não encerra a sessão do admin, e o novo usuário consegue entrar em seguida.
- E-mail já cadastrado mostra erro claro e não cria documento em `users`.
- O admin não vê as ações de inativar nem de mudar perfil na própria linha.
- Inativar um corretor encerra a sessão dele (E1) e o retira do campo "Captador" de novos cadastros.
- Os contadores batem com os dados do seed.

### E8 — Qualidade e deploy

**Objetivo:** sistema validado e publicado.

| ID | História |
|---|---|
| E8.1 | Escrever testes unitários de `diffImovel`, `filtros` e `formatadores`. |
| E8.2 | Revisar as seis telas contra o protótipo em 375px, 768px e 1280px, nos temas claro e escuro; conferir foco por teclado e rótulos de formulário. |
| E8.3 | Criar o primeiro admin em produção e publicar com `firebase deploy --only firestore:rules,firestore:indexes,storage` seguido de `npm run build` e `firebase deploy --only hosting`. |
| E8.4 | Escrever o `README.md` com setup local, uso do emulador, deploy, criação do primeiro admin e o roteiro de export manual do Firestore para backup. |
| E8.5 | Executar o roteiro da seção 7 em produção. |

**Critérios de aceite**

- `npm run test`, `npm run test:rules`, `npm run lint` e `npm run build` passam.
- A aplicação abre no domínio do Firebase Hosting, com SSL, e recarregar uma rota interna não retorna 404.
- O alerta de orçamento está ativo no projeto.

---

## 7. Verificação final

Roteiro manual, primeiro no emulador e depois em produção:

1. Entrar como corretor: catálogo visível, `/admin` inacessível.
2. Entrar como admin: todas as rotas acessíveis.
3. Inativar um corretor com a sessão dele aberta em outro navegador: a sessão cai.
4. Cadastrar um imóvel com três fotos: as fotos aparecem no carrossel e o histórico mostra a criação e as três inclusões.
5. Editar valor e bairro: dois registros novos no histórico, com valores anterior e novo.
6. Combinar busca, tipo e faixa de valor no catálogo.
7. Cadastrar um lead pelo detalhe do imóvel e conferir na listagem geral.
8. Inativar o imóvel como corretor: some do catálogo do corretor e aparece no painel admin.
9. Excluir o imóvel como admin: documento, histórico e arquivos removidos; o lead permanece.
10. Criar um usuário como admin e entrar com ele em outro navegador.
11. Tentar, pelo console do navegador, alterar o próprio `perfil` como corretor: a escrita é negada.

---

## 8. Limitações conhecidas

| Limitação | Mitigação |
|---|---|
| Filtros no cliente carregam todos os imóveis do status consultado | Adequado ao acervo previsto; migrar para paginação e consultas indexadas se passar de alguns milhares |
| `imovelEndereco` do lead não acompanha edições posteriores do endereço | Aceito; o lead registra o endereço do momento do cadastro |
| A exclusão real em cascata roda no cliente e pode ser interrompida no meio | A ordem (Storage, histórico, documento) permite repetir a operação até concluir |
| Inativar um usuário não desativa a conta no Authentication | As regras negam todo acesso a dados e o cliente encerra a sessão |
| Sem backup automático | Export manual periódico pelo console, documentado no README |
| Sem CI/CD | Deploy manual; automatizar com GitHub Actions no futuro |
