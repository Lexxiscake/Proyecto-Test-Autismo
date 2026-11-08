import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const { user_id, score, cats } = req.body || {};

  // Validación estricta
  if (!user_id || typeof user_id !== 'string') return res.status(400).json({ error: 'Datos inválidos' });
  if (typeof score !== 'number' || score < 0 || score > 50 || !Number.isInteger(score))
    return res.status(400).json({ error: 'Puntaje inválido' });
  if (!Array.isArray(cats) || cats.length !== 5 || cats.some(c => typeof c !== 'number' || c < 0 || !Number.isInteger(c)))
    return res.status(400).json({ error: 'Categorías inválidas' });

  // Verificar que el usuario existe
  const { data: user } = await supabase.from('users').select('id').eq('id', user_id).single();
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

  // Verificar que no haya hecho el test ya (doble check servidor)
  const { data: existing } = await supabase.from('results').select('id').eq('user_id', user_id).single();
  if (existing) return res.status(409).json({ error: 'Ya completaste el test. Solo se permite un intento.' });

  const { data, error } = await supabase
    .from('results')
    .insert({ user_id, score, cats })
    .select()
    .single();

  if (error) return res.status(500).json({ error: 'Error guardando resultado' });

  return res.status(200).json({ result: data });
}
