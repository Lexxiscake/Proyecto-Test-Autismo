import { createClient } from '@supabase/supabase-js';
import { createHash, randomBytes } from 'crypto';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function hashPassword(password, salt) {
  const s = salt || randomBytes(16).toString('hex');
  let h = createHash('sha256').update(password + s + 'aq50_2024_uni').digest('hex');
  for (let i = 0; i < 10000; i++) h = createHash('sha256').update(h + s).digest('hex');
  return { hash: h, salt: s };
}

const attempts = new Map();
function checkRateLimit(ip) {
  const now = Date.now(), key = ip || 'unknown';
  const data = attempts.get(key) || { count: 0, first: now };
  if (now - data.first > 60000) { attempts.set(key, { count: 1, first: now }); return true; }
  if (data.count >= 10) return false;
  attempts.set(key, { ...data, count: data.count + 1 });
  return true;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
  if (!checkRateLimit(ip)) return res.status(429).json({ error: 'Demasiados intentos. Espera un minuto.' });

  const { name, email, password, major } = req.body || {};
  if (!name || !email || !password) return res.status(400).json({ error: 'Faltan campos' });
  if (typeof name !== 'string' || name.length > 100) return res.status(400).json({ error: 'Nombre inválido' });
  if (password.length < 6 || password.length > 128) return res.status(400).json({ error: 'Contraseña inválida (6-128 caracteres)' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return res.status(400).json({ error: 'Correo inválido' });

  const cleanEmail = email.toLowerCase().trim();
  const cleanName = name.trim().replace(/[<>]/g, '');
  const cleanMajor = major ? String(major).trim().slice(0, 100) : null;

  const { data: existing } = await supabase.from('users').select('id').eq('email', cleanEmail).single();
  if (existing) return res.status(409).json({ error: 'Este correo ya está registrado. Inicia sesión.' });

  const { hash, salt } = await hashPassword(password);
  const { data, error } = await supabase
    .from('users')
    .insert({ name: cleanName, email: cleanEmail, password_hash: hash, salt, major: cleanMajor })
    .select('id, name, email, major')
    .single();

  if (error) return res.status(500).json({ error: 'Error creando cuenta' });
  return res.status(200).json({ user: data });
}
