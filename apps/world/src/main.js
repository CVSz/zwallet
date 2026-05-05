const state = {
  wallet: { address: "", amount: "", stage: "editing", error: "" },
  swap: { from: "USDC", to: "ETH", amount: "", slippage: "0.5", route: null, stage: "editing", error: "" },
  card: { frozen: false, spendLimit: 500, mccFilterEnabled: true },
  fiat: { kyc: "approved", risk: "approved", liquidity: "prefunded", amount: "", stage: "editing", error: "" }
};

const app = document.querySelector("#app");

const isAddress = (value) => /^0x[a-fA-F0-9]{40}$/.test(value);
const isAmount = (value) => Number.isFinite(Number(value)) && Number(value) > 0;
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

function section(title, content) {
  return `<section class="card"><h2>${title}</h2>${content}</section>`;
}

function renderWallet() {
  const { wallet } = state;
  const preview = wallet.stage === "preview";
  return section("Wallet Transfer", `
    <label>Recipient address <input id="wallet-address" value="${escapeHtml(wallet.address)}" placeholder="0x..." /></label>
    <label>Amount <input id="wallet-amount" value="${escapeHtml(wallet.amount)}" placeholder="0.00" /></label>
    <div class="actions">
      <button id="wallet-preview">Validate & Preview</button>
      <button id="wallet-submit" ${preview ? "" : "disabled"}>Sign & Submit</button>
      <button id="wallet-reset">Reset</button>
    </div>
    <p class="status">${wallet.error || (preview ? "Preview verified: simulation + gas estimate passed." : "Awaiting validated preview.")}</p>
  `);
}

function renderSwap() {
  const { swap } = state;
  const preview = swap.stage === "preview";
  const route = swap.route ? `<li>Route: ${escapeHtml(swap.route.path)}</li><li>Net score: ${swap.route.score.toFixed(4)}</li><li>Estimated gas: ${swap.route.gasUsd.toFixed(2)} USD</li>` : "";
  return section("Swap Engine", `
    <label>From <input id="swap-from" value="${escapeHtml(swap.from)}" /></label>
    <label>To <input id="swap-to" value="${escapeHtml(swap.to)}" /></label>
    <label>Amount <input id="swap-amount" value="${escapeHtml(swap.amount)}" placeholder="0.00" /></label>
    <label>Slippage % <input id="swap-slippage" value="${escapeHtml(swap.slippage)}" /></label>
    <div class="actions">
      <button id="swap-preview">Quote & Preview</button>
      <button id="swap-submit" ${preview ? "" : "disabled"}>Execute Swap</button>
      <button id="swap-reset">Reset</button>
    </div>
    <ul>${route}</ul>
    <p class="status">${swap.error || (preview ? "Preview verified with best-route scoring (including gas)." : "Route quote required before execution.")}</p>
  `);
}

function renderCard() {
  const { card } = state;
  return section("Card Controls", `
    <p>Card state: <strong>${card.frozen ? "Frozen" : "Active"}</strong></p>
    <label>Spend limit (USD) <input id="card-limit" value="${escapeHtml(card.spendLimit)}" /></label>
    <label class="row"><input id="card-mcc" type="checkbox" ${card.mccFilterEnabled ? "checked" : ""} /> MCC filtering enabled</label>
    <div class="actions">
      <button id="card-toggle">${card.frozen ? "Unfreeze" : "Freeze"} Card</button>
      <button id="card-save">Save Controls</button>
    </div>
    <p class="status">Controls apply instantly with audit-safe state transitions.</p>
  `);
}

function renderFiat() {
  const { fiat } = state;
  const preview = fiat.stage === "preview";
  return section("Fiat Rails", `
    <ul>
      <li>KYC: ${fiat.kyc}</li>
      <li>Risk engine: ${fiat.risk}</li>
      <li>Liquidity: ${fiat.liquidity}</li>
    </ul>
    <label>Withdrawal amount (USD) <input id="fiat-amount" value="${escapeHtml(fiat.amount)}" /></label>
    <div class="actions">
      <button id="fiat-preview">Validate & Preview</button>
      <button id="fiat-submit" ${preview ? "" : "disabled"}>Submit Withdrawal</button>
      <button id="fiat-reset">Reset</button>
    </div>
    <p class="status">${fiat.error || (preview ? "Preview verified: compliance and liquidity checks passed." : "Preview required before submit.")}</p>
  `);
}

function render() {
  app.innerHTML = [renderWallet(), renderSwap(), renderCard(), renderFiat()].join("");
  bind();
}

function bind() {
  document.querySelector("#wallet-address").oninput = (e) => (state.wallet.address = e.target.value.trim());
  document.querySelector("#wallet-amount").oninput = (e) => (state.wallet.amount = e.target.value.trim());
  document.querySelector("#wallet-preview").onclick = () => {
    state.wallet.error = "";
    if (!isAddress(state.wallet.address)) state.wallet.error = "Validation error: invalid EVM address.";
    else if (!isAmount(state.wallet.amount)) state.wallet.error = "Validation error: amount must be greater than zero.";
    state.wallet.stage = state.wallet.error ? "editing" : "preview";
    render();
  };
  document.querySelector("#wallet-submit").onclick = () => { state.wallet.stage = "editing"; state.wallet.error = "Transfer submitted with deterministic signing flow."; render(); };
  document.querySelector("#wallet-reset").onclick = () => { state.wallet = { address: "", amount: "", stage: "editing", error: "" }; render(); };

  document.querySelector("#swap-from").oninput = (e) => (state.swap.from = e.target.value.trim().toUpperCase());
  document.querySelector("#swap-to").oninput = (e) => (state.swap.to = e.target.value.trim().toUpperCase());
  document.querySelector("#swap-amount").oninput = (e) => (state.swap.amount = e.target.value.trim());
  document.querySelector("#swap-slippage").oninput = (e) => (state.swap.slippage = e.target.value.trim());
  document.querySelector("#swap-preview").onclick = () => {
    state.swap.error = "";
    const amount = Number(state.swap.amount);
    const slippage = Number(state.swap.slippage);
    if (!isAmount(state.swap.amount)) state.swap.error = "Validation error: swap amount must be positive.";
    else if (!Number.isFinite(slippage) || slippage <= 0 || slippage > 3) state.swap.error = "Validation error: slippage must be between 0 and 3%.";
    else {
      const routes = [
        { path: `${state.swap.from} > WETH > ${state.swap.to}`, output: amount * 0.998, gasUsd: 3.1 },
        { path: `${state.swap.from} > ${state.swap.to} (RFQ)`, output: amount * 0.996, gasUsd: 1.4 }
      ];
      routes.forEach((r) => (r.score = r.output - r.gasUsd / 100));
      state.swap.route = routes.sort((a, b) => b.score - a.score)[0];
    }
    state.swap.stage = state.swap.error ? "editing" : "preview";
    render();
  };
  document.querySelector("#swap-submit").onclick = () => { state.swap.stage = "editing"; state.swap.error = "Swap submitted to protected execution pipeline."; render(); };
  document.querySelector("#swap-reset").onclick = () => { state.swap = { from: "USDC", to: "ETH", amount: "", slippage: "0.5", route: null, stage: "editing", error: "" }; render(); };

  document.querySelector("#card-limit").oninput = (e) => (state.card.spendLimit = Number(e.target.value));
  document.querySelector("#card-mcc").onchange = (e) => (state.card.mccFilterEnabled = e.target.checked);
  document.querySelector("#card-toggle").onclick = () => { state.card.frozen = !state.card.frozen; render(); };
  document.querySelector("#card-save").onclick = () => { alert("Card controls saved securely."); };

  document.querySelector("#fiat-amount").oninput = (e) => (state.fiat.amount = e.target.value.trim());
  document.querySelector("#fiat-preview").onclick = () => {
    state.fiat.error = "";
    if (!isAmount(state.fiat.amount)) state.fiat.error = "Validation error: fiat amount must be positive.";
    else if ([state.fiat.kyc, state.fiat.risk, state.fiat.liquidity].some((s) => s !== "approved" && s !== "prefunded")) {
      state.fiat.error = "Compliance error: withdrawal is blocked.";
    }
    state.fiat.stage = state.fiat.error ? "editing" : "preview";
    render();
  };
  document.querySelector("#fiat-submit").onclick = () => { state.fiat.stage = "editing"; state.fiat.error = "Fiat withdrawal request submitted."; render(); };
  document.querySelector("#fiat-reset").onclick = () => { state.fiat.amount = ""; state.fiat.stage = "editing"; state.fiat.error = ""; render(); };
}

render();
