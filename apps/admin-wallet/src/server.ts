import http from "node:http";

const port = Number(process.env.PORT || 8081);

const pageTitle = "zWallet Admin";

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${pageTitle}</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #07111f;
      --panel: rgba(15, 23, 42, 0.88);
      --panel-strong: rgba(17, 24, 39, 0.96);
      --border: rgba(148, 163, 184, 0.22);
      --text: #e5eefb;
      --muted: #8ea3bb;
      --accent: #38bdf8;
      --good: #22c55e;
      --warn: #f59e0b;
      --danger: #fb7185;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background:
        radial-gradient(circle at top left, rgba(56, 189, 248, 0.18), transparent 32rem),
        radial-gradient(circle at bottom right, rgba(34, 197, 94, 0.10), transparent 28rem),
        var(--bg);
      color: var(--text);
    }
    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 1.25rem clamp(1rem, 4vw, 3rem);
      border-bottom: 1px solid var(--border);
      background: rgba(7, 17, 31, 0.78);
      backdrop-filter: blur(16px);
      position: sticky;
      top: 0;
      z-index: 2;
    }
    .brand { display: flex; align-items: center; gap: .8rem; font-weight: 800; letter-spacing: -0.03em; }
    .logo {
      width: 2.5rem;
      height: 2.5rem;
      border-radius: .9rem;
      display: grid;
      place-items: center;
      background: linear-gradient(135deg, var(--accent), var(--good));
      color: #03111f;
      box-shadow: 0 18px 50px rgba(56, 189, 248, .22);
    }
    .pill {
      border: 1px solid var(--border);
      border-radius: 999px;
      padding: .45rem .75rem;
      color: var(--muted);
      background: rgba(15, 23, 42, .64);
      font-size: .85rem;
    }
    main { padding: clamp(1rem, 4vw, 3rem); max-width: 1260px; margin: 0 auto; }
    .hero {
      display: grid;
      grid-template-columns: minmax(0, 1.35fr) minmax(280px, .65fr);
      gap: 1rem;
      align-items: stretch;
      margin-bottom: 1rem;
    }
    .card {
      border: 1px solid var(--border);
      background: var(--panel);
      border-radius: 1.35rem;
      padding: 1.25rem;
      box-shadow: 0 24px 80px rgba(0, 0, 0, .18);
    }
    h1 { font-size: clamp(2rem, 5vw, 4.4rem); line-height: .95; margin: .2rem 0 1rem; letter-spacing: -0.07em; }
    h2 { font-size: 1rem; margin: 0 0 .9rem; color: #dbeafe; }
    p { color: var(--muted); line-height: 1.65; margin: 0; }
    .actions { display: flex; flex-wrap: wrap; gap: .75rem; margin-top: 1.5rem; }
    .button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 2.75rem;
      padding: .75rem 1rem;
      border-radius: .9rem;
      text-decoration: none;
      color: #06111f;
      background: linear-gradient(135deg, var(--accent), var(--good));
      font-weight: 750;
    }
    .button.secondary { color: var(--text); background: rgba(15, 23, 42, .8); border: 1px solid var(--border); }
    .grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 1rem; margin: 1rem 0; }
    .stat strong { display: block; font-size: 1.75rem; letter-spacing: -0.04em; }
    .stat span { color: var(--muted); font-size: .88rem; }
    .two { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .list { display: grid; gap: .75rem; }
    .row { display: flex; justify-content: space-between; align-items: center; gap: 1rem; padding: .8rem; border: 1px solid var(--border); border-radius: .9rem; background: rgba(2, 6, 23, .28); }
    .row b { font-size: .95rem; }
    .status { display: inline-flex; align-items: center; gap: .45rem; color: var(--muted); font-size: .85rem; white-space: nowrap; }
    .dot { width: .55rem; height: .55rem; border-radius: 999px; background: var(--good); box-shadow: 0 0 20px var(--good); }
    .dot.warn { background: var(--warn); box-shadow: 0 0 20px var(--warn); }
    .dot.danger { background: var(--danger); box-shadow: 0 0 20px var(--danger); }
    .terminal { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: .86rem; color: #b7c7dc; white-space: pre-wrap; }
    footer { padding: 2rem clamp(1rem, 4vw, 3rem); color: var(--muted); text-align: center; }
    @media (max-width: 920px) { .hero, .two, .grid { grid-template-columns: 1fr; } header { align-items: flex-start; flex-direction: column; } }
  </style>
</head>
<body>
  <header>
    <div class="brand"><div class="logo">zW</div><div><div>zWallet Admin</div><small style="color:var(--muted)">Production runtime</small></div></div>
    <div class="pill">admin-wallet.zeaz.dev · localhost:8081</div>
  </header>
  <main>
    <section class="hero">
      <div class="card">
        <p>Wallet operations console</p>
        <h1>Admin wallet control plane is online.</h1>
        <p>Monitor wallet services, compliance checks, liquidity routing, swap execution, card flows, and event workers from one operational surface.</p>
        <div class="actions">
          <a class="button" href="/healthz">Health check</a>
          <a class="button secondary" href="#services">Service map</a>
        </div>
      </div>
      <div class="card">
        <h2>Runtime status</h2>
        <div class="list">
          <div class="row"><b>Admin runtime</b><span class="status"><i class="dot"></i> online</span></div>
          <div class="row"><b>Cloudflare Tunnel</b><span class="status"><i class="dot"></i> routed</span></div>
          <div class="row"><b>Zero Trust</b><span class="status"><i class="dot warn"></i> pending</span></div>
          <div class="row"><b>Observability</b><span class="status"><i class="dot warn"></i> next</span></div>
        </div>
      </div>
    </section>

    <section class="grid">
      <div class="card stat"><strong>19</strong><span>workspace projects</span></div>
      <div class="card stat"><strong>8081</strong><span>admin runtime port</span></div>
      <div class="card stat"><strong>200</strong><span>public route status</span></div>
      <div class="card stat"><strong>0</strong><span>placeholder services required</span></div>
    </section>

    <section id="services" class="two">
      <div class="card">
        <h2>Service domains</h2>
        <div class="list">
          <div class="row"><b>wallet-engine</b><span class="status"><i class="dot warn"></i> integrate</span></div>
          <div class="row"><b>swap-engine</b><span class="status"><i class="dot warn"></i> integrate</span></div>
          <div class="row"><b>compliance</b><span class="status"><i class="dot warn"></i> integrate</span></div>
          <div class="row"><b>liquidity</b><span class="status"><i class="dot warn"></i> integrate</span></div>
          <div class="row"><b>event-workers</b><span class="status"><i class="dot warn"></i> integrate</span></div>
        </div>
      </div>
      <div class="card">
        <h2>Operations checklist</h2>
        <div class="terminal">✓ runtime supervised by systemd
✓ public route through Cloudflare Tunnel
✓ /healthz returns JSON
→ add Zero Trust access policy
→ add metrics endpoint
→ wire data services
→ resolve dependency vulnerability report</div>
      </div>
    </section>
  </main>
  <footer>zWallet Admin · production bootstrap UI · replace with authenticated console components next</footer>
</body>
</html>`;

function sendHtml(res: http.ServerResponse): void {
  res.writeHead(200, {
    "content-type": "text/html; charset=utf-8",
    "cache-control": "no-store",
    "x-frame-options": "DENY",
    "x-content-type-options": "nosniff"
  });
  res.end(html);
}

function sendJson(res: http.ServerResponse, status: number, payload: unknown): void {
  res.writeHead(status, {
    "content-type": "application/json",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff"
  });
  res.end(JSON.stringify(payload));
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  if ((req.method === "GET" || req.method === "HEAD") && url.pathname === "/healthz") {
    sendJson(res, 200, { status: "ok", service: "admin-wallet", runtime: "production" });
    return;
  }
  if ((req.method === "GET" || req.method === "HEAD") && url.pathname === "/readyz") {
    sendJson(res, 200, { status: "ready", service: "admin-wallet" });
    return;
  }
  if (req.method !== "GET" && req.method !== "HEAD") {
    sendJson(res, 405, { error: "method_not_allowed" });
    return;
  }
  sendHtml(res);
});

server.listen(port, () => {
  console.log(`zWallet admin runtime listening on :${port}`);
});
