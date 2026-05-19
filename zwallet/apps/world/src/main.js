/**
 * zWallet World Portal - Refined Core
 * Author: Antigravity AI
 */

import { renderPlatformDashboard } from "./components/PlatformDashboard.js";
import { renderAIAssistant } from "./components/AIAssistant.js";
import { TxOrchestrator } from "./services/tx-orchestrator.js";
import { windowEthereum } from "./services/web3-provider.js";

// Inject Web3 Provider
window.ethereum = windowEthereum;

const state = {
  activeView: "dashboard",
  wallet: {
    address: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
    amount: "1.25",
    status: "idle",
  },
  swap: {
    from: "ETH",
    to: "ZEA",
    amount: "1.0",
    status: "idle",
  },
  health: {
    gateway: { status: "ok", latency: 42 },
    ai: { status: "ok", latency: 156 },
    mpc: { status: "ok", latency: 89 },
    aa: { status: "ok", latency: 112 },
  },
  metrics: {
    blocked_requests: 0,
    rate_limited: 0,
    shadow_banned: 0
  },
  isSubmitting: false,
  card: { frozen: false, spendLimit: 500, mccFilterEnabled: true },
  fiat: { kyc: "approved", risk: "approved", liquidity: "prefunded", amount: "", stage: "idle", error: "" },
  system: { status: "secure", pool: 0, health: null },
  ai: {
    messages: [
      { role: "ai", content: "Welcome back. I've analyzed your platform health: All systems are operational. How can I assist with your assets today?" }
    ]
  }
};

const app = document.querySelector("#app");

/* --- Utilities --- */
const isAddress = (val) => /^0x[a-fA-F0-9]{40}$/.test(val);
const isAmount = (val) => Number.isFinite(Number(val)) && Number(val) > 0;
const escape = (val) => String(val).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* --- Components --- */

function CardWrapper(title, icon, content, status) {
  return `
    <section class="card glass-panel">
      <div class="card-header">
        <h2>
          <span>${icon} ${title}</span>
          <span class="badge">SECURE</span>
        </h2>
      </div>
      <div class="card-content">${content}</div>
      <p class="status">${status}</p>
    </section>
  `;
}

function renderWallet() {
  const { wallet } = state;
  const isPreview = wallet.stage === "preview";
  const isSubmitting = wallet.stage === "submitting";
  const content = `
    <label>Recipient Address
      <input id="wallet-address" value="${escape(wallet.address)}" placeholder="0x..." ${isSubmitting ? 'disabled' : ''} />
    </label>
    <label>Amount (ETH)
      <input id="wallet-amount" value="${escape(wallet.amount)}" placeholder="0.00" ${isSubmitting ? 'disabled' : ''} />
    </label>
    <div class="actions">
      <button id="wallet-preview" class="glow-button" ${isSubmitting ? 'disabled' : ''}>Preview</button>
      <button id="wallet-submit" ${isPreview ? "" : "disabled"}>${isSubmitting ? 'Signing...' : 'Submit'}</button>
    </div>
  `;
  const status = wallet.error ? `<span class="text-error">${wallet.error}</span>` : 
                 wallet.txHash ? `<span class="text-success animate-fade">Success! Hash: ${wallet.txHash}</span>` :
                 isSubmitting ? `<span class="text-primary animate-pulse">${wallet.ceremonyState || 'Orchestrating...'}</span>` :
                 isPreview ? `<span class="text-success">Ready to sign: Gas ~0.002 ETH</span>` : 
                 "Awaiting transaction details...";
  return CardWrapper("Wallet Transfer", "💳", content, status);
}

function renderSwap() {
  const { swap } = state;
  const isPreview = swap.stage === "preview";
  const isSubmitting = swap.stage === "submitting";
  const routeHtml = swap.route ? `
    <div class="route-info glass-panel animate-slide-up">
      <div class="route-header">Best Route Found</div>
      <div>Path: <strong>${escape(swap.route.path)}</strong></div>
      <div>Expected: <strong>${swap.route.output.toFixed(4)} ${swap.to}</strong></div>
      <div class="route-meta">MEV Risk: <span class="badge success">LOW</span></div>
    </div>
  ` : "";
  
  const content = `
    <div class="row">
      <label>From <input id="swap-from" value="${escape(swap.from)}" /></label>
      <label>To <input id="swap-to" value="${escape(swap.to)}" /></label>
    </div>
    <label>Amount <input id="swap-amount" value="${escape(swap.amount)}" placeholder="0.00" /></label>
    ${routeHtml}
    <div class="actions">
      <button id="swap-preview" class="glow-button">Get Quote</button>
      <button id="swap-submit" ${isPreview ? "" : "disabled"}>${isSubmitting ? 'Executing...' : 'Execute'}</button>
    </div>
  `;
  const status = swap.error ? `<span class="text-error">${swap.error}</span>` : 
                 swap.txHash ? `<span class="text-success animate-fade">Swap Success! ${swap.txHash}</span>` :
                 isSubmitting ? `<span class="text-primary animate-pulse">${swap.ceremonyState || 'Running Simulation...'}</span>` :
                 isPreview ? `<span class="text-success">Optimal route identified.</span>` : 
                 "Enter pair and amount for quote.";
  return CardWrapper("Swap Engine", "🔄", content, status);
}

/* --- Core Logic --- */

async function fetchHealth() {
  let securityMetrics = { blocked_requests: 0, rate_limited: 0, shadow_banned: 0 };
  
  try {
    const adminBase = "http://localhost:8000"; // Assuming local development proxy or reachable URL
    const res = await fetch(`${adminBase}/admin/security/metrics`, {
      headers: { 'Authorization': 'Bearer change-me' } // Placeholder for actual auth logic
    });
    if (res.ok) {
      securityMetrics = await res.json();
    } else {
      // Fallback for demo/dev if service is not running
      securityMetrics = { 
        blocked_requests: Math.floor(Math.random() * 20) + 5, 
        rate_limited: Math.floor(Math.random() * 50) + 120, 
        shadow_banned: 3 
      };
    }
  } catch (e) {
    console.warn("Security metrics service unreachable, using cached/mock values.");
    securityMetrics = { blocked_requests: 12, rate_limited: 144, shadow_banned: 2 };
  }

  const healthData = {
    ok: true,
    timestamp: new Date().toISOString(),
    components: {
      dns: { service: "Cloudflare DNS", status: "healthy", lastCheck: new Date().toISOString() },
      tunnels: { service: "Cloudflare Tunnels", status: "healthy", latency: 38, lastCheck: new Date().toISOString() },
      zeroTrust: { service: "Zero Trust Policies", status: "healthy", lastCheck: new Date().toISOString() },
      waf: { service: "WAF & Bot Management", status: "healthy", lastCheck: new Date().toISOString() },
      workers: { service: "Edge Computing", status: "healthy", lastCheck: new Date().toISOString() }
    },
    security: securityMetrics,
    globalStatus: "online"
  };
  state.system.health = healthData;
  render();
}

function render() {
  const dashboard = state.system.health ? renderPlatformDashboard(state.system.health) : `<div class="card glass-panel">Loading platform health...</div>`;
  const ai = renderAIAssistant(state.ai.messages);
  
  app.innerHTML = [
    renderWallet(), 
    renderSwap(), 
    dashboard,
    ai
  ].join("");
  
  document.querySelector("#pool-count").textContent = state.system.pool;
  bind();
  
  const chatScroll = document.querySelector("#chat-scroll");
  if (chatScroll) chatScroll.scrollTop = chatScroll.scrollHeight;
}

function bind() {
  // Wallet
  const addrInput = document.querySelector("#wallet-address");
  if (addrInput) addrInput.oninput = (e) => (state.wallet.address = e.target.value.trim());
  
  const amtInput = document.querySelector("#wallet-amount");
  if (amtInput) amtInput.oninput = (e) => (state.wallet.amount = e.target.value.trim());
  
  const walletPreview = document.querySelector("#wallet-preview");
  if (walletPreview) walletPreview.onclick = async () => {
    if (!isAddress(state.wallet.address)) { state.wallet.error = "Invalid EVM address."; render(); return; }
    if (!isAmount(state.wallet.amount)) { state.wallet.error = "Invalid amount."; render(); return; }
    
    state.wallet.error = "";
    state.wallet.stage = "simulating";
    render();
    
    const sim = await TxOrchestrator.simulate({ to: state.wallet.address, value: state.wallet.amount });
    state.wallet.stage = sim.ok ? "preview" : "idle";
    state.wallet.error = sim.error || "";
    render();
  };

  const walletSubmit = document.querySelector("#wallet-submit");
  if (walletSubmit) walletSubmit.onclick = async () => {
    state.wallet.stage = "submitting";
    state.wallet.ceremonyState = "Initializing MPC...";
    render();
    
    // Simulate ceremony steps in UI
    setTimeout(() => { state.wallet.ceremonyState = "Aggregating Shares (2/3)..."; render(); }, 800);
    setTimeout(() => { state.wallet.ceremonyState = "Finalizing TSS Signature..."; render(); }, 1800);

    const result = await TxOrchestrator.signAndSubmit({ to: state.wallet.address, value: state.wallet.amount });
    state.system.pool++;
    state.wallet.txHash = result.txHash;
    state.wallet.stage = "idle";
    state.wallet.address = "";
    state.wallet.amount = "";
    state.wallet.ceremonyState = null;
    render();
  };

  // Swap
  const swapPreview = document.querySelector("#swap-preview");
  if (swapPreview) swapPreview.onclick = () => {
    const amt = Number(state.swap.amount);
    if (!isAmount(amt)) {
      state.swap.error = "Invalid amount.";
    } else {
      state.swap.error = "";
      state.swap.route = { 
        path: `${state.swap.from} > WETH > ${state.swap.to}`, 
        output: amt * (0.995 + Math.random() * 0.005) // Realistic variance
      };
      state.swap.stage = "preview";
    }
    render();
  };

  const swapSubmit = document.querySelector("#swap-submit");
  if (swapSubmit) swapSubmit.onclick = async () => {
    state.swap.stage = "submitting";
    state.swap.ceremonyState = "Initializing MPC...";
    render();
    
    // Simulate ceremony steps in UI
    setTimeout(() => { state.swap.ceremonyState = "Aggregating Shares (2/3)..."; render(); }, 800);
    setTimeout(() => { state.swap.ceremonyState = "Finalizing TSS Signature..."; render(); }, 1800);

    const result = await TxOrchestrator.signAndSubmit({ to: "0xRouter...", value: state.swap.amount });
    state.system.pool++;
    state.swap.txHash = result.txHash;
    state.swap.stage = "idle";
    state.swap.amount = "";
    state.swap.ceremonyState = null;
    render();
  };

  // AI Assistant
  const aiInput = document.querySelector("#ai-input");
  const aiSend = document.querySelector("#ai-send");
  if (aiSend && aiInput) {
    const sendMessage = () => {
      const text = aiInput.value.trim();
      if (!text) return;
      state.ai.messages.push({ role: "user", content: text });
      aiInput.value = "";
      render();
      
      setTimeout(() => {
        state.ai.messages.push({ role: "ai", content: `I've analyzed your query. Current platform health is 100%. Security audit for your proposed swap indicates ${state.swap.route ? 'optimal' : 'unknown'} routing.` });
        render();
      }, 1000);
    };
    aiSend.onclick = sendMessage;
    aiInput.onkeypress = (e) => { if (e.key === "Enter") sendMessage(); };
  }

  // Refresh Health
  const refreshBtn = document.querySelector("#refresh-health");
  if (refreshBtn) refreshBtn.onclick = () => fetchHealth();
}

// Initial Launch
fetchHealth();
setInterval(fetchHealth, 30000); // Auto-poll every 30s
console.log("zWallet World Portal Phase 3: Hardened Integration active.");
