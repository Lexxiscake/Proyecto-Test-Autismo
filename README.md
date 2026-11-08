# 🧠 Test AQ-50 Universitario

> Cuestionario de Espectro Autista (Baron-Cohen et al., 2001) — 50 preguntas sobre habilidades sociales, atención, comunicación e imaginación. Con ranking global, gráfica radar y un solo intento por cuenta.

![Vercel](https://img.shields.io/badge/Hosted%20on-Vercel-black?logo=vercel)
![Supabase](https://img.shields.io/badge/Database-Supabase-3ECF8E?logo=supabase)
![JavaScript](https://img.shields.io/badge/Language-JavaScript-F7DF1E?logo=javascript)
![License](https://img.shields.io/badge/License-MIT-purple)

---

## ⚠️ Aviso importante sobre el ranking

> **El ranking de puntajes es una broma entre amigos, no una competencia real.**
>
> Esta app nació como un chiste universitario — nada más. Tener un puntaje alto **no significa** que tengas autismo, y tener uno bajo **no significa** que seas más "normal" que nadie. El espectro autista es un tema serio que merece respeto.
>
> Si tu resultado te genera curiosidad o preocupación, habla con un profesional de salud mental. Este test **no es un diagnóstico clínico**.

<div align="center">
       <img width="600" height="450" alt="image" src="https://github.com/user-attachments/assets/eb9d9f54-026e-4347-a372-9e9c30eeb657" />
</div>

---

## ✨ Características

- 🔐 Registro con correo universitario + contraseña segura
- 📝 Test AQ-50 completo con las 50 preguntas oficiales
- 🔒 **Un solo intento por cuenta** — sin trampas
- 📊 Gráfica radar con resultados por área al finalizar
- 🏅 Ranking global ordenado por puntaje
- 🛡️ Seguridad: rate limiting, RLS, hash con salt, headers HTTP

---

## 🏗️ Cómo está construido

### Arquitectura general

```
Usuario (Navegador)
       │
       ▼
  index.html          ← SPA: toda la UI en un solo archivo HTML + JS vanilla
       │
       ▼
  Vercel (Edge)       ← Hosting estático + API serverless
       │
  ┌────┴────┐
  │  /api   │         ← 4 funciones serverless en Node.js
  └────┬────┘
       │
       ▼
  Supabase            ← PostgreSQL como base de datos
  (PostgreSQL)
```

### Frontend

- **Tecnología:** HTML + CSS + JavaScript vanilla (sin frameworks)
- **Una sola página (SPA):** toda la app vive en `public/index.html`
- **Renderizado:** el JS manipula el DOM directamente con `innerHTML` — sin React, sin Vue
- **Gráfica:** [Chart.js 4.4.1](https://chartjs.org) cargado desde CDN para la gráfica radar de resultados
- **Sin dependencias de frontend:** no hay `node_modules`, no hay bundler, carga instantánea

### Backend (API serverless)

Vercel ejecuta cada archivo de `/api/` como una función serverless independiente:

| Archivo | Método | Descripción |
|---------|--------|-------------|
| `api/register.js` | POST | Crea una nueva cuenta con email y contraseña hasheada |
| `api/login.js` | POST | Autentica al usuario y devuelve su resultado si ya hizo el test |
| `api/submit.js` | POST | Guarda el resultado del test (bloqueado si ya existe uno) |
| `api/ranking.js` | GET | Devuelve el ranking global ordenado por puntaje |

### Base de datos

Supabase provee una base de datos **PostgreSQL** con dos tablas:

```sql
-- Almacena los usuarios registrados
users (
  id uuid PRIMARY KEY,
  name text,
  email text UNIQUE,     -- un correo = una cuenta
  password_hash text,    -- hash con 10,000 iteraciones + salt
  salt text,             -- único por usuario
  created_at timestamptz
)

-- Almacena el resultado del test (UNIQUE por user_id = 1 intento)
results (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES users(id),
  score integer,         -- puntaje total (0-50)
  cats integer[],        -- array con puntaje por cada una de las 5 áreas
  created_at timestamptz,
  UNIQUE(user_id)        -- garantiza 1 solo resultado por usuario
)
```

### Flujo completo de la app

```
1. Usuario se registra
        │
        ▼
   register.js valida email, hashea contraseña con salt, guarda en users
        │
        ▼
2. Usuario hace el test (50 preguntas, solo en el frontend)
        │
        ▼
3. Al finalizar → submit.js calcula puntaje y guarda en results
   (si ya existe un resultado para ese user_id, lo rechaza → 1 intento)
        │
        ▼
4. Se muestra resultado + gráfica radar (Chart.js)
        │
        ▼
5. Usuario puede ver el ranking → ranking.js devuelve todos los resultados
   ordenados por score DESC
```

### Puntuación del AQ-50

Cada pregunta tiene una dirección (`rev: true/false`):
- Preguntas normales: puntúan 1 si el usuario **está de acuerdo**
- Preguntas invertidas (`rev: true`): puntúan 1 si el usuario **está en desacuerdo**

Las preguntas se agrupan en 5 áreas:
| # | Área | Descripción |
|---|------|-------------|
| 0 | Social | Habilidades e interés social |
| 1 | Atención al detalle | Foco en detalles y patrones |
| 2 | Rutinas | Preferencia por rutinas y orden |
| 3 | Imaginación | Capacidad de imaginar y hacer rol |
| 4 | Datos/Números | Tendencia a memorizar y coleccionar datos |

---

## 🚀 Cómo desplegarlo (gratis)

### Paso 1 — Base de datos en Supabase

1. Crea una cuenta en [supabase.com](https://supabase.com) con GitHub
2. Crea un nuevo proyecto (cualquier nombre, región US East)
3. Ve a **SQL Editor → New query** y ejecuta:

```sql
create table users (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  email text unique not null,
  password_hash text not null,
  salt text,
  created_at timestamptz default now()
);

create table results (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id) on delete cascade,
  score integer not null,
  cats integer[] not null,
  created_at timestamptz default now(),
  unique(user_id)
);

create index on results(score desc);

alter table users enable row level security;
alter table results enable row level security;
create policy "Bloquear acceso publico users" on users for all using (false);
create policy "Bloquear acceso publico results" on results for all using (false);
```

4. Ve a **Settings → API Keys** y copia:
   - `Project URL` → tu `SUPABASE_URL`
   - `Secret key` (sb_secret_...) → tu `SUPABASE_SERVICE_KEY`

---

### Paso 2 — Subir a GitHub

1. Crea un repositorio en [github.com](https://github.com)
2. Sube el **contenido** de la carpeta `aq50-app/` a la raíz del repo
3. Verifica que se vean directamente: `api/`, `public/`, `package.json`, `vercel.json`

---

### Paso 3 — Deploy en Vercel

1. Crea una cuenta en [vercel.com](https://vercel.com) con GitHub
2. Click en **Add New Project** → importa tu repo
3. Agrega las **Environment Variables**:

| Variable | Valor |
|----------|-------|
| `SUPABASE_URL` | Tu Project URL de Supabase |
| `SUPABASE_SERVICE_KEY` | Tu secret key de Supabase |

4. Click en **Deploy** 🚀

---

## 🔐 Seguridad implementada

- Contraseñas hasheadas con 10,000 iteraciones SHA-256 + salt único por usuario
- Rate limiting: máx 5 intentos de login fallidos por minuto por IP
- Row Level Security (RLS) en Supabase
- Variables de entorno en Vercel — claves fuera del código
- Validación estricta de todos los inputs en el servidor
- Headers HTTP: `HSTS`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`
- HTTPS automático vía Vercel

---

## 📚 Referencia

Baron-Cohen, S., Wheelwright, S., Skinner, R., Martin, J., & Clubley, E. (2001). *The Autism-Spectrum Quotient (AQ): Evidence from Asperger Syndrome/High-Functioning Autism, Males and Females, Scientists and Mathematicians.* Journal of Autism and Developmental Disorders, 31(1), 5–17.

---
<div align="center">
*Hecho con 💜 como broma en la escuela o((>ω< ))o. Trátalo como tal.*
       
</div>
<div align="center">
       <img width="368" height="368" alt="image" src="https://github.com/user-attachments/assets/d827a6be-ec4d-4e9a-9df5-da44c832b6e5" />
</div>


