-- Nundinae - Marketplace Schema
-- Referencia: Diagrama de Classes (Figura 2) e DER (Figura 4)

CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  senha_hash VARCHAR(255) NOT NULL,
  tipo ENUM('comprador', 'vendedor', 'ambos', 'admin') NOT NULL DEFAULT 'ambos',
  reputacao DECIMAL(3,2) NOT NULL DEFAULT 0.00,
  total_avaliacoes INT NOT NULL DEFAULT 0,
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  -- Perfil do usuário (extensão ao modelo da doc; foto via Cloudinary ou base64 de fallback)
  avatar_url TEXT,
  telefone VARCHAR(20),
  bio VARCHAR(280),
  -- Endereço reutilizável (pré-preenche o checkout)
  endereco_cep VARCHAR(9),
  endereco_logradouro VARCHAR(150),
  endereco_numero VARCHAR(20),
  endereco_complemento VARCHAR(100),
  endereco_bairro VARCHAR(100),
  endereco_cidade VARCHAR(100),
  endereco_estado VARCHAR(2),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS produtos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  vendedor_id INT NOT NULL,
  nome VARCHAR(200) NOT NULL,
  descricao TEXT,
  preco DECIMAL(10,2) NOT NULL,
  imagem VARCHAR(500),
  estoque INT NOT NULL DEFAULT 0,
  categoria VARCHAR(100) NOT NULL,
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (vendedor_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  INDEX idx_vendedor (vendedor_id),
  INDEX idx_categoria (categoria),
  INDEX idx_ativo (ativo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS carrinhos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL UNIQUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS itens_carrinho (
  id INT AUTO_INCREMENT PRIMARY KEY,
  carrinho_id INT NOT NULL,
  produto_id INT NOT NULL,
  quantidade INT NOT NULL DEFAULT 1,
  preco_unitario DECIMAL(10,2) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (carrinho_id) REFERENCES carrinhos(id) ON DELETE CASCADE,
  FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE,
  UNIQUE KEY unique_carrinho_produto (carrinho_id, produto_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS pedidos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  status ENUM('pendente', 'pago', 'cancelado', 'entregue') NOT NULL DEFAULT 'pendente',
  -- Snapshot do endereço de entrega usado no checkout
  entrega_cep VARCHAR(9),
  entrega_logradouro VARCHAR(150),
  entrega_numero VARCHAR(20),
  entrega_complemento VARCHAR(100),
  entrega_bairro VARCHAR(100),
  entrega_cidade VARCHAR(100),
  entrega_estado VARCHAR(2),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  INDEX idx_usuario (usuario_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS itens_pedido (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pedido_id INT NOT NULL,
  produto_id INT NOT NULL,
  vendedor_id INT NOT NULL,
  quantidade INT NOT NULL,
  preco_unitario DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
  FOREIGN KEY (produto_id) REFERENCES produtos(id),
  FOREIGN KEY (vendedor_id) REFERENCES usuarios(id),
  INDEX idx_pedido (pedido_id),
  INDEX idx_vendedor (vendedor_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS pagamentos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pedido_id INT NOT NULL UNIQUE,
  valor DECIMAL(10,2) NOT NULL,
  status ENUM('pendente', 'aprovado', 'recusado') NOT NULL DEFAULT 'pendente',
  metodo ENUM('cartao', 'pix', 'boleto') NOT NULL,
  data_pagamento DATETIME,
  FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS avaliacoes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pedido_id INT NOT NULL,
  avaliador_id INT NOT NULL,
  avaliado_id INT NOT NULL,
  nota TINYINT NOT NULL,
  comentario TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
  FOREIGN KEY (avaliador_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (avaliado_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  CONSTRAINT chk_nota CHECK (nota BETWEEN 1 AND 5),
  UNIQUE KEY unique_avaliacao (pedido_id, avaliador_id, avaliado_id),
  INDEX idx_avaliado (avaliado_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Lista de desejos (favoritos): produtos marcados por um usuário.
CREATE TABLE IF NOT EXISTS favoritos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  produto_id INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE,
  UNIQUE KEY unique_favorito (usuario_id, produto_id),
  INDEX idx_fav_usuario (usuario_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Notificações in-app (pedido pago, nova venda, avaliação, pergunta, etc).
CREATE TABLE IF NOT EXISTS notificacoes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  tipo VARCHAR(40) NOT NULL,
  titulo VARCHAR(150) NOT NULL,
  mensagem VARCHAR(300),
  link VARCHAR(200),
  lida TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  INDEX idx_notif_usuario (usuario_id, lida)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Perguntas e respostas no anúncio (comprador pergunta, vendedor responde).
CREATE TABLE IF NOT EXISTS perguntas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  produto_id INT NOT NULL,
  autor_id INT NOT NULL,
  pergunta VARCHAR(500) NOT NULL,
  resposta VARCHAR(500),
  respondida_em DATETIME,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE,
  FOREIGN KEY (autor_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  INDEX idx_perg_produto (produto_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Cupons de desconto (criados pelo admin, aplicados no checkout).
CREATE TABLE IF NOT EXISTS cupons (
  id INT AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(40) NOT NULL UNIQUE,
  tipo ENUM('percentual', 'fixo') NOT NULL,
  valor DECIMAL(10,2) NOT NULL,
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  validade DATE,
  usos_max INT,
  usos INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_cupom_valor CHECK (valor > 0),
  INDEX idx_cupom_codigo (codigo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Rastreamento do pedido: histórico de status (timeline estilo Mercado Livre).
-- Alimentado automaticamente por trigger a cada mudança de status do pedido.
CREATE TABLE IF NOT EXISTS pedido_eventos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pedido_id INT NOT NULL,
  status VARCHAR(20) NOT NULL,
  descricao VARCHAR(200),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
  INDEX idx_evt_pedido (pedido_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
