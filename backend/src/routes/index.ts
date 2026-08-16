import { Router } from 'express';
import * as auth from '../controllers/auth.controller.js';
import * as users from '../controllers/users.controller.js';
import * as products from '../controllers/products.controller.js';
import * as cart from '../controllers/cart.controller.js';
import * as orders from '../controllers/orders.controller.js';
import * as reviews from '../controllers/reviews.controller.js';
import * as admin from '../controllers/admin.controller.js';
import * as favorites from '../controllers/favorites.controller.js';
import * as notifications from '../controllers/notifications.controller.js';
import * as questions from '../controllers/questions.controller.js';
import * as coupons from '../controllers/coupons.controller.js';
import { authenticate, requireAdmin, requireSeller } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rate-limit.js';

export const router = Router();

// Protege as rotas que criam sessão contra força bruta e cadastro em massa.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Muitas tentativas de autenticação. Aguarde alguns minutos.',
});

router.get('/health', (_req, res) => res.json({ ok: true, service: 'nundinae-api' }));

// Auth
router.post('/auth/register', authLimiter, auth.register);
router.post('/auth/login', authLimiter, auth.login);
router.get('/auth/me', authenticate, auth.me);

// Perfil do usuário (próprios dados)
router.put('/users/me', authenticate, users.updateProfile);
router.put('/users/me/password', authenticate, users.changePassword);
router.post('/users/me/avatar', authenticate, users.avatarUpload.single('avatar'), users.uploadAvatar);
router.delete('/users/me/avatar', authenticate, users.removeAvatar);

// Produtos
router.get('/products', products.list);
router.get('/products/categories', products.categories);
router.get('/products/:id', products.getById);
router.post('/products/image', authenticate, products.productImageUpload.single('imagem'), products.uploadImage);
router.post('/products', authenticate, products.create);
router.put('/products/:id', authenticate, products.update);
router.delete('/products/:id', authenticate, products.remove);

// Perguntas e respostas no anúncio (Q&A)
router.get('/products/:id/questions', questions.listByProduct);
router.post('/products/:id/questions', authenticate, questions.ask);
router.get('/questions/seller', authenticate, questions.listForSeller);
router.post('/questions/:id/answer', authenticate, questions.answer);

// Lista de desejos (favoritos)
router.get('/favorites', authenticate, favorites.list);
router.get('/favorites/ids', authenticate, favorites.listIds);
router.post('/favorites/:produtoId', authenticate, favorites.add);
router.delete('/favorites/:produtoId', authenticate, favorites.remove);

// Notificações in-app
router.get('/notifications', authenticate, notifications.list);
router.put('/notifications/read-all', authenticate, notifications.markAllRead);
router.put('/notifications/:id/read', authenticate, notifications.markRead);

// Cupons de desconto
router.post('/coupons/validate', authenticate, coupons.validate);

// Cupons gerenciados pelo vendedor (cria e administra os próprios)
router.get('/coupons', authenticate, requireSeller, coupons.list);
router.post('/coupons', authenticate, requireSeller, coupons.create);
router.put('/coupons/:id', authenticate, requireSeller, coupons.update);
router.delete('/coupons/:id', authenticate, requireSeller, coupons.remove);

// Carrinho
router.get('/cart', authenticate, cart.get);
router.post('/cart/items', authenticate, cart.add);
router.put('/cart/items/:itemId', authenticate, cart.updateItem);
router.delete('/cart/items/:itemId', authenticate, cart.removeItem);
router.delete('/cart', authenticate, cart.clear);

// Pedidos / checkout
router.get('/payments/mode', orders.paymentMode);
router.post('/orders/checkout', authenticate, orders.checkout);
router.post('/orders/:id/confirm', authenticate, orders.confirm);
router.get('/orders/mine', authenticate, orders.listMine);
router.get('/orders/sales', authenticate, orders.listSales);
router.get('/orders/:id/tracking', authenticate, orders.tracking);
router.patch('/orders/:id/status', authenticate, orders.advanceStatus);

// Avaliações
router.post('/reviews', authenticate, reviews.create);
router.get('/reviews/seller/:vendedorId', reviews.listBySeller);

// Admin (RF09) — todas exigem papel 'admin'
router.get('/admin/stats', authenticate, requireAdmin, admin.stats);
router.get('/admin/users', authenticate, requireAdmin, admin.listUsers);
router.get('/admin/products', authenticate, requireAdmin, admin.listProducts);
router.patch('/admin/users/:id/status', authenticate, requireAdmin, admin.setStatus);
router.patch('/admin/users/:id/tipo', authenticate, requireAdmin, admin.setTipo);
router.delete('/admin/users/:id', authenticate, requireAdmin, admin.removeUser);
