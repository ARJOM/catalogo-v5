/**
 * Popula o Firebase Emulator Suite com dados de desenvolvimento.
 *
 * Uso: com `npm run emulators` rodando em outro terminal, execute `npm run seed`.
 *
 * O script só fala com os emuladores: os endereços abaixo são fixos e ele aborta
 * se o emulador do Firestore não responder. Nunca toca o projeto real.
 * Rodar de novo apaga os dados do emulador e recria tudo.
 */
import { initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'

const PROJECT_ID = 'catalogo-v5'
const FIRESTORE_HOST = '127.0.0.1:8080'
const AUTH_HOST = '127.0.0.1:9099'
const STORAGE_HOST = '127.0.0.1:9199'
const SENHA = 'senha123'

process.env.FIRESTORE_EMULATOR_HOST = FIRESTORE_HOST
process.env.FIREBASE_AUTH_EMULATOR_HOST = AUTH_HOST
process.env.FIREBASE_STORAGE_EMULATOR_HOST = STORAGE_HOST
process.env.GCLOUD_PROJECT = PROJECT_ID

const DIA = 24 * 60 * 60 * 1000
const diasAtras = (dias: number, hora = 9, minuto = 0) => {
  const data = new Date(Date.now() - dias * DIA)
  data.setHours(hora, minuto, 0, 0)
  return Timestamp.fromDate(data)
}

async function exigirEmulador() {
  try {
    await fetch(`http://${FIRESTORE_HOST}/`)
    await fetch(`http://${AUTH_HOST}/`)
  } catch {
    console.error(
      'Emuladores não encontrados. Rode `npm run emulators` em outro terminal e tente de novo.',
    )
    process.exit(1)
  }
}

async function limparEmulador() {
  const respostas = await Promise.all([
    fetch(
      `http://${FIRESTORE_HOST}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`,
      { method: 'DELETE' },
    ),
    fetch(`http://${AUTH_HOST}/emulator/v1/projects/${PROJECT_ID}/accounts`, { method: 'DELETE' }),
  ])
  for (const resposta of respostas) {
    if (!resposta.ok) throw new Error(`Falha ao limpar o emulador: ${resposta.status}`)
  }
}

const usuarios = [
  { uid: 'admin', nome: 'Admin', email: 'admin@imoveispro.com', perfil: 'admin', ativo: true },
  { uid: 'joao', nome: 'João Melo', email: 'joao@imoveispro.com', perfil: 'corretor', ativo: true },
  { uid: 'ana', nome: 'Ana Souza', email: 'ana@imoveispro.com', perfil: 'corretor', ativo: false },
] as const

const nomePorUid = Object.fromEntries(usuarios.map((u) => [u.uid, u.nome]))

interface ImovelSeed {
  id: string
  tipo: string
  finalidade: string
  valor: number
  areaM2: number
  quartos: number | null
  caracteristicas: string
  rua: string
  bairro: string
  cidade: string
  estado: string
  captadorId: (typeof usuarios)[number]['uid']
  vendedorNome: string
  vendedorTelefone: string
  status: 'ativo' | 'inativo'
  criadoHaDias: number
  inativadoHaDias?: number
}

const imoveis: ImovelSeed[] = [
  {
    id: 'casa-flores',
    tipo: 'Casa',
    finalidade: 'Venda',
    valor: 480000,
    areaM2: 120,
    quartos: 3,
    caracteristicas:
      '3 quartos, 2 banheiros, garagem p/ 2 carros, quintal amplo, área de serviço coberta.',
    rua: 'Rua das Flores, 142',
    bairro: 'Centro',
    cidade: 'Cajazeiras',
    estado: 'PB',
    captadorId: 'joao',
    vendedorNome: 'Carlos Ferreira',
    vendedorTelefone: '(83) 99999-0001',
    status: 'ativo',
    criadoHaDias: 60,
  },
  {
    id: 'apto-brasil',
    tipo: 'Apartamento',
    finalidade: 'Aluguel',
    valor: 1800,
    areaM2: 75,
    quartos: 2,
    caracteristicas: '2 quartos, 1 banheiro, varanda, 1 vaga coberta.',
    rua: 'Av. Brasil, 88',
    bairro: 'Bairro Novo',
    cidade: 'Sousa',
    estado: 'PB',
    captadorId: 'ana',
    vendedorNome: 'Lúcia Andrade',
    vendedorTelefone: '(83) 98888-0002',
    status: 'ativo',
    criadoHaDias: 45,
  },
  {
    id: 'terreno-rural',
    tipo: 'Terreno',
    finalidade: 'Venda',
    valor: 95000,
    areaM2: 800,
    quartos: null,
    caracteristicas: 'Terreno plano, murado, com acesso por estrada de terra.',
    rua: 'Estrada Rural s/n',
    bairro: 'Zona Sul',
    cidade: 'Cajazeiras',
    estado: 'PB',
    captadorId: 'joao',
    vendedorNome: 'José Batista',
    vendedorTelefone: '(83) 97777-0003',
    status: 'inativo',
    criadoHaDias: 90,
    inativadoHaDias: 10,
  },
  {
    id: 'comercial-comercio',
    tipo: 'Comercial',
    finalidade: 'Venda',
    valor: 1200000,
    areaM2: 350,
    quartos: null,
    caracteristicas: 'Ponto comercial de esquina, 2 pavimentos, 4 banheiros.',
    rua: 'Rua do Comércio, 500',
    bairro: 'Centro',
    cidade: 'Cajazeiras',
    estado: 'PB',
    captadorId: 'ana',
    vendedorNome: 'Imobiliária Sertão Ltda.',
    vendedorTelefone: '(83) 3531-0004',
    status: 'ativo',
    criadoHaDias: 30,
  },
  {
    id: 'casa-ipes',
    tipo: 'Casa',
    finalidade: 'Aluguel',
    valor: 2500,
    areaM2: 140,
    quartos: 4,
    caracteristicas: '4 quartos, sendo 1 suíte, garagem p/ 2 carros, área gourmet.',
    rua: 'Rua dos Ipês, 30',
    bairro: 'Jardim Oásis',
    cidade: 'Cajazeiras',
    estado: 'PB',
    captadorId: 'joao',
    vendedorNome: 'Marta Queiroz',
    vendedorTelefone: '(83) 99666-0005',
    status: 'ativo',
    criadoHaDias: 2,
  },
  {
    id: 'rural-boa-vista',
    tipo: 'Rural',
    finalidade: 'Venda',
    valor: 650000,
    areaM2: 50000,
    quartos: 3,
    caracteristicas: 'Sítio com casa sede, açude, curral e energia trifásica.',
    rua: 'Sítio Boa Vista, km 12',
    bairro: 'Zona Rural',
    cidade: 'Juazeiro do Norte',
    estado: 'CE',
    captadorId: 'joao',
    vendedorNome: 'Antônio Leite',
    vendedorTelefone: '(88) 99555-0006',
    status: 'ativo',
    criadoHaDias: 1,
  },
  {
    id: 'apto-tiradentes',
    tipo: 'Apartamento',
    finalidade: 'Venda',
    valor: 320000,
    areaM2: 68,
    quartos: 2,
    caracteristicas: '2 quartos, 2 banheiros, elevador, portaria 24h.',
    rua: 'Rua Tiradentes, 210',
    bairro: 'Centro',
    cidade: 'Mossoró',
    estado: 'RN',
    captadorId: 'ana',
    vendedorNome: 'Paulo Henrique Dantas',
    vendedorTelefone: '(84) 99444-0007',
    status: 'inativo',
    criadoHaDias: 120,
    inativadoHaDias: 40,
  },
]

const leads = [
  {
    imovelId: 'casa-flores',
    nomeComprador: 'Maria Aparecida',
    telefone: '(83) 98888-1234',
    criadoHaDias: 1,
    hora: 14,
    minuto: 30,
  },
  {
    imovelId: 'casa-flores',
    nomeComprador: 'Roberto Lima',
    telefone: '(83) 97777-5678',
    criadoHaDias: 4,
    hora: 9,
    minuto: 10,
  },
  {
    imovelId: 'apto-brasil',
    nomeComprador: 'Fernanda Costa',
    telefone: '(83) 96666-9900',
    criadoHaDias: 9,
    hora: 11,
    minuto: 5,
  },
  {
    imovelId: 'comercial-comercio',
    nomeComprador: 'Grupo Varejo Nordeste',
    telefone: '(83) 3522-4400',
    criadoHaDias: 40,
    hora: 16,
    minuto: 20,
  },
]

async function main() {
  await exigirEmulador()
  await limparEmulador()

  initializeApp({ projectId: PROJECT_ID })
  const auth = getAuth()
  const db = getFirestore()

  for (const usuario of usuarios) {
    await auth.createUser({
      uid: usuario.uid,
      email: usuario.email,
      password: SENHA,
      displayName: usuario.nome,
    })
  }

  const batch = db.batch()

  for (const usuario of usuarios) {
    const criadoEm = diasAtras(150)
    batch.set(db.doc(`users/${usuario.uid}`), { ...usuario, criadoEm, atualizadoEm: criadoEm })
  }

  for (const { id, criadoHaDias, inativadoHaDias, ...campos } of imoveis) {
    const criadoEm = diasAtras(criadoHaDias, 8, 45)
    const inativadoEm = inativadoHaDias === undefined ? null : diasAtras(inativadoHaDias, 17, 0)
    const ref = db.doc(`imoveis/${id}`)

    batch.set(ref, {
      ...campos,
      fotos: [],
      criadoEm,
      criadoPor: campos.captadorId,
      atualizadoEm: inativadoEm ?? criadoEm,
      atualizadoPor: campos.captadorId,
      deletadoEm: inativadoEm,
    })
    batch.set(ref.collection('historico').doc(), {
      tipo: 'criacao',
      usuarioId: campos.captadorId,
      usuarioNome: nomePorUid[campos.captadorId],
      timestamp: criadoEm,
    })
  }

  // Um registro de edição, para a tela de detalhe ter histórico além da criação.
  batch.set(db.collection('imoveis/casa-flores/historico').doc(), {
    tipo: 'edicao',
    campo: 'valor',
    valorAnterior: 500000,
    valorNovo: 480000,
    usuarioId: 'joao',
    usuarioNome: nomePorUid.joao,
    timestamp: diasAtras(3, 10, 22),
  })

  for (const lead of leads) {
    const imovel = imoveis.find((i) => i.id === lead.imovelId)!
    const criadoEm = diasAtras(lead.criadoHaDias, lead.hora, lead.minuto)
    batch.set(db.collection('leads').doc(), {
      imovelId: lead.imovelId,
      imovelEndereco: `${imovel.tipo} — ${imovel.rua}`,
      nomeComprador: lead.nomeComprador,
      telefone: lead.telefone,
      criadoEm,
      criadoPor: 'joao',
      atualizadoEm: criadoEm,
      atualizadoPor: 'joao',
    })
  }

  await batch.commit()

  const ativos = imoveis.filter((i) => i.status === 'ativo').length
  console.log(`Seed concluído no emulador (projeto ${PROJECT_ID}):`)
  console.log(`  ${usuarios.length} usuários (senha de todos: ${SENHA})`)
  for (const u of usuarios) {
    console.log(`    ${u.email} — ${u.perfil}${u.ativo ? '' : ' (inativo)'}`)
  }
  console.log(`  ${imoveis.length} imóveis (${ativos} ativos, ${imoveis.length - ativos} inativos)`)
  console.log(`  ${leads.length} leads`)
}

main().catch((erro) => {
  console.error('Seed falhou:', erro)
  process.exit(1)
})
