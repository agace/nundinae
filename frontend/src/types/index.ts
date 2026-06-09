export type UserType = 'comprador' | 'vendedor' | 'ambos' | 'admin';

export interface User {
  id: number;
  nome: string;
  email: string;
  tipo: UserType;
  reputacao: number;
  total_avaliacoes?: number;
  avatar_url?: string | null;
  telefone?: string | null;
  bio?: string | null;
  endereco_cep?: string | null;
  endereco_logradouro?: string | null;
  endereco_numero?: string | null;
  endereco_complemento?: string | null;
  endereco_bairro?: string | null;
  endereco_cidade?: string | null;
  endereco_estado?: string | null;
}

export interface AdminProduct {
  id: number;
  nome: string;
  preco: number;
  estoque: number;
  categoria: string;
  imagem: string | null;
  ativo: boolean;
  vendedor_id: number;
  vendedor_nome: string;
  created_at: string;
}

export interface Product {
  id: number;
  vendedor_id: number;
  vendedor_nome: string;
  vendedor_reputacao: number;
  nome: string;
  descricao: string;
  preco: number;
  imagem: string | null;
  estoque: number;
  categoria: string;
  ativo: boolean;
  created_at: string;
}

export interface CartItem {
  id: number;
  produto_id: number;
  produto_nome: string;
  produto_imagem: string | null;
  produto_estoque: number;
  vendedor_id: number;
  vendedor_nome: string;
  quantidade: number;
  preco_unitario: number;
  subtotal: number;
}

export interface Cart {
  items: CartItem[];
  total: number;
}

export interface OrderItem {
  produto_id: number;
  produto_nome: string;
  produto_imagem: string | null;
  vendedor_id: number;
  vendedor_nome: string;
  quantidade: number;
  preco_unitario: number;
}

export type OrderStatus = 'pendente' | 'pago' | 'preparando' | 'enviado' | 'entregue' | 'cancelado';

export interface Order {
  id: number;
  total: number;
  status: OrderStatus;
  created_at: string;
  metodo: 'cartao' | 'pix' | 'boleto' | null;
  pagamento_status: 'pendente' | 'aprovado' | 'recusado' | null;
  cupom_codigo: string | null;
  desconto: number;
  itens: OrderItem[];
}

export interface TrackingEvent {
  status: OrderStatus;
  descricao: string;
  created_at: string;
}

export interface Tracking {
  pedido_id: number;
  status: OrderStatus;
  proximo_status: OrderStatus | null;
  eventos: TrackingEvent[];
}

export interface SaleItem {
  pedido_id: number;
  status: OrderStatus;
  created_at: string;
  comprador_nome: string;
  produto_id: number;
  produto_nome: string;
  produto_imagem: string | null;
  quantidade: number;
  preco_unitario: number;
  subtotal: number;
}

export interface Review {
  id: number;
  nota: number;
  comentario: string;
  created_at: string;
  avaliador_nome: string;
}

export interface Category {
  categoria: string;
  total: number;
}

export interface AdminUser {
  id: number;
  nome: string;
  email: string;
  tipo: UserType;
  ativo: boolean;
  reputacao: number;
  total_avaliacoes: number;
  total_produtos: number;
  total_pedidos: number;
  created_at: string;
}

export interface AdminStats {
  usuarios: number;
  usuarios_bloqueados: number;
  produtos: number;
  produtos_inativos: number;
  pedidos_pagos: number;
  faturamento: number;
}

export interface Notification {
  id: number;
  tipo: string;
  titulo: string;
  mensagem: string | null;
  link: string | null;
  lida: boolean;
  created_at: string;
}

export interface NotificationFeed {
  nao_lidas: number;
  items: Notification[];
}

export interface Question {
  id: number;
  produto_id: number;
  autor_id: number;
  autor_nome: string;
  pergunta: string;
  resposta: string | null;
  respondida_em: string | null;
  created_at: string;
  produto_nome?: string;
}

export interface Coupon {
  id: number;
  codigo: string;
  tipo: 'percentual' | 'fixo';
  valor: number;
  ativo: boolean;
  validade: string | null;
  usos_max: number | null;
  usos: number;
  created_at: string;
}

export interface CouponValidation {
  codigo: string;
  tipo: 'percentual' | 'fixo';
  valor: number;
  desconto: number;
}
