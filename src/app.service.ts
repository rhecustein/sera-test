import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getDashboardHtml(): string {
    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>SERA Backend Dashboard</title>
  <style>
    :root {
      --bg: #f5f7fb;
      --surface: #ffffff;
      --surface-2: #f8fafc;
      --text: #0f172a;
      --muted: #64748b;
      --line: #e2e8f0;
      --accent: #2563eb;
      --accent-soft: #eff6ff;
      --good: #0f766e;
      --shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
    }

    * { box-sizing: border-box; }
    html, body { margin: 0; min-height: 100%; }
    body {
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.5;
    }

    a { color: inherit; text-decoration: none; }

    .wrap {
      width: min(1180px, calc(100% - 32px));
      margin: 0 auto;
      padding: 28px 0 40px;
    }

    .shell {
      border: 1px solid var(--line);
      border-radius: 20px;
      background: var(--surface);
      box-shadow: var(--shadow);
      overflow: hidden;
    }

    .topbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      padding: 22px 24px;
      border-bottom: 1px solid var(--line);
      background: var(--surface);
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 14px;
      min-width: 0;
    }

    .mark {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      display: grid;
      place-items: center;
      background: var(--accent-soft);
      border: 1px solid #dbeafe;
      color: var(--accent);
      font-weight: 800;
      letter-spacing: 0.08em;
    }

    .brand h1 {
      margin: 0;
      font-size: 1.02rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .brand p {
      margin: 2px 0 0;
      color: var(--muted);
      font-size: 0.92rem;
    }

    .pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 14px;
      border-radius: 999px;
      border: 1px solid #cbd5e1;
      background: #f8fafc;
      color: #334155;
      font-size: 0.88rem;
      white-space: nowrap;
    }

    .hero {
      padding: 40px 24px 26px;
      display: grid;
      grid-template-columns: 1.4fr 0.9fr;
      gap: 22px;
      align-items: start;
    }

    .hero h2 {
      margin: 0;
      font-size: clamp(1.9rem, 3vw, 2.8rem);
      line-height: 1.02;
      letter-spacing: -0.04em;
      max-width: 16ch;
    }

    .hero h2 .accent { color: var(--accent); }

    .hero p {
      margin: 16px 0 0;
      max-width: 64ch;
      color: var(--muted);
      font-size: 1rem;
    }

    .cta-row {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-top: 22px;
    }

    .btn {
      padding: 12px 16px;
      border-radius: 14px;
      border: 1px solid var(--line);
      background: var(--surface);
      transition: border-color 0.15s ease, background 0.15s ease;
      font-size: 0.9rem;
    }

    .btn:hover {
      border-color: #cbd5e1;
      background: #f8fafc;
    }

    .btn.primary {
      background: var(--accent);
      color: #fff;
      border-color: var(--accent);
    }

    .btn.primary:hover { background: #1d4ed8; }

    .panel {
      border: 1px solid var(--line);
      border-radius: 22px;
      background: var(--surface-2);
      padding: 18px;
    }

    .panel h3 {
      margin: 0 0 12px;
      font-size: 0.98rem;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: #334155;
    }

    .stats {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }

    .stat {
      padding: 14px;
      border-radius: 18px;
      background: var(--surface);
      border: 1px solid var(--line);
    }

    .stat span {
      display: block;
      font-size: 0.82rem;
      color: var(--muted);
      margin-bottom: 8px;
    }

    .stat strong {
      display: block;
      font-size: 1.16rem;
      letter-spacing: -0.02em;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(12, minmax(0, 1fr));
      gap: 16px;
      padding: 0 24px 24px;
    }

    .card {
      grid-column: span 4;
      padding: 18px;
      border-radius: 22px;
      border: 1px solid var(--line);
      background: var(--surface);
      min-height: 196px;
    }

    .card h3 { margin: 0 0 10px; font-size: 1.05rem; }
    .card p   { margin: 0; color: var(--muted); font-size: 0.95rem; }

    .route-list {
      list-style: none;
      padding: 0;
      margin: 16px 0 0;
      display: grid;
      gap: 10px;
    }

    .route-list li {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      padding: 11px 12px;
      border-radius: 14px;
      background: #f8fafc;
      border: 1px solid var(--line);
    }

    .route-list code { color: #0f172a; font-size: 0.9rem; }

    .tag { color: var(--good); font-size: 0.85rem; white-space: nowrap; }

    .steps { display: grid; gap: 10px; margin-top: 16px; }

    .step {
      display: flex;
      gap: 12px;
      align-items: flex-start;
      padding: 12px 14px;
      border-radius: 16px;
      background: #f8fafc;
      border: 1px solid var(--line);
    }

    .step b {
      width: 28px;
      height: 28px;
      border-radius: 999px;
      display: grid;
      place-items: center;
      background: var(--accent-soft);
      color: var(--accent);
      flex: none;
      font-size: 0.82rem;
    }

    .step div { color: var(--muted); font-size: 0.92rem; }

    .footer { padding: 0 24px 24px; }

    .footer-inner {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: 14px;
      align-items: center;
      padding: 18px 20px;
      border-radius: 18px;
      border: 1px solid var(--line);
      background: var(--surface);
      color: var(--muted);
      font-size: 0.92rem;
    }

    @media (max-width: 960px) {
      .hero { grid-template-columns: 1fr; }
      .card { grid-column: span 6; }
    }

    @media (max-width: 720px) {
      .wrap { width: min(100% - 18px, 1180px); padding-top: 10px; }
      .shell { border-radius: 20px; }
      .topbar, .hero, .grid, .footer { padding-left: 14px; padding-right: 14px; }
      .card { grid-column: span 12; }
      .stats { grid-template-columns: 1fr; }
      .topbar { align-items: flex-start; flex-direction: column; }
      .hero h2 { max-width: 100%; }
    }
  </style>
</head>
<body>
  <main class="wrap">
    <section class="shell">
      <header class="topbar">
        <div class="brand">
          <div class="mark">S</div>
          <div>
            <h1>SERA Backend Dashboard</h1>
            <p>NestJS API · Port 60010</p>
          </div>
        </div>
        <div class="pill">REST API · Swagger · Health · Metrics</div>
      </header>

      <section class="hero">
        <div>
          <h2><span class="accent">Backend</span> dashboard for the technical test.</h2>
          <p>Landing page untuk quick access ke Swagger, health check, dan metrics. UI management tersedia di Frontend.</p>
          <div class="cta-row">
            <a class="btn primary" href="/api">Open Swagger UI</a>
            <a class="btn" href="/health">Check Health</a>
            <a class="btn" href="/metrics">View Metrics</a>
            <a class="btn" href="http://localhost:3000" target="_blank">Open Frontend →</a>
          </div>
        </div>

        <aside class="panel">
          <h3>System Snapshot</h3>
          <div class="stats">
            <div class="stat">
              <span>Auth</span>
              <strong>JWT + RBAC</strong>
            </div>
            <div class="stat">
              <span>Products</span>
              <strong>CRUD + Search</strong>
            </div>
            <div class="stat">
              <span>Orders</span>
              <strong>Tx + Idempotency</strong>
            </div>
            <div class="stat">
              <span>Async</span>
              <strong>Bull Queue</strong>
            </div>
          </div>
        </aside>
      </section>

      <section class="grid">
        <article class="card">
          <h3>Core Endpoints</h3>
          <p>Entry points untuk testing, debugging, dan QA.</p>
          <ul class="route-list">
            <li><code>GET /api</code><span class="tag">Swagger Docs</span></li>
            <li><code>GET /health</code><span class="tag">DB + Redis</span></li>
            <li><code>GET /metrics</code><span class="tag">Counters</span></li>
          </ul>
        </article>

        <article class="card">
          <h3>What is included</h3>
          <p>Backend dibangun sesuai checklist SERA Technical Test.</p>
          <div class="steps">
            <div class="step"><b>1</b><div>Authentication — register, login, JWT bearer token, RBAC.</div></div>
            <div class="step"><b>2</b><div>Product &amp; order flows dengan validasi dan role-based access.</div></div>
            <div class="step"><b>3</b><div>Async workers — email invoice, activity log, notifikasi via Bull Queue.</div></div>
          </div>
        </article>

        <article class="card">
          <h3>Quick Start</h3>
          <p>Mulai testing dari sini.</p>
          <div class="steps">
            <div class="step"><b>A</b><div>Buka Frontend → Login dengan akun admin atau customer.</div></div>
            <div class="step"><b>B</b><div>Atau buka Swagger UI → Authorize dengan JWT dari /auth/login.</div></div>
            <div class="step"><b>C</b><div>Cek Health dulu, lalu jalankan flow product dan order.</div></div>
          </div>
        </article>
      </section>

      <footer class="footer">
        <div class="footer-inner">
          <span>Built with NestJS · TypeScript · PostgreSQL · Redis · Bull Queue</span>
          <span>Frontend UI: <a href="http://localhost:3000" style="color:var(--accent)">localhost:3000</a> &nbsp;|&nbsp; Swagger: <a href="/api" style="color:var(--accent)">/api</a></span>
        </div>
      </footer>
    </section>
  </main>
</body>
</html>`;
  }
}
