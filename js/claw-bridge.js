/* ═══════════════════════════════════════════════════════════════════
   TITAN v6 — claw-bridge.js
   Ponte Nga ↔ Claw Code
   Fase 1: HTTP local (Ollama/Claw server) + fallback para Claude API
   Fase 2: Unificação de tools + memdir session_store
   Fase 3: Loop autônomo com trigger de issues/commits
═══════════════════════════════════════════════════════════════════ */

/* ── CONFIGURAÇÃO DO BRIDGE ──────────────────────────────────────── */
const CLAW_CONFIG = {
  localEndpoint: "http://localhost:11434",   // Ollama default
  clawServerPort: 8765,                       // Porta do Claw HTTP server
  clawEndpoint: "http://localhost:8765",      // Claw local API
  defaultLocalModel: "qwen2.5-coder:7b",     // Modelo padrão Ollama
  fallbackModel: "claude-sonnet-4-6",        // Fallback Claude API
  connectionTimeout: 3000,                    // ms para detectar se Claw está online
  maxRetries: 2,
  version: "6.0-fused",
};

/* ── ESTADO DO BRIDGE ────────────────────────────────────────────── */
const CLAW_STATE = {
  mode: "claude",          // "claw-local" | "ollama" | "claude"
  clawOnline: false,
  ollamaOnline: false,
  availableModels: [],
  currentModel: null,
  sessionId: null,
  taskQueue: [],
  isProcessing: false,
  lastHealthCheck: null,
  stats: {
    totalRequests: 0,
    clawRequests: 0,
    ollamaRequests: 0,
    claudeRequests: 0,
    tokensSaved: 0,
  }
};

/* ── HEALTH CHECK — detecta Claw e Ollama online ─────────────────── */
async function clawHealthCheck() {
  const now = Date.now();
  if (CLAW_STATE.lastHealthCheck && now - CLAW_STATE.lastHealthCheck < 30000) return;
  CLAW_STATE.lastHealthCheck = now;

  // Verifica Claw HTTP server
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), CLAW_CONFIG.connectionTimeout);
    const res = await fetch(`${CLAW_CONFIG.clawEndpoint}/health`, { signal: ctrl.signal });
    clearTimeout(t);
    if (res.ok) {
      CLAW_STATE.clawOnline = true;
      CLAW_STATE.mode = "claw-local";
      addLog("success", "CLAW", "Claw Code server detectado na porta " + CLAW_CONFIG.clawServerPort);
    }
  } catch (_) {
    CLAW_STATE.clawOnline = false;
  }

  // Verifica Ollama
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), CLAW_CONFIG.connectionTimeout);
    const res = await fetch(`${CLAW_CONFIG.localEndpoint}/api/tags`, { signal: ctrl.signal });
    clearTimeout(t);
    if (res.ok) {
      const data = await res.json();
      CLAW_STATE.ollamaOnline = true;
      CLAW_STATE.availableModels = (data.models || []).map(m => m.name);
      if (!CLAW_STATE.clawOnline) {
        CLAW_STATE.mode = "ollama";
        CLAW_STATE.currentModel = CLAW_STATE.availableModels[0] || CLAW_CONFIG.defaultLocalModel;
      }
      addLog("success", "CLAW", `Ollama detectado. Modelos: ${CLAW_STATE.availableModels.slice(0,3).join(", ")}`);
    }
  } catch (_) {
    CLAW_STATE.ollamaOnline = false;
    if (!CLAW_STATE.clawOnline) CLAW_STATE.mode = "claude";
  }

  updateClawStatusBadge();
}

/* ── OLLAMA COMPLETION ───────────────────────────────────────────── */
async function ollamaComplete(messages, model) {
  const targetModel = model || CLAW_STATE.currentModel || CLAW_CONFIG.defaultLocalModel;
  const res = await fetch(`${CLAW_CONFIG.localEndpoint}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: targetModel,
      messages: messages.map(m => ({
        role: m.role,
        content: Array.isArray(m.content)
          ? m.content.filter(b => b.type === "text").map(b => b.text).join("\n")
          : (m.content || ""),
      })),
      stream: false,
      options: { temperature: 0.3, num_ctx: 8192 },
    }),
  });
  if (!res.ok) throw new Error("Ollama " + res.status);
  const data = await res.json();
  CLAW_STATE.stats.ollamaRequests++;
  return {
    content: [{ type: "text", text: data.message?.content || "" }],
    stop_reason: "end_turn",
    model: targetModel,
    usage: { input_tokens: 0, output_tokens: 0 },
  };
}

/* ── CLAW LOCAL SERVER COMPLETION ────────────────────────────────── */
async function clawComplete(messages, systemPrompt, tools) {
  const res = await fetch(`${CLAW_CONFIG.clawEndpoint}/v1/agent/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages,
      system: systemPrompt,
      tools: tools || [],
      session_id: CLAW_STATE.sessionId,
    }),
  });
  if (!res.ok) throw new Error("Claw server " + res.status);
  const data = await res.json();
  CLAW_STATE.stats.clawRequests++;
  if (data.session_id) CLAW_STATE.sessionId = data.session_id;
  return data;
}

/* ── ROTEADOR PRINCIPAL — seleciona backend ──────────────────────── */
async function clawRoute(messages, systemPrompt, tools, forceMode) {
  await clawHealthCheck();
  CLAW_STATE.stats.totalRequests++;

  const mode = forceMode || CLAW_STATE.mode;

  // Tools só disponíveis no Claude (Claw e Ollama usam texto puro)
  const hasToolCalls = tools && tools.length > 0;

  if (mode === "claw-local" && CLAW_STATE.clawOnline && !hasToolCalls) {
    try {
      return await clawComplete(messages, systemPrompt, tools);
    } catch (e) {
      addLog("warn", "CLAW", "Claw server falhou, fallback Claude: " + e.message);
    }
  }

  if (mode === "ollama" && CLAW_STATE.ollamaOnline && !hasToolCalls) {
    try {
      return await ollamaComplete(messages, CLAW_STATE.currentModel);
    } catch (e) {
      addLog("warn", "CLAW", "Ollama falhou, fallback Claude: " + e.message);
    }
  }

  // Fallback: Claude API (modo padrão com tools)
  return null; // sinaliza para usar Claude API normal
}

/* ── STATUS BADGE ────────────────────────────────────────────────── */
function updateClawStatusBadge() {
  const el = document.getElementById("claw-status-badge");
  if (!el) return;

  let html = "";
  if (CLAW_STATE.clawOnline) {
    html = `<span class="claw-badge claw-badge--online"><i class="fas fa-robot"></i> Claw Local</span>`;
  } else if (CLAW_STATE.ollamaOnline) {
    const m = (CLAW_STATE.currentModel || "").split(":")[0];
    html = `<span class="claw-badge claw-badge--ollama"><i class="fas fa-brain"></i> Ollama · ${m}</span>`;
  } else {
    html = `<span class="claw-badge claw-badge--cloud"><i class="fas fa-cloud"></i> Claude API</span>`;
  }
  el.innerHTML = html;
}

/* ── ULTRAPLAN ────────────────────────────────────────────────────── */
async function ultraplan(task, onChunk) {
  if (!task || !task.trim()) return;

  const systemPrompt = `Você é o UltraPlan Engine do TITAN — sistema de decomposição de tasks do Claw Code.
Dado um objetivo, produza um plano de execução detalhado com:
1. Análise do problema
2. Passos numerados e concretos (máx 10)
3. Arquivos a modificar / criar
4. Riscos e mitigações
5. Critério de conclusão (definition of done)
Seja técnico, preciso e orientado a código. Responda em Português Brasileiro.`;

  const messages = [{ role: "user", content: `/ultraplan: ${task}` }];

  try {
    addLog("info", "ULTRAPLAN", `Planejando: "${task.substring(0, 60)}..."`);
    const resp = await fetch(ANTHROPIC_API, {
      method: "POST",
      headers: {
        "x-api-key": KEYS.anthropic,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2048,
        system: systemPrompt,
        messages,
        stream: true,
      }),
    });

    if (!resp.ok) throw new Error("API " + resp.status);

    const reader = resp.body.getReader();
    const dec = new TextDecoder();
    let full = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = dec.decode(value);
      const lines = chunk.split("\n").filter(l => l.startsWith("data: "));
      for (const line of lines) {
        try {
          const ev = JSON.parse(line.slice(6));
          if (ev.type === "content_block_delta" && ev.delta?.text) {
            full += ev.delta.text;
            if (onChunk) onChunk(ev.delta.text);
          }
        } catch (_) {}
      }
    }

    addLog("success", "ULTRAPLAN", `Plano gerado: ${full.length} chars`);
    return full;
  } catch (e) {
    addLog("error", "ULTRAPLAN", e.message);
    throw e;
  }
}

/* ── BUGHUNTER ────────────────────────────────────────────────────── */
async function bughunter(code, filePath) {
  const systemPrompt = `Você é o BugHunter do Claw Code — analisador automático de bugs.
Analise o código fornecido e identifique:
1. Bugs críticos (runtime errors, null refs, race conditions)
2. Vulnerabilidades de segurança (XSS, injection, auth bypass)
3. Problemas de performance (memory leaks, O(n²), re-renders desnecessários)
4. Code smells (dead code, duplicação, acoplamento excessivo)
Para cada item: localização exata, severidade (CRÍTICO/ALTO/MÉDIO/BAIXO), correção sugerida.`;

  try {
    const resp = await fetch(ANTHROPIC_API, {
      method: "POST",
      headers: {
        "x-api-key": KEYS.anthropic,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2048,
        system: systemPrompt,
        messages: [{
          role: "user",
          content: `/bughunter ${filePath ? `[${filePath}]` : ""}:\n\`\`\`\n${code.substring(0, 8000)}\n\`\`\``,
        }],
      }),
    });
    if (!resp.ok) throw new Error("API " + resp.status);
    const data = await resp.json();
    return data.content?.[0]?.text || "Nenhum bug encontrado.";
  } catch (e) {
    addLog("error", "BUGHUNTER", e.message);
    throw e;
  }
}

/* ── TELEPORT — navegação instantânea por símbolo ────────────────── */
function teleport(query) {
  if (!query) return;
  const files = Object.keys(STATE.files);
  const results = [];

  // Busca em arquivos carregados
  for (const path of files) {
    const content = STATE.files[path] || "";
    const lines = content.split("\n");
    lines.forEach((line, idx) => {
      if (line.toLowerCase().includes(query.toLowerCase())) {
        results.push({
          file: path,
          line: idx + 1,
          content: line.trim(),
          score: line.toLowerCase().startsWith(query.toLowerCase()) ? 2 : 1,
        });
      }
    });
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, 20);
}

/* ── MULTI-PROVIDER SELECTOR ─────────────────────────────────────── */
function clawGetProviderInfo() {
  return {
    mode: CLAW_STATE.mode,
    clawOnline: CLAW_STATE.clawOnline,
    ollamaOnline: CLAW_STATE.ollamaOnline,
    models: CLAW_STATE.availableModels,
    currentModel: CLAW_STATE.currentModel,
    stats: { ...CLAW_STATE.stats },
  };
}

function clawSetMode(mode, model) {
  const validModes = ["claw-local", "ollama", "claude"];
  if (!validModes.includes(mode)) return false;
  CLAW_STATE.mode = mode;
  if (model) CLAW_STATE.currentModel = model;
  CLAW_STATE.lastHealthCheck = null; // forçar re-check
  updateClawStatusBadge();
  addLog("info", "CLAW", `Modo alterado para: ${mode}${model ? " · " + model : ""}`);
  return true;
}

/* ── TASK QUEUE (Fase 3 preparação) ─────────────────────────────── */
function clawEnqueueTask(task) {
  const id = "task-" + Date.now();
  CLAW_STATE.taskQueue.push({ id, ...task, status: "queued", createdAt: Date.now() });
  addLog("info", "CLAW", `Task enfileirada: ${task.type || "generic"}`);
  if (!CLAW_STATE.isProcessing) processTaskQueue();
  return id;
}

async function processTaskQueue() {
  if (CLAW_STATE.isProcessing || !CLAW_STATE.taskQueue.length) return;
  CLAW_STATE.isProcessing = true;

  while (CLAW_STATE.taskQueue.length > 0) {
    const task = CLAW_STATE.taskQueue[0];
    task.status = "running";
    try {
      addLog("info", "CLAW", `Processando task: ${task.id}`);
      if (task.type === "ultraplan" && task.goal) {
        task.result = await ultraplan(task.goal, null);
      } else if (task.type === "bughunter" && task.code) {
        task.result = await bughunter(task.code, task.file);
      }
      task.status = "done";
    } catch (e) {
      task.status = "error";
      task.error = e.message;
    }
    CLAW_STATE.taskQueue.shift();
    Bus.emit("claw-task-done", task);
  }

  CLAW_STATE.isProcessing = false;
}

/* ── INIT ─────────────────────────────────────────────────────────── */
async function initClawBridge() {
  addLog("info", "CLAW", "Iniciando ClawBridge v" + CLAW_CONFIG.version);
  await clawHealthCheck();
  setInterval(clawHealthCheck, 60000); // re-verifica a cada 60s
}
