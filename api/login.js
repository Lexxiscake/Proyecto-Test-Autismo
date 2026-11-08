import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function hashPassword(password, salt) {
  let h = createHash('sha256').update(password + salt + 'aq50_2024_uni').digest('hex');
  for (let i = 0; i < 10000; i++) h = createHash('sha256').update(h + salt).digest('hex');
  return h;
}

const failedAttempts = new Map();
function checkLoginRateLimit(ip) {
  const now = Date.now(), key = ip || 'unknown';
  const data = failedAttempts.get(key) || { count: 0, first: now };
  if (now - data.first > 60000) { failedAttempts.set(key, { count: 1, first: now }); return true; }
  if (data.count >= 5) return false;
  return true;
}
function recordFailedAttempt(ip) {
  const key = ip || 'unknown', now = Date.now();
  const data = failedAttempts.get(key) || { count: 0, first: now };
  failedAttempts.set(key, { count: data.count + 1, first: data.first });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
  if (!checkLoginRateLimit(ip)) return res.status(429).json({ error: 'Demasiados intentos fallidos. Espera un minuto.' });

  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Faltan campos' });

  const { data: user } = await supabase
    .from('users')
    .select('id, name, email, password_hash, salt, major')
    .eq('email', email.toLowerCase().trim())
    .single();

  if (!user) { recordFailedAttempt(ip); return res.status(401).json({ error: 'Correo o contraseña incorrectos' }); }

  let valid = false;
  if (user.salt) {
    const hash = await hashPassword(password, user.salt);
    valid = hash === user.password_hash;
  } else {
    const oldHash = createHash('sha256').update(password + 'aq50salt2024').digest('hex');
    valid = oldHash === user.password_hash;
  }

  if (!valid) { recordFailedAttempt(ip); return res.status(401).json({ error: 'Correo o contraseña incorrectos' }); }

  const { data: result } = await supabase
    .from('results').select('score, cats, created_at').eq('user_id', user.id).single();

  return res.status(200).json({
    user: { id: user.id, name: user.name, email: user.email, major: user.major || null },
    result: result || null
  });
}
