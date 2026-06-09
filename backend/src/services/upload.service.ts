import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env.js';

/**
 * Armazenamento de imagens (avatar de perfil) via Cloudinary — tecnologia
 * oficial da documentação. Se as 3 chaves não estiverem configuradas,
 * `isConfigured()` retorna false e o upload cai num data-URI base64 guardado
 * no próprio banco — assim a aplicação roda sem credenciais (mesmo padrão
 * graceful do Mercado Pago/SMTP).
 */

export function isConfigured(): boolean {
  return Boolean(env.cloudinary.cloudName && env.cloudinary.apiKey && env.cloudinary.apiSecret);
}

if (isConfigured()) {
  cloudinary.config({
    cloud_name: env.cloudinary.cloudName,
    api_key: env.cloudinary.apiKey,
    api_secret: env.cloudinary.apiSecret,
    secure: true,
  });
}

/**
 * Envia o avatar do usuário. Com Cloudinary configurado, faz o upload e devolve
 * a URL segura (CDN); senão, devolve um data-URI base64 (fallback).
 */
export async function uploadAvatar(
  buffer: Buffer,
  userId: number,
  mimetype: string,
): Promise<string> {
  if (!isConfigured()) {
    return `data:${mimetype};base64,${buffer.toString('base64')}`;
  }

  return new Promise<string>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'nundinae/avatars',
        public_id: `user_${userId}`,
        overwrite: true,
        resource_type: 'image',
        transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }],
      },
      (error, result) => {
        if (error || !result) return reject(error ?? new Error('Falha no upload da imagem'));
        resolve(result.secure_url);
      },
    );
    stream.end(buffer);
  });
}

/**
 * Envia a imagem de um produto. Com Cloudinary configurado devolve a URL do
 * CDN, senão um data-URI base64 (fallback), mesmo padrão do avatar.
 */
export async function uploadProductImage(
  buffer: Buffer,
  mimetype: string,
): Promise<string> {
  if (!isConfigured()) {
    return `data:${mimetype};base64,${buffer.toString('base64')}`;
  }

  return new Promise<string>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'nundinae/products',
        resource_type: 'image',
        transformation: [{ width: 1000, height: 1000, crop: 'limit' }],
      },
      (error, result) => {
        if (error || !result) return reject(error ?? new Error('Falha no upload da imagem'));
        resolve(result.secure_url);
      },
    );
    stream.end(buffer);
  });
}

/** Remove o avatar do Cloudinary (no-op sem credenciais ou no fallback base64). */
export async function removeAvatar(userId: number): Promise<void> {
  if (!isConfigured()) return;
  try {
    await cloudinary.uploader.destroy(`nundinae/avatars/user_${userId}`);
  } catch {
    // Não derruba o fluxo: limpar a coluna no banco já é suficiente para a UX.
  }
}
