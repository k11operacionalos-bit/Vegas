/* ═══════════════════════════════════════════════════════════════════
   TITAN v5 — apikeys.js
   API Keys modal, testing, GitHub OAuth, save/load
═══════════════════════════════════════════════════════════════════ */

/* ── MODAL OPEN/CLOSE ───────────────────────────────────────────── */
function openApiModal(){
  const modal = _el("api-modal-overlay");
  if(modal) modal.classList.add("show");
  // Populate fields
  const populate = (id, key)=>{ const el=_el(id); if(el) el.value=KEYS[key]||""; };
  populate("key-anthropic","anthropic");
  populate("key-github","github");
  populate("key-github-repo","githubRepo");
  populate("key-github-branch","githubBranch");
  populate("key-render","render");
  populate("key-render-service","renderService");
  populate("key-supabase-url","supabaseUrl");
  populate("key-supabase","supabase");
  const modelEl=_el("key-model"); if(modelEl) modelEl.value=MODEL;
  updateKeyStatusIndicators();
}

function closeApiModal(){
  const modal = _el("api-modal-overlay");
  if(modal) modal.classList.remove("show");
}

/* ── SAVE KEYS ──────────────────────────────────────────────────── */
function saveApiKeys(){
  const get = id=>_el(id)?.value?.trim()||"";
  KEYS.anthropic   = get("key-anthropic");
  KEYS.github      = get("key-github");
  KEYS.githubRepo  = get("key-github-repo");
  KEYS.githubBranch= get("key-github-branch")||"main";
  KEYS.render      = get("key-render");
  KEYS.renderService=get("key-render-service");
  KEYS.supabaseUrl = get("key-supabase-url");
  KEYS.supabase    = get("key-supabase");
  MODEL = _el("key-model")?.value||"claude-sonnet-4-6";

  persistKeys();
  updateConnStatus();
  updateKeyStatusIndicators();

  const banner = _el("api-saved-banner");
  if(banner){ banner.classList.add("show"); setTimeout(()=>banner.classList.remove("show"),3000); }

  // Hide setup screen
  const ss = _el("setup-screen"); if(ss) ss.classList.remove("show");
  
  // Update config btn
  if(isConfigured()){
    const cb=_el("config-btn"); if(cb) cb.classList.add("configured");
    const ct=_el("config-btn-text"); if(ct) ct.textContent="✓ KEYS";
  }

  addLog("success","INIT","API Keys salvas. Claude: "+(KEYS.anthropic?"✓":"✗")+" | GitHub: "+(KEYS.github?"✓":"✗"));
  
  if(KEYS.github||KEYS.render||KEYS.supabase) startRealDataPolling();
  
  Bus.emit("keys-updated");
  showToast("API Keys salvas com sucesso!","success");
}

function clearAllKeys(){
  if(!confirm("Limpar todas as API Keys?")) return;
  Object.keys(KEYS).forEach(k=>KEYS[k]="");
  persistKeys();
  _qsa(".api-input").forEach(el=>el.value="");
  updateConnStatus();
  updateKeyStatusIndicators();
  showToast("Chaves removidas","info");
}

/* ── KEY INPUT ──────────────────────────────────────────────────── */
function onKeyInput(service){
  const statusEl = _el("status-"+service);
  if(statusEl){ statusEl.className="api-status-indicator checking"; }
}

function updateKeyStatusIndicators(){
  const statuses = {
    anthropic: KEYS.anthropic.length>10,
    github:    KEYS.github.length>10,
    render:    KEYS.render.length>5,
    supabase:  KEYS.supabase.length>10&&KEYS.supabaseUrl.length>10,
  };
  Object.entries(statuses).forEach(([k,v])=>{
    const el=_el("status-"+k);
    if(el) el.className="api-status-indicator "+(v?"ok":"none");
    const tel=_el("text-status-"+k);
    if(tel) tel.textContent=v?"✓ configurada":"não configurada";
    if(tel) tel.style.color=v?"var(--green)":"var(--text-dim)";
  });
}

/* ── TOGGLE VISIBILITY ──────────────────────────────────────────── */
function toggleVisibility(inputId, btn){
  const inp = _el(inputId); if(!inp) return;
  const isPass = inp.type==="password";
  inp.type = isPass?"text":"password";
  const icon = btn?.querySelector("i");
  if(icon) icon.className = isPass?"fas fa-eye-slash":"fas fa-eye";
}

/* ── TEST KEYS ──────────────────────────────────────────────────── */
async function testAnthropicKey(){
  const key=_el("key-anthropic")?.value?.trim();
  if(!key){ showToast("Insira a API Key primeiro","error"); return; }
  const btn=_el("test-anthropic");
  if(btn){ btn.disabled=true; btn.textContent="TESTANDO..."; }
  try {
    const res = await fetch(ANTHROPIC_API,{
      method:"POST",
      headers:{"Content-Type":"application/json","x-api-key":key,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
      body:JSON.stringify({model:"claude-haiku-4-5-20251001",max_tokens:10,messages:[{role:"user",content:"hi"}]})
    });
    const data=await res.json();
    if(res.ok||data.type==="message"){
      _el("status-anthropic").className="api-status-indicator ok";
      _el("text-status-anthropic").textContent="✓ válida";
      showToast("✓ Chave Anthropic válida!","success");
    } else throw new Error(data.error?.message||"Inválida");
  } catch(e){
    _el("status-anthropic").className="api-status-indicator error";
    showToast("Chave inválida: "+e.message,"error");
  }
  if(btn){ btn.disabled=false; btn.textContent="TESTAR"; }
}

async function testGithubKey(){
  const key=_el("key-github")?.value?.trim();
  if(!key){ showToast("Insira o Token primeiro","error"); return; }
  const btn=_el("test-github");
  if(btn){ btn.disabled=true; btn.textContent="TESTANDO..."; }
  try {
    const res = await fetch("https://api.github.com/user",{headers:{Authorization:"Bearer "+key}});
    const data=await res.json();
    if(res.ok){
      KEYS.githubUser=data.login||"";
      KEYS.githubAvatar=data.avatar_url||"";
      _el("status-github").className="api-status-indicator ok";
      const tsg=_el("text-status-github"); if(tsg) tsg.textContent=`✓ @${data.login}`;
      // Show avatar in modal
      const avatar=_el("github-user-avatar"); 
      if(avatar&&data.avatar_url) avatar.src=data.avatar_url;
      const uname=_el("github-user-name");
      if(uname) uname.textContent=data.name||data.login;
      showToast("✓ GitHub conectado como @"+data.login,"success");
      // Load repos into switcher
      loadUserRepos?.();
    } else throw new Error(data.message||"Token inválido");
  } catch(e){
    _el("status-github").className="api-status-indicator error";
    showToast("Token inválido: "+e.message,"error");
  }
  if(btn){ btn.disabled=false; btn.textContent="TESTAR"; }
}

async function testSupabaseKey(){
  const url=_el("key-supabase-url")?.value?.trim();
  const key=_el("key-supabase")?.value?.trim();
  if(!url||!key){ showToast("Insira URL e Key do Supabase","error"); return; }
  const btn=_el("test-supabase");
  if(btn){ btn.disabled=true; btn.textContent="TESTANDO..."; }
  try {
    const t0=Date.now();
    const res=await fetch(url.replace(/\/$/,"")+"/rest/v1/",{headers:{apikey:key,Authorization:"Bearer "+key}});
    const lat=Date.now()-t0;
    if(res.ok||res.status===400){
      _el("status-supabase").className="api-status-indicator ok";
      const tss=_el("text-status-supabase"); if(tss) tss.textContent=`✓ conectado (${lat}ms)`;
      showToast(`✓ Supabase conectado (${lat}ms)`,"success");
    } else throw new Error("HTTP "+res.status);
  } catch(e){
    _el("status-supabase").className="api-status-indicator error";
    showToast("Erro Supabase: "+e.message,"error");
  }
  if(btn){ btn.disabled=false; btn.textContent="TESTAR"; }
}

/* ── GITHUB OAUTH ───────────────────────────────────────────────── */
function openGithubOAuth(){
  // GitHub OAuth Device Flow — works without server
  showToast("Abrindo GitHub OAuth...","info");
  
  const clientId = "Ov23liXxHG5lDCOBbHvw"; // Replace with your GitHub App client_id
  
  // Try Device Flow
  const popup = window.open(
    `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=repo,read:user`,
    "github-oauth",
    "width=700,height=600,left="+Math.round(screen.width/2-350)+",top="+Math.round(screen.height/2-300)
  );

  // Monitor popup
  const checkInterval = setInterval(()=>{
    if(popup&&popup.closed){
      clearInterval(checkInterval);
      // Check if token was stored (from callback)
      const storedToken = localStorage.getItem("titan_gh_temp_token");
      if(storedToken){
        _el("key-github").value = storedToken;
        localStorage.removeItem("titan_gh_temp_token");
        testGithubKey();
      }
    }
  },500);

  // Fallback: Manual token entry instructions
  setTimeout(()=>{
    const manualDiv = _el("oauth-manual-fallback");
    if(manualDiv){
      manualDiv.style.display="block";
      manualDiv.innerHTML=`
        <div style="font-size:10px;color:var(--text-mid);line-height:1.8;padding:10px;background:var(--bg3);border-radius:6px;margin-top:8px;">
          <strong style="color:var(--yellow);">💡 Token Alternativo:</strong><br>
          1. Acesse <a href="https://github.com/settings/tokens/new?scopes=repo,read:user&description=TITAN+v5" target="_blank" style="color:var(--accent);">GitHub Personal Access Tokens</a><br>
          2. Selecione scopes: <code>repo</code> e <code>read:user</code><br>
          3. Gere e cole o token acima
        </div>`;
    }
  },2000);
}

/* ── GITHUB OAUTH CALLBACK ──────────────────────────────────────── */
function handleOAuthCallback(){
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  if(code){
    // Store code for processing
    localStorage.setItem("titan_oauth_code",code);
    showToast("GitHub OAuth: código recebido","success");
  }
}

// Handle return from OAuth
if(window.location.search.includes("code=")) handleOAuthCallback();
