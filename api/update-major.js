import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const { user_id, major } = req.body || {};
  if (!user_id || !major) return res.status(400).json({ error: 'Faltan datos' });

  const cleanMajor = String(major).trim().slice(0, 100);
  const { error } = await supabase.from('users').update({ major: cleanMajor }).eq('id', user_id);
  if (error) return res.status(500).json({ error: 'Error guardando carrera' });

  return res.status(200).json({ ok: true });
}
