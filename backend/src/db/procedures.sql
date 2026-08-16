-- Nundinae — Regras de negócio no banco de dados
-- Triggers e stored procedures que garantem RN003, RN004, RN005, RN006 e RF07
-- independentemente da aplicacao. Cada statement e separado por um marcador
-- proprio (ver migrate.ts), executado um a um para nao depender de DELIMITER.

-- ----------------------------------------------------------------------------
-- Limpeza (idempotente)
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_carrinho_rn003
-- @SPLIT@
DROP TRIGGER IF EXISTS trg_carrinho_estoque_upd
-- @SPLIT@
DROP TRIGGER IF EXISTS trg_avaliacao_rn005
-- @SPLIT@
DROP TRIGGER IF EXISTS trg_avaliacao_ai
-- @SPLIT@
DROP TRIGGER IF EXISTS trg_avaliacao_au
-- @SPLIT@
DROP TRIGGER IF EXISTS trg_avaliacao_ad
-- @SPLIT@
DROP TRIGGER IF EXISTS trg_pagamento_rn004
-- @SPLIT@
DROP TRIGGER IF EXISTS trg_pagamento_rn004_upd
-- @SPLIT@
DROP PROCEDURE IF EXISTS sp_recalc_reputacao
-- @SPLIT@
DROP PROCEDURE IF EXISTS sp_checkout
-- @SPLIT@
DROP PROCEDURE IF EXISTS sp_criar_pedido_pendente
-- @SPLIT@
DROP PROCEDURE IF EXISTS sp_confirmar_pagamento
-- @SPLIT@
DROP TRIGGER IF EXISTS trg_pedido_evento_ai
-- @SPLIT@
DROP TRIGGER IF EXISTS trg_pedido_evento_au
-- @SPLIT@
DROP TRIGGER IF EXISTS trg_avaliacao_notif
-- @SPLIT@
DROP FUNCTION IF EXISTS fn_status_descricao
-- @SPLIT@

-- ----------------------------------------------------------------------------
-- RN003 — Vendedor não pode comprar o próprio produto.
-- Também valida disponibilidade e estoque ao inserir no carrinho.
-- ----------------------------------------------------------------------------
CREATE TRIGGER trg_carrinho_rn003
BEFORE INSERT ON itens_carrinho
FOR EACH ROW
BEGIN
  DECLARE v_vendedor INT;
  DECLARE v_dono INT;
  DECLARE v_estoque INT;
  DECLARE v_ativo TINYINT;

  SELECT vendedor_id, estoque, ativo
    INTO v_vendedor, v_estoque, v_ativo
    FROM produtos WHERE id = NEW.produto_id;

  IF v_vendedor IS NULL OR v_ativo = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Produto indisponível';
  END IF;

  SELECT usuario_id INTO v_dono FROM carrinhos WHERE id = NEW.carrinho_id;

  IF v_vendedor = v_dono THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Você não pode comprar seu próprio produto (RN003)';
  END IF;

  IF NEW.quantidade > v_estoque THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Estoque insuficiente';
  END IF;
END
-- @SPLIT@

-- Revalida estoque quando a quantidade do item é alterada.
CREATE TRIGGER trg_carrinho_estoque_upd
BEFORE UPDATE ON itens_carrinho
FOR EACH ROW
BEGIN
  DECLARE v_estoque INT;
  SELECT estoque INTO v_estoque FROM produtos WHERE id = NEW.produto_id;
  IF NEW.quantidade > v_estoque THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Estoque insuficiente';
  END IF;
END
-- @SPLIT@

-- ----------------------------------------------------------------------------
-- RN005 — Avaliação só pode ocorrer após pedido pago/entregue, pelo dono do
-- pedido, e o vendedor avaliado precisa ter participado do pedido.
-- (RN006 — nota entre 1 e 5 — já é garantido pela CHECK constraint chk_nota.)
-- ----------------------------------------------------------------------------
CREATE TRIGGER trg_avaliacao_rn005
BEFORE INSERT ON avaliacoes
FOR EACH ROW
BEGIN
  DECLARE v_status VARCHAR(20);
  DECLARE v_dono INT;
  DECLARE v_participou INT;

  SELECT status, usuario_id INTO v_status, v_dono
    FROM pedidos WHERE id = NEW.pedido_id;

  IF v_dono IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Pedido não encontrado';
  END IF;

  IF v_dono <> NEW.avaliador_id THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Pedido não pertence ao usuário';
  END IF;

  IF v_status NOT IN ('pago', 'entregue') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Só é possível avaliar pedidos pagos (RN005)';
  END IF;

  SELECT COUNT(*) INTO v_participou
    FROM itens_pedido
   WHERE pedido_id = NEW.pedido_id AND vendedor_id = NEW.avaliado_id;

  IF v_participou = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Vendedor não participou deste pedido';
  END IF;
END
-- @SPLIT@

-- ----------------------------------------------------------------------------
-- RF07 — Reputação do vendedor = média das notas. Recalculada automaticamente
-- a cada inserção/alteração/remoção de avaliação.
-- ----------------------------------------------------------------------------
CREATE PROCEDURE sp_recalc_reputacao(IN p_avaliado INT)
BEGIN
  UPDATE usuarios
     SET reputacao = COALESCE((SELECT AVG(nota) FROM avaliacoes WHERE avaliado_id = p_avaliado), 0),
         total_avaliacoes = (SELECT COUNT(*) FROM avaliacoes WHERE avaliado_id = p_avaliado)
   WHERE id = p_avaliado;
END
-- @SPLIT@

CREATE TRIGGER trg_avaliacao_ai
AFTER INSERT ON avaliacoes
FOR EACH ROW
BEGIN
  CALL sp_recalc_reputacao(NEW.avaliado_id);
END
-- @SPLIT@

CREATE TRIGGER trg_avaliacao_au
AFTER UPDATE ON avaliacoes
FOR EACH ROW
BEGIN
  CALL sp_recalc_reputacao(NEW.avaliado_id);
END
-- @SPLIT@

CREATE TRIGGER trg_avaliacao_ad
AFTER DELETE ON avaliacoes
FOR EACH ROW
BEGIN
  CALL sp_recalc_reputacao(OLD.avaliado_id);
END
-- @SPLIT@

-- Notificação in-app quando o vendedor recebe uma avaliação (regra no banco).
CREATE TRIGGER trg_avaliacao_notif
AFTER INSERT ON avaliacoes
FOR EACH ROW
BEGIN
  INSERT INTO notificacoes (usuario_id, tipo, titulo, mensagem, link)
  VALUES (
    NEW.avaliado_id,
    'avaliacao',
    'Você recebeu uma nova avaliação',
    CONCAT('Nota ', NEW.nota, ' de 5 em um dos seus produtos.'),
    '/vendas'
  );
END
-- @SPLIT@

-- ----------------------------------------------------------------------------
-- Rastreamento do pedido (estilo Mercado Livre): cada mudança de status do
-- pedido vira um evento na timeline (pedido_eventos) e uma notificação para o
-- comprador. Tudo no banco — independe da camada de aplicação.
-- ----------------------------------------------------------------------------
-- Descrição amigável de cada status (usada nos eventos e notificações).
CREATE FUNCTION fn_status_descricao(p_status VARCHAR(20))
RETURNS VARCHAR(200) DETERMINISTIC
BEGIN
  RETURN CASE p_status
    WHEN 'pendente'   THEN 'Pedido criado, aguardando pagamento'
    WHEN 'pago'       THEN 'Pagamento aprovado'
    WHEN 'preparando' THEN 'Pedido em preparação pelo vendedor'
    WHEN 'enviado'    THEN 'Pedido enviado, a caminho'
    WHEN 'entregue'   THEN 'Pedido entregue'
    WHEN 'cancelado'  THEN 'Pedido cancelado'
    ELSE 'Status atualizado'
  END;
END
-- @SPLIT@

CREATE TRIGGER trg_pedido_evento_ai
AFTER INSERT ON pedidos
FOR EACH ROW
BEGIN
  INSERT INTO pedido_eventos (pedido_id, status, descricao)
  VALUES (NEW.id, NEW.status, fn_status_descricao(NEW.status));
END
-- @SPLIT@

CREATE TRIGGER trg_pedido_evento_au
AFTER UPDATE ON pedidos
FOR EACH ROW
BEGIN
  IF NEW.status <> OLD.status THEN
    INSERT INTO pedido_eventos (pedido_id, status, descricao)
    VALUES (NEW.id, NEW.status, fn_status_descricao(NEW.status));

    INSERT INTO notificacoes (usuario_id, tipo, titulo, mensagem, link)
    VALUES (
      NEW.usuario_id,
      'pedido',
      CONCAT('Pedido #', NEW.id, ': ', fn_status_descricao(NEW.status)),
      fn_status_descricao(NEW.status),
      '/pedidos'
    );
  END IF;
END
-- @SPLIT@

-- ----------------------------------------------------------------------------
-- RN004 — Estoque é decrementado quando o pagamento é aprovado.
-- Como regra de banco: dispara ao registrar um pagamento 'aprovado'.
-- ----------------------------------------------------------------------------
CREATE TRIGGER trg_pagamento_rn004
AFTER INSERT ON pagamentos
FOR EACH ROW
BEGIN
  IF NEW.status = 'aprovado' THEN
    UPDATE produtos p
      JOIN itens_pedido ip ON ip.produto_id = p.id
       SET p.estoque = p.estoque - ip.quantidade
     WHERE ip.pedido_id = NEW.pedido_id;
  END IF;
END
-- @SPLIT@

-- Mesma regra para pagamentos confirmados depois (fluxo Mercado Pago):
-- o estoque é decrementado quando o status passa a 'aprovado'.
CREATE TRIGGER trg_pagamento_rn004_upd
AFTER UPDATE ON pagamentos
FOR EACH ROW
BEGIN
  IF NEW.status = 'aprovado' AND OLD.status <> 'aprovado' THEN
    UPDATE produtos p
      JOIN itens_pedido ip ON ip.produto_id = p.id
       SET p.estoque = p.estoque - ip.quantidade
     WHERE ip.pedido_id = NEW.pedido_id;
  END IF;
END
-- @SPLIT@

-- ----------------------------------------------------------------------------
-- Checkout (RF05) encapsulado no banco. Valida carrinho/estoque, cria pedido,
-- itens e pagamento. O decremento de estoque é feito pelo trigger RN004 acima.
-- ----------------------------------------------------------------------------
CREATE PROCEDURE sp_checkout(
  IN p_usuario INT,
  IN p_metodo VARCHAR(10),
  IN p_simular_falha TINYINT,
  IN p_cupom VARCHAR(40),
  IN p_desconto DECIMAL(10,2)
)
BEGIN
  DECLARE v_carrinho INT;
  DECLARE v_total DECIMAL(10,2);
  DECLARE v_total_final DECIMAL(10,2);
  DECLARE v_desconto DECIMAL(10,2);
  DECLARE v_pedido INT;
  DECLARE v_aprovado TINYINT;
  DECLARE v_status_pedido VARCHAR(20);
  DECLARE v_status_pag VARCHAR(20);
  DECLARE v_falta INT;

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;

  SELECT id INTO v_carrinho FROM carrinhos WHERE usuario_id = p_usuario;
  IF v_carrinho IS NULL
     OR (SELECT COUNT(*) FROM itens_carrinho WHERE carrinho_id = v_carrinho) = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Carrinho vazio';
  END IF;

  -- FOR UPDATE trava as linhas de produtos ate o COMMIT: sem isso dois
  -- checkouts simultaneos leriam o mesmo estoque e ambos passariam na
  -- verificacao, deixando o estoque negativo.
  SELECT COUNT(*) INTO v_falta
    FROM itens_carrinho ic
    JOIN produtos p ON p.id = ic.produto_id
   WHERE ic.carrinho_id = v_carrinho AND ic.quantidade > p.estoque
   FOR UPDATE;
  IF v_falta > 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Estoque insuficiente para um ou mais itens';
  END IF;

  SELECT COALESCE(SUM(ic.preco_unitario * ic.quantidade), 0) INTO v_total
    FROM itens_carrinho ic WHERE ic.carrinho_id = v_carrinho;

  -- Desconto do cupom nunca passa do total do pedido.
  SET v_desconto = LEAST(COALESCE(p_desconto, 0), v_total);
  SET v_total_final = v_total - v_desconto;

  SET v_aprovado = IF(p_simular_falha = 1, 0, 1);
  SET v_status_pedido = IF(v_aprovado = 1, 'pago', 'cancelado');
  SET v_status_pag = IF(v_aprovado = 1, 'aprovado', 'recusado');

  INSERT INTO pedidos (usuario_id, total, status, cupom_codigo, desconto)
  VALUES (p_usuario, v_total_final, v_status_pedido, p_cupom, v_desconto);
  SET v_pedido = LAST_INSERT_ID();

  INSERT INTO itens_pedido (pedido_id, produto_id, vendedor_id, quantidade, preco_unitario)
  SELECT v_pedido, ic.produto_id, p.vendedor_id, ic.quantidade, ic.preco_unitario
    FROM itens_carrinho ic
    JOIN produtos p ON p.id = ic.produto_id
   WHERE ic.carrinho_id = v_carrinho;

  -- O trigger trg_pagamento_rn004 decrementa o estoque se aprovado.
  INSERT INTO pagamentos (pedido_id, valor, status, metodo, data_pagamento)
  VALUES (v_pedido, v_total_final, v_status_pag, p_metodo, IF(v_aprovado = 1, NOW(), NULL));

  IF v_aprovado = 1 THEN
    DELETE FROM itens_carrinho WHERE carrinho_id = v_carrinho;
    IF p_cupom IS NOT NULL THEN
      UPDATE cupons SET usos = usos + 1
       WHERE codigo COLLATE utf8mb4_unicode_ci = p_cupom COLLATE utf8mb4_unicode_ci;
    END IF;
  END IF;

  COMMIT;

  SELECT v_pedido AS pedido_id,
         v_status_pedido AS status,
         v_status_pag AS pagamento,
         v_total_final AS total,
         v_desconto AS desconto,
         p_metodo AS metodo;
END
-- @SPLIT@

-- ----------------------------------------------------------------------------
-- Fluxo Mercado Pago: cria o pedido como 'pendente' e o pagamento 'pendente'.
-- O estoque NÃO é mexido aqui — só após a aprovação real (sp_confirmar_pagamento).
-- ----------------------------------------------------------------------------
CREATE PROCEDURE sp_criar_pedido_pendente(
  IN p_usuario INT,
  IN p_metodo VARCHAR(10),
  IN p_cupom VARCHAR(40),
  IN p_desconto DECIMAL(10,2)
)
BEGIN
  DECLARE v_carrinho INT;
  DECLARE v_total DECIMAL(10,2);
  DECLARE v_total_final DECIMAL(10,2);
  DECLARE v_desconto DECIMAL(10,2);
  DECLARE v_pedido INT;
  DECLARE v_falta INT;

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;

  SELECT id INTO v_carrinho FROM carrinhos WHERE usuario_id = p_usuario;
  IF v_carrinho IS NULL
     OR (SELECT COUNT(*) FROM itens_carrinho WHERE carrinho_id = v_carrinho) = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Carrinho vazio';
  END IF;

  -- FOR UPDATE trava as linhas de produtos ate o COMMIT: sem isso dois
  -- checkouts simultaneos leriam o mesmo estoque e ambos passariam na
  -- verificacao, deixando o estoque negativo.
  SELECT COUNT(*) INTO v_falta
    FROM itens_carrinho ic
    JOIN produtos p ON p.id = ic.produto_id
   WHERE ic.carrinho_id = v_carrinho AND ic.quantidade > p.estoque
   FOR UPDATE;
  IF v_falta > 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Estoque insuficiente para um ou mais itens';
  END IF;

  SELECT COALESCE(SUM(ic.preco_unitario * ic.quantidade), 0) INTO v_total
    FROM itens_carrinho ic WHERE ic.carrinho_id = v_carrinho;

  SET v_desconto = LEAST(COALESCE(p_desconto, 0), v_total);
  SET v_total_final = v_total - v_desconto;

  INSERT INTO pedidos (usuario_id, total, status, cupom_codigo, desconto)
  VALUES (p_usuario, v_total_final, 'pendente', p_cupom, v_desconto);
  SET v_pedido = LAST_INSERT_ID();

  INSERT INTO itens_pedido (pedido_id, produto_id, vendedor_id, quantidade, preco_unitario)
  SELECT v_pedido, ic.produto_id, p.vendedor_id, ic.quantidade, ic.preco_unitario
    FROM itens_carrinho ic
    JOIN produtos p ON p.id = ic.produto_id
   WHERE ic.carrinho_id = v_carrinho;

  INSERT INTO pagamentos (pedido_id, valor, status, metodo)
  VALUES (v_pedido, v_total_final, 'pendente', p_metodo);

  COMMIT;

  SELECT v_pedido AS pedido_id, v_total_final AS total, v_desconto AS desconto;
END
-- @SPLIT@

-- ----------------------------------------------------------------------------
-- Confirma (ou recusa) um pagamento pendente conforme o retorno do gateway.
-- Em caso de aprovação: marca pedido/pagamento e o trigger RN004 (UPDATE)
-- decrementa o estoque; o carrinho do comprador é esvaziado.
-- ----------------------------------------------------------------------------
CREATE PROCEDURE sp_confirmar_pagamento(
  IN p_pedido INT,
  IN p_aprovado TINYINT
)
BEGIN
  DECLARE v_usuario INT;
  DECLARE v_carrinho INT;
  DECLARE v_cupom VARCHAR(40);

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;

  SELECT usuario_id, cupom_codigo INTO v_usuario, v_cupom FROM pedidos WHERE id = p_pedido;
  IF v_usuario IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Pedido não encontrado';
  END IF;

  IF p_aprovado = 1 THEN
    UPDATE pagamentos
       SET status = 'aprovado', data_pagamento = NOW()
     WHERE pedido_id = p_pedido;
    UPDATE pedidos SET status = 'pago' WHERE id = p_pedido;

    SELECT id INTO v_carrinho FROM carrinhos WHERE usuario_id = v_usuario;
    IF v_carrinho IS NOT NULL THEN
      DELETE FROM itens_carrinho WHERE carrinho_id = v_carrinho;
    END IF;

    IF v_cupom IS NOT NULL THEN
      UPDATE cupons SET usos = usos + 1
       WHERE codigo COLLATE utf8mb4_unicode_ci = v_cupom COLLATE utf8mb4_unicode_ci;
    END IF;
  ELSE
    UPDATE pagamentos SET status = 'recusado' WHERE pedido_id = p_pedido;
    UPDATE pedidos SET status = 'cancelado' WHERE id = p_pedido;
  END IF;

  COMMIT;

  SELECT p_pedido AS pedido_id,
         (SELECT status FROM pedidos WHERE id = p_pedido) AS status;
END
-- @SPLIT@
