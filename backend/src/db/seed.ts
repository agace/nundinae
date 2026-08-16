import { pathToFileURL } from 'node:url';
import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';
import { env } from '../config/env.js';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';

interface SeedUser {
  nome: string;
  email: string;
  senha: string;
  tipo: 'comprador' | 'vendedor' | 'ambos' | 'admin';
}

const USERS: SeedUser[] = [
  { nome: 'Marcus Aurelius', email: 'marcus@nundinae.com', senha: 'roma123', tipo: 'vendedor' },
  { nome: 'Livia Drusilla', email: 'livia@nundinae.com', senha: 'roma123', tipo: 'vendedor' },
  { nome: 'Cassius Varro', email: 'cassius@nundinae.com', senha: 'roma123', tipo: 'vendedor' },
  { nome: 'Julia Domna', email: 'julia@nundinae.com', senha: 'roma123', tipo: 'comprador' },
  { nome: 'Admin Nundinae', email: 'admin@nundinae.com', senha: 'admin123', tipo: 'admin' },
];

interface ProductSeed {
  vendedor_email: string;
  nome: string;
  descricao: string;
  preco: number;
  imagem: string;
  estoque: number;
  categoria: string;
}

const PRODUCTS: ProductSeed[] = [
  {
    vendedor_email: 'marcus@nundinae.com',
    nome: 'Ânfora de Cerâmica Romana',
    descricao: 'Peça artesanal inspirada nas ânforas usadas no transporte de vinho e azeite na Roma Antiga. Feita à mão em argila natural, queimada em forno tradicional.',
    preco: 289.90,
    imagem: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=800',
    estoque: 12,
    categoria: 'Cerâmicas e Louças',
  },
  {
    vendedor_email: 'marcus@nundinae.com',
    nome: 'Taça de Terracota com Grecas',
    descricao: 'Taça decorada com padrões geométricos clássicos. Ideal para decoração ou uso como vaso.',
    preco: 129.00,
    imagem: 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=800',
    estoque: 20,
    categoria: 'Cerâmicas e Louças',
  },
  {
    vendedor_email: 'livia@nundinae.com',
    nome: 'Colar de Ouro com Moeda Romana',
    descricao: 'Réplica autêntica de denário romano banhado a ouro 18k, com corrente artesanal.',
    preco: 749.00,
    imagem: 'https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=800',
    estoque: 8,
    categoria: 'Joias',
  },
  {
    vendedor_email: 'livia@nundinae.com',
    nome: 'Anel com Entalhe em Cornalina',
    descricao: 'Inspirado nos signetes romanos, com pedra cornalina vermelha e entalhe manual.',
    preco: 459.00,
    imagem: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800',
    estoque: 5,
    categoria: 'Joias',
  },
  {
    vendedor_email: 'livia@nundinae.com',
    nome: 'Brincos Laureados em Prata',
    descricao: 'Inspirados nas coroas de louros dos imperadores. Prata 925 escovada.',
    preco: 329.00,
    imagem: 'https://images.unsplash.com/photo-1629224316810-9d8805b95e76?w=800',
    estoque: 15,
    categoria: 'Joias',
  },
  {
    vendedor_email: 'cassius@nundinae.com',
    nome: 'Quadro Mosaico de Pompeia',
    descricao: 'Reprodução em mosaico de peças icônicas encontradas nas ruínas de Pompeia. 40x60cm com moldura de madeira.',
    preco: 899.00,
    imagem: 'https://images.unsplash.com/photo-1577083552431-6e5fd01aa342?w=800',
    estoque: 4,
    categoria: 'Artes e Quadros',
  },
  {
    vendedor_email: 'cassius@nundinae.com',
    nome: 'Afresco do Coliseu (Pintura à Óleo)',
    descricao: 'Tela original em óleo retratando o Coliseu ao entardecer. Assinada pelo artista.',
    preco: 1290.00,
    imagem: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=800',
    estoque: 2,
    categoria: 'Artes e Quadros',
  },
  {
    vendedor_email: 'cassius@nundinae.com',
    nome: 'Gravura Antiga de Roma',
    descricao: 'Gravura envelhecida em papel artesanal retratando o Fórum Romano. 30x40cm.',
    preco: 189.00,
    imagem: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800',
    estoque: 10,
    categoria: 'Artes e Quadros',
  },
  {
    vendedor_email: 'marcus@nundinae.com',
    nome: 'Jarro com Asa Dupla',
    descricao: 'Estilo etrusco, perfeito para servir ou decorar. Altura de 25cm.',
    preco: 199.90,
    imagem: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=800',
    estoque: 7,
    categoria: 'Cerâmicas e Louças',
  },
  {
    vendedor_email: 'livia@nundinae.com',
    nome: 'Pulseira com Símbolo da SPQR',
    descricao: 'Bronze envelhecido com o icônico Senatus Populusque Romanus gravado.',
    preco: 249.00,
    imagem: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800',
    estoque: 12,
    categoria: 'Joias',
  },
];

// Popula o banco com dados de demonstração. Usado pela CLI (npm run seed) e
// pelos testes de integração.
export async function seedDatabase(conn: mysql.Connection, opts: { log?: boolean } = {}): Promise<void> {
  const log = opts.log ? console.log : () => {};

  log('[seed] Limpando dados antigos...');
  await conn.query('SET FOREIGN_KEY_CHECKS = 0');
  for (const t of [
    'pedido_eventos', 'notificacoes', 'perguntas', 'favoritos', 'cupons',
    'avaliacoes', 'pagamentos', 'itens_pedido', 'pedidos', 'itens_carrinho', 'carrinhos', 'produtos', 'usuarios',
  ]) {
    await conn.query(`TRUNCATE TABLE ${t}`);
  }
  await conn.query('SET FOREIGN_KEY_CHECKS = 1');

  log('[seed] Cadastrando usuários...');
  const emailToId: Record<string, number> = {};
  for (const u of USERS) {
    const hash = await bcrypt.hash(u.senha, 10);
    const [result] = await conn.query<ResultSetHeader>(
      'INSERT INTO usuarios (nome, email, senha_hash, tipo) VALUES (?, ?, ?, ?)',
      [u.nome, u.email, hash, u.tipo],
    );
    emailToId[u.email] = result.insertId;
    await conn.query('INSERT INTO carrinhos (usuario_id) VALUES (?)', [result.insertId]);
  }

  await conn.query(
    `UPDATE usuarios SET telefone = ?, endereco_cep = ?, endereco_logradouro = ?,
            endereco_numero = ?, endereco_bairro = ?, endereco_cidade = ?, endereco_estado = ?
       WHERE id = ?`,
    ['(42) 99876-5432', '84010-000', 'Rua das Oliveiras', '120', 'Centro', 'Ponta Grossa', 'PR', emailToId['julia@nundinae.com']],
  );

  log('[seed] Cadastrando produtos...');
  for (const p of PRODUCTS) {
    await conn.query(
      `INSERT INTO produtos (vendedor_id, nome, descricao, preco, imagem, estoque, categoria)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [emailToId[p.vendedor_email], p.nome, p.descricao, p.preco, p.imagem, p.estoque, p.categoria],
    );
  }

  log('[seed] Criando avaliações de exemplo...');
  const comprador = emailToId['julia@nundinae.com'];
  const vendedores = [
    emailToId['marcus@nundinae.com'],
    emailToId['livia@nundinae.com'],
    emailToId['cassius@nundinae.com'],
  ];

  // A reputação (RF07) e o estoque (RN004) saem dos triggers do banco.
  const pedidoIds: number[] = [];
  for (const vendedorId of vendedores) {
    const [prodRows] = await conn.query<RowDataPacket[]>(
      'SELECT id, preco FROM produtos WHERE vendedor_id = ? LIMIT 1',
      [vendedorId],
    );
    const prod = prodRows[0];
    const [pedidoResult] = await conn.query<ResultSetHeader>(
      'INSERT INTO pedidos (usuario_id, total, status) VALUES (?, ?, ?)',
      [comprador, prod.preco, 'pago'],
    );
    pedidoIds.push(pedidoResult.insertId);
    await conn.query(
      `INSERT INTO itens_pedido (pedido_id, produto_id, vendedor_id, quantidade, preco_unitario)
       VALUES (?, ?, ?, ?, ?)`,
      [pedidoResult.insertId, prod.id, vendedorId, 1, prod.preco],
    );
    await conn.query(
      `INSERT INTO pagamentos (pedido_id, valor, status, metodo, data_pagamento)
       VALUES (?, ?, 'aprovado', 'pix', NOW())`,
      [pedidoResult.insertId, prod.preco],
    );
    const nota = 4 + Math.round(Math.random());
    await conn.query(
      `INSERT INTO avaliacoes (pedido_id, avaliador_id, avaliado_id, nota, comentario)
       VALUES (?, ?, ?, ?, ?)`,
      [pedidoResult.insertId, comprador, vendedorId, nota, 'Produto excepcional, entrega rápida!'],
    );
  }

  log('[seed] Cupons, favoritos, perguntas e rastreamento de exemplo...');

  await conn.query(
    `INSERT INTO cupons (codigo, tipo, valor, ativo, usos_max, vendedor_id) VALUES
       ('ROMA10', 'percentual', 10, 1, 100, ?),
       ('FORUM5', 'percentual', 5, 1, NULL, ?),
       ('SPQR50', 'fixo', 50, 1, 50, ?)`,
    [
      emailToId['marcus@nundinae.com'],
      emailToId['marcus@nundinae.com'],
      emailToId['livia@nundinae.com'],
    ],
  );

  const [favProds] = await conn.query<RowDataPacket[]>(
    'SELECT id FROM produtos WHERE vendedor_id <> ? ORDER BY id LIMIT 3',
    [comprador],
  );
  for (const p of favProds) {
    await conn.query('INSERT INTO favoritos (usuario_id, produto_id) VALUES (?, ?)', [comprador, p.id]);
  }

  const [perguntaProds] = await conn.query<RowDataPacket[]>(
    'SELECT id, vendedor_id FROM produtos ORDER BY id LIMIT 2',
  );
  if (perguntaProds[0]) {
    await conn.query(
      `INSERT INTO perguntas (produto_id, autor_id, pergunta, resposta, respondida_em)
       VALUES (?, ?, ?, ?, NOW())`,
      [perguntaProds[0].id, comprador, 'Esta peça acompanha certificado de autenticidade?',
        'Sim! Toda peça vai com um certificado assinado pelo artesão.'],
    );
  }
  if (perguntaProds[1]) {
    await conn.query(
      `INSERT INTO perguntas (produto_id, autor_id, pergunta) VALUES (?, ?, ?)`,
      [perguntaProds[1].id, comprador, 'Vocês enviam para todo o Brasil?'],
    );
  }

  // Avança um pedido para "enviado" para a timeline aparecer populada na demo.
  if (pedidoIds[0]) {
    await conn.query(`UPDATE pedidos SET status = 'preparando' WHERE id = ?`, [pedidoIds[0]]);
    await conn.query(`UPDATE pedidos SET status = 'enviado' WHERE id = ?`, [pedidoIds[0]]);
  }
}

async function run() {
  // O seed apaga TODAS as tabelas antes de recriar os dados de exemplo. Rodar
  // isso contra o banco de produção seria irreversível.
  if (env.isProduction && process.env.SEED_ALLOW_PRODUCTION !== 'true') {
    console.error(
      '[seed] Bloqueado: este comando apaga todos os dados e NODE_ENV=production.\n' +
      '       Se for mesmo a intenção, rode com SEED_ALLOW_PRODUCTION=true.',
    );
    process.exit(1);
  }

  const conn = await mysql.createConnection({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    database: env.db.database,
  });
  try {
    await seedDatabase(conn, { log: true });
    console.log('\n[seed] Concluído.\n');
    console.log('Usuários criados (senha: roma123 | admin: admin123):');
    for (const u of USERS) console.log(`  - ${u.email.padEnd(30)} [${u.tipo}]`);
    console.log('');
  } finally {
    await conn.end();
  }
}

// Só executa quando rodado direto pela CLI, não ao ser importado pelos testes.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run().catch((err) => {
    console.error('[seed] Erro:', err);
    process.exit(1);
  });
}
