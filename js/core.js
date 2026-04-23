/* ═══════════════════════════════════════════════════════════════════
   TITAN v5 — core.js
   Global state, constants, helpers, event bus, data fetch
   Ecosistema completo no nível do claw-code
   Linguagem original do TITAN preservada e elevada
═══════════════════════════════════════════════════════════════════ */

const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";
let   MODEL         = "claude-sonnet-4-6";
const VERSION       = "6.0-fused"; // Nga + Claw Code

const COLORS = {
  green:"#0fd98a",  greenDim:"rgba(15,217,138,0.10)",
  red:"#f43060",    redDim:"rgba(244,48,96,0.10)",
  yellow:"#f5a623", yellowDim:"rgba(245,166,35,0.10)",
  cyan:"#18d4f0",   cyanDim:"rgba(24,212,240,0.08)",
  purple:"#9c7df5", purpleDim:"rgba(156,125,245,0.10)",
  accent:"#2f78f0", accentDim:"rgba(47,120,240,0.10)",
  copper:"#d97757", copperDim:"rgba(217,119,87,0.12)",
  text:"#c4d4e8",   textDim:"#2e4560", textMid:"#6888aa",
  blue:"#3b82f6",   orange:"#f97316",
};

/* ── API KEYS ──────────────────────────────────────────────────── */
const KEYS = {
  anthropic:"", github:"", githubRepo:"", githubBranch:"main",
  render:"", renderService:"", supabaseUrl:"", supabase:"",
  githubUser:"", githubAvatar:"", githubToken:"",
  openai:"", vercel:"", netlify:""
};
const KEY_STATUS = { anthropic:"none", github:"none", render:"none", supabase:"none" };

function loadKeys(){
  try {
    const saved = JSON.parse(localStorage.getItem("titan_v5_keys")||"{}");
    Object.assign(KEYS, saved);
    const old = JSON.parse(localStorage.getItem("titan_api_keys")||"{}");
    if(old.anthropic && !KEYS.anthropic) Object.assign(KEYS, old);
    if(saved.model) MODEL = saved.model;
  } catch(e){}
}
function persistKeys(){
  const toSave = {...KEYS, model:MODEL};
  localStorage.setItem("titan_v5_keys", JSON.stringify(toSave));
}
function isConfigured(){ return KEYS.anthropic.length > 10; }

/* ── GLOBAL STATE ──────────────────────────────────────────────── */
const STATE = {
  tab: "dashboard",
  sidebarOpen: false,
  metrics:      { cpu:null, mem:null, disk:null, net:null },
  ghStatus:     { branch:"—", lastCommit:"—", sha:"—", ci:"—", openPRs:"—", issues:"—", url:"—", stars:0, forks:0, lang:"—", description:"" },
  renderStatus: { status:"—", uptime:"—", url:"—", lastDeploy:"—", region:"—" },
  sbStatus:     { status:"—", latency:null, tables:"—", rows:"—", storage:"—", connections:"—" },
  workflows:[], prs:[], issues:[], commits:[],
  logs:[], errors:[],
  pending:[],
  notifications:[],
  agentMsgs:[ {
    role:"assistant",
    text:`# ⚡ TITAN Super Agent v6\n\nOlá! Sou o agente autônomo de DevOps — fusão **Nga + Claw Code**.\n\nCapacidades ativas:\n- 📁 **Navegar e editar** repositórios GitHub\n- ⚡ **Monitorar CI/CD** e deploys em tempo real\n- 🐛 **Analisar e corrigir** erros automaticamente\n- 🚀 **Disparar deploys** no Render / Vercel / Netlify\n- 🗄️ **Consultar dados** no Supabase\n- 🎨 **Criar arte** e assets com as Skills\n- 📊 **Gerar relatórios** completos de status\n- 🧠 **Memória cross-sessão** — lembro decisões anteriores\n- ⚡ **UltraPlan** — decomposição profunda de tasks\n- 🔍 **BugHunter** — scan automático de bugs/vulnerabilidades\n- 🔭 **Teleport** — navegação instantânea por símbolo\n- 🔌 **Multi-provider** — Claude / Ollama local / Claw CLI\n- 🤖 **Loop Autônomo** — plan→execute→test→deploy\n\nConfigure suas API Keys em **⚙ KEYS** e me diga o que fazer!`
  } ],
  agentHistory:[], agentLoading:false,
  files:{}, activeFile:null, modifiedFiles:new Set(),
  _fileShas:{}, _fileTreePath:"", openTabs:[],
  lastAlertMsg:null,
  logFilter:"all",
  activeSkill:null,
  theme:"dark",
  searchHistory:[],
  bookmarks:[],
  snippets:[],
  terminalHistory:[],
  terminalHistoryIdx:-1,

  // v6 — novos estados da fusão Nga + Claw
  clawBridge: {
    online: false,
    ollamaOnline: false,
    mode: "claude",
    availableModels: [],
  },
  loopActive: false,
  loopPhase: "idle",
  memoryStats: null,
  costToday: 0,
};

/* ── EVENT BUS ─────────────────────────────────────────────────── */
const Bus = {
  _l:{},
  on(e,fn)  { (this._l[e]=this._l[e]||[]).push(fn); },
  off(e,fn) { this._l[e]=(this._l[e]||[]).filter(f=>f!==fn); },
  emit(e,d) { (this._l[e]||[]).slice().forEach(fn=>{ try{ fn(d); }catch(err){ console.warn("Bus error",e,err); } }); },
};

/* ── HELPERS ───────────────────────────────────────────────────── */
function escHtml(s){
  return String(s??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
function escAttr(s){ return String(s??"").replace(/'/g,"\\'").replace(/[<>]/g,""); }
function _el(id){ return document.getElementById(id); }
function _qs(sel, ctx){ return (ctx||document).querySelector(sel); }
function _qsa(sel, ctx){ return [...(ctx||document).querySelectorAll(sel)]; }

function statusColor(s=""){
  const l = s.toLowerCase();
  if(/live|ok|success|passing|connected|active|online/.test(l)) return COLORS.green;
  if(/fail|error|down|crash|critical/.test(l))                   return COLORS.red;
  if(/pending|running|deploy|building|warn|high|queued/.test(l)) return COLORS.yellow;
  if(/medium|partial/.test(l))                                    return COLORS.cyan;
  return COLORS.purple;
}
function levelColor(lvl){
  return {info:COLORS.cyan,warn:COLORS.yellow,error:COLORS.red,success:COLORS.green,agent:COLORS.purple}[lvl]||COLORS.text;
}
function timePT(){
  return new Date().toLocaleTimeString("pt-BR",{hour12:false});
}
function badge(text,color){
  const c = color||statusColor(text);
  return `<span class="badge" style="background:${c}18;color:${c};border:1px solid ${c}28;">${escHtml(text)}</span>`;
}
function dot(color,pulse=false){
  return `<span class="dot${pulse?" pulse":""}" style="background:${color};${pulse?`box-shadow:0 0 7px ${color};`:""}"></span>`;
}
function metricBox(label,value,color,sub,icon=""){
  const c = color||COLORS.text;
  return `<div class="metric-box">
    <div class="m-label">${icon?`<i class="${icon}" style="margin-right:5px;opacity:.6;"></i>`:""}${escHtml(label)}</div>
    <div class="m-value" style="color:${c}">${escHtml(String(value??'—'))}</div>
    ${sub?`<div class="m-sub">${escHtml(sub)}</div>`:""}
  </div>`;
}
function progressBar(label,value,color,sub=""){
  const c = color||COLORS.accent;
  const v = Math.min(100,Math.max(0,Math.round(value||0)));
  const segColor = v>80?COLORS.red:v>60?COLORS.yellow:c;
  return `<div class="progress-wrap">
    <div class="progress-header"><span>${escHtml(label)}</span><span style="color:${segColor}">${v}% ${sub?`<small style="opacity:.6">${sub}</small>`:""}</span></div>
    <div class="progress-track"><div class="progress-fill" style="width:${v}%;background:${segColor};transition:width .6s ease;"></div></div>
  </div>`;
}
function listRow(dc,pulse,title,sub,right){
  return `<div class="list-row">
    ${dot(dc,pulse)}
    <div class="row-main">
      <div class="row-title">${escHtml(title)}</div>
      ${sub?`<div class="row-sub">${escHtml(sub)}</div>`:""}
    </div>
    ${right||""}
  </div>`;
}
function cpuColor(cpu){ return cpu>80?COLORS.red:cpu>60?COLORS.yellow:COLORS.green; }
function timeAgo(dateStr){
  if(!dateStr) return "—";
  const diff = Date.now()-new Date(dateStr).getTime();
  const mins = Math.floor(diff/60000);
  if(mins<1)  return "agora";
  if(mins<60) return `há ${mins}min`;
  const hrs = Math.floor(mins/60);
  if(hrs<24)  return `há ${hrs}h`;
  return `há ${Math.floor(hrs/24)}d`;
}
function langFromPath(path=""){
  const ext = (path.split(".").pop()||"").toLowerCase();
  const map = {
    js:"JavaScript",ts:"TypeScript",jsx:"JSX",tsx:"TSX",
    py:"Python",rs:"Rust",go:"Go",java:"Java",c:"C",cpp:"C++",cs:"C#",
    css:"CSS",scss:"SCSS",less:"LESS",html:"HTML",json:"JSON",
    md:"Markdown",yml:"YAML",yaml:"YAML",
    sh:"Shell",bash:"Shell",toml:"TOML",
    sql:"SQL",graphql:"GraphQL",svelte:"Svelte",vue:"Vue",
    rb:"Ruby",php:"PHP",kt:"Kotlin",swift:"Swift",dart:"Dart",
    xml:"XML",env:"ENV",gitignore:"Git",
  };
  return map[ext]||ext.toUpperCase()||"TEXT";
}

function formatBytes(bytes){
  if(!bytes) return "0 B";
  const k=1024, dm=2, sizes=["B","KB","MB","GB","TB"];
  const i=Math.floor(Math.log(bytes)/Math.log(k));
  return parseFloat((bytes/Math.pow(k,i)).toFixed(dm))+" "+sizes[i];
}

function copyToClipboard(text,msg="Copiado!"){
  navigator.clipboard.writeText(text).then(()=>showToast(msg,"success")).catch(()=>{
    const ta=document.createElement("textarea"); ta.value=text;
    document.body.appendChild(ta); ta.select(); document.execCommand("copy");
    document.body.removeChild(ta); showToast(msg,"success");
  });
}

function showToast(msg,type="info"){
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<i class="fas fa-${type==="success"?"check-circle":type==="error"?"exclamation-circle":"info-circle"}"></i> ${escHtml(msg)}`;
  const container = _el("toast-container")||document.body;
  container.appendChild(toast);
  setTimeout(()=>toast.classList.add("show"),10);
  setTimeout(()=>{ toast.classList.remove("show"); setTimeout(()=>toast.remove(),300); },3000);
}

function debounce(fn,ms){
  let t; return function(...args){ clearTimeout(t); t=setTimeout(()=>fn.apply(this,args),ms); };
}

/* ── MARKED CONFIG ─────────────────────────────────────────────── */
if(window.marked){
  marked.setOptions({
    breaks: true, gfm: true,
    highlight: function(code,lang){
      if(window.hljs && lang && hljs.getLanguage(lang)){
        return hljs.highlight(code,{language:lang}).value;
      }
      return code;
    }
  });
}
function renderMarkdown(text){
  if(!window.marked) return escHtml(text).replace(/\n/g,"<br>");
  try { return marked.parse(text||""); }
  catch(e){ return escHtml(text); }
}

/* ── LOG SYSTEM ────────────────────────────────────────────────── */
function addLog(level,source,message){
  const entry = {id:Date.now()+Math.random(),level,source,message,time:timePT()};
  STATE.logs.push(entry);
  if(STATE.logs.length>1000) STATE.logs=STATE.logs.slice(-1000);
  if(level==="error"){
    STATE.errors.push(entry);
    if(STATE.errors.length>200) STATE.errors=STATE.errors.slice(-200);
    Bus.emit("critical-error",entry);
  }
  Bus.emit("log-new",entry);
  Bus.emit("badges-update");
}

/* ── DATA FETCH ────────────────────────────────────────────────── */
async function fetchGitHubStatus(){
  if(!KEYS.github||!KEYS.githubRepo) return;
  const repo = KEYS.githubRepo;
  const headers = { Authorization:"Bearer "+KEYS.github, Accept:"application/vnd.github+json" };
  try {
    addLog("info","GITHUB",`Buscando: ${repo}`);
    const [repoData, prsData, issuesData] = await Promise.all([
      fetch(`https://api.github.com/repos/${repo}`,{headers}).then(r=>r.json()),
      fetch(`https://api.github.com/repos/${repo}/pulls?state=open&per_page=10`,{headers}).then(r=>r.json()),
      fetch(`https://api.github.com/repos/${repo}/issues?state=open&per_page=10`,{headers}).then(r=>r.json()),
    ]);
    const branch = repoData.default_branch||KEYS.githubBranch||"main";
    KEYS.githubBranch = branch;
    const commitData = await fetch(`https://api.github.com/repos/${repo}/commits?sha=${branch}&per_page=10`,{headers}).then(r=>r.json());
    const lastCommit = commitData[0]?.commit?.message?.split("\n")[0]||"—";
    const sha = commitData[0]?.sha?.substring(0,7)||"—";
    const commitDate = commitData[0]?.commit?.author?.date;
    const prsCount = Array.isArray(prsData)?prsData.length:"?";
    const issuesCount = Array.isArray(issuesData)?issuesData.filter(i=>!i.pull_request).length:"?";
    let ci="—";
    try {
      const checks = await fetch(`https://api.github.com/repos/${repo}/commits/${commitData[0]?.sha}/check-runs`,{headers}).then(r=>r.json());
      const runs = checks.check_runs||[];
      if(runs.length>0){
        const anyFail = runs.some(r=>r.conclusion==="failure");
        ci = anyFail?"failing":runs.every(r=>r.conclusion==="success")?"passing":runs[0].status;
      }
    } catch(e){}
    STATE.ghStatus = {
      branch, lastCommit, sha, ci, openPRs:prsCount, issues:issuesCount,
      updatedAt:commitDate, url:repoData.html_url||"—",
      stars:repoData.stargazers_count||0, forks:repoData.forks_count||0,
      lang:repoData.language||"—", description:repoData.description||"",
      size:formatBytes((repoData.size||0)*1024),
      visibility:repoData.private?"private":"public",
      license:repoData.license?.name||"—",
    };
    STATE.prs = Array.isArray(prsData)?prsData.slice(0,10):[];
    STATE.issues = Array.isArray(issuesData)?issuesData.filter(i=>!i.pull_request).slice(0,10):[];
    STATE.commits = Array.isArray(commitData)?commitData.slice(0,10):[];
    addLog("success","GITHUB",`branch:${branch} | sha:${sha} | PRs:${prsCount} | CI:${ci}`);
    Bus.emit("status-update");
    try {
      const wfRuns = await fetch(`https://api.github.com/repos/${repo}/actions/runs?per_page=8`,{headers}).then(r=>r.json());
      STATE.workflows = (wfRuns.workflow_runs||[]).map(w=>({
        name:w.name, status:w.conclusion||w.status,
        duration:w.updated_at&&w.created_at?`${Math.round((new Date(w.updated_at)-new Date(w.created_at))/60000)}min`:"—",
        ago:timeAgo(w.updated_at)
      }));
      Bus.emit("status-update");
    } catch(e){}
    // Update GitHub user info
    try {
      const userInfo = await fetch(`https://api.github.com/user`,{headers}).then(r=>r.json());
      KEYS.githubUser = userInfo.login||"";
      KEYS.githubAvatar = userInfo.avatar_url||"";
      persistKeys();
      Bus.emit("user-updated");
    } catch(e){}
  } catch(e){ addLog("warn","GITHUB","Erro: "+e.message); }
}

async function fetchRenderStatus(){
  if(!KEYS.render||!KEYS.renderService) return;
  try {
    addLog("info","RENDER","Buscando status...");
    const res = await fetch(`https://api.render.com/v1/services/${KEYS.renderService}`,{headers:{Authorization:"Bearer "+KEYS.render}});
    if(!res.ok) throw new Error("HTTP "+res.status);
    const data = await res.json(); const svc = data.service||data;
    let lastDeploy="—";
    try {
      const deploys = await fetch(`https://api.render.com/v1/services/${KEYS.renderService}/deploys?limit=1`,{headers:{Authorization:"Bearer "+KEYS.render}}).then(r=>r.json());
      const d = Array.isArray(deploys)?deploys[0]?.deploy:deploys.deploy;
      lastDeploy = d?.finishedAt?timeAgo(d.finishedAt):d?.status||"—";
    } catch(e){}
    STATE.renderStatus = {
      status:svc.suspended?"suspended":"live",
      uptime:"—", url:svc.serviceDetails?.url||svc.url||"—",
      lastDeploy, region:svc.serviceDetails?.region||svc.region||"—",
      name:svc.name||"—"
    };
    addLog("success","RENDER",`status:${STATE.renderStatus.status} | url:${STATE.renderStatus.url}`);
    Bus.emit("status-update");
  } catch(e){ addLog("warn","RENDER","Erro: "+e.message); }
}

async function fetchSupabaseStatus(){
  if(!KEYS.supabase||!KEYS.supabaseUrl) return;
  try {
    addLog("info","SUPABASE","Verificando conexão...");
    const t0 = Date.now();
    const res = await fetch(KEYS.supabaseUrl.replace(/\/$/,"")+"/rest/v1/",{
      headers:{apikey:KEYS.supabase,Authorization:"Bearer "+KEYS.supabase}
    });
    const latency = Date.now()-t0;
    if(!res.ok&&res.status!==400) throw new Error("HTTP "+res.status);
    STATE.sbStatus = {status:"connected",latency,tables:"—",rows:"—",storage:"—",connections:"—"};
    addLog("success","SUPABASE",`conectado | latência:${latency}ms`);
    Bus.emit("status-update");
  } catch(e){
    STATE.sbStatus = {...STATE.sbStatus,status:"error"};
    addLog("warn","SUPABASE","Erro: "+e.message);
    Bus.emit("status-update");
  }
}

async function refreshAllStatus(){
  await Promise.allSettled([fetchGitHubStatus(),fetchRenderStatus(),fetchSupabaseStatus()]);
}

function startRealDataPolling(){
  if(!KEYS.github&&!KEYS.render&&!KEYS.supabase) return;
  refreshAllStatus();
  setInterval(refreshAllStatus, 120_000);
}

/* ── SIDEBAR TOGGLE ────────────────────────────────────────────── */
function toggleSidebar(){
  const sidebar = _el("sidebar");
  const overlay = _el("sidebar-overlay");
  STATE.sidebarOpen = !STATE.sidebarOpen;
  if(sidebar) sidebar.classList.toggle("open", STATE.sidebarOpen);
  if(overlay) overlay.classList.toggle("show", STATE.sidebarOpen);
}
function closeSidebar(){
  STATE.sidebarOpen = false;
  const sidebar = _el("sidebar"); if(sidebar) sidebar.classList.remove("open");
  const overlay = _el("sidebar-overlay"); if(overlay) overlay.classList.remove("show");
}

/* ── MODAL TABS ────────────────────────────────────────────────── */
function switchModalTab(section){
  _qsa(".modal-tab").forEach(t=>t.classList.toggle("active",t.dataset.section===section));
  _qsa(".modal-section").forEach(s=>s.classList.toggle("active",s.id==="modal-section-"+section));
}

/* ── LOGS ──────────────────────────────────────────────────────── */
function clearLogs(){
  STATE.logs=[]; STATE.errors=[];
  renderLogsTab(); Bus.emit("badges-update");
}
function filterLogs(level,btn){
  STATE.logFilter=level;
  _qsa(".log-filter-btn").forEach(b=>b.classList.remove("active"));
  if(btn) btn.classList.add("active");
  renderLogsTab();
}
function exportLogs(){
  const content = STATE.logs.map(l=>`[${l.time}] [${l.level.toUpperCase()}] [${l.source}] ${l.message}`).join("\n");
  const blob = new Blob([content],{type:"text/plain"});
  const a = document.createElement("a"); a.href=URL.createObjectURL(blob);
  a.download = `titan-logs-${new Date().toISOString().substring(0,10)}.txt`;
  a.click();
}
function renderLogsTab(){
  const scroll=_el("log-scroll"); if(!scroll) return;
  const filtered = STATE.logFilter==="all"?STATE.logs:STATE.logs.filter(l=>l.level===STATE.logFilter);
  scroll.innerHTML=filtered.map(l=>`
    <div class="log-entry">
      <span class="log-time">${l.time}</span>
      <span class="log-src" style="color:${levelColor(l.level)}">[${escHtml(l.source)}]</span>
      <span class="log-msg" style="color:${l.level==="error"?COLORS.red:l.level==="warn"?COLORS.yellow:l.level==="success"?COLORS.green:COLORS.text}">${escHtml(l.message)}</span>
    </div>`).join("");
  scroll.scrollTop=scroll.scrollHeight;
  const badge2=_el("log-count-badge2");
  if(badge2) badge2.textContent=STATE.logs.length+" logs";
}
Bus.on("log-new",(entry)=>{
  if(STATE.tab!=="logs") return;
  const scroll=_el("log-scroll"); if(!scroll) return;
  if(STATE.logFilter!=="all"&&entry.level!==STATE.logFilter) return;
  const div=document.createElement("div"); div.className="log-entry";
  div.innerHTML=`<span class="log-time">${entry.time}</span><span class="log-src" style="color:${levelColor(entry.level)}">[${escHtml(entry.source)}]</span><span class="log-msg" style="color:${entry.level==="error"?COLORS.red:entry.level==="warn"?COLORS.yellow:entry.level==="success"?COLORS.green:COLORS.text}">${escHtml(entry.message)}</span>`;
  scroll.appendChild(div); scroll.scrollTop=scroll.scrollHeight;
});

/* ── ERRORS ────────────────────────────────────────────────────── */
function renderErrors(){
  const titleEl=_el("errors-title"); if(titleEl) titleEl.textContent=`⚠ ${STATE.errors.length} erros detectados`;
  const list=_el("errors-list"); if(!list) return;
  if(STATE.errors.length===0){
    list.innerHTML=`<div class="card success"><div class="empty-state"><span class="empty-icon">✓</span><span class="empty-text">Nenhum erro detectado</span></div></div>`;
    return;
  }
  list.innerHTML=[...STATE.errors].reverse().map(e=>`
    <div class="card danger">
      <div class="flex justify-between mb-8">
        <span class="text-xs text-dim">${e.time} · ${escHtml(e.source)}</span>
        ${badge("error",COLORS.red)}
      </div>
      <div style="color:var(--red);font-size:11px;margin-bottom:12px;line-height:1.7;word-break:break-word;">${escHtml(e.message)}</div>
      <div class="flex gap-8" style="flex-wrap:wrap;">
        <button class="btn-analyze" onclick="analyzeError('${escAttr(e.message)}')"><i class="fas fa-robot"></i> ANALISAR</button>
        <button class="btn-analyze" onclick="openErrorInEditor('${escAttr(e.message)}')" style="background:var(--purple-dim);border-color:rgba(156,125,245,.3);color:var(--purple);"><i class="fas fa-code"></i> EDITOR</button>
        <button class="btn-analyze" onclick="copyToClipboard('${escAttr(e.message)}')" style="background:var(--bg3);border-color:var(--border);color:var(--text-mid);"><i class="fas fa-copy"></i> COPIAR</button>
      </div>
    </div>`).join("");
}
function clearErrors(){
  STATE.errors=[]; renderErrors(); Bus.emit("badges-update");
}
Bus.on("log-new",(entry)=>{ if(STATE.tab==="errors"&&entry.level==="error") renderErrors(); });

/* ── APPROVALS ─────────────────────────────────────────────────── */
function renderApprovals(){
  const list=_el("approvals-list"); if(!list) return;
  if(STATE.pending.length===0){
    list.innerHTML=`<div class="card success"><div class="empty-state"><span class="empty-icon"><i class="fas fa-check-circle" style="font-size:28px;"></i></span><span class="empty-text">Nenhuma ação pendente</span></div></div>`;
    return;
  }
  list.innerHTML=STATE.pending.map(a=>`
    <div class="approval-card">
      <div class="approval-risk-badges">
        ${badge("ALTO RISCO",COLORS.red)}
        ${a.autoGenerated?badge("AUTO-GERADO",COLORS.yellow):""}
      </div>
      <div class="approval-tool"><i class="fas fa-terminal"></i> ${escHtml(a.toolName)}</div>
      <pre class="approval-desc">${escHtml(a.description)}</pre>
      ${a.input?`<pre class="approval-input">${escHtml(JSON.stringify(a.input,null,2).substring(0,600))}</pre>`:""}
      <div class="approval-actions">
        <button class="btn-approve" onclick="approveAction('${escAttr(a.id)}')"><i class="fas fa-check"></i> APROVAR E EXECUTAR</button>
        <button class="btn-reject"  onclick="rejectAction('${escAttr(a.id)}')"><i class="fas fa-times"></i> REJEITAR</button>
      </div>
    </div>`).join("");
}
function approveAction(id){
  const action=STATE.pending.find(a=>a.id===id);
  STATE.pending=STATE.pending.filter(a=>a.id!==id);
  if(action&&action.onApprove) action.onApprove();
  addLog("success","APPROVAL","Aprovado: "+(action?.toolName||id));
  renderApprovals(); Bus.emit("badges-update");
  showToast("Ação aprovada e executada!","success");
}
function rejectAction(id){
  STATE.pending=STATE.pending.filter(a=>a.id!==id);
  addLog("warn","APPROVAL","Rejeitado: "+id);
  renderApprovals(); Bus.emit("badges-update");
  showToast("Ação rejeitada","info");
}

Bus.on("critical-error",(entry)=>{
  STATE.lastAlertMsg=entry.message;
  const alertMsg=_el("alert-msg"); if(alertMsg) alertMsg.textContent=entry.message.substring(0,150);
  const alert=_el("critical-alert"); if(alert){ alert.classList.add("show"); setTimeout(()=>alert.classList.remove("show"),8000); }
});

/* ── ALERT HELPERS ─────────────────────────────────────────────── */
function analyzeError(msg){ switchTab("agent"); setAgentPrompt("Analise e sugira correção para este erro:\n\n"+msg); }
function openErrorInEditor(m){ switchTab("editor"); const a=_el("ai-edit-instruction"); if(a) a.value="Corrija este bug: "+m.substring(0,100); }
function analyzeFromAlert(){ if(STATE.lastAlertMsg) analyzeError(STATE.lastAlertMsg); dismissAlert(); }
function dismissAlert(){ const a=_el("critical-alert"); if(a) a.classList.remove("show"); }

/* ── SEARCH ────────────────────────────────────────────────────── */
function openGlobalSearch(){
  const modal=_el("search-modal"); if(modal){ modal.classList.add("show"); _el("search-input")?.focus(); }
}
function closeGlobalSearch(){ _el("search-modal")?.classList.remove("show"); }

/* ── BOOKMARKS ─────────────────────────────────────────────────── */
function addBookmark(path){
  if(!STATE.bookmarks.includes(path)){
    STATE.bookmarks.push(path);
    showToast(`Favorito: ${path}`,"success");
    localStorage.setItem("titan_bookmarks",JSON.stringify(STATE.bookmarks));
  }
}
function loadBookmarks(){
  try { STATE.bookmarks=JSON.parse(localStorage.getItem("titan_bookmarks")||"[]"); }catch(e){}
}

/* ── SNIPPETS ──────────────────────────────────────────────────── */
function saveSnippet(name,content,lang){
  STATE.snippets.push({id:Date.now(),name,content,lang,created:new Date().toISOString()});
  localStorage.setItem("titan_snippets",JSON.stringify(STATE.snippets));
  showToast("Snippet salvo: "+name,"success");
}
function loadSnippets(){
  try { STATE.snippets=JSON.parse(localStorage.getItem("titan_snippets")||"[]"); }catch(e){}
}
