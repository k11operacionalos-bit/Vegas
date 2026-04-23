/* ═══════════════════════════════════════════════════════════════════
   TITAN v6 — memory-engine.js
   MemoryEngine: substitui stateless do Nga por memória persistente
   Inspirado no memdir + session_store do Claw Code
   Persiste contexto entre reloads, sessões e reinicializações
═══════════════════════════════════════════════════════════════════ */

/* ── CONSTANTES ──────────────────────────────────────────────────── */
const MEM_VERSION   = "6.0";
const MEM_STORE_KEY = "titan_v6_memory";
const MEM_MAX_FACTS = 200;
const MEM_MAX_SESSIONS = 30;
const MEM_MAX_HISTORY_PER_SESSION = 100;

/* ── ESTRUTURA DO MEMORY STORE ──────────────────────────────────── */
/*
  memory_store = {
    version: "6.0",
    facts:         []   ← conhecimento persistente sobre o projeto
    sessions:      []   ← histórico de sessões anteriores (resumos)
    currentSession: {}  ← sessão ativa
    projectCtx:    {}   ← contexto do projeto (repo, stack, preferências)
    snippets:      []   ← snippets reutilizáveis aprendidos
    errors:        []   ← erros recorrentes e suas soluções
  }
*/

let MEM = null; // instância singleton do memory store

/* ── LOAD / SAVE ─────────────────────────────────────────────────── */
function memLoad() {
  try {
    const raw = localStorage.getItem(MEM_STORE_KEY);
    if (raw) {
      MEM = JSON.parse(raw);
      if (MEM.version !== MEM_VERSION) MEM = null; // migração futura
    }
  } catch (_) { MEM = null; }

  if (!MEM) {
    MEM = {
      version: MEM_VERSION,
      facts: [],
      sessions: [],
      currentSession: memNewSession(),
      projectCtx: {},
      snippets: [],
      errors: [],
    };
  }
  addLog("info", "MEMORY", `MemoryEngine carregado — ${MEM.facts.length} fatos, ${MEM.sessions.length} sessões`);
}

function memSave() {
  try {
    // Limita tamanho antes de salvar
    if (MEM.facts.length > MEM_MAX_FACTS)
      MEM.facts = MEM.facts.slice(-MEM_MAX_FACTS);
    if (MEM.sessions.length > MEM_MAX_SESSIONS)
      MEM.sessions = MEM.sessions.slice(-MEM_MAX_SESSIONS);

    localStorage.setItem(MEM_STORE_KEY, JSON.stringify(MEM));
  } catch (e) {
    addLog("warn", "MEMORY", "Falha ao salvar memória: " + e.message);
  }
}

/* ── SESSÃO ──────────────────────────────────────────────────────── */
function memNewSession() {
  return {
    id: "sess-" + Date.now(),
    startedAt: new Date().toISOString(),
    endedAt: null,
    summary: null,
    turns: 0,
    tools_used: [],
    files_touched: [],
    key_decisions: [],
  };
}

function memStartSession() {
  // Arquiva sessão anterior se existia
  if (MEM.currentSession && MEM.currentSession.turns > 0) {
    MEM.sessions.push({ ...MEM.currentSession, endedAt: new Date().toISOString() });
  }
  MEM.currentSession = memNewSession();
  memSave();
}

function memEndSession(summary) {
  if (!MEM || !MEM.currentSession) return;
  MEM.currentSession.endedAt = new Date().toISOString();
  MEM.currentSession.summary = summary || "(sem resumo)";
  MEM.sessions.push({ ...MEM.currentSession });
  MEM.currentSession = memNewSession();
  memSave();
  addLog("success", "MEMORY", "Sessão encerrada e arquivada.");
}

/* ── REGISTRO DE TURNO ───────────────────────────────────────────── */
function memRecordTurn(toolsUsed, filesTouched) {
  if (!MEM || !MEM.currentSession) return;
  MEM.currentSession.turns++;
  if (toolsUsed?.length) {
    toolsUsed.forEach(t => {
      if (!MEM.currentSession.tools_used.includes(t))
        MEM.currentSession.tools_used.push(t);
    });
  }
  if (filesTouched?.length) {
    filesTouched.forEach(f => {
      if (!MEM.currentSession.files_touched.includes(f))
        MEM.currentSession.files_touched.push(f);
    });
  }
  // Salva a cada 5 turnos para não ser lento
  if (MEM.currentSession.turns % 5 === 0) memSave();
}

/* ── FATOS (conhecimento persistente) ───────────────────────────── */
function memAddFact(category, content, source) {
  if (!MEM) return;
  // Evita duplicatas por conteúdo
  const exists = MEM.facts.some(f => f.content === content);
  if (exists) return;

  MEM.facts.push({
    id: "fact-" + Date.now(),
    category: category || "general",
    content,
    source: source || "agent",
    createdAt: new Date().toISOString(),
    uses: 0,
  });
  memSave();
}

function memSearchFacts(query, category) {
  if (!MEM || !query) return [];
  const q = query.toLowerCase();
  return MEM.facts
    .filter(f => {
      const matchCat = !category || f.category === category;
      const matchContent = f.content.toLowerCase().includes(q);
      return matchCat && matchContent;
    })
    .sort((a, b) => b.uses - a.uses)
    .slice(0, 10);
}

function memUseFact(id) {
  if (!MEM) return;
  const f = MEM.facts.find(f => f.id === id);
  if (f) f.uses++;
}

/* ── CONTEXTO DO PROJETO ─────────────────────────────────────────── */
function memSetProjectCtx(key, value) {
  if (!MEM) return;
  MEM.projectCtx[key] = value;
  memSave();
}

function memGetProjectCtx(key) {
  return MEM?.projectCtx?.[key];
}

function memUpdateProjectCtx(partial) {
  if (!MEM) return;
  Object.assign(MEM.projectCtx, partial);
  memSave();
}

/* ── SNIPPETS APRENDIDOS ─────────────────────────────────────────── */
function memSaveSnippet(name, code, language, description) {
  if (!MEM) return;
  const existing = MEM.snippets.findIndex(s => s.name === name);
  const snippet = { name, code, language, description, savedAt: new Date().toISOString() };
  if (existing >= 0) MEM.snippets[existing] = snippet;
  else MEM.snippets.push(snippet);
  memSave();
  addLog("success", "MEMORY", `Snippet salvo: ${name}`);
}

function memGetSnippets(language) {
  if (!MEM) return [];
  return language
    ? MEM.snippets.filter(s => s.language === language)
    : MEM.snippets;
}

/* ── ERROS RECORRENTES ───────────────────────────────────────────── */
function memRecordError(errorMsg, solution, file) {
  if (!MEM) return;
  const key = errorMsg.substring(0, 100);
  const existing = MEM.errors.find(e => e.key === key);
  if (existing) {
    existing.count++;
    existing.lastSeen = new Date().toISOString();
    if (solution) existing.solution = solution;
  } else {
    MEM.errors.push({
      key,
      message: errorMsg,
      solution: solution || null,
      file: file || null,
      count: 1,
      firstSeen: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
    });
  }
  if (MEM.errors.length > 100) MEM.errors = MEM.errors.slice(-100);
  memSave();
}

function memGetRecurringErrors() {
  if (!MEM) return [];
  return MEM.errors.filter(e => e.count > 1).sort((a, b) => b.count - a.count);
}

/* ── CONTEXTO INJETADO NO SYSTEM PROMPT ─────────────────────────── */
function memBuildContextBlock() {
  if (!MEM) return "";
  const lines = [];

  if (Object.keys(MEM.projectCtx).length > 0) {
    lines.push("CONTEXTO DO PROJETO (memória persistente):");
    Object.entries(MEM.projectCtx).forEach(([k, v]) => {
      if (typeof v === "string" || typeof v === "number") {
        lines.push(`  - ${k}: ${v}`);
      }
    });
  }

  if (MEM.sessions.length > 0) {
    const last = MEM.sessions[MEM.sessions.length - 1];
    if (last.summary) {
      lines.push(`\nÚLTIMA SESSÃO (${last.startedAt?.substring(0,10)}):`);
      lines.push(`  ${last.summary}`);
    }
  }

  const recurringErrors = memGetRecurringErrors().slice(0, 3);
  if (recurringErrors.length > 0) {
    lines.push("\nERROS RECORRENTES (não repetir estas soluções):");
    recurringErrors.forEach(e => {
      lines.push(`  - "${e.key}" (${e.count}x)${e.solution ? " → " + e.solution : ""}`);
    });
  }

  const recentFacts = MEM.facts.slice(-5);
  if (recentFacts.length > 0) {
    lines.push("\nFATOS CONHECIDOS:");
    recentFacts.forEach(f => lines.push(`  - [${f.category}] ${f.content}`));
  }

  return lines.length > 0 ? "\n\n" + lines.join("\n") : "";
}

/* ── MEMDIR — export/import como arquivo (Fase 2) ─────────────────── */
function memExport() {
  const data = JSON.stringify(MEM, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `titan-memory-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  addLog("success", "MEMORY", "Memória exportada como .json");
}

function memImport(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const imported = JSON.parse(e.target.result);
      if (imported.version && imported.facts) {
        // Merge: não sobrescreve, une
        const existingIds = new Set(MEM.facts.map(f => f.content));
        imported.facts.forEach(f => {
          if (!existingIds.has(f.content)) MEM.facts.push(f);
        });
        MEM.sessions.push(...(imported.sessions || []).filter(s => s.id));
        Object.assign(MEM.projectCtx, imported.projectCtx || {});
        memSave();
        addLog("success", "MEMORY", `Memória importada: ${imported.facts.length} fatos`);
        showToast("Memória importada com sucesso!", "success");
      }
    } catch (_) {
      showToast("Arquivo de memória inválido.", "error");
    }
  };
  reader.readAsText(file);
}

function memClear() {
  MEM = {
    version: MEM_VERSION,
    facts: [],
    sessions: [],
    currentSession: memNewSession(),
    projectCtx: {},
    snippets: [],
    errors: [],
  };
  memSave();
  addLog("warn", "MEMORY", "Memória resetada.");
}

/* ── STATS ────────────────────────────────────────────────────────── */
function memGetStats() {
  if (!MEM) return null;
  return {
    facts: MEM.facts.length,
    sessions: MEM.sessions.length,
    currentTurns: MEM.currentSession?.turns || 0,
    snippets: MEM.snippets.length,
    errors: MEM.errors.length,
    projectKeys: Object.keys(MEM.projectCtx).length,
    sizeKB: Math.round(JSON.stringify(MEM).length / 1024),
  };
}

/* ── AUTO-EXTRAÇÃO DE FATOS DO HISTÓRICO ─────────────────────────── */
function memAutoExtract(agentResponse) {
  if (!agentResponse || typeof agentResponse !== "string") return;
  // Extrai padrões comuns do agente
  const patterns = [
    { re: /repo[sitorório]* é ([^\n.]+)/i,   cat: "repo" },
    { re: /stack[:\s]+([^\n.]+)/i,           cat: "stack" },
    { re: /deploy em ([^\n.]+)/i,            cat: "deploy" },
    { re: /banco de dados[:\s]+([^\n.]+)/i,  cat: "database" },
    { re: /versão[:\s]+([\d.]+)/i,           cat: "version" },
    { re: /branch principal[:\s]+(\w+)/i,    cat: "git" },
  ];

  patterns.forEach(({ re, cat }) => {
    const match = agentResponse.match(re);
    if (match && match[1]) {
      memAddFact(cat, match[1].trim().substring(0, 200), "auto-extract");
    }
  });
}

/* ── INIT ─────────────────────────────────────────────────────────── */
function initMemoryEngine() {
  memLoad();
  memStartSession();
  addLog("info", "MEMORY", `MemoryEngine v${MEM_VERSION} iniciado. Sessão: ${MEM.currentSession.id}`);

  // Salva sessão ao fechar a página
  window.addEventListener("beforeunload", () => {
    if (MEM.currentSession.turns > 0) {
      MEM.currentSession.endedAt = new Date().toISOString();
      MEM.sessions.push({ ...MEM.currentSession });
      memSave();
    }
  });
}
