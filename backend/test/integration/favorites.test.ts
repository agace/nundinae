import { describe, it, expect } from 'vitest';
import { app, request, registerUser, createProduct, bearer } from '../helpers.js';

describe('Favoritos / lista de desejos (integração)', () => {
  it('favorita, lista e desfavorita um produto', async () => {
    const seller = await registerUser('vendedor');
    const prod = await createProduct(seller.token, { nome: 'Vaso Favorito' });
    const buyer = await registerUser('comprador');

    const add = await request(app)
      .post(`/api/favorites/${prod.id}`)
      .set('Authorization', bearer(buyer.token));
    expect(add.status).toBe(201);
    expect(add.body.favorito).toBe(true);

    const ids = await request(app).get('/api/favorites/ids').set('Authorization', bearer(buyer.token));
    expect(ids.body).toContain(prod.id);

    const list = await request(app).get('/api/favorites').set('Authorization', bearer(buyer.token));
    expect(list.body.some((p: { id: number }) => p.id === prod.id)).toBe(true);

    const del = await request(app)
      .delete(`/api/favorites/${prod.id}`)
      .set('Authorization', bearer(buyer.token));
    expect(del.status).toBe(200);

    const ids2 = await request(app).get('/api/favorites/ids').set('Authorization', bearer(buyer.token));
    expect(ids2.body).not.toContain(prod.id);
  });

  it('favoritar duas vezes é idempotente (não duplica)', async () => {
    const seller = await registerUser('vendedor');
    const prod = await createProduct(seller.token);
    const buyer = await registerUser('comprador');

    await request(app).post(`/api/favorites/${prod.id}`).set('Authorization', bearer(buyer.token));
    await request(app).post(`/api/favorites/${prod.id}`).set('Authorization', bearer(buyer.token));

    const ids = await request(app).get('/api/favorites/ids').set('Authorization', bearer(buyer.token));
    expect(ids.body.filter((id: number) => id === prod.id)).toHaveLength(1);
  });

  it('exige autenticação', async () => {
    const res = await request(app).get('/api/favorites');
    expect(res.status).toBe(401);
  });
});
