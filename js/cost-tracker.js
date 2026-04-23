/* ═══════════════════════════════════════════════════════════════════
   TITAN v6 — cost-tracker.js
   Rastreamento de tokens e custo por sessão/provider
   Inspirado no costHook.py + cost_tracker.py do Claw Code
═══════════════════════════════════════════════════════════════════ */

/* ── PREÇOS (USD por 1M tokens, Abril 2025) ──────────────────────── */
const PRICING = {
  "claude-opus-4-5":    { in: 15.00, out: 75.00 },
  "claude-sonnet-4-6":  { in: 3.00,  out: 15.00 },
  "claude-sonnet-4-5":  { in: 3.00,  out: 15.00 },
  "claude-haiku-3-5":   { in: 0.80,  out: 4.00  },
  "claude-haiku-3":     { in: 0.25,  out: 1.25  },
  "ollama":             { in: 0.00,  out: 0.00  },
  "claw-local":         { in: 0.00,  out: 0.00  },
  "default":            { in: 3.00,  out: 15.00 },
};

const COST_STORE_KEY = "titan_v6_costs";

/* ── ESTADO DOS CUSTOS ───────────────────────────────────────────── */
let COST_STATE = null;

function costLoad() {
  try {
    const raw = localStorage.getItem(COST_STORE_KEY);
    if (raw) COST_STATE = JSON.parse(raw);
  } catch (_) { COST_STATE = null; }

  if (!COST_STATE) {
    COST_STATE = {
      today: { date: todayStr(), inputTokens: 0, outputTokens: 0, usd: 0, requests: 0 },
      month: { month: monthStr(), inputTokens: 0, outputTokens: 0, usd: 0, requests: 0 },
      total: { inputTokens: 0, outputTokens: 0, usd: 0, requests: 0 },
      byModel: {},
      bySession: [],
      savedByLocal: 0, // tokens economizados usando Ollama/Claw local
    };
  }
  // Reset diário
  if (COST_STATE.today.date !== todayStr()) {
    COST_STATE.today = { date: todayStr(), inputTokens: 0, outputTokens: 0, usd: 0, requests: 0 };
  }
  // Reset mensal
  if (COST_STATE.month.month !== monthStr()) {
    COST_STATE.month = { month: monthStr(), inputTokens: 0, outputTokens: 0, usd: 0, requests: 0 };
  }
}

function costSave() {
  try { localStorage.setItem(COST_STORE_KEY, JSON.stringify(COST_STATE)); } catch (_) {}
}

function todayStr()  { return new Date().toISOString().substring(0, 10); }
function monthStr()  { return new Date().toISOString().substring(0, 7);  }

/* ── REGISTRAR USO ───────────────────────────────────────────────── */
function costTrack(model, inputTokens, outputTokens) {
  if (!COST_STATE) costLoad();

  const modelKey = model || "default";
  const price = PRICING[modelKey] || PRICING["default"];
  const usd = ((inputTokens * price.in) + (outputTokens * price.out)) / 1_000_000;
  const isFree = price.in === 0 && price.out === 0;

  // Acumula
  const add = (bucket) => {
    bucket.inputTokens  += inputTokens;
    bucket.outputTokens += outputTokens;
    bucket.usd          += usd;
    bucket.requests     += 1;
  };

  add(COST_STATE.today);
  add(COST_STATE.month);
  add(COST_STATE.total);

  if (!COST_STATE.byModel[modelKey]) {
    COST_STATE.byModel[modelKey] = { inputTokens: 0, outputTokens: 0, usd: 0, requests: 0 };
  }
  add(COST_STATE.byModel[modelKey]);

  // Rastreia tokens economizados com local
  if (isFree) {
    const equivalent = ((inputTokens * PRICING["claude-sonnet-4-6"].in) + (outputTokens * PRICING["claude-sonnet-4-6"].out)) / 1_000_000;
    COST_STATE.savedByLocal += equivalent;
  }

  costSave();
  updateCostBadge();
  Bus.emit("cost-update", { model: modelKey, inputTokens, outputTokens, usd });
}

/* ── UTILITÁRIOS DE FORMATO ──────────────────────────────────────── */
function fmtUSD(val) {
  if (val === 0) return "$0.00";
  if (val < 0.001) return "<$0.001";
  return "$" + val.toFixed(val < 0.01 ? 4 : val < 1 ? 3 : 2);
}

function fmtTokens(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

/* ── BADGE DE CUSTO ──────────────────────────────────────────────── */
function updateCostBadge() {
  const el = document.getElementById("cost-badge");
  if (!el || !COST_STATE) return;

  const today = COST_STATE.today;
  const color = today.usd > 5 ? "#f43060" : today.usd > 1 ? "#f5a623" : "#0fd98a";
  el.innerHTML = `<span style="color:${color};font-size:11px;">
    <i class="fas fa-coins" style="margin-right:3px;"></i>${fmtUSD(today.usd)} hoje
  </span>`;
}

/* ── PAINEL DE CUSTOS (HTML) ─────────────────────────────────────── */
function renderCostPanel() {
  if (!COST_STATE) costLoad();
  const { today, month, total, byModel, savedByLocal } = COST_STATE;

  const modelRows = Object.entries(byModel)
    .sort((a, b) => b[1].usd - a[1].usd)
    .map(([model, d]) => `
      <div class="cost-row">
        <span class="cost-model">${model}</span>
        <span class="cost-tokens">${fmtTokens(d.inputTokens + d.outputTokens)}</span>
        <span class="cost-req">${d.requests}×</span>
        <span class="cost-usd" style="color:${d.usd === 0 ? '#0fd98a' : '#c4d4e8'}">${fmtUSD(d.usd)}</span>
      </div>
    `).join("");

  return `
    <div class="cost-panel">
      <div class="cost-section">
        <div class="cost-title"><i class="fas fa-calendar-day"></i> Hoje</div>
        <div class="cost-big">${fmtUSD(today.usd)}</div>
        <div class="cost-detail">${fmtTokens(today.inputTokens)} in + ${fmtTokens(today.outputTokens)} out · ${today.requests} req</div>
      </div>

      <div class="cost-divider"></div>

      <div class="cost-section">
        <div class="cost-title"><i class="fas fa-calendar-alt"></i> Mês</div>
        <div class="cost-big">${fmtUSD(month.usd)}</div>
        <div class="cost-detail">${fmtTokens(month.inputTokens + month.outputTokens)} tokens · ${month.requests} req</div>
      </div>

      <div class="cost-divider"></div>

      <div class="cost-section">
        <div class="cost-title"><i class="fas fa-leaf"></i> Economizado (local)</div>
        <div class="cost-big" style="color:#0fd98a;">${fmtUSD(savedByLocal)}</div>
        <div class="cost-detail">Usando Ollama/Claw local</div>
      </div>

      <div class="cost-divider"></div>

      <div class="cost-section">
        <div class="cost-title"><i class="fas fa-chart-bar"></i> Por modelo</div>
        <div class="cost-model-table">${modelRows || "<div style='color:#6888aa;font-size:11px;'>Nenhum uso ainda</div>"}</div>
      </div>

      <div class="cost-divider"></div>

      <div class="cost-section">
        <div class="cost-title"><i class="fas fa-infinity"></i> Total acumulado</div>
        <div class="cost-big" style="color:#9c7df5;">${fmtUSD(total.usd)}</div>
        <div class="cost-detail">${fmtTokens(total.inputTokens + total.outputTokens)} tokens · ${total.requests} req</div>
      </div>

      <button onclick="costReset()" class="cost-reset-btn">
        <i class="fas fa-trash-alt"></i> Resetar contadores
      </button>
    </div>
  `;
}

/* ── RESET ────────────────────────────────────────────────────────── */
function costReset() {
  if (!confirm("Resetar todos os contadores de custo?")) return;
  COST_STATE = null;
  localStorage.removeItem(COST_STORE_KEY);
  costLoad();
  updateCostBadge();
  showToast("Contadores resetados.", "info");
}

/* ── INIT ─────────────────────────────────────────────────────────── */
function initCostTracker() {
  costLoad();
  updateCostBadge();
  addLog("info", "COST", `CostTracker iniciado. Total acumulado: ${fmtUSD(COST_STATE.total.usd)}`);
}
