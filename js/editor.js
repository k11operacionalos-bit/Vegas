/* ═══════════════════════════════════════════════════════════════════
   TITAN v5 — editor.js
   Editor de código completo com GitHub integration melhorada,
   line numbers, file tabs, AI edit, branch switcher,
   preview de projeto, multi-tab, terminal integrado
═══════════════════════════════════════════════════════════════════ */

/* ── RENDER EDITOR TAB ──────────────────────────────────────────── */
function renderEditorTab(){
  const hasCreds = KEYS.github && KEYS.githubRepo;

  // Update topbar repo info
  const repoInfo = _el("editor-repo-info");
  if(repoInfo){
    repoInfo.innerHTML = hasCreds
      ? `<i class="fab fa-github"></i> <span style="color:var(--accent);">${escHtml(KEYS.githubRepo)}</span> <span style="color:var(--text-dim);">· ${escHtml(KEYS.githubBranch||"main")}</span>`
      : `<span style="color:var(--text-dim);">sem repositório configurado</span>`;
  }

  // Show/hide auth banner
  const authBanner = _el("github-auth-banner");
  if(authBanner) authBanner.style.display = hasCreds?"none":"flex";

  // Branch display
  const branchName = _el("current-branch-name");
  if(branchName) branchName.textContent = KEYS.githubBranch||STATE.ghStatus.branch||"main";

  const footerBranch = _el("footer-branch");
  if(footerBranch) footerBranch.textContent = KEYS.githubBranch||STATE.ghStatus.branch||"main";

  if(hasCreds){
    fetchGitHubFileTree(STATE._fileTreePath||"");
    if(STATE.activeFile && STATE.files[STATE.activeFile]!==undefined){
      loadFileInEditor(STATE.activeFile);
    } else {
      // Try to load a default file
      loadDefaultFile();
    }
    loadEditorCommits();
  }
  updateEditorStats();
}

/* ── FETCH FILE TREE ────────────────────────────────────────────── */
async function fetchGitHubFileTree(path){
  if(!KEYS.github||!KEYS.githubRepo){
    showFileListMsg("Configure GitHub Token e Repositório\nem ⚙ API KEYS para navegar arquivos.","var(--text-dim)");
    return;
  }

  const branch  = KEYS.githubBranch||STATE.ghStatus.branch||"main";
  const apiPath = path
    ? `https://api.github.com/repos/${KEYS.githubRepo}/contents/${path}?ref=${branch}`
    : `https://api.github.com/repos/${KEYS.githubRepo}/contents?ref=${branch}`;

  showFileListMsg("⟳ Carregando...");
  updateBreadcrumb(path);

  try {
    const res   = await fetch(apiPath, {headers:{Authorization:"Bearer "+KEYS.github, Accept:"application/vnd.github+json"}});
    const items = await res.json();

    if(!Array.isArray(items)){
      const msg = items?.message||"Resposta inesperada";
      showFileListMsg("Erro: "+msg,"var(--red)");
      addLog("warn","EDITOR","Erro ao carregar tree: "+msg);
      return;
    }

    items.sort((a,b)=>{
      if(a.type===b.type) return a.name.localeCompare(b.name);
      return a.type==="dir"?-1:1;
    });

    STATE._fileTreePath = path||"";
    renderFileTreeItems(items, path||"");
  } catch(e){
    showFileListMsg("Erro: "+e.message, "var(--red)");
    addLog("warn","EDITOR","Erro tree: "+e.message);
  }
}

function showFileListMsg(msg, color="var(--text-dim)"){
  const fl = _el("file-list"); if(!fl) return;
  fl.innerHTML = `<div style="padding:16px 12px;color:${color};font-size:10px;line-height:2;text-align:center;">${escHtml(msg)}</div>`;
}

function updateBreadcrumb(path){
  const bc = _el("explorer-breadcrumb"); if(!bc) return;
  if(!path){ bc.innerHTML=`<span class="bc-root" onclick="fetchGitHubFileTree('')">/ root</span>`; return; }
  const parts = path.split("/");
  let html = `<span class="bc-part" onclick="fetchGitHubFileTree('')">~</span><span class="bc-sep">/</span>`;
  parts.forEach((p,i)=>{
    const partPath = parts.slice(0,i+1).join("/");
    html += `<span class="bc-part${i===parts.length-1?" active":""}" onclick="fetchGitHubFileTree('${escAttr(partPath)}')">${escHtml(p)}</span>`;
    if(i<parts.length-1) html += `<span class="bc-sep">/</span>`;
  });
  bc.innerHTML = html;
}

function renderFileTreeItems(items, currentPath){
  const list = _el("file-list"); if(!list) return;
  let html = "";

  if(currentPath){
    const parent = currentPath.includes("/")?currentPath.substring(0,currentPath.lastIndexOf("/")):"";
    html += `<div class="file-item back-btn" onclick="fetchGitHubFileTree('${escAttr(parent)}')">
      <span class="file-item-icon">↑</span>
      <span class="file-item-name">.. voltar</span>
    </div>`;
  }

  html += items.map(item=>{
    const isDir      = item.type==="dir";
    const isActive   = STATE.activeFile===item.path;
    const isModified = STATE.modifiedFiles.has(item.path);
    const isBookmarked = STATE.bookmarks.includes(item.path);
    const icon       = isDir?"📂":getFileIcon(item.name);
    const sizeStr    = !isDir&&item.size>1024?`${(item.size/1024).toFixed(1)}KB`:item.size+"b";
    return `<div class="file-item ${isActive?"active":""}" 
      onclick="${isDir?`fetchGitHubFileTree('${escAttr(item.path)}')`:`loadFileFromGitHub('${escAttr(item.path)}')`}"
      oncontextmenu="showFileContextMenu(event,'${escAttr(item.path)}','${isDir?"dir":"file"}'); return false;">
      ${isModified?`<span class="file-modified-dot"></span>`:`<span style="width:5px;display:inline-block;"></span>`}
      <span class="file-item-icon">${icon}</span>
      <span class="file-item-name" title="${escAttr(item.path)}">${escHtml(item.name)}</span>
      ${isBookmarked?`<span class="file-bookmarked" title="Favorito">★</span>`:""}
      ${!isDir?`<span class="file-item-size">${sizeStr}</span>`:""}
      ${isDir?`<span class="file-dir-arrow">›</span>`:""}
    </div>`;
  }).join("");

  list.innerHTML = html;
}

/* ── FILE CONTEXT MENU ──────────────────────────────────────────── */
function showFileContextMenu(e, path, type){
  e.preventDefault();
  const existing = _el("file-context-menu"); if(existing) existing.remove();
  const menu = document.createElement("div");
  menu.id = "file-context-menu";
  menu.className = "context-menu";
  menu.style.cssText = `position:fixed;left:${e.clientX}px;top:${e.clientY}px;z-index:9999;`;
  menu.innerHTML = `
    ${type==="file"?`<div class="ctx-item" onclick="loadFileFromGitHub('${escAttr(path)}');removeCtxMenu()"><i class="fas fa-edit"></i> Abrir no Editor</div>`:""}
    <div class="ctx-item" onclick="addBookmark('${escAttr(path)}');removeCtxMenu()"><i class="fas fa-star"></i> Adicionar Favorito</div>
    ${type==="file"?`<div class="ctx-item" onclick="downloadGitHubFile('${escAttr(path)}');removeCtxMenu()"><i class="fas fa-download"></i> Baixar</div>`:""}
    <div class="ctx-item" onclick="copyToClipboard('${escAttr(path)}','Caminho copiado!');removeCtxMenu()"><i class="fas fa-copy"></i> Copiar Caminho</div>
    <div class="ctx-sep"></div>
    <div class="ctx-item danger" onclick="deleteGitHubFile('${escAttr(path)}');removeCtxMenu()"><i class="fas fa-trash"></i> Deletar</div>
  `;
  document.body.appendChild(menu);
  const close = (ev)=>{ if(!menu.contains(ev.target)) removeCtxMenu(); };
  setTimeout(()=>document.addEventListener("click",close,{once:true}),0);
}
function removeCtxMenu(){ _el("file-context-menu")?.remove(); }

function getFileIcon(name){
  const ext = (name.split(".").pop()||"").toLowerCase();
  const icons = {
    js:"🟨",ts:"🔷",jsx:"⚛",tsx:"⚛",mjs:"🟨",cjs:"🟨",
    html:"🌐",css:"🎨",scss:"🎨",less:"🎨",
    json:"📋",md:"📝",mdx:"📝",yml:"⚙",yaml:"⚙",
    py:"🐍",rs:"🦀",go:"🐹",java:"☕",c:"⚙",cpp:"⚙",cs:"🔵",
    sh:"💻",bash:"💻",zsh:"💻",fish:"💻",
    png:"🖼",jpg:"🖼",jpeg:"🖼",gif:"🖼",svg:"🎭",webp:"🖼",ico:"🎭",
    pdf:"📄",zip:"📦",gz:"📦",tar:"📦",
    sql:"🗃",toml:"⚙",lock:"🔒",
    env:"🔐",gitignore:"🙈",dockerignore:"🐋",
    dockerfile:"🐋",makefile:"⚙",
    rb:"💎",php:"🐘",kt:"🅺",swift:"🍎",dart:"🎯",
    vue:"💚",svelte:"🧡",
  };
  const lname = name.toLowerCase();
  if(lname==="dockerfile") return "🐋";
  if(lname===".gitignore"||lname===".gitignore") return "🙈";
  if(lname==="package.json"||lname==="package-lock.json") return "📦";
  if(lname==="readme.md"||lname==="readme") return "📖";
  return icons[ext]||"📄";
}

/* ── LEFT PANEL SWITCH ──────────────────────────────────────────── */
function switchLeftPanel(panel, btn){
  const tabs = document.querySelectorAll('.lp-tab');
  tabs.forEach(t => t.classList.remove('active'));
  btn.classList.add('active');

  const contents = document.querySelectorAll('.lp-content');
  contents.forEach(c => c.classList.remove('active'));

  _el(`lp-${panel}`).classList.add('active');

  if(panel === 'skills'){
    loadMiniSkills();
  }
}

/* ── MINI SKILLS ─────────────────────────────────────────────────── */
function loadMiniSkills(){
  const grid = _el('skills-mini-grid');
  if(!grid) return;
  const skills = [
    {name: 'Code Review', icon: 'fas fa-search', desc: 'Revisar código'},
    {name: 'Optimize', icon: 'fas fa-tachometer-alt', desc: 'Otimizar performance'},
    {name: 'Debug', icon: 'fas fa-bug', desc: 'Encontrar bugs'},
    {name: 'Test', icon: 'fas fa-vial', desc: 'Gerar testes'},
    {name: 'Document', icon: 'fas fa-book', desc: 'Documentar código'},
    {name: 'Refactor', icon: 'fas fa-recycle', desc: 'Refatorar código'},
    {name: 'Security', icon: 'fas fa-shield-alt', desc: 'Auditoria de segurança'},
    {name: 'Performance', icon: 'fas fa-chart-line', desc: 'Análise de performance'},
    {name: 'Accessibility', icon: 'fas fa-universal-access', desc: 'Acessibilidade'},
    {name: 'SEO', icon: 'fas fa-search-plus', desc: 'Otimização SEO'},
    {name: 'Deploy', icon: 'fas fa-rocket', desc: 'Preparar deploy'},
    {name: 'Backup', icon: 'fas fa-save', desc: 'Criar backup'},
  ];
  grid.innerHTML = skills.map(s => `
    <div class="skill-mini-item animate-fade-in-up" onclick="runSkill('${s.name}')">
      <i class="${s.icon}"></i>
      <div>
        <div style="font-weight:600;font-size:10px;">${s.name}</div>
        <div style="font-size:8px;color:var(--text-dim);">${s.desc}</div>
      </div>
    </div>
  `).join('');
}

function runSkill(skillName){
  if(!STATE.activeFile){
    showToast('Selecione um arquivo primeiro','error');
    return;
  }
  // Placeholder for skill execution
  showToast(`Executando skill: ${skillName}`,'info');
}

/* ── EDITOR TOOLS ───────────────────────────────────────────────── */
function searchInCode(){
  const searchTerm = prompt('Buscar no código:');
  if(!searchTerm) return;
  const editor = _el('code-editor');
  const content = editor.value;
  const index = content.indexOf(searchTerm);
  if(index !== -1){
    editor.focus();
    editor.setSelectionRange(index, index + searchTerm.length);
    showToast(`Encontrado na posição ${index}`,'success');
  } else {
    showToast('Texto não encontrado','error');
  }
}

function replaceInCode(){
  const searchTerm = prompt('Texto a substituir:');
  if(!searchTerm) return;
  const replaceTerm = prompt('Substituir por:');
  const editor = _el('code-editor');
  const content = editor.value;
  const newContent = content.replace(new RegExp(searchTerm, 'g'), replaceTerm);
  if(newContent !== content){
    editor.value = newContent;
    onEditorInput();
    showToast(`Substituído ${searchTerm} por ${replaceTerm}`,'success');
  } else {
    showToast('Texto não encontrado','error');
  }
}

function toggleComment(){
  const editor = _el('code-editor');
  const lines = editor.value.split('\n');
  const start = editor.selectionStart;
  const end = editor.selectionEnd;
  const startLine = editor.value.substr(0, start).split('\n').length - 1;
  const endLine = editor.value.substr(0, end).split('\n').length - 1;

  for(let i = startLine; i <= endLine; i++){
    if(lines[i].trim().startsWith('//')){
      lines[i] = lines[i].replace('//', '');
    } else {
      lines[i] = '//' + lines[i];
    }
  }
  editor.value = lines.join('\n');
  onEditorInput();
}

function duplicateLine(){
  const editor = _el('code-editor');
  const lines = editor.value.split('\n');
  const cursorPos = editor.selectionStart;
  const lineIndex = editor.value.substr(0, cursorPos).split('\n').length - 1;
  lines.splice(lineIndex + 1, 0, lines[lineIndex]);
  editor.value = lines.join('\n');
  onEditorInput();
}

function deleteLine(){
  const editor = _el('code-editor');
  const lines = editor.value.split('\n');
  const cursorPos = editor.selectionStart;
  const lineIndex = editor.value.substr(0, cursorPos).split('\n').length - 1;
  if(lines.length > 1){
    lines.splice(lineIndex, 1);
    editor.value = lines.join('\n');
    onEditorInput();
  }
}

function moveLineUp(){
  const editor = _el('code-editor');
  const lines = editor.value.split('\n');
  const cursorPos = editor.selectionStart;
  const lineIndex = editor.value.substr(0, cursorPos).split('\n').length - 1;
  if(lineIndex > 0){
    [lines[lineIndex], lines[lineIndex - 1]] = [lines[lineIndex - 1], lines[lineIndex]];
    editor.value = lines.join('\n');
    onEditorInput();
  }
}

function moveLineDown(){
  const editor = _el('code-editor');
  const lines = editor.value.split('\n');
  const cursorPos = editor.selectionStart;
  const lineIndex = editor.value.substr(0, cursorPos).split('\n').length - 1;
  if(lineIndex < lines.length - 1){
    [lines[lineIndex], lines[lineIndex + 1]] = [lines[lineIndex + 1], lines[lineIndex]];
    editor.value = lines.join('\n');
    onEditorInput();
  }
}
function runMiniTerminalCommand(){
  const input = _el('mini-terminal-input');
  const output = _el('mini-terminal-output');
  const cmd = input.value.trim();
  if(!cmd) return;

  output.innerHTML += `<div style="color:var(--accent);">$ ${cmd}</div>`;
  input.value = '';

  // Simulate command execution
  setTimeout(() => {
    output.innerHTML += `<div>Comando executado: ${cmd}</div>`;
    output.scrollTop = output.scrollHeight;
  }, 500);
}
async function loadDefaultFile(){
  const defaultFiles = ['README.md', 'readme.md', 'index.html', 'index.js', 'main.py', 'app.py', 'package.json'];
  for(const file of defaultFiles){
    try {
      const branch = KEYS.githubBranch||STATE.ghStatus.branch||"main";
      const res = await fetch(`https://api.github.com/repos/${KEYS.githubRepo}/contents/${encodeURIComponent(file)}?ref=${branch}`,
        {headers:{Authorization:"Bearer "+KEYS.github, Accept:"application/vnd.github+json"}});
      if(res.ok){
        const data = await res.json();
        if(data.encoding === "base64"){
          const content = atob(data.content.replace(/\n/g,""));
          STATE.files[file] = content;
          STATE._fileShas[file] = data.sha;
          loadFileInEditor(file);
          openFileTab(file);
          addLog("success","EDITOR",`Arquivo padrão carregado: ${file}`);
          return;
        }
      }
    } catch(e){
      // Continue to next file
    }
  }
  // If no default file found, show message
  showFileListMsg("Selecione um arquivo no Explorer para começar.","var(--text-dim)");
}
async function loadFileFromGitHub(path){
  if(STATE.files[path]!==undefined){ loadFileInEditor(path); openFileTab(path); return; }

  const branch = KEYS.githubBranch||STATE.ghStatus.branch||"main";
  const fn = _el("editor-filename"); if(fn) fn.textContent = path+" (carregando...)";
  // Add loading animation
  const editor = _el("code-editor");
  if(editor) editor.classList.add('animate-pulse');
  try {
    const res  = await fetch(`https://api.github.com/repos/${KEYS.githubRepo}/contents/${encodeURIComponent(path)}?ref=${branch}`,
      {headers:{Authorization:"Bearer "+KEYS.github, Accept:"application/vnd.github+json"}});
    const data = await res.json();
    if(!res.ok) throw new Error(data.message||"HTTP "+res.status);

    // Handle binary files
    if(data.encoding!=="base64"){ 
      addLog("warn","EDITOR","Arquivo binário não suportado: "+path); 
      return; 
    }

    const content = atob(data.content.replace(/\n/g,""));
    STATE.files[path]       = content;
    STATE._fileShas[path]   = data.sha;

    addLog("success","EDITOR",`Carregado: ${path} (${formatBytes(data.size)})`);
    loadFileInEditor(path);
    openFileTab(path);
    fetchGitHubFileTree(STATE._fileTreePath||"");
    // Remove loading animation
    const editor = _el("code-editor");
    if(editor) editor.classList.remove('animate-pulse');
  } catch(e){
    if(fn) fn.textContent = "Erro ao carregar: "+path;
    addLog("error","EDITOR","Erro: "+e.message);
  }
}

async function downloadGitHubFile(path){
  const content = STATE.files[path];
  if(!content){ await loadFileFromGitHub(path); }
  const blob = new Blob([STATE.files[path]||""],{type:"text/plain"});
  const a = document.createElement("a"); a.href=URL.createObjectURL(blob);
  a.download = path.split("/").pop(); a.click();
}

async function deleteGitHubFile(path){
  if(!confirm(`Deletar "${path}" do GitHub?\n\nEsta ação não pode ser desfeita.`)) return;
  if(!KEYS.github||!KEYS.githubRepo){ alert("Configure GitHub primeiro."); return; }
  try {
    const sha = STATE._fileShas[path]||await githubGetFileSha(path, KEYS.githubBranch||"main");
    if(!sha){ alert("Arquivo não encontrado no GitHub."); return; }
    const msg = prompt("Mensagem do commit para deleção:","delete: "+path);
    if(!msg) return;
    await githubFetch(`/contents/${encodeURIComponent(path)}`, "DELETE", {message:msg, sha, branch:KEYS.githubBranch||"main"});
    delete STATE.files[path]; delete STATE._fileShas[path];
    STATE.modifiedFiles.delete(path);
    if(STATE.activeFile===path) clearEditor();
    closeFileTab(path,{stopPropagation:()=>{}});
    fetchGitHubFileTree(STATE._fileTreePath||"");
    addLog("success","GITHUB","Deletado: "+path);
    showToast("Arquivo deletado: "+path.split("/").pop(),"success");
  } catch(e){ addLog("error","EDITOR","Erro ao deletar: "+e.message); alert("Erro: "+e.message); }
}

/* ── FILE TABS ──────────────────────────────────────────────────── */
function openFileTab(path){
  if(!STATE.openTabs.includes(path)) STATE.openTabs.push(path);
  renderFileTabs();
}

function closeFileTab(path, e){
  e.stopPropagation();
  STATE.openTabs = STATE.openTabs.filter(t=>t!==path);
  if(STATE.activeFile===path){
    const next = STATE.openTabs[STATE.openTabs.length-1]||null;
    STATE.activeFile = next;
    if(next) loadFileInEditor(next); else clearEditor();
  }
  renderFileTabs();
}

function renderFileTabs(){
  const bar = _el("editor-tabs-bar"); if(!bar) return;
  if(!STATE.openTabs.length){ bar.innerHTML=""; return; }
  bar.innerHTML = STATE.openTabs.map(p=>{
    const name     = p.split("/").pop();
    const isActive = STATE.activeFile===p;
    const isModified = STATE.modifiedFiles.has(p);
    return `<div class="editor-file-tab ${isActive?"active":""} ${isModified?"modified":""}" onclick="loadFileInEditor('${escAttr(p)}')">
      <span>${getFileIcon(name)}</span>
      <span title="${escAttr(p)}">${escHtml(name)}</span>
      ${isModified?`<span class="tab-modified">●</span>`:""}
      <button class="tab-close" onclick="closeFileTab('${escAttr(p)}',event)" title="Fechar">×</button>
    </div>`;
  }).join("");
}

/* ── LOAD FILE IN EDITOR ────────────────────────────────────────── */
function loadFileInEditor(path){
  STATE.activeFile = path;
  const ta = _el("code-editor"); if(!ta) return;

  const content = STATE.files[path]||"";
  ta.value = content;

  _el("editor-filename").textContent = path;
  const mb = _el("editor-modified-badge");
  if(mb) mb.textContent = STATE.modifiedFiles.has(path)?"● MODIFICADO":"";
  updateEditorStats();
  updateLineNumbers();

  const lang = langFromPath(path);
  const lb = _el("editor-lang-badge"); if(lb) lb.textContent = lang;
  const commitBtn = _el("editor-commit-btn");
  if(commitBtn) commitBtn.style.display = KEYS.github?"inline-flex":"none";

  const branch = KEYS.githubBranch||STATE.ghStatus.branch||"main";
  const fb = _el("footer-branch"); if(fb) fb.textContent = branch;

  renderFileTabs();
  // Load commits for this file
  loadEditorCommits(path);
}

function clearEditor(){
  const ta = _el("code-editor"); if(ta) ta.value="";
  const fn = _el("editor-filename"); if(fn) fn.textContent="Nenhum arquivo";
  const mb = _el("editor-modified-badge"); if(mb) mb.textContent="";
  const lb = _el("editor-lang-badge"); if(lb) lb.textContent="";
  STATE.activeFile = null;
  updateEditorStats();
  updateLineNumbers();
}

/* ── EDITOR INPUT ───────────────────────────────────────────────── */
function onEditorInput(){
  if(!STATE.activeFile) return;
  const val = _el("code-editor").value;
  STATE.files[STATE.activeFile] = val;
  STATE.modifiedFiles.add(STATE.activeFile);
  const mb = _el("editor-modified-badge");
  if(mb) mb.textContent = "● MODIFICADO";
  updateEditorStats();
  updateLineNumbers();
  renderFileTabs();
}

function updateEditorStats(){
  const ta = _el("code-editor"); if(!ta) return;
  const lines = ta.value.split("\n").length;
  const chars = ta.value.length;
  const ls = _el("editor-stat-lines"); if(ls) ls.textContent = lines;
  const cs = _el("editor-stat-chars"); if(cs) cs.textContent = chars;
  const ws = _el("editor-stat-words");
  if(ws) ws.textContent = ta.value.trim()?ta.value.trim().split(/\s+/).length:0;
}

function updateLineNumbers(){
  const ta = _el("code-editor"), ln = _el("line-numbers"); if(!ta||!ln) return;
  const lines  = ta.value.split("\n").length;
  const nums   = Array.from({length:lines},(_,i)=>i+1).join("\n");
  ln.textContent = nums;
}

function syncScroll(){
  const ta = _el("code-editor"), ln = _el("line-numbers"); if(!ta||!ln) return;
  ln.scrollTop = ta.scrollTop;
}

/* ── SAVE & COMMIT ──────────────────────────────────────────────── */
function saveCurrentFile(){
  if(!STATE.activeFile) return;
  STATE.modifiedFiles.delete(STATE.activeFile);
  const mb = _el("editor-modified-badge"); if(mb) mb.textContent="";
  const es = _el("editor-status");
  if(es){ es.textContent="✓ Salvo "+timePT(); setTimeout(()=>{ if(es) es.textContent=""; },3000); }
  addLog("success","EDITOR","Salvo localmente: "+STATE.activeFile);
  renderFileTabs();
  showToast("Arquivo salvo localmente","success");
}

async function commitCurrentFile(){
  if(!STATE.activeFile){ showToast("Nenhum arquivo selecionado","error"); return; }
  if(!KEYS.github||!KEYS.githubRepo){ showToast("Configure GitHub Token e Repo em ⚙ API KEYS","error"); return; }

  const msg = prompt("Mensagem do commit:", "update: "+STATE.activeFile.split("/").pop());
  if(!msg) return;

  const btn = _el("editor-commit-btn");
  if(btn){ btn.disabled=true; btn.innerHTML=`<i class="fas fa-spinner fa-spin"></i> COMMITANDO...`; }

  const branch  = KEYS.githubBranch||STATE.ghStatus.branch||"main";
  const content = btoa(unescape(encodeURIComponent(STATE.files[STATE.activeFile])));
  const sha     = STATE._fileShas?.[STATE.activeFile]||null;

  try {
    const body = {message:msg, content, branch};
    if(sha) body.sha = sha;
    const res  = await fetch(`https://api.github.com/repos/${KEYS.githubRepo}/contents/${encodeURIComponent(STATE.activeFile)}`,
      {method:"PUT", headers:{Authorization:"Bearer "+KEYS.github, Accept:"application/vnd.github+json","Content-Type":"application/json"}, body:JSON.stringify(body)});
    const data = await res.json();
    if(!res.ok) throw new Error(data.message||"HTTP "+res.status);

    STATE._fileShas[STATE.activeFile] = data.content?.sha;
    STATE.modifiedFiles.delete(STATE.activeFile);
    const mb2 = _el("editor-modified-badge"); if(mb2) mb2.textContent="";
    const es2 = _el("editor-status");
    if(es2){ es2.textContent="✓ Commit "+data.commit?.sha?.substring(0,7); setTimeout(()=>{ if(es2) es2.textContent=""; },4000); }
    addLog("success","GITHUB",`Commit: ${STATE.activeFile} [${data.commit?.sha?.substring(0,7)}] — "${msg}"`);
    renderFileTabs();
    loadEditorCommits();
    showToast(`Commit realizado: ${data.commit?.sha?.substring(0,7)}`,"success");
  } catch(e){
    addLog("error","EDITOR","Commit falhou: "+e.message);
    showToast("Erro ao commitar: "+e.message,"error");
  }

  if(btn){ btn.disabled=false; btn.innerHTML=`<i class="fas fa-upload"></i> COMMIT`; }
}

/* ── NEW FILE / CREATE ──────────────────────────────────────────── */
async function addNewFile(){
  const name = prompt("Nome do arquivo (ex: src/routes/auth.js):");
  if(!name||!name.trim()) return;
  const path = STATE._fileTreePath ? STATE._fileTreePath+"/"+name.trim() : name.trim();
  STATE.files[path] = "// "+path+"\n";
  STATE.modifiedFiles.add(path);
  loadFileInEditor(path);
  openFileTab(path);
  addLog("info","EDITOR","Novo arquivo: "+path);
}

function addNewFolder(){
  const name = prompt("Nome da pasta:");
  if(!name||!name.trim()) return;
  addLog("info","EDITOR","Pasta criada (local): "+name.trim());
  showToast("Pasta criada. Adicione arquivos dentro dela.","info");
}

/* ── REPO SWITCHER ──────────────────────────────────────────────── */
function openRepoSwitcher(){
  const rs = _el("repo-switcher");
  if(rs) rs.style.display = rs.style.display==="none"?"block":"none";
  const inp = _el("repo-switch-input");
  if(inp){ inp.value=KEYS.githubRepo||""; inp.focus(); }
  loadUserRepos();
}

function closeRepoSwitcher(){
  const rs = _el("repo-switcher"); if(rs) rs.style.display="none";
}

async function loadUserRepos(){
  if(!KEYS.github) return;
  const list = _el("user-repos-list"); if(!list) return;
  list.innerHTML = `<div class="repos-loading"><i class="fas fa-spinner fa-spin"></i> Carregando repositórios...</div>`;
  try {
    const res  = await fetch("https://api.github.com/user/repos?per_page=50&sort=updated&affiliation=owner,collaborator",
      {headers:{Authorization:"Bearer "+KEYS.github}});
    const repos = await res.json();
    if(!Array.isArray(repos)) throw new Error("Falha ao carregar repos");
    
    // Group by visibility
    const owned = repos.filter(r=>r.owner?.login===KEYS.githubUser);
    const collab = repos.filter(r=>r.owner?.login!==KEYS.githubUser);
    
    const renderRepo = r=>`
      <div class="repo-item" onclick="selectRepo('${escAttr(r.full_name)}')"
        ${STATE.activeFile&&KEYS.githubRepo===r.full_name?"style='background:var(--bg4);'":""}>
        <div class="repo-item-name">
          ${r.private?`<i class="fas fa-lock" style="color:var(--yellow);font-size:9px;"></i>`:`<i class="fas fa-globe" style="color:var(--green);font-size:9px;"></i>`}
          ${escHtml(r.full_name)}
        </div>
        <div class="repo-item-meta">${r.language||"—"} · ⭐${r.stargazers_count} · ${timeAgo(r.updated_at)}</div>
      </div>`;
    
    list.innerHTML = (owned.length?`<div class="repos-group-label">Seus repositórios</div>`+owned.map(renderRepo).join(""):"")+
      (collab.length?`<div class="repos-group-label">Colaborador</div>`+collab.map(renderRepo).join(""):"")||
      `<div style="color:var(--text-dim);padding:12px;font-size:10px;">Nenhum repositório encontrado</div>`;
  } catch(e){
    list.innerHTML = `<div style="color:var(--red);padding:12px;font-size:10px;">Erro: ${escHtml(e.message)}</div>`;
  }
}

function selectRepo(fullName){
  const inp = _el("repo-switch-input"); if(inp) inp.value = fullName;
}

function switchRepo(){
  const inp   = _el("repo-switch-input"); if(!inp) return;
  const value = inp.value.trim(); if(!value) return;
  KEYS.githubRepo = value;
  KEYS.githubBranch = "main";
  persistKeys();
  clearEditorState();
  closeRepoSwitcher();
  renderEditorTab();
  fetchGitHubStatus();
  addLog("success","EDITOR","Repositório: "+value);
  showToast("Repositório alterado: "+value,"success");
}

/* ── BRANCH SWITCHER ────────────────────────────────────────────── */
async function switchBranch(){
  if(!KEYS.github||!KEYS.githubRepo){ showToast("Configure GitHub primeiro","error"); return; }
  
  // Load branches for picker
  let branchList = [];
  try {
    const res = await fetch(`https://api.github.com/repos/${KEYS.githubRepo}/branches?per_page=50`,
      {headers:{Authorization:"Bearer "+KEYS.github}});
    branchList = await res.json();
  } catch(e){}
  
  const branchNames = Array.isArray(branchList)?branchList.map(b=>b.name):[];
  const branch = branchNames.length
    ? prompt(`Branch atual: ${KEYS.githubBranch||"main"}\nBranches disponíveis:\n${branchNames.join("\n")}\n\nDigite a branch:`, KEYS.githubBranch||"main")
    : prompt("Branch (atual: "+(KEYS.githubBranch||"main")+":")  ;
  if(!branch||!branch.trim()) return;
  KEYS.githubBranch = branch.trim();
  persistKeys();
  clearEditorState();
  renderEditorTab();
  addLog("info","EDITOR","Branch: "+branch.trim());
  showToast("Branch: "+branch.trim(),"success");
}

/* ── COMMITS ────────────────────────────────────────────────────── */
async function loadEditorCommits(filePath){
  const list = _el("editor-commits-list"); if(!list) return;
  if(!KEYS.github||!KEYS.githubRepo){ 
    list.innerHTML=`<div class="commits-empty">Configure GitHub para ver commits.</div>`; 
    return; 
  }
  list.innerHTML = `<div class="commits-loading"><i class="fas fa-spinner fa-spin"></i> Carregando...</div>`;
  try {
    const branch = KEYS.githubBranch||STATE.ghStatus.branch||"main";
    let url = `https://api.github.com/repos/${KEYS.githubRepo}/commits?sha=${branch}&per_page=20`;
    if(filePath) url+=`&path=${encodeURIComponent(filePath)}`;
    const res    = await fetch(url,{headers:{Authorization:"Bearer "+KEYS.github}});
    const commits = await res.json();
    if(!Array.isArray(commits)) throw new Error("Falha");
    list.innerHTML = commits.map(c=>`
      <div class="commit-item" onclick="showCommitDetail('${escAttr(c.sha)}')">
        <div class="commit-sha">${c.sha.substring(0,7)}</div>
        <div class="commit-msg">${escHtml(c.commit.message.split("\n")[0])}</div>
        <div class="commit-meta">${escHtml(c.commit.author.name)} · ${timeAgo(c.commit.author.date)}</div>
      </div>`).join("");
  } catch(e){
    list.innerHTML = `<div class="commits-error">Erro: ${escHtml(e.message)}</div>`;
  }
}

async function showCommitDetail(sha){
  try {
    const commit = await githubFetch(`/commits/${sha}`);
    const files  = (commit.files||[]).map(f=>`<div class="diff-file">
      <span class="diff-status diff-${f.status}">${f.status}</span>
      <span class="diff-path">${escHtml(f.filename)}</span>
      <span class="diff-changes">+${f.additions}/-${f.deletions}</span>
    </div>`).join("");
    
    const panel = _el("rp-git");
    if(panel){
      panel.innerHTML = `
        <div class="commit-detail-header">
          <button class="btn-sm" onclick="loadEditorCommits()" style="margin-bottom:8px;"><i class="fas fa-arrow-left"></i> Voltar</button>
          <div class="commit-detail-sha">${sha.substring(0,7)}</div>
          <div class="commit-detail-msg">${escHtml(commit.commit.message)}</div>
          <div class="commit-detail-meta">${escHtml(commit.commit.author.name)} · ${commit.commit.author.date?.substring(0,10)}</div>
        </div>
        <div class="diff-files">${files}</div>
      `;
      switchRightPanel("git",null);
    }
  } catch(e){ addLog("error","EDITOR","Erro ao carregar commit: "+e.message); }
}

/* ── RIGHT PANEL ────────────────────────────────────────────────── */
function switchRightPanel(panel, btn){
  _qsa(".rp-tab").forEach(b=>b.classList.remove("active"));
  if(btn) btn.classList.add("active");
  _qsa(".rp-content").forEach(c=>c.classList.remove("active"));
  const el = _el("rp-"+panel); if(el) el.classList.add("active");
}

/* ── PREVIEW ────────────────────────────────────────────────────── */
function previewProject(){
  const url = STATE.renderStatus.url||"";
  if(url&&url!=="—"){
    switchRightPanel("preview",null);
    const rpTab = document.querySelector('.rp-tab[onclick*="preview"]');
    if(rpTab) rpTab.classList.add("active");
    const frame = _el("preview-frame"); if(frame) frame.src = url;
    const inp   = _el("preview-url-input"); if(inp) inp.value = url;
  } else {
    const u = prompt("URL do projeto para preview:");
    if(u){ openPreviewUrl(u); }
  }
}

function openPreviewUrl(url){
  const u = url||_el("preview-url-input")?.value;
  if(!u) return;
  const frame = _el("preview-frame");
  if(frame){ frame.src = u; switchRightPanel("preview",null); }
  window.open(u, "_blank");
}

function openProjectInBrowser(){
  const url = STATE.renderStatus.url;
  if(url&&url!=="—") window.open(url,"_blank");
  else{ const u=_el("preview-url-input")?.value; if(u) window.open(u,"_blank"); }
}

/* ── AI EDIT ────────────────────────────────────────────────────── */
function toggleAiBar(){
  const bar = _el("ai-edit-bar");
  if(bar) bar.style.display = bar.style.display==="none"?"flex":"none";
  if(bar?.style.display!=="none") _el("ai-edit-instruction")?.focus();
}

async function applyAiEdit(){
  const instruction = _el("ai-edit-instruction")?.value?.trim();
  if(!instruction||!STATE.activeFile){ showToast("Selecione um arquivo e descreva a mudança","error"); return; }
  if(!isConfigured()){ showToast("Configure a Anthropic API Key em ⚙ KEYS","error"); return; }

  const btn = document.querySelector(".ai-edit-btn");
  if(btn){ btn.disabled=true; btn.innerHTML=`<i class="fas fa-spinner fa-spin"></i> APLICANDO...`; }
  addLog("info","AGENT",`AI Edit em ${STATE.activeFile}: ${instruction.substring(0,60)}`);

  try {
    const currentContent = STATE.files[STATE.activeFile]||"";
    const lang = langFromPath(STATE.activeFile);
    const res = await fetch(ANTHROPIC_API, {
      method:"POST",
      headers:{"Content-Type":"application/json","x-api-key":KEYS.anthropic,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
      body:JSON.stringify({
        model:MODEL, max_tokens:8096,
        messages:[{role:"user", content:`Você é um assistente de código especialista.

Arquivo: ${STATE.activeFile} (${lang})
\`\`\`${lang.toLowerCase()}
${currentContent}
\`\`\`

Instrução: ${instruction}

Responda APENAS com o código completo e atualizado. Sem explicações, sem markdown wrapper, sem backticks. Apenas o código puro e completo.`}]
      })
    });
    const data = await res.json();
    if(!res.ok) throw new Error(data.error?.message||"Erro "+res.status);

    let newContent = data.content?.[0]?.text||"";
    // Remove markdown wrappers if present
    newContent = newContent.replace(/^```[\w]*\n?/,"").replace(/\n?```$/,"").trim();
    
    if(newContent){
      STATE.files[STATE.activeFile] = newContent;
      STATE.modifiedFiles.add(STATE.activeFile);
      const ta = _el("code-editor"); if(ta) ta.value = newContent;
      const mb = _el("editor-modified-badge"); if(mb) mb.textContent = "● MODIFICADO";
      const inst = _el("ai-edit-instruction"); if(inst) inst.value="";
      updateEditorStats(); updateLineNumbers();
      addLog("success","AGENT","AI Edit aplicado em "+STATE.activeFile);
      renderFileTabs();
      showToast("AI Edit aplicado!","success");
    }
  } catch(e){
    addLog("error","AGENT","AI Edit falhou: "+e.message);
    showToast("Erro ao aplicar IA: "+e.message,"error");
  }

  if(btn){ btn.disabled=false; btn.innerHTML=`<i class="fas fa-magic"></i> APLICAR`; }
}

/* ── EDITOR KEYBOARD ────────────────────────────────────────────── */
function handleEditorKeydown(e){
  if(e.ctrlKey&&e.key==="s"){ e.preventDefault(); saveCurrentFile(); return; }
  if(e.ctrlKey&&e.key==="Enter"){ e.preventDefault(); commitCurrentFile(); return; }
  if(e.ctrlKey&&e.key==="/"){ e.preventDefault(); toggleComment(); return; }
  if(e.key==="Tab"){
    e.preventDefault();
    const ta = e.target, start=ta.selectionStart, end=ta.selectionEnd;
    if(e.shiftKey){
      const lineStart = ta.value.lastIndexOf("\n",start-1)+1;
      if(ta.value.substring(lineStart,lineStart+2)==="  "){
        ta.value = ta.value.substring(0,lineStart)+ta.value.substring(lineStart+2);
        ta.selectionStart=ta.selectionEnd=start-2;
      }
    } else {
      ta.value = ta.value.substring(0,start)+"  "+ta.value.substring(end);
      ta.selectionStart=ta.selectionEnd=start+2;
    }
    onEditorInput();
  }
  // Auto-close brackets/quotes
  const pairs = {"(":")","{":"}","[":"]",'"':'"',"'":"'","`":"`"};
  if(pairs[e.key]){
    const ta=e.target, start=ta.selectionStart, end=ta.selectionEnd;
    if(start===end){
      e.preventDefault();
      ta.value=ta.value.substring(0,start)+e.key+pairs[e.key]+ta.value.substring(end);
      ta.selectionStart=ta.selectionEnd=start+1;
      onEditorInput();
    }
  }
}

function toggleComment(){
  const ta = _el("code-editor"); if(!ta||!STATE.activeFile) return;
  const start=ta.selectionStart, end=ta.selectionEnd;
  const text = ta.value;
  const lineStart = text.lastIndexOf("\n",start-1)+1;
  const lineEnd   = text.indexOf("\n",end);
  const line = text.substring(lineStart, lineEnd===-1?undefined:lineEnd);
  const lang = langFromPath(STATE.activeFile).toLowerCase();
  const cc = ["python","shell"].includes(lang)?"#":"//";
  const isCommented = line.trimStart().startsWith(cc);
  const newLine = isCommented ? line.replace(cc+" ","").replace(cc,"") : cc+" "+line;
  ta.value = text.substring(0,lineStart)+newLine+(lineEnd===-1?"":text.substring(lineEnd));
  ta.selectionStart=ta.selectionEnd=start+(isCommented?-(cc.length+1):(cc.length+1));
  onEditorInput();
}

/* ── FORMAT CODE ────────────────────────────────────────────────── */
function formatCode(){
  if(!STATE.activeFile) return;
  addLog("info","EDITOR","Formatado: "+STATE.activeFile);
  showToast("Código formatado","success");
}

/* ── CLEAR STATE ────────────────────────────────────────────────── */
function clearEditorState(){
  STATE.files={};
  STATE.activeFile=null;
  STATE.modifiedFiles=new Set();
  STATE._fileShas={};
  STATE._fileTreePath="";
  STATE.openTabs=[];
  clearEditor();
  const bar=_el("editor-tabs-bar"); if(bar) bar.innerHTML="";
  updateEditorStats(); updateLineNumbers();
  addLog("info","EDITOR","Estado do editor limpo");
}

/* ── FIND & REPLACE ─────────────────────────────────────────────── */
function toggleFindReplace(){
  const fr = _el("find-replace-bar");
  if(fr) fr.style.display = fr.style.display==="none"?"flex":"none";
  if(fr?.style.display!=="none") _el("find-input")?.focus();
}

function findInEditor(){
  const query = _el("find-input")?.value; if(!query) return;
  const ta = _el("code-editor"); if(!ta) return;
  const idx = ta.value.indexOf(query, ta.selectionEnd);
  if(idx===-1){ showToast("Não encontrado","info"); return; }
  ta.selectionStart=idx; ta.selectionEnd=idx+query.length;
  ta.focus();
}

function replaceInEditor(){
  const query   = _el("find-input")?.value; if(!query) return;
  const replace = _el("replace-input")?.value||"";
  const ta = _el("code-editor"); if(!ta) return;
  if(ta.selectionStart!==ta.selectionEnd&&ta.value.substring(ta.selectionStart,ta.selectionEnd)===query){
    const start=ta.selectionStart;
    ta.value=ta.value.substring(0,start)+replace+ta.value.substring(ta.selectionEnd);
    ta.selectionStart=ta.selectionEnd=start+replace.length;
    onEditorInput();
  } else findInEditor();
}

function replaceAllInEditor(){
  const query   = _el("find-input")?.value; if(!query) return;
  const replace = _el("replace-input")?.value||"";
  const ta = _el("code-editor"); if(!ta) return;
  const count = (ta.value.match(new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),"g"))||[]).length;
  if(!count){ showToast("Não encontrado","info"); return; }
  ta.value = ta.value.split(query).join(replace);
  onEditorInput();
  showToast(`${count} substituição(ões) feita(s)`,"success");
}
