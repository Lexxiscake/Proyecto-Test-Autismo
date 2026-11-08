# Test AQ-50 Universitario

Cuestionario de Espectro Autista (Baron-Cohen et al., 2001) — 50 preguntas sobre habilidades sociales, atención, comunicación e imaginación. Con ranking global, gráfica radar y un solo intento por cuenta.

[![Vercel](https://img.shields.io/badge/Hosted%20on-Vercel-black?logo=vercel)](https://vercel.com)
[![Supabase](https://img.shields.io/badge/Database-Supabase-3ECF8E?logo=supabase)](https://supabase.com)
[![JavaScript](https://img.shields.io/badge/Language-JavaScript-F7DF1E?logo=javascript)](https://developer.mozilla.org)
[![License](https://img.shields.io/badge/License-MIT-purple)](LICENSE)

---

## Aviso importante sobre el ranking

El ranking de puntajes es una referencia interna entre usuarios, no una competencia real.

Esta aplicación nace como un proyecto universitario. Tener un puntaje alto **no significa** que se tenga autismo, y tener uno bajo **no significa** ser más "normal" que nadie. El espectro autista es un tema serio que merece respeto.

Si un resultado genera curiosidad o preocupación, se recomienda hablar con un profesional de salud mental. Este test **no es un diagnóstico clínico**.

---

## Características

- Registro con correo universitario y contraseña segura
- Test AQ-50 completo con las 50 preguntas oficiales
- Un solo intento por cuenta, sin posibilidad de repetir
- Gráfica radar con resultados por área al finalizar
- Ranking global ordenado por puntaje
- Seguridad: rate limiting, RLS, hash con salt, cabeceras HTTP

---

## Arquitectura

```text
Usuario (Navegador)
       |
       v
  index.html      SPA: interfaz en un solo archivo HTML + JavaScript vanilla
       |
       v
  Vercel (Edge)   Hosting estático + funciones serverless
       |
   +----+----+
   |  /api   |  4 funciones serverless en Node.js
   +----+----+
        |
        v
  Supabase        PostgreSQL como base de datos
  (PostgreSQL)
```

### Frontend

- Tecnología: HTML, CSS y JavaScript vanilla (sin frameworks)
- Una sola página (SPA): toda la aplicación vive en `public/index.html`
- Renderizado: manipulación directa del DOM con JavaScript
- Gráfica: Chart.js 4.4.1 cargado desde CDN para la gráfica radar
- Sin dependencias de frontend: no hay `node_modules`, no hay bundler

### Backend (API serverless)

Vercel ejecuta cada archivo de `/api/` como una función serverless independiente:

| Archivo | Método | Descripción |
|---------|--------|-------------|
| `api/register.js` | POST | Crea una cuenta con correo y contraseña hasheada |
| `api/login.js` | POST | Autentica al usuario y devuelve su resultado si ya hizo el test |
| `api/submit.js` | POST | Guarda el resultado del test (bloqueado si ya existe uno) |
| `api/ranking.js` | GET | Devuelve el ranking global ordenado por puntaje |
| `api/update-major.js` | POST | Actualiza la carrera universitaria del usuario |

### Base de datos

Supabase provee una base de datos PostgreSQL con dos tablas:

```sql
-- Almacena los usuarios registrados
users (
  id uuid PRIMARY KEY,
  name text,
  email text UNIQUE,
  password_hash text,
  salt text,
  created_at timestamptz
)

-- Almacena el resultado del test (UNIQUE por user_id = 1 intento)
results (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES users(id),
  score integer,
  cats integer[],
  created_at timestamptz,
  UNIQUE(user_id)
)
```

### Flujo completo de la aplicación

1. El usuario se registra
2. `register.js` valida el correo, hashea la contraseña con salt y guarda en `users`
3. El usuario realiza el test (50 preguntas, solo en el frontend)
4. Al finalizar, `submit.js` calcula el puntaje y lo guarda en `results` (si ya existe un resultado para ese usuario, lo rechaza: un solo intento)
5. Se muestra el resultado con la gráfica radar (Chart.js)
6. El usuario puede ver el ranking: `ranking.js` devuelve todos los resultados ordenados por puntaje descendente

---

## Puntuación del AQ-50

Cada pregunta tiene una dirección (`rev: true/false`):

- Preguntas normales: puntúan 1 si el usuario está de acuerdo
- Preguntas invertidas (`rev: true`): puntúan 1 si el usuario está en desacuerdo

Las preguntas se agrupan en cinco áreas:

| # | Área | Descripción |
|---|------|-------------|
| 0 | Social | Habilidades e interés social |
| 1 | Atención al detalle | Foco en detalles y patrones |
| 2 | Rutinas | Preferencia por rutinas y orden |
| 3 | Imaginación | Capacidad de imaginar y hacer rol |
| 4 | Datos/Números | Tendencia a memorizar y coleccionar datos |

---

## Despliegue (gratis)

### Paso 1 — Base de datos en Supabase

1. Crea una cuenta en [supabase.com](https://supabase.com)
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

### Paso 2 — Subir a GitHub

1. Crea un repositorio en [github.com](https://github.com)
2. Sube el contenido de la carpeta a la raíz del repositorio
3. Verifica que se vean directamente: `api/`, `public/`, `package.json`, `vercel.json`

### Paso 3 — Despliegue en Vercel

1. Crea una cuenta en [vercel.com](https://vercel.com)
2. Clic en **Add New Project** e importa tu repositorio
3. Agrega las **Variables de Entorno**:

| Variable | Valor |
|----------|-------|
| `SUPABASE_URL` | Tu Project URL de Supabase |
| `SUPABASE_SERVICE_KEY` | Tu secret key de Supabase |

4. Clic en **Desplegar**

---

## Seguridad implementada

- Contraseñas hasheadas con 10,000 iteraciones SHA-256 + salt único por usuario
- Rate limiting: máximo 5 intentos de login fallidos por minuto por IP
- Row Level Security (RLS) en Supabase
- Variables de entorno en Vercel: claves fuera del código
- Validación estricta de todos los inputs en el servidor
- Cabeceras HTTP: `HSTS`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`
- HTTPS automático vía Vercel

---

## Licencia

Este proyecto está bajo la Licencia MIT. Consulta el archivo `LICENSE` para más detalles.

---

<div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; text-align: center;">
  Proyecto Test AQ-50 Universitario — Documentación técnica
</div>