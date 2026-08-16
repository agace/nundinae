import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env.js';

// Sem as três chaves do Cloudinary o upload cai num data-URI base64 guardado
// no próprio banco, para a aplicação rodar sem credenciais. É um fallback de
// demonstração: em produção o Cloudinary deve estar configurado, senão as
// imagens inflam as linhas e as respostas da API.

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

export async function removeAvatar(userId: number): Promise<void> {
  if (!isConfigured()) return;
  try {
    await cloudinary.uploader.destroy(`nundinae/avatars/user_${userId}`);
  } catch {
    // Limpar a coluna no banco já basta para a UX.
  }
}
