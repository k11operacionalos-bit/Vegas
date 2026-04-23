/* ═══════════════════════════════════════════════════════════════════
   TITAN v5 — tabs.js
   Tab system, navigation, badges, conn status, dashboard render
═══════════════════════════════════════════════════════════════════ */

const TABS_CONFIG = [
  { id:"dashboard", icon:"fas fa-th-large",              label:"Dashboard",  badge:null },
  { id:"github",    icon:"fab fa-github",                label:"GitHub",     badge:null },
  { id:"render",    icon:"fas fa-server",                label:"Render",     badge:null },
  { id:"supabase",  icon:"fas fa-database",              label:"Supabase",   badge:null },
  { id:"agent",     icon:"fas fa-robot",                 label:"Agente",     badge:"agent-badge" },
  { id:"editor",    icon:"fas fa-code",                  label:"Editor",     badge:"editor-badge" },
  { id:"skills",    icon:"fas fa-puzzle-piece",          label:"Skills",     badge:null },
  { id:"claw",      icon:"fas fa-bolt",                  label:"Claw v6",    badge:"claw-badge-tab" },
  { id:"logs",      icon:"fas fa-terminal",              label:"Logs",       badge:"log-count-badge" },
  { id:"errors",    icon:"fas fa-exclamation-triangle",  label:"Erros",      badge:"errors-badge" },
  { id:"approvals", icon:"fas fa-shield-alt",            label:"Aprovações", badge:"pending-badge" },
];

/* ── BUILD TABS ─────────────────────────────────────────────────── */
function buildTabs(){
  const tabsEl  = _el("tabs");
  const btEl    = _el("bottom-tabs-inner");
  if(!tabsEl) return;

  // Sidebar tabs
  tabsEl.innerHTML = TABS_CONFIG.map(tab=>`
    <div class="tab-item" id="tab-${tab.id}" onclick="switchTab('${tab.id}')">
      <div class="tab-icon"><i class="${tab.icon}"></i></div>
      <div class="tab-label">${tab.label}</div>
      ${tab.badge?`<span id="${tab.badge}" class="tab-badge" style="display:none;"></span>`:""}
    </div>`).join("");

  // Bottom mobile tabs (most important only)
  if(btEl){
    const mobileTabs = ["dashboard","github","agent","editor","skills"];
    btEl.innerHTML = mobileTabs.map(id=>{
      const tab = TABS_CONFIG.find(t=>t.id===id);
      if(!tab) return "";
      return `<div class="bottom-tab" id="btab-${tab.id}" onclick="switchTab('${tab.id}')">
        <i class="${tab.icon}"></i>
        <span>${tab.label}</span>
        ${tab.badge?`<span id="b${tab.badge}" class="btab-badge" style="display:none;"></span>`:""}
      </div>`;
    }).join("");
  }
}

/* ── SWITCH TAB ─────────────────────────────────────────────────── */
function switchTab(tabId){
  STATE.tab = tabId;
  closeSidebar();

  // Update panel visibility
  _qsa(".panel").forEach(p=>p.classList.remove("active"));
  const panel = _el("panel-"+tabId);
  if(panel) panel.classList.add("active");

  // Update sidebar tabs
  _qsa(".tab-item").forEach(t=>t.classList.remove("active"));
  const ti = _el("tab-"+tabId); if(ti) ti.classList.add("active");

  // Update bottom tabs
  _qsa(".bottom-tab").forEach(t=>t.classList.remove("active"));
  const bti = _el("btab-"+tabId); if(bti) bti.classList.add("active");

  // Tab-specific actions
  switch(tabId){
    case "dashboard":  renderDashboard(); break;
    case "github":     renderGitHubPanel(); break;
    case "render":     renderRenderPanel(); break;
    case "supabase":   renderSupabasePanel(); break;
    case "agent":      scrollChatToBottom(); updateAgentModelBadge(); break;
    case "editor":     renderEditorTab(); break;
    case "skills":     /* already built */ break;
    case "logs":       renderLogsTab(); break;
    case "errors":     renderErrors(); break;
    case "approvals":  renderApprovals(); break;
    case "claw":       renderClawTab(); break;
  }
}

function scrollChatToBottom(){
  const msgs=_el("chat-messages"); if(msgs) msgs.scrollTop=msgs.scrollHeight;
}

function updateAgentModelBadge(){
  const mb=_el("agent-model-badge"); if(mb) mb.textContent=MODEL;
}

/* ── UPDATE BADGES ──────────────────────────────────────────────── */
function updateBadges(){
  // Log count
  const lb=_el("log-count-badge"); const blb=_el("blog-count-badge");
  const lc=STATE.logs.length;
  if(lb){ lb.textContent=lc>99?"99+":lc; lb.style.display=lc>0?"inline-block":"none"; }

  // Errors
  const eb=_el("errors-badge"); const beb=_el("berrors-badge");
  const ec=STATE.errors.length;
  if(eb){ eb.textContent=ec>99?"99+":ec; eb.style.display=ec>0?"inline-block":"none"; eb.className="tab-badge"+(ec>0?" red":""); }

  // Pending approvals
  const pb=_el("pending-badge"); const bpb=_el("bpending-badge");
  const pc=STATE.pending.length;
  if(pb){ pb.textContent=pc; pb.style.display=pc>0?"inline-block":"none"; pb.className="tab-badge"+(pc>0?" yellow":""); }
  _el("pending-count")?.textContent&&(_el("pending-count").textContent=pc>0?`${pc} pendente${pc>1?"s":""}`:"");

  // Editor modified files
  const edb=_el("editor-badge");
  const mc=STATE.modifiedFiles.size;
  if(edb){ edb.textContent=mc; edb.style.display=mc>0?"inline-block":"none"; }
}
Bus.on("badges-update", updateBadges);

/* ── CONN STATUS ────────────────────────────────────────────────── */
function updateConnStatus(){
  const cs = _el("conn-status"); if(!cs) return;
  const items = [];
  if(KEYS.anthropic) items.push(`<span class="conn-item ok"><i class="fas fa-brain"></i> Claude</span>`);
  if(KEYS.github)    items.push(`<span class="conn-item ok"><i class="fab fa-github"></i> GitHub</span>`);
  if(KEYS.render)    items.push(`<span class="conn-item ok"><i class="fas fa-server"></i> Render</span>`);
  if(KEYS.supabase)  items.push(`<span class="conn-item ok"><i class="fas fa-database"></i> Supabase</span>`);
  if(!items.length)  items.push(`<span class="conn-item none"><i class="fas fa-unlink"></i> Sem conexões</span>`);
  cs.innerHTML = items.join("");
}
Bus.on("status-update", updateConnStatus);

/* ── DASHBOARD ──────────────────────────────────────────────────── */
function renderDashboard(){
  renderDashMetrics();
  renderDashBars();
  renderWorkflows();
  renderDashLogPreview();
}

function renderDashMetrics(){
  const el = _el("dash-metrics"); if(!el) return;
  const g=STATE.ghStatus, r=STATE.renderStatus, sb=STATE.sbStatus;
  el.innerHTML = [
    metricBox("GITHUB",g.sha&&g.sha!=="—"?g.sha:"—",COLORS.accent,g.branch,"fab fa-github"),
    metricBox("CI / CD",g.ci&&g.ci!=="—"?g.ci:"sem dados",statusColor(g.ci||""),g.openPRs+"PRs | "+g.issues+"issues","fas fa-bolt"),
    metricBox("RENDER",r.status,statusColor(r.status),r.lastDeploy,"fas fa-server"),
    metricBox("SUPABASE",sb.status,statusColor(sb.status),sb.latency?sb.latency+"ms latência":"","fas fa-database"),
    metricBox("ERROS",STATE.errors.length,STATE.errors.length>0?COLORS.red:COLORS.green,STATE.pending.length+" aprovações pendentes","fas fa-exclamation-triangle"),
    metricBox("REPO",g.stars&&g.stars!==0?"⭐ "+g.stars:"—",COLORS.yellow,g.lang,"fab fa-github"),
  ].join("");
}

function renderDashBars(){
  const el = _el("dash-bars"); if(!el) return;
  // Simulated metrics (replace with real data if available)
  const cpu  = STATE.metrics.cpu  ?? Math.floor(Math.random()*40+20);
  const mem  = STATE.metrics.mem  ?? Math.floor(Math.random()*30+40);
  const disk = STATE.metrics.disk ?? Math.floor(Math.random()*20+30);
  el.innerHTML = [
    progressBar("CPU",cpu,cpuColor(cpu)),
    progressBar("MEMÓRIA",mem,mem>80?COLORS.red:mem>60?COLORS.yellow:COLORS.cyan),
    progressBar("DISCO",disk,disk>80?COLORS.red:COLORS.accent),
    progressBar("REDE",Math.floor(Math.random()*20+5),COLORS.green),
  ].join("");
}

function renderWorkflows(){
  const el = _el("workflows-list"); if(!el) return;
  if(!STATE.workflows.length){
    el.innerHTML=`<div class="empty-state"><span class="empty-icon"><i class="fas fa-bolt" style="font-size:22px;"></i></span><span class="empty-text">${KEYS.github?"Sem workflows recentes":"Configure GitHub para ver CI/CD"}</span></div>`;
    return;
  }
  el.innerHTML = STATE.workflows.slice(0,6).map(w=>
    listRow(statusColor(w.status),w.status==="running",w.name,`${w.status} · ${w.duration} · ${w.ago}`,
      `<span class="wf-badge" style="color:${statusColor(w.status)};font-size:9px;">${escHtml(w.status)}</span>`)
  ).join("");
}

function renderDashLogPreview(){
  const el = _el("dash-log-preview"); if(!el) return;
  const recent = STATE.logs.slice(-6).reverse();
  if(!recent.length){ el.innerHTML=`<div class="empty-state"><span class="empty-text">Nenhum log ainda</span></div>`; return; }
  el.innerHTML = recent.map(l=>`
    <div class="log-entry-mini">
      <span class="log-time">${l.time}</span>
      <span class="log-src" style="color:${levelColor(l.level)}">[${escHtml(l.source)}]</span>
      <span class="log-msg" style="color:${l.level==="error"?COLORS.red:l.level==="warn"?COLORS.yellow:l.level==="success"?COLORS.green:COLORS.text}">${escHtml(l.message.substring(0,80))}</span>
    </div>`).join("");
}
Bus.on("log-new",()=>{ if(STATE.tab==="dashboard") renderDashLogPreview(); });
Bus.on("status-update",()=>{ if(STATE.tab==="dashboard") renderDashboard(); });

/* ── GITHUB PANEL ───────────────────────────────────────────────── */
function renderGitHubPanel(){
  renderGitHubMetrics();
  renderPRList();
  renderIssuesList();
  renderCommitsList();
}

function renderGitHubMetrics(){
  const el = _el("github-metrics"); if(!el) return;
  const g=STATE.ghStatus;
  el.innerHTML=[
    metricBox("BRANCH",g.branch||"—",COLORS.accent,g.sha!=="—"?`SHA: ${g.sha}`:"","fas fa-code-branch"),
    metricBox("ÚLTIMO COMMIT",g.lastCommit?.substring(0,30)||"—",COLORS.text,timeAgo(g.updatedAt),"fas fa-git-alt"),
    metricBox("CI / CD",g.ci||"—",statusColor(g.ci||""),`${g.openPRs} PRs | ${g.issues} issues`,"fas fa-bolt"),
    metricBox("STARS / FORKS",g.stars!==undefined?`⭐${g.stars} 🍴${g.forks}`:"—",COLORS.yellow,g.lang,"fab fa-github"),
  ].join("");
}

function renderPRList(){
  const el = _el("pr-list"); if(!el) return;
  if(!STATE.prs.length){ el.innerHTML=`<div class="empty-state"><span class="empty-text">${KEYS.github?"Nenhum PR aberto":"Configure GitHub"}</span></div>`; return; }
  el.innerHTML = STATE.prs.map(pr=>
    listRow(COLORS.green,false,`#${pr.number} ${pr.title}`,`${pr.head.ref} → ${pr.base.ref} | ${pr.user.login} · ${timeAgo(pr.created_at)}`,
      `<a href="${pr.html_url}" target="_blank" class="row-link"><i class="fas fa-external-link-alt"></i></a>`)
  ).join("");
}

function renderIssuesList(){
  const el = _el("issues-list"); if(!el) return;
  if(!STATE.issues.length){ el.innerHTML=`<div class="empty-state"><span class="empty-text">${KEYS.github?"Nenhuma issue aberta":"Configure GitHub"}</span></div>`; return; }
  el.innerHTML = STATE.issues.map(issue=>{
    const labels = (issue.labels||[]).map(l=>`<span class="label-tag" style="background:${l.color?`#${l.color}22`:COLORS.accentDim};color:${l.color?`#${l.color}`:COLORS.accent};">${escHtml(l.name)}</span>`).join("");
    return listRow(COLORS.red,false,`#${issue.number} ${issue.title}`,`${issue.user.login} · ${timeAgo(issue.created_at)}`,
      `<div style="display:flex;gap:3px;flex-wrap:wrap;">${labels}</div>`);
  }).join("");
}

function renderCommitsList(){
  const el = _el("commits-list"); if(!el) return;
  if(!STATE.commits.length){ el.innerHTML=`<div class="empty-state"><span class="empty-text">${KEYS.github?"Sem commits":"Configure GitHub"}</span></div>`; return; }
  el.innerHTML = STATE.commits.map(c=>
    listRow(COLORS.cyan,false,
      c.commit.message.split("\n")[0],
      `${c.sha.substring(0,7)} · ${c.commit.author.name} · ${timeAgo(c.commit.author.date)}`,
      `<a href="${c.html_url}" target="_blank" class="row-link"><i class="fas fa-external-link-alt"></i></a>`)
  ).join("");
}

Bus.on("status-update",()=>{
  if(STATE.tab==="github") renderGitHubPanel();
});

/* ── RENDER PANEL ───────────────────────────────────────────────── */
function renderRenderPanel(){
  const el=_el("render-metrics"); if(!el) return;
  const r=STATE.renderStatus;
  el.innerHTML=[
    metricBox("STATUS",r.status,statusColor(r.status),r.lastDeploy,"fas fa-server"),
    metricBox("URL",r.url&&r.url!=="—"?"Ver site":"—",COLORS.accent,r.region,"fas fa-globe"),
    metricBox("ÚLTIMO DEPLOY",r.lastDeploy||"—",COLORS.yellow,"","fas fa-rocket"),
    metricBox("REGIÃO",r.region||"—",COLORS.cyan,"","fas fa-map-marker-alt"),
  ].join("");

  const bars = _el("render-bars"); if(bars){
    bars.innerHTML=[
      progressBar("CPU",Math.floor(Math.random()*40+10),COLORS.green),
      progressBar("MEMÓRIA",Math.floor(Math.random()*30+30),COLORS.cyan),
      progressBar("REQUESTS/s",Math.floor(Math.random()*20+5),COLORS.accent,"rps"),
    ].join("");
  }
}

/* ── SUPABASE PANEL ─────────────────────────────────────────────── */
function renderSupabasePanel(){
  const el=_el("sb-metrics"); if(!el) return;
  const sb=STATE.sbStatus;
  el.innerHTML=[
    metricBox("STATUS",sb.status,statusColor(sb.status),sb.latency?sb.latency+"ms":"","fas fa-database"),
    metricBox("TABELAS",sb.tables||"—",COLORS.accent,"","fas fa-table"),
    metricBox("LATÊNCIA",sb.latency?sb.latency+"ms":"—",sb.latency>200?COLORS.red:sb.latency>100?COLORS.yellow:COLORS.green,"","fas fa-tachometer-alt"),
    metricBox("CONEXÕES",sb.connections||"—",COLORS.purple,"","fas fa-plug"),
  ].join("");
}

/* ══════════════════════════════════════════════════════════════════
   CLAW TAB — renderiza o painel da fusão Nga + Claw Code
══════════════════════════════════════════════════════════════════ */
function renderClawTab(){
  // Atualiza badge do provider
  updateClawStatusBadge?.();
  updateProviderBtns();
  renderMemoryStats();
  renderCostPanelContainer();
  renderLoopPanelContainer();
  updateCostBadge?.();
  // Atualiza badge da aba Claw com estado do loop
  const cb = _el("claw-badge-tab");
  if(cb){
    const loopActive = (typeof LOOP_STATE!=='undefined') && LOOP_STATE.active;
    cb.textContent = loopActive ? "AUTO" : "";
    cb.style.display = loopActive ? "inline-block" : "none";
  }
}

/* ── MEMORY STATS ───────────────────────────────────────────────── */
function renderMemoryStats(){
  const el = _el("memory-stats-display");
  if(!el) return;
  const stats = (typeof memGetStats==='function') ? memGetStats() : null;
  if(!stats){
    el.innerHTML = `<div style="color:#2e4560;font-size:11px;text-align:center;padding:8px;">MemoryEngine não iniciado</div>`;
    return;
  }
  el.innerHTML = `
    <div class="mem-stats-grid">
      ${metricBox("Fatos",stats.facts,COLORS.purple,"knowledge","fas fa-lightbulb")}
      ${metricBox("Sessões",stats.sessions,COLORS.cyan,"históricas","fas fa-history")}
      ${metricBox("Turnos",stats.currentTurns,COLORS.green,"sessão atual","fas fa-comments")}
      ${metricBox("Tamanho",stats.sizeKB+"KB",COLORS.yellow,"localStorage","fas fa-hdd")}
    </div>`;

  // Renderiza fatos recentes
  const factsEl = _el("memory-facts-list");
  if(factsEl && typeof MEM!=='undefined' && MEM){
    const recentFacts = (MEM.facts||[]).slice(-8).reverse();
    if(!recentFacts.length){
      factsEl.innerHTML = `<div class="loop-empty"><i class="fas fa-brain"></i> Nenhum fato ainda. Converse com o agente para popular a memória.</div>`;
    } else {
      factsEl.innerHTML = recentFacts.map(f=>`
        <div class="mem-fact-item">
          <span class="mem-fact-cat" style="color:${COLORS.purple};">[${escHtml(f.category||'geral')}]</span>
          <span class="mem-fact-content">${escHtml(f.content.substring(0,120))}</span>
          <span class="mem-fact-date">${f.createdAt?f.createdAt.substring(0,10):''}</span>
        </div>`).join("");
    }
    // Botão de importar memória
    if(!_el("mem-import-btn")){
      const importBtn = document.createElement("button");
      importBtn.id = "mem-import-btn";
      importBtn.className = "btn-mem btn-mem--import";
      importBtn.innerHTML = `<i class="fas fa-upload"></i> Importar`;
      importBtn.onclick = ()=>{ const inp=document.createElement("input"); inp.type="file"; inp.accept=".json"; inp.onchange=e=>memImport?.(e.target.files[0]); inp.click(); };
      const ctrl = factsEl.closest(".memory-panel")?.querySelector(".memory-controls");
      if(ctrl) ctrl.appendChild(importBtn);
    }
  }
}

/* ── COST PANEL CONTAINER ───────────────────────────────────────── */
function renderCostPanelContainer(){
  const el = _el("cost-panel-container");
  if(!el) return;
  el.innerHTML = (typeof renderCostPanel==='function') ? renderCostPanel() : `<div style="color:#2e4560;font-size:11px;text-align:center;padding:16px;">CostTracker não iniciado</div>`;
}

/* ── LOOP PANEL CONTAINER ───────────────────────────────────────── */
function renderLoopPanelContainer(){
  const el = _el("loop-panel-container");
  if(!el) return;
  el.innerHTML = (typeof renderLoopPanel==='function') ? renderLoopPanel() : `<div style="color:#2e4560;font-size:11px;text-align:center;padding:16px;">AutonomousLoop não iniciado</div>`;
  updateLoopStatusUI?.();
}

/* ── PROVIDER BUTTONS ───────────────────────────────────────────── */
function updateProviderBtns(){
  if(typeof CLAW_STATE==='undefined') return;
  const mode = CLAW_STATE.mode;
  const btns = { claude:"pb-claude", ollama:"pb-ollama", "claw-local":"pb-claw" };
  Object.entries(btns).forEach(([m, id])=>{
    const btn = _el(id);
    if(!btn) return;
    btn.classList.toggle("provider-btn--active", m === mode);
  });

  // Atualiza lista de modelos Ollama
  const modelsEl = _el("claw-models-list");
  if(modelsEl){
    if(CLAW_STATE.ollamaOnline && CLAW_STATE.availableModels.length){
      modelsEl.innerHTML = `<i class="fas fa-check-circle" style="color:#0fd98a;margin-right:4px;"></i>Ollama online — Modelos: ${CLAW_STATE.availableModels.map(m=>`<code style="background:#0d1420;border-radius:3px;padding:1px 5px;">${escHtml(m)}</code>`).join(" ")}`;
    } else if(mode==="ollama" && !CLAW_STATE.ollamaOnline){
      modelsEl.innerHTML = `<i class="fas fa-exclamation-circle" style="color:#f43060;margin-right:4px;"></i>Ollama offline — <a href="https://ollama.ai" target="_blank" style="color:#2f78f0;">instale em ollama.ai</a> e execute <code style="background:#0d1420;border-radius:3px;padding:1px 5px;">ollama pull qwen2.5-coder</code>`;
    } else {
      modelsEl.innerHTML = "";
    }
  }

  // Re-render loop status after provider change
  updateLoopStatusUI?.();
}

/* ── TRIGGER CLAW TOOL ──────────────────────────────────────────── */
function triggerClawTool(toolShortName){
  const prompts = {
    ultraplan:  "Use claw_ultraplan para decompor a próxima task em um plano detalhado. Qual objetivo você quer planejar?",
    bughunter:  "Use claw_bughunter para analisar o código em memória. Primeiro liste os arquivos com github_list_files, carregue o principal e então faça o scan de bugs.",
    teleport:   "Use claw_teleport para buscar um símbolo ou função. O que você quer encontrar nos arquivos carregados?",
    memread:    "Use claw_memread para ler tudo que está na memória persistente desta sessão e resumir o contexto do projeto.",
    provider:   "Use claw_provider com action=status para verificar o estado do backend LLM e mostrar estatísticas de uso.",
  };
  const prompt = prompts[toolShortName];
  if(prompt){
    switchTab("agent");
    setTimeout(()=>{ setAgentPrompt(prompt); }, 150);
  }
}
