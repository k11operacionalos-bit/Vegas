/* ═══════════════════════════════════════════════════════════════════
   TITAN v6 — autonomous-loop.js
   Loop Autônomo: trigger → plan → execute → test → deploy
   Fase 3 do roadmap Nga + Claw
   Watcher de issues/commits → Claw executa → TITAN valida → deploy
═══════════════════════════════════════════════════════════════════ */

/* ── CONFIGURAÇÃO ─────────────────────────────────────────────────── */
const LOOP_CONFIG = {
  pollIntervalMs: 30000,     // checar GitHub a cada 30s
  maxIterations: 10,         // máximo de iterações por task autônoma
  testCommand: null,         // ex: "npm test" (configurável)
  autoApproveReads: true,    // tools de leitura: auto
  autoApproveWrites: false,  // tools de escrita: sempre pedir aprovação
  watchLabels: ["titan-auto", "agent", "autofix"], // labels monitorados
  triggerOnPush: false,      // reagir a commits (desativado por padrão)
  version: "6.0",
};

/* ── ESTADO DO LOOP ───────────────────────────────────────────────── */
const LOOP_STATE = {
  active: false,
  paused: false,
  watcherId: null,           // setInterval id
  currentTask: null,
  taskHistory: [],
  phase: "idle",             // idle | watching | planning | executing | testing | deploying
  lastWatchAt: null,
  stats: {
    tasksCompleted: 0,
    tasksAborted: 0,
    deploysTriggered: 0,
    issuesClosed: 0,
  },
};

/* ── FASES ────────────────────────────────────────────────────────── */
const LOOP_PHASES = {
  idle:      { label: "Ocioso",       color: "#6888aa", icon: "fa-circle" },
  watching:  { label: "Monitorando",  color: "#18d4f0", icon: "fa-eye" },
  planning:  { label: "Planejando",   color: "#9c7df5", icon: "fa-brain" },
  executing: { label: "Executando",   color: "#f5a623", icon: "fa-cogs" },
  testing:   { label: "Testando",     color: "#2f78f0", icon: "fa-flask" },
  deploying: { label: "Deployando",   color: "#d97757", icon: "fa-rocket" },
  done:      { label: "Concluído",    color: "#0fd98a", icon: "fa-check-circle" },
  error:     { label: "Erro",         color: "#f43060", icon: "fa-exclamation-circle" },
};

/* ── HELPERS ──────────────────────────────────────────────────────── */
function loopSetPhase(phase) {
  LOOP_STATE.phase = phase;
  Bus.emit("loop-phase-change", phase);
  updateLoopStatusUI();
}

function updateLoopStatusUI() {
  const el = document.getElementById("loop-status-indicator");
  if (!el) return;
  const p = LOOP_PHASES[LOOP_STATE.phase] || LOOP_PHASES.idle;
  el.innerHTML = `
    <span class="loop-phase" style="color:${p.color}">
      <i class="fas ${p.icon}${LOOP_STATE.active && LOOP_STATE.phase !== 'idle' ? ' fa-spin' : ''}"></i>
      ${p.label}
    </span>
    ${LOOP_STATE.active
      ? `<span class="loop-active-badge"><i class="fas fa-broadcast-tower"></i> Autônomo</span>`
      : `<span class="loop-inactive-badge"><i class="fas fa-pause"></i> Manual</span>`}
  `;
}

/* ══════════════════════════════════════════════════════════════════
   WATCHER — Fase 3: monitora GitHub por issues/commits disparadores
══════════════════════════════════════════════════════════════════ */
async function loopStartWatcher() {
  if (LOOP_STATE.watcherId) clearInterval(LOOP_STATE.watcherId);
  LOOP_STATE.active = true;
  loopSetPhase("watching");
  addLog("info", "LOOP", "Watcher autônomo iniciado.");

  // Executa imediatamente
  await loopWatchTick();

  LOOP_STATE.watcherId = setInterval(async () => {
    if (!LOOP_STATE.paused) await loopWatchTick();
  }, LOOP_CONFIG.pollIntervalMs);

  updateLoopStatusUI();
}

function loopStopWatcher() {
  if (LOOP_STATE.watcherId) {
    clearInterval(LOOP_STATE.watcherId);
    LOOP_STATE.watcherId = null;
  }
  LOOP_STATE.active = false;
  loopSetPhase("idle");
  addLog("info", "LOOP", "Watcher autônomo parado.");
  updateLoopStatusUI();
}

function loopPause() {
  LOOP_STATE.paused = true;
  addLog("info", "LOOP", "Loop pausado (aguardando retomada).");
}

function loopResume() {
  LOOP_STATE.paused = false;
  addLog("info", "LOOP", "Loop retomado.");
}

/* ── TICK DO WATCHER ─────────────────────────────────────────────── */
async function loopWatchTick() {
  if (!KEYS.github || !KEYS.githubRepo) return;
  if (LOOP_STATE.currentTask) return; // já há uma task em andamento

  LOOP_STATE.lastWatchAt = new Date().toISOString();

  try {
    // Busca issues com labels de automação
    const issues = await githubFetch(
      `/issues?state=open&per_page=10&labels=${LOOP_CONFIG.watchLabels.join(",")}`
    );

    const actionable = (issues || []).filter(i => !i.pull_request);
    if (!actionable.length) return;

    const issue = actionable[0]; // pega a issue mais antiga
    addLog("info", "LOOP", `Issue disparadora encontrada: #${issue.number} — "${issue.title}"`);

    // Cria task e inicia loop
    await loopRunTask({
      type: "issue",
      issue_number: issue.number,
      title: issue.title,
      body: issue.body || "",
      labels: (issue.labels || []).map(l => l.name),
    });

  } catch (e) {
    addLog("warn", "LOOP", "Watcher tick falhou: " + e.message);
  }
}

/* ══════════════════════════════════════════════════════════════════
   LOOP PRINCIPAL — plan → execute → test → deploy
══════════════════════════════════════════════════════════════════ */
async function loopRunTask(task) {
  if (LOOP_STATE.currentTask) {
    addLog("warn", "LOOP", "Task já em execução, ignorando nova task.");
    return;
  }

  LOOP_STATE.currentTask = {
    ...task,
    id: "loop-" + Date.now(),
    startedAt: new Date().toISOString(),
    status: "running",
    plan: null,
    steps: [],
    result: null,
  };

  Bus.emit("loop-task-start", LOOP_STATE.currentTask);
  appendLoopCard(LOOP_STATE.currentTask);

  try {
    /* ── FASE 1: PLANEJAMENTO ──────────────────────────── */
    loopSetPhase("planning");
    addLog("info", "LOOP", `Planejando task: "${task.title}"`);

    const plan = await loopPlan(task);
    LOOP_STATE.currentTask.plan = plan;
    appendLoopLog(`📋 **Plano gerado**\n${plan.summary}`);

    /* ── FASE 2: EXECUÇÃO ──────────────────────────────── */
    loopSetPhase("executing");
    addLog("info", "LOOP", "Executando plano...");

    const execResult = await loopExecute(plan, task);
    LOOP_STATE.currentTask.steps = execResult.steps;

    if (execResult.aborted) {
      loopAbortTask("Execução abortada: " + execResult.reason);
      return;
    }

    /* ── FASE 3: TESTE (se configurado) ────────────────── */
    if (LOOP_CONFIG.testCommand) {
      loopSetPhase("testing");
      addLog("info", "LOOP", "Executando testes...");
      appendLoopLog(`🧪 **Teste:** \`${LOOP_CONFIG.testCommand}\` — (simulado, aguardando CI)`);
    }

    /* ── FASE 4: DEPLOY (se aprovado) ─────────────────── */
    if (execResult.needsDeploy) {
      loopSetPhase("deploying");
      // Deploy precisa de aprovação humana (write tool)
      appendLoopLog("🚀 **Deploy necessário** — aguardando sua aprovação.");
      addPendingAction({
        type: "loop-deploy",
        task: LOOP_STATE.currentTask,
        label: `Deploy após task #${task.issue_number || "manual"}`,
      });
    }

    /* ── CONCLUSÃO ─────────────────────────────────────── */
    loopSetPhase("done");
    LOOP_STATE.currentTask.status = "done";
    LOOP_STATE.currentTask.endedAt = new Date().toISOString();
    LOOP_STATE.stats.tasksCompleted++;

    // Fecha issue automaticamente se configurado
    if (task.type === "issue" && task.issue_number && execResult.success) {
      appendLoopLog(`✅ **Task concluída!** Aguardando aprovação para fechar issue #${task.issue_number}.`);
      addPendingAction({
        type: "close-issue",
        issue_number: task.issue_number,
        comment: `✅ Resolvido pelo TITAN Autonomous Loop v6.\n\n${plan.summary}`,
        label: `Fechar issue #${task.issue_number}`,
      });
    }

    LOOP_STATE.taskHistory.unshift({ ...LOOP_STATE.currentTask });
    if (LOOP_STATE.taskHistory.length > 20) LOOP_STATE.taskHistory.pop();

  } catch (e) {
    loopAbortTask(e.message);
  } finally {
    LOOP_STATE.currentTask = null;
    if (LOOP_STATE.active) loopSetPhase("watching");
    else loopSetPhase("idle");
  }
}

/* ── PLANEJAMENTO ─────────────────────────────────────────────────── */
async function loopPlan(task) {
  const prompt = `Você é o planejador do TITAN Autonomous Loop.

TASK:
Título: ${task.title}
Corpo: ${(task.body || "").substring(0, 500)}
Tipo: ${task.type}

Crie um plano de execução com:
1. Análise do que precisa ser feito
2. Lista de arquivos a verificar (use github_read_file e github_list_files)
3. Mudanças necessárias (específicas e concretas)
4. Critério de conclusão

Seja CONCISO. Máximo 5 passos. Foco em código.`;

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
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!resp.ok) throw new Error("API " + resp.status);
    const data = await resp.json();
    const summary = data.content?.[0]?.text || "Plano não gerado.";

    // Rastreia tokens
    if (data.usage) costTrack(MODEL, data.usage.input_tokens, data.usage.output_tokens);

    return { summary, steps: [], raw: data };
  } catch (e) {
    return { summary: "Erro ao planejar: " + e.message, steps: [], error: e.message };
  }
}

/* ── EXECUÇÃO ─────────────────────────────────────────────────────── */
async function loopExecute(plan, task) {
  const steps = [];
  let needsDeploy = false;
  let aborted = false;
  let reason = "";

  // Passa o plano para o agente principal executar
  const loopPrompt = `AUTONOMOUS LOOP TASK #${task.issue_number || "manual"}

OBJETIVO: ${task.title}

PLANO APROVADO:
${plan.summary}

Execute o plano agora. Use as ferramentas disponíveis. Para cada ação de escrita, eu precisarei aprovar. Seja preciso e eficiente.`;

  // Usa o loop do agente existente
  try {
    await runAgentLoop(loopPrompt);
    steps.push({ step: "execute", status: "ok", summary: "Agente executou o plano" });

    // Verifica se houve modificações que requerem deploy
    needsDeploy = STATE.pending.some(p =>
      p.tool === "github_push_multiple_files" ||
      p.tool === "github_create_or_update_file" ||
      p.tool === "render_trigger_deploy"
    );
  } catch (e) {
    aborted = true;
    reason = e.message;
  }

  return { steps, needsDeploy, success: !aborted, aborted, reason };
}

/* ── ABORTAR ──────────────────────────────────────────────────────── */
function loopAbortTask(reason) {
  if (!LOOP_STATE.currentTask) return;
  LOOP_STATE.currentTask.status = "aborted";
  LOOP_STATE.currentTask.endedAt = new Date().toISOString();
  LOOP_STATE.stats.tasksAborted++;
  loopSetPhase("error");
  addLog("error", "LOOP", "Task abortada: " + reason);
  appendLoopLog(`❌ **Task abortada:** ${reason}`);
  LOOP_STATE.taskHistory.unshift({ ...LOOP_STATE.currentTask });
  LOOP_STATE.currentTask = null;
  setTimeout(() => loopSetPhase(LOOP_STATE.active ? "watching" : "idle"), 3000);
}

/* ── PENDING ACTIONS (aprovação humana) ──────────────────────────── */
function addPendingAction(action) {
  STATE.pending.push({
    id: "pend-" + Date.now(),
    ...action,
    createdAt: new Date().toISOString(),
  });
  Bus.emit("pending-update");
  renderPendingActions?.();
}

/* ── EXECUÇÃO MANUAL ─────────────────────────────────────────────── */
async function loopRunManual(goal) {
  if (!goal || !goal.trim()) return;
  await loopRunTask({
    type: "manual",
    title: goal,
    body: "",
    labels: [],
  });
}

/* ── UI — card de task do loop ────────────────────────────────────── */
function appendLoopCard(task) {
  const container = document.getElementById("loop-tasks-container");
  if (!container) return;

  const card = document.createElement("div");
  card.id = "loop-task-" + task.id;
  card.className = "loop-task-card";
  card.innerHTML = `
    <div class="loop-task-header">
      <span class="loop-task-type">${task.type === "issue" ? "🐛 Issue" : "⚡ Manual"}</span>
      <span class="loop-task-title">${escHtml(task.title.substring(0, 60))}</span>
      <span class="loop-task-time">${new Date().toLocaleTimeString("pt-BR", { hour12: false })}</span>
    </div>
    <div class="loop-task-log" id="loop-log-${task.id}"></div>
  `;
  container.prepend(card);
}

function appendLoopLog(text) {
  if (!LOOP_STATE.currentTask) return;
  const el = document.getElementById("loop-log-" + LOOP_STATE.currentTask.id);
  if (!el) return;
  const p = document.createElement("p");
  p.innerHTML = renderMarkdown(text);
  el.appendChild(p);
  el.scrollTop = el.scrollHeight;
}

/* ── PAINEL DO LOOP (HTML) ────────────────────────────────────────── */
function renderLoopPanel() {
  const phase = LOOP_PHASES[LOOP_STATE.phase] || LOOP_PHASES.idle;
  const history = LOOP_STATE.taskHistory.slice(0, 5);

  return `
    <div class="loop-panel">
      <div class="loop-header">
        <div class="loop-phase-display" style="color:${phase.color}">
          <i class="fas ${phase.icon}"></i> ${phase.label}
        </div>
        <div class="loop-controls">
          ${LOOP_STATE.active
            ? `<button onclick="loopStopWatcher()" class="btn-loop btn-loop--stop"><i class="fas fa-stop"></i> Parar</button>
               ${LOOP_STATE.paused
                 ? `<button onclick="loopResume()" class="btn-loop btn-loop--resume"><i class="fas fa-play"></i> Retomar</button>`
                 : `<button onclick="loopPause()" class="btn-loop btn-loop--pause"><i class="fas fa-pause"></i> Pausar</button>`
               }`
            : `<button onclick="loopStartWatcher()" class="btn-loop btn-loop--start"><i class="fas fa-broadcast-tower"></i> Iniciar Watcher</button>`
          }
        </div>
      </div>

      <div class="loop-manual-section">
        <div class="loop-section-title">Execução manual</div>
        <div class="loop-input-row">
          <input id="loop-manual-input" type="text" placeholder="Descreva o objetivo (ex: corrigir bug na função login)..." class="loop-input" />
          <button onclick="loopRunManual(document.getElementById('loop-manual-input').value)" class="btn-loop btn-loop--run">
            <i class="fas fa-play"></i> Executar
          </button>
        </div>
      </div>

      <div class="loop-config-section">
        <div class="loop-section-title">Configuração do watcher</div>
        <div class="loop-config-grid">
          <label class="loop-config-item">
            <span>Intervalo de polling</span>
            <select onchange="LOOP_CONFIG.pollIntervalMs=+this.value" class="loop-select">
              <option value="10000">10s (dev)</option>
              <option value="30000" selected>30s (recomendado)</option>
              <option value="60000">1min</option>
              <option value="300000">5min</option>
            </select>
          </label>
          <label class="loop-config-item">
            <span>Labels monitoradas</span>
            <input type="text" value="${LOOP_CONFIG.watchLabels.join(", ")}"
              onchange="LOOP_CONFIG.watchLabels = this.value.split(',').map(s=>s.trim())"
              class="loop-input-sm" />
          </label>
          <label class="loop-config-item">
            <span>Auto-approve reads</span>
            <input type="checkbox" ${LOOP_CONFIG.autoApproveReads ? "checked" : ""}
              onchange="LOOP_CONFIG.autoApproveReads = this.checked" />
          </label>
          <label class="loop-config-item">
            <span>Trigger em commits</span>
            <input type="checkbox" ${LOOP_CONFIG.triggerOnPush ? "checked" : ""}
              onchange="LOOP_CONFIG.triggerOnPush = this.checked" />
          </label>
        </div>
      </div>

      <div class="loop-tasks-section">
        <div class="loop-section-title">Tasks em execução</div>
        <div id="loop-tasks-container" class="loop-tasks-container">
          ${LOOP_STATE.currentTask
            ? `<div class="loop-task-active">
                 <i class="fas fa-spinner fa-spin"></i>
                 Executando: "${escHtml(LOOP_STATE.currentTask.title.substring(0,50))}"
               </div>`
            : `<div class="loop-empty"><i class="fas fa-inbox"></i> Nenhuma task em execução</div>`
          }
        </div>
      </div>

      <div class="loop-history-section">
        <div class="loop-section-title">Histórico recente</div>
        ${history.length === 0
          ? `<div class="loop-empty"><i class="fas fa-history"></i> Nenhuma task executada</div>`
          : history.map(t => `
            <div class="loop-history-item loop-history-${t.status}">
              <i class="fas fa-${t.status === 'done' ? 'check-circle' : t.status === 'aborted' ? 'times-circle' : 'clock'}"></i>
              <span>${escHtml(t.title.substring(0,50))}</span>
              <span class="loop-history-time">${t.startedAt?.substring(11,16)}</span>
            </div>
          `).join("")
        }
      </div>

      <div class="loop-stats">
        <span>✅ ${LOOP_STATE.stats.tasksCompleted} concluídas</span>
        <span>❌ ${LOOP_STATE.stats.tasksAborted} abortadas</span>
        <span>🚀 ${LOOP_STATE.stats.deploysTriggered} deploys</span>
        <span>🔄 ${LOOP_STATE.stats.issuesClosed} issues fechadas</span>
      </div>
    </div>
  `;
}

/* ── INIT ─────────────────────────────────────────────────────────── */
function initAutonomousLoop() {
  loopSetPhase("idle");
  addLog("info", "LOOP", "AutonomousLoop v" + LOOP_CONFIG.version + " iniciado.");

  // Escuta eventos do agente para rastrear tools usadas no loop
  Bus.on("log-new", (entry) => {
    if (entry.source === "TOOL" && LOOP_STATE.currentTask) {
      LOOP_STATE.currentTask.steps = LOOP_STATE.currentTask.steps || [];
      LOOP_STATE.currentTask.steps.push({ step: entry.message, time: entry.time });
    }
  });
}
