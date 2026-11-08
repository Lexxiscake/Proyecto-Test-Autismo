import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

function privateName(name) {
  if (!name) return 'Anónimo';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0]; // nombre sin apellido, se muestra completo
  // Tiene espacios: mostrar solo primer nombre + inicial del segundo
  return parts[0] + ' ' + parts[1][0] + '.';
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { data, error } = await supabase
    .from('results')
    .select('score, cats, created_at, users(name, email, major)')
    .order('score', { ascending: false })
    .limit(100);

  if (error) return res.status(500).json({ error: 'Error cargando ranking' });

  const ranking = data.map(r => ({
    name: privateName(r.users?.name),       // nombre abreviado para todos
    domain: (r.users?.email || '').split('@')[1] || '',
    major: r.users?.major || null,
    score: r.score,
    cats: r.cats,
    date: r.created_at
  }));

  return res.status(200).json({ ranking });
}
