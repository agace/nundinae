<div align="center">

# 🏛️ Nundinae

**Marketplace completo inspirado nas feiras da Roma Antiga**

*Compre, venda e negocie como nos tempos do Império.*

![React](https://img.shields.io/badge/React_18-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL_8-4479A1?style=for-the-badge&logo=mysql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-6E9F18?style=for-the-badge&logo=vitest&logoColor=white)

</div>

---

## Sobre o projeto

**Nundinae** (do latim *nundinae*, os dias de feira da Roma Antiga) é uma plataforma de
marketplace full-stack onde usuários se cadastram como compradores e/ou vendedores,
anunciam produtos, compram através de um carrinho virtual com checkout transparente,
acompanham seus pedidos em tempo real e avaliam vendedores, tudo com uma identidade
visual inspirada na estética romana.

O grande diferencial técnico do projeto é que as **regras de negócio críticas vivem no
próprio banco de dados**, garantidas por triggers, stored procedures e constraints.
Elas não dependem apenas da camada de aplicação.

## Funcionalidades

### Para compradores
- **Carrinho de compras** com checkout transparente (sem redirect)
- **Pagamento via PIX real** (integração Mercado Pago), cartão e boleto
- **Cupons de desconto** aplicáveis no checkout
- **Rastreamento de pedidos** com timeline de status em tempo real
- **Lista de desejos** (favoritos)
- **Avaliação de vendedores** com sistema de reputação
- **Perguntas e respostas** diretamente no anúncio

### Para vendedores
- **Gestão completa de anúncios** (CRUD de produtos com upload de imagens)
- **Painel de vendas** com avanço de status do pedido (pago, preparando, enviado, entregue)
- **Notificações in-app** de novas vendas, perguntas e avaliações

### Para administradores
- **Painel administrativo** com gestão de usuários, produtos e cupons
- Estatísticas gerais da plataforma

### Plataforma
- Autenticação **JWT** com senhas criptografadas (**Bcrypt**)
- **E-mail de confirmação** de pedido (Nodemailer/SMTP)
- **Upload de imagens** via Cloudinary (com fallback local, roda sem credenciais)
- Interface **responsiva** com tema vinho/dourado romano

## Arquitetura

```
nundinae/
├── backend/                  # API REST - Node.js + Express + TypeScript
│   └── src/
│       ├── config/           # Variáveis de ambiente
│       ├── controllers/      # Auth, produtos, carrinho, pedidos, avaliações
│       ├── middleware/       # Autenticação JWT, tratamento de erros
│       ├── routes/           # Definição das rotas da API
│       ├── services/         # Mercado Pago, e-mail, upload de imagens
│       └── db/
│           ├── schema.sql    # DDL completo do banco
│           ├── procedures.sql# Triggers, procedures e constraints
│           ├── migrate.ts    # Aplica o schema
│           └── seed.ts       # Dados de demonstração
├── frontend/                 # SPA - React 18 + TypeScript + Vite
│   └── src/
│       ├── components/       # Navbar, ProductCard, Footer, StarRating
│       ├── pages/            # Landing, Catálogo, Checkout, Pedidos, Admin
│       ├── contexts/         # Auth, Carrinho, Favoritos, Toasts
│       ├── services/         # Cliente HTTP com JWT
│       └── styles/           # Tema visual
├── docker-compose.yml        # MySQL 8 containerizado
└── package.json              # Monorepo (npm workspaces)
```

### Regras de negócio no banco de dados

| Regra | Garantia | Mecanismo |
|-------|----------|-----------|
| Vendedor não compra o próprio produto | Trigger | `trg_carrinho_rn003` |
| Estoque só decrementa após pagamento aprovado | Trigger | `trg_pagamento_rn004` |
| Avaliação só após pedido pago | Trigger | `trg_avaliacao_rn005` |
| Nota inteira de 1 a 5 | CHECK constraint | `chk_nota` |
| Reputação = média das notas | Triggers | `trg_avaliacao_ai/au/ad` |
| Checkout atômico (pedido + pagamento + cupom) | Stored procedure | `sp_checkout` |
| Timeline do pedido + notificações | Triggers | `trg_pedido_evento_ai/au` |

## Stack

| Camada | Tecnologias |
|--------|-------------|
| **Frontend** | React 18, TypeScript, Vite, React Router |
| **Backend** | Node.js, Express, TypeScript, Zod |
| **Banco de dados** | MySQL 8 (Docker), triggers e stored procedures |
| **Autenticação** | JWT + Bcrypt |
| **Integrações** | Mercado Pago (PIX), Cloudinary (imagens), Nodemailer (e-mail) |
| **Testes** | Vitest, Supertest, Testing Library |

## Como rodar

**Pré-requisitos:** Node.js 20+, Docker

```bash
# 1. Suba o MySQL (aguarde ~15s na primeira vez)
npm run db:up

# 2. Instale as dependências
npm install

# 3. Crie o schema e popule os dados de demonstração
npm run db:migrate
npm run db:seed

# 4. Rode backend + frontend em paralelo
npm run dev
```

- **Frontend:** http://localhost:5173
- **API:** http://localhost:4000/api/health

Para parar o banco: `npm run db:down`

### Configuração opcional

A aplicação roda completa **sem nenhuma credencial externa**. As integrações são
ativadas por configuração em `backend/.env` (ver `backend/.env.example`):

```env
MP_ACCESS_TOKEN=         # Mercado Pago, habilita PIX real (QR Code + copia e cola)
SMTP_HOST=               # Nodemailer, habilita e-mail de confirmação do pedido
CLOUDINARY_CLOUD_NAME=   # Cloudinary, habilita CDN de imagens (senão usa fallback local)
```

- **Sem Mercado Pago:** o PIX cai no modo simulado.
- **Sem SMTP:** o e-mail é apenas registrado no log.
- **Sem Cloudinary:** as imagens usam fallback base64 no banco.

## Usuários de demonstração

| E-mail | Senha | Perfil |
|--------|-------|--------|
| `marcus@nundinae.com` | `roma123` | Vendedor |
| `livia@nundinae.com` | `roma123` | Vendedor |
| `julia@nundinae.com` | `roma123` | Comprador |
| `admin@nundinae.com` | `admin123` | Administrador |

## Testes

Testes de integração do backend (Vitest + Supertest) rodam contra um banco isolado
`nundinae_test` criado automaticamente, validando inclusive as regras do banco.
Testes de componente do frontend usam Vitest + Testing Library (jsdom).

```bash
npm run db:up          # o MySQL precisa estar de pé
npm test               # backend + frontend
npm run test:backend
npm run test:frontend
```

## API - principais endpoints

<details>
<summary>Clique para expandir</summary>

```
# Autenticação
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me

# Usuário
PUT    /api/users/me                    # dados do perfil
PUT    /api/users/me/password
POST   /api/users/me/avatar             # upload de foto (multipart)

# Produtos
GET    /api/products                    # ?q=&categoria=&vendedor_id=
GET    /api/products/:id
POST   /api/products                    # (autenticado)
PUT    /api/products/:id                # (dono ou admin)
DELETE /api/products/:id                # soft delete

# Carrinho
GET    /api/cart
POST   /api/cart/items
PUT    /api/cart/items/:itemId
DELETE /api/cart/items/:itemId

# Pedidos e pagamento
POST   /api/orders/checkout
POST   /api/orders/:id/confirm          # confirmação do pagamento (polling PIX)
GET    /api/orders/mine
GET    /api/orders/sales
GET    /api/orders/:id/tracking         # timeline do pedido
PATCH  /api/orders/:id/status           # vendedor avança o status

# Avaliações, favoritos, perguntas, cupons
POST   /api/reviews
GET    /api/reviews/seller/:vendedorId
GET    /api/favorites
POST   /api/favorites/:produtoId
GET    /api/products/:id/questions
POST   /api/questions/:id/answer
POST   /api/coupons/validate

# Notificações
GET    /api/notifications
PUT    /api/notifications/:id/read

# Administração
GET    /api/admin/stats
GET    /api/admin/users
PATCH  /api/admin/users/:id/status
GET    /api/admin/coupons
POST   /api/admin/coupons
```

</details>

## Equipe

| Integrante |
|------------|
| Bryan Charles |
| Guilherme Eidam |
| Guilherme Sartori |
| Luis Gustavo |

---

<div align="center">

**Nundinae** - *Ubi Roma negotiatur* 🏛️

</div>
