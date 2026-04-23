/* ═══════════════════════════════════════════════════════════════════
   TITAN v5 — skills.js
   10 Skills completas: Algorithmic Art, Canvas Design, Brand Guidelines,
   Doc Co-authoring, Internal Comms, MCP Builder, Skill Creator,
   Slack GIF Creator, Theme Factory, Web Artifacts Builder
═══════════════════════════════════════════════════════════════════ */

const SKILLS = [
  {
    id:"algorithmic-art",
    icon:"fas fa-palette",
    title:"Algorithmic Art",
    desc:"Gera arte generativa com Canvas API, fractais, L-systems e algoritmos visuais.",
    color:"#9c7df5",
    tags:["Arte","Canvas","Generativo"],
  },
  {
    id:"canvas-design",
    icon:"fas fa-vector-square",
    title:"Canvas Design",
    desc:"Editor de design visual com formas, gradientes, tipografia e exportação PNG/SVG.",
    color:"#d97757",
    tags:["Design","Canvas","SVG"],
  },
  {
    id:"brand-guidelines",
    icon:"fas fa-trademark",
    title:"Brand Guidelines",
    desc:"Cria guias de identidade visual completos com paletas, tipografia e componentes.",
    color:"#2f78f0",
    tags:["Brand","Design","Identity"],
  },
  {
    id:"doc-coauthoring",
    icon:"fas fa-file-alt",
    title:"Doc Co-authoring",
    desc:"Editor colaborativo de documentos com templates, markdown e exportação.",
    color:"#0fd98a",
    tags:["Docs","Markdown","Templates"],
  },
  {
    id:"internal-comms",
    icon:"fas fa-comments",
    title:"Internal Comms",
    desc:"Gerador de comunicados internos, emails, anúncios e notas técnicas.",
    color:"#18d4f0",
    tags:["Comunicação","Templates","Email"],
  },
  {
    id:"mcp-builder",
    icon:"fas fa-plug",
    title:"MCP Builder",
    desc:"Construtor de servidores MCP (Model Context Protocol) com ferramentas e recursos.",
    color:"#f5a623",
    tags:["MCP","Protocol","Tools"],
  },
  {
    id:"skill-creator",
    icon:"fas fa-magic",
    title:"Skill Creator",
    desc:"Cria novas skills customizadas para o TITAN com formulários e prompts.",
    color:"#d97757",
    tags:["Skills","Customização","IA"],
  },
  {
    id:"slack-gif-creator",
    icon:"fas fa-film",
    title:"Slack GIF Creator",
    desc:"Cria GIFs animados e stickers para Slack com Canvas API e animações CSS.",
    color:"#f43060",
    tags:["GIF","Slack","Animação"],
  },
  {
    id:"theme-factory",
    icon:"fas fa-fill-drip",
    title:"Theme Factory",
    desc:"Cria e exporta temas de cor completos com variáveis CSS e preview em tempo real.",
    color:"#9c7df5",
    tags:["Temas","CSS","Design"],
  },
  {
    id:"web-artifacts-builder",
    icon:"fas fa-cube",
    title:"Web Artifacts Builder",
    desc:"Gera componentes HTML/CSS/JS prontos para uso: cards, modais, formulários, etc.",
    color:"#2f78f0",
    tags:["HTML","CSS","Componentes"],
  },
];

/* ── BUILD SKILLS NAV ───────────────────────────────────────────── */
function buildSkillsNav(){
  const nav = _el("skills-nav"); if(!nav) return;
  nav.innerHTML = SKILLS.map(s=>`
    <div class="skill-nav-item" onclick="openSkill('${s.id}')" title="${escHtml(s.title)}">
      <i class="${s.icon}" style="color:${s.color};"></i>
      <span>${s.title}</span>
    </div>`).join("");
}

/* ── BUILD SKILLS GRID ──────────────────────────────────────────── */
function buildSkillsGrid(){
  const grid = _el("skills-grid"); if(!grid) return;
  grid.innerHTML = SKILLS.map(s=>`
    <div class="skill-card" onclick="openSkill('${s.id}')">
      <div class="skill-card-icon" style="background:${s.color}18;border:1px solid ${s.color}30;">
        <i class="${s.icon}" style="color:${s.color};font-size:22px;"></i>
      </div>
      <div class="skill-card-title">${escHtml(s.title)}</div>
      <div class="skill-card-desc">${escHtml(s.desc)}</div>
      <div class="skill-card-tags">${s.tags.map(t=>`<span class="skill-tag" style="color:${s.color};background:${s.color}18;">${t}</span>`).join("")}</div>
      <button class="skill-open-btn" style="background:${s.color}18;color:${s.color};border:1px solid ${s.color}30;">
        <i class="fas fa-arrow-right"></i> ABRIR
      </button>
    </div>`).join("");
}

/* ── FILTER SKILLS ──────────────────────────────────────────────── */
function filterSkills(query){
  const q = query.toLowerCase();
  _qsa(".skill-card").forEach(card=>{
    const title = card.querySelector(".skill-card-title")?.textContent?.toLowerCase()||"";
    const desc  = card.querySelector(".skill-card-desc")?.textContent?.toLowerCase()||"";
    card.style.display = (!q||title.includes(q)||desc.includes(q))?"":"none";
  });
}

/* ── OPEN SKILL ─────────────────────────────────────────────────── */
function openSkill(skillId){
  const skill = SKILLS.find(s=>s.id===skillId);
  if(!skill) return;
  STATE.activeSkill = skillId;
  switchTab("skills");

  const runner = _el("skill-runner");
  const grid   = _el("skills-grid");
  if(runner){ runner.style.display="block"; }
  if(grid)  { grid.style.display="none"; }

  const content = _el("skill-runner-content");
  if(!content) return;

  const renderer = SKILL_RENDERERS[skillId];
  if(renderer){ content.innerHTML=""; renderer(content); }
  else content.innerHTML=`<div class="skill-placeholder"><div class="skill-placeholder-icon"><i class="${skill.icon}" style="color:${skill.color};"></i></div><div class="skill-placeholder-title">${escHtml(skill.title)}</div><div class="skill-placeholder-desc">Skill em desenvolvimento. Use o Agente para assistência.</div><button class="btn-primary" onclick="setAgentPrompt('Me ajude com ${escAttr(skill.title)}: '); switchTab(\"agent\");"><i class="fas fa-robot"></i> Abrir no Agente</button></div>`;
}

function closeSkill(){
  STATE.activeSkill=null;
  const runner=_el("skill-runner"); if(runner) runner.style.display="none";
  const grid=_el("skills-grid"); if(grid) grid.style.display="";
}

/* ── SKILL RENDERERS ────────────────────────────────────────────── */
const SKILL_RENDERERS = {};

/* ─── ALGORITHMIC ART ──────────────────────────────────────────── */
SKILL_RENDERERS["algorithmic-art"] = (container)=>{
  container.innerHTML=`
    <div class="skill-header">
      <button class="btn-sm" onclick="closeSkill()"><i class="fas fa-arrow-left"></i> Voltar</button>
      <div class="skill-title"><i class="fas fa-palette" style="color:#9c7df5;"></i> Algorithmic Art</div>
    </div>
    <div class="skill-body">
      <div class="art-controls">
        <div class="art-control-row">
          <label>Estilo:</label>
          <select id="art-style" class="api-input" style="width:auto;">
            <option value="fractal">Fractal Mandelbrot</option>
            <option value="lissajous">Lissajous</option>
            <option value="particles">Partículas</option>
            <option value="spiral">Espiral Dourada</option>
            <option value="voronoi">Voronoi</option>
            <option value="waves">Ondas</option>
          </select>
          <label>Cores:</label>
          <select id="art-palette" class="api-input" style="width:auto;">
            <option value="titan">TITAN</option>
            <option value="neon">Neon</option>
            <option value="sunset">Sunset</option>
            <option value="ocean">Ocean</option>
            <option value="mono">Mono</option>
          </select>
          <button class="btn-primary" onclick="generateArt()"><i class="fas fa-play"></i> Gerar</button>
          <button class="btn-secondary" onclick="downloadArt()"><i class="fas fa-download"></i> PNG</button>
        </div>
        <div class="art-params" id="art-params"></div>
      </div>
      <canvas id="art-canvas" width="600" height="400" style="width:100%;max-width:700px;border-radius:8px;background:#080c12;"></canvas>
      <div id="art-info" style="font-size:10px;color:var(--text-dim);margin-top:8px;text-align:center;"></div>
    </div>`;
  generateArt();
};

function generateArt(){
  const canvas=_el("art-canvas"); if(!canvas) return;
  const ctx=canvas.getContext("2d");
  const style=_el("art-style")?.value||"fractal";
  const pal=_el("art-palette")?.value||"titan";
  
  const palettes={
    titan:["#d97757","#2f78f0","#0fd98a","#9c7df5","#18d4f0"],
    neon:["#ff0080","#00ffff","#ff8800","#00ff00","#8800ff"],
    sunset:["#ff6b35","#f7931e","#ffcd05","#a8323b","#d4384f"],
    ocean:["#006994","#0891b2","#22d3ee","#67e8f9","#ecfeff"],
    mono:["#ffffff","#aaaaaa","#555555","#222222","#111111"],
  };
  const colors=palettes[pal]||palettes.titan;
  const W=canvas.width, H=canvas.height;
  ctx.clearRect(0,0,W,H);
  ctx.fillStyle="#080c12"; ctx.fillRect(0,0,W,H);

  const info=_el("art-info");

  if(style==="fractal"){
    // Mandelbrot fractal
    const maxIter=100; const zoom=2.5;
    const imageData=ctx.createImageData(W,H);
    for(let px=0;px<W;px++) for(let py=0;py<H;py++){
      let x0=(px/W)*3.5-2.5, y0=(py/H)*2-1, x=0, y=0, iter=0;
      while(x*x+y*y<=4&&iter<maxIter){ const xt=x*x-y*y+x0; y=2*x*y+y0; x=xt; iter++; }
      const t=iter/maxIter;
      const c=hexToRgb(colors[Math.floor(t*colors.length)%colors.length]);
      const idx=(py*W+px)*4;
      imageData.data[idx]=c.r*t; imageData.data[idx+1]=c.g*t; imageData.data[idx+2]=c.b*t; imageData.data[idx+3]=255;
    }
    ctx.putImageData(imageData,0,0);
    if(info) info.textContent="Fractal de Mandelbrot — "+maxIter+" iterações";
  } else if(style==="lissajous"){
    ctx.lineWidth=1.5; const steps=3000;
    const a=3,b=4,delta=Math.PI/4;
    for(let i=0;i<steps;i++){
      const t=(i/steps)*Math.PI*2;
      const x=W/2+Math.sin(a*t+delta)*W*0.4;
      const y=H/2+Math.sin(b*t)*H*0.4;
      const c=colors[Math.floor((i/steps)*colors.length)];
      ctx.strokeStyle=c+"aa"; ctx.beginPath(); ctx.arc(x,y,1,0,Math.PI*2); ctx.stroke();
    }
    if(info) info.textContent="Curva de Lissajous — a:"+a+" b:"+b+" δ:π/4";
  } else if(style==="particles"){
    const count=500;
    for(let i=0;i<count;i++){
      const x=Math.random()*W, y=Math.random()*H;
      const r=Math.random()*3+1;
      const c=colors[Math.floor(Math.random()*colors.length)];
      ctx.fillStyle=c+"cc"; ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
      // Connections
      if(Math.random()>0.85){
        const x2=Math.random()*W, y2=Math.random()*H;
        ctx.strokeStyle=c+"22"; ctx.lineWidth=0.5;
        ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x2,y2); ctx.stroke();
      }
    }
    if(info) info.textContent="Campo de partículas — "+count+" pontos";
  } else if(style==="spiral"){
    const maxR=Math.min(W,H)*0.45, turns=15;
    ctx.lineWidth=1.5;
    for(let t=0;t<turns*Math.PI*2;t+=0.05){
      const r=maxR*(t/(turns*Math.PI*2));
      const x=W/2+r*Math.cos(t), y=H/2+r*Math.sin(t);
      const ci=Math.floor((t/(turns*Math.PI*2))*colors.length)%colors.length;
      ctx.fillStyle=colors[ci]+"cc"; ctx.beginPath(); ctx.arc(x,y,1+r/maxR*2,0,Math.PI*2); ctx.fill();
    }
    if(info) info.textContent="Espiral dourada — "+turns+" voltas";
  } else if(style==="waves"){
    const layers=8;
    for(let l=0;l<layers;l++){
      const c=colors[l%colors.length];
      const amp=H/(layers+2)*(l+1)*0.3;
      const freq=2+l*0.5;
      const phase=l*0.8;
      ctx.beginPath(); ctx.moveTo(0,H/2);
      for(let x=0;x<W;x++){
        const y=H/2+Math.sin((x/W)*Math.PI*2*freq+phase)*amp;
        l===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
      }
      ctx.strokeStyle=c+"66"; ctx.lineWidth=2+l*0.3; ctx.stroke();
    }
    if(info) info.textContent="Ondas interferentes — "+layers+" camadas";
  } else if(style==="voronoi"){
    const pts=Array.from({length:20},()=>({x:Math.random()*W,y:Math.random()*H,c:colors[Math.floor(Math.random()*colors.length)]}));
    const imageData=ctx.createImageData(W,H);
    for(let px=0;px<W;px++) for(let py=0;py<H;py++){
      let minD=Infinity, mc=pts[0].c;
      pts.forEach(p=>{ const d=(px-p.x)**2+(py-p.y)**2; if(d<minD){minD=d;mc=p.c;} });
      const rgb=hexToRgb(mc); const i=(py*W+px)*4;
      imageData.data[i]=rgb.r; imageData.data[i+1]=rgb.g; imageData.data[i+2]=rgb.b; imageData.data[i+3]=180;
    }
    ctx.putImageData(imageData,0,0);
    pts.forEach(p=>{ ctx.fillStyle="#fff"; ctx.beginPath(); ctx.arc(p.x,p.y,3,0,Math.PI*2); ctx.fill(); });
    if(info) info.textContent="Diagrama de Voronoi — "+pts.length+" pontos";
  }
}

function hexToRgb(hex){
  const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
  return {r:r||0,g:g||0,b:b||0};
}

function downloadArt(){
  const canvas=_el("art-canvas"); if(!canvas) return;
  const a=document.createElement("a"); a.href=canvas.toDataURL("image/png");
  a.download="titan-art-"+Date.now()+".png"; a.click();
  showToast("Arte exportada!","success");
}

/* ─── THEME FACTORY ─────────────────────────────────────────────── */
SKILL_RENDERERS["theme-factory"] = (container)=>{
  const presets = {
    titan:{bg:"#080c12",bg2:"#0d1420",accent:"#2f78f0",green:"#0fd98a",red:"#f43060",copper:"#d97757",purple:"#9c7df5",text:"#c4d4e8"},
    dark:{bg:"#0a0a0a",bg2:"#141414",accent:"#6366f1",green:"#22c55e",red:"#ef4444",copper:"#f97316",purple:"#a855f7",text:"#e2e8f0"},
    ocean:{bg:"#0c1a2e",bg2:"#0f2237",accent:"#38bdf8",green:"#34d399",red:"#f87171",copper:"#fb923c",purple:"#818cf8",text:"#cbd5e1"},
    forest:{bg:"#0a1a0a",bg2:"#0f240f",accent:"#4ade80",green:"#86efac",red:"#f87171",copper:"#fcd34d",purple:"#c084fc",text:"#d1fae5"},
  };
  
  container.innerHTML=`
    <div class="skill-header">
      <button class="btn-sm" onclick="closeSkill()"><i class="fas fa-arrow-left"></i> Voltar</button>
      <div class="skill-title"><i class="fas fa-fill-drip" style="color:#9c7df5;"></i> Theme Factory</div>
    </div>
    <div class="skill-body">
      <div class="row-2col" style="gap:16px;">
        <div>
          <div class="card-title" style="margin-bottom:12px;">Presets</div>
          <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px;">
            ${Object.keys(presets).map(k=>`<button class="btn-secondary" onclick="applyThemePreset('${k}')">${k.charAt(0).toUpperCase()+k.slice(1)}</button>`).join("")}
          </div>
          <div class="card-title" style="margin-bottom:12px;">Personalizar</div>
          <div id="theme-color-pickers" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;"></div>
          <div style="margin-top:16px;display:flex;gap:8px;">
            <button class="btn-primary" onclick="applyThemePreview()"><i class="fas fa-eye"></i> Preview</button>
            <button class="btn-secondary" onclick="exportThemeCSS()"><i class="fas fa-download"></i> CSS</button>
            <button class="btn-secondary" onclick="copyThemeToClipboard()"><i class="fas fa-copy"></i> Copiar</button>
          </div>
        </div>
        <div>
          <div class="card-title" style="margin-bottom:12px;">Preview</div>
          <div id="theme-preview-box" style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:16px;min-height:200px;">
            <div style="color:var(--accent);font-size:12px;font-weight:700;margin-bottom:8px;">TEMA ATIVO</div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;">
              ${["bg","bg2","accent","green","red","copper","purple","text"].map(k=>`<div id="prev-${k}" style="width:28px;height:28px;border-radius:4px;background:var(--${k});border:1px solid rgba(255,255,255,.1);" title="${k}"></div>`).join("")}
            </div>
            <div style="background:var(--bg2);border-radius:6px;padding:10px;border:1px solid var(--border);">
              <div style="color:var(--text);font-size:11px;">Sample text component</div>
              <div style="color:var(--accent);font-size:9px;">Accent color</div>
            </div>
          </div>
          <pre id="theme-css-output" style="margin-top:12px;font-size:9px;max-height:150px;overflow:auto;background:var(--bg2);padding:10px;border-radius:6px;border:1px solid var(--border);white-space:pre-wrap;"></pre>
        </div>
      </div>
    </div>`;

  // Build color pickers
  let currentTheme={...presets.titan};
  const pickers=_el("theme-color-pickers");
  Object.entries(currentTheme).forEach(([k,v])=>{
    pickers.innerHTML+=`<div style="display:flex;align-items:center;gap:6px;">
      <input type="color" value="${v}" id="tc-${k}" style="width:32px;height:28px;border:none;background:none;cursor:pointer;" onchange="updateThemeColor('${k}',this.value)"/>
      <span style="font-size:10px;color:var(--text-mid);">${k}</span>
    </div>`;
  });

  window.currentTheme = currentTheme;
  generateThemeCSS();
};

function updateThemeColor(key,value){
  if(!window.currentTheme) return;
  window.currentTheme[key]=value;
  generateThemeCSS();
}

function applyThemePreset(name){
  const presets={
    titan:{bg:"#080c12",bg2:"#0d1420",accent:"#2f78f0",green:"#0fd98a",red:"#f43060",copper:"#d97757",purple:"#9c7df5",text:"#c4d4e8"},
    dark:{bg:"#0a0a0a",bg2:"#141414",accent:"#6366f1",green:"#22c55e",red:"#ef4444",copper:"#f97316",purple:"#a855f7",text:"#e2e8f0"},
    ocean:{bg:"#0c1a2e",bg2:"#0f2237",accent:"#38bdf8",green:"#34d399",red:"#f87171",copper:"#fb923c",purple:"#818cf8",text:"#cbd5e1"},
    forest:{bg:"#0a1a0a",bg2:"#0f240f",accent:"#4ade80",green:"#86efac",red:"#f87171",copper:"#fcd34d",purple:"#c084fc",text:"#d1fae5"},
  };
  const p=presets[name]; if(!p) return;
  window.currentTheme={...p};
  Object.entries(p).forEach(([k,v])=>{
    const inp=_el("tc-"+k); if(inp) inp.value=v;
  });
  generateThemeCSS();
  showToast("Preset aplicado: "+name,"success");
}

function generateThemeCSS(){
  const t=window.currentTheme||{}; if(!Object.keys(t).length) return;
  const css=`:root {\n${Object.entries(t).map(([k,v])=>`  --${k}: ${v};`).join("\n")}\n}`;
  const out=_el("theme-css-output"); if(out) out.textContent=css;
  return css;
}

function applyThemePreview(){
  const t=window.currentTheme||{};
  Object.entries(t).forEach(([k,v])=>{
    document.documentElement.style.setProperty("--"+k,v);
  });
  showToast("Tema aplicado ao preview!","success");
}

function exportThemeCSS(){
  const css=generateThemeCSS(); if(!css) return;
  const blob=new Blob([css],{type:"text/css"});
  const a=document.createElement("a"); a.href=URL.createObjectURL(blob);
  a.download="titan-theme.css"; a.click();
  showToast("CSS exportado!","success");
}

function copyThemeToClipboard(){
  const css=generateThemeCSS(); if(!css) return;
  copyToClipboard(css,"CSS copiado!");
}

/* ─── WEB ARTIFACTS BUILDER ─────────────────────────────────────── */
SKILL_RENDERERS["web-artifacts-builder"] = (container)=>{
  const artifacts=[
    {id:"button",name:"Button Set",desc:"Botões com variantes"},
    {id:"card",name:"Card Component",desc:"Card responsivo"},
    {id:"form",name:"Form Elements",desc:"Inputs e formulário"},
    {id:"modal",name:"Modal Dialog",desc:"Modal com overlay"},
    {id:"navbar",name:"Navbar",desc:"Barra de navegação"},
    {id:"badge",name:"Badge Set",desc:"Badges e tags"},
    {id:"table",name:"Data Table",desc:"Tabela estilizada"},
    {id:"toast",name:"Toast Alerts",desc:"Notificações"},
  ];

  container.innerHTML=`
    <div class="skill-header">
      <button class="btn-sm" onclick="closeSkill()"><i class="fas fa-arrow-left"></i> Voltar</button>
      <div class="skill-title"><i class="fas fa-cube" style="color:#2f78f0;"></i> Web Artifacts Builder</div>
    </div>
    <div class="skill-body">
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;">
        ${artifacts.map(a=>`<button class="btn-secondary" onclick="renderArtifact('${a.id}')" style="font-size:10px;">${a.name}</button>`).join("")}
      </div>
      <div class="row-2col" style="gap:12px;">
        <div>
          <div class="card-title" style="margin-bottom:8px;">Código</div>
          <textarea id="artifact-code" style="width:100%;height:300px;background:var(--bg2);border:1px solid var(--border);border-radius:6px;padding:10px;color:var(--text);font-family:var(--font-mono);font-size:10px;resize:vertical;" spellcheck="false"></textarea>
          <div style="display:flex;gap:8px;margin-top:8px;">
            <button class="btn-primary" onclick="copyArtifact()"><i class="fas fa-copy"></i> Copiar</button>
            <button class="btn-secondary" onclick="downloadArtifact()"><i class="fas fa-download"></i> HTML</button>
            <button class="btn-secondary" onclick="sendArtifactToEditor()"><i class="fas fa-code"></i> Editor</button>
          </div>
        </div>
        <div>
          <div class="card-title" style="margin-bottom:8px;">Preview</div>
          <iframe id="artifact-preview" style="width:100%;height:300px;border:1px solid var(--border);border-radius:6px;background:white;"></iframe>
        </div>
      </div>
    </div>`;
  
  renderArtifact("button");
};

const ARTIFACT_TEMPLATES = {
  button:`<!DOCTYPE html><html><head><style>
body{font-family:system-ui;padding:20px;background:#f8f9fa;}
.btn{padding:8px 16px;border:none;border-radius:6px;cursor:pointer;font-weight:600;transition:all .2s;}
.btn-primary{background:#2f78f0;color:white;}
.btn-secondary{background:#6c757d;color:white;}
.btn-danger{background:#f43060;color:white;}
.btn-success{background:#0fd98a;color:white;}
.btn-outline{background:transparent;border:2px solid #2f78f0;color:#2f78f0;}
.btn:hover{opacity:.85;transform:translateY(-1px);}
.btn:active{transform:translateY(0);}
</style></head><body>
<h4>Button Variants</h4>
<div style="display:flex;gap:10px;flex-wrap:wrap;">
<button class="btn btn-primary">Primary</button>
<button class="btn btn-secondary">Secondary</button>
<button class="btn btn-danger">Danger</button>
<button class="btn btn-success">Success</button>
<button class="btn btn-outline">Outline</button>
</div></body></html>`,

  card:`<!DOCTYPE html><html><head><style>
body{font-family:system-ui;padding:20px;background:#f0f2f5;}
.card{background:white;border-radius:12px;padding:20px;box-shadow:0 2px 12px rgba(0,0,0,.1);max-width:320px;}
.card-img{width:100%;height:140px;background:linear-gradient(135deg,#2f78f0,#9c7df5);border-radius:8px;margin-bottom:16px;}
.card-title{font-weight:700;font-size:18px;margin-bottom:8px;}
.card-desc{color:#666;font-size:14px;margin-bottom:16px;}
.card-btn{background:#2f78f0;color:white;border:none;border-radius:6px;padding:8px 16px;cursor:pointer;font-weight:600;}
.card-tag{background:#e8f0fe;color:#2f78f0;font-size:11px;padding:3px 8px;border-radius:99px;}
</style></head><body>
<div class="card">
<div class="card-img"></div>
<div style="margin-bottom:8px;"><span class="card-tag">Design</span></div>
<div class="card-title">Card Component</div>
<div class="card-desc">Um card responsivo com imagem, título, descrição e botão de ação.</div>
<button class="card-btn">Ver mais →</button>
</div></body></html>`,

  modal:`<!DOCTYPE html><html><head><style>
body{font-family:system-ui;padding:20px;background:#f0f2f5;}
.btn{padding:8px 16px;background:#2f78f0;color:white;border:none;border-radius:6px;cursor:pointer;font-weight:600;}
.overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:100;align-items:center;justify-content:center;}
.overlay.show{display:flex;}
.modal{background:white;border-radius:12px;padding:24px;max-width:400px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,.3);}
.modal-title{font-weight:700;font-size:18px;margin-bottom:8px;}
.modal-desc{color:#666;font-size:14px;margin-bottom:20px;}
.modal-actions{display:flex;gap:8px;justify-content:flex-end;}
.btn-cancel{background:#f0f0f0;color:#333;}
</style></head><body>
<button class="btn" onclick="document.getElementById('modal-overlay').classList.add('show')">Abrir Modal</button>
<div class="overlay" id="modal-overlay" onclick="if(event.target===this)this.classList.remove('show')">
<div class="modal">
<div class="modal-title">Modal Dialog</div>
<div class="modal-desc">Um modal acessível com overlay, fechamento por clique externo e ações.</div>
<div class="modal-actions">
<button class="btn btn-cancel" onclick="document.getElementById('modal-overlay').classList.remove('show')">Cancelar</button>
<button class="btn" onclick="document.getElementById('modal-overlay').classList.remove('show')">Confirmar</button>
</div>
</div>
</div></body></html>`,

  table:`<!DOCTYPE html><html><head><style>
body{font-family:system-ui;padding:20px;background:#f8f9fa;}
table{width:100%;border-collapse:collapse;background:white;border-radius:8px;overflow:hidden;box-shadow:0 1px 6px rgba(0,0,0,.1);}
th{background:#2f78f0;color:white;padding:12px 16px;text-align:left;font-size:12px;font-weight:700;letter-spacing:.5px;}
td{padding:10px 16px;border-bottom:1px solid #f0f0f0;font-size:13px;}
tr:hover td{background:#f8f9fa;}
.badge{padding:2px 8px;border-radius:99px;font-size:10px;font-weight:700;}
.ok{background:#d4f8e8;color:#0a8a4c;}
.warn{background:#fff3cd;color:#856404;}
.err{background:#fde8e8;color:#c41c1c;}
</style></head><body>
<table>
<thead><tr><th>NOME</th><th>STATUS</th><th>ÚLTIMA ATIVIDADE</th><th>SCORE</th></tr></thead>
<tbody>
<tr><td>Alice Johnson</td><td><span class="badge ok">Ativo</span></td><td>há 2min</td><td>98</td></tr>
<tr><td>Bob Smith</td><td><span class="badge warn">Pendente</span></td><td>há 1h</td><td>72</td></tr>
<tr><td>Carol White</td><td><span class="badge err">Inativo</span></td><td>há 3d</td><td>45</td></tr>
</tbody>
</table></body></html>`,
};

function renderArtifact(id){
  const template=ARTIFACT_TEMPLATES[id]||`<html><body><p>Template não encontrado</p></body></html>`;
  const code=_el("artifact-code"); if(code) code.value=template;
  updateArtifactPreview();
}

function updateArtifactPreview(){
  const code=_el("artifact-code")?.value||"";
  const frame=_el("artifact-preview"); if(!frame) return;
  const blob=new Blob([code],{type:"text/html"});
  frame.src=URL.createObjectURL(blob);
}

function copyArtifact(){ copyToClipboard(_el("artifact-code")?.value||"","Código copiado!"); }

function downloadArtifact(){
  const code=_el("artifact-code")?.value||"";
  const blob=new Blob([code],{type:"text/html"});
  const a=document.createElement("a"); a.href=URL.createObjectURL(blob);
  a.download="artifact-"+Date.now()+".html"; a.click();
  showToast("Arquivo HTML exportado!","success");
}

function sendArtifactToEditor(){
  const code=_el("artifact-code")?.value||"";
  const path="artifacts/component-"+Date.now()+".html";
  STATE.files[path]=code; STATE.modifiedFiles.add(path);
  loadFileInEditor?.(path); openFileTab?.(path); switchTab("editor");
}

/* ─── DOC CO-AUTHORING ──────────────────────────────────────────── */
SKILL_RENDERERS["doc-coauthoring"] = (container)=>{
  container.innerHTML=`
    <div class="skill-header">
      <button class="btn-sm" onclick="closeSkill()"><i class="fas fa-arrow-left"></i> Voltar</button>
      <div class="skill-title"><i class="fas fa-file-alt" style="color:#0fd98a;"></i> Doc Co-authoring</div>
      <div style="margin-left:auto;display:flex;gap:8px;">
        <select id="doc-template" class="api-input" style="width:auto;font-size:11px;">
          <option value="blank">Em branco</option>
          <option value="readme">README</option>
          <option value="api-docs">API Docs</option>
          <option value="meeting">Ata de Reunião</option>
          <option value="postmortem">Post-mortem</option>
          <option value="adr">ADR (Decision Record)</option>
        </select>
        <button class="btn-sm" onclick="loadDocTemplate()">Carregar</button>
        <button class="btn-sm" onclick="exportDoc('md')"><i class="fas fa-download"></i> .MD</button>
        <button class="btn-sm" onclick="exportDoc('html')"><i class="fas fa-download"></i> .HTML</button>
        <button class="btn-sm btn-accent" onclick="aiCoauthorDoc()"><i class="fas fa-robot"></i> AI</button>
      </div>
    </div>
    <div class="skill-body" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;height:calc(100% - 60px);">
      <div style="display:flex;flex-direction:column;">
        <div style="font-size:10px;color:var(--text-dim);margin-bottom:6px;">MARKDOWN</div>
        <textarea id="doc-editor" style="flex:1;width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:6px;padding:12px;color:var(--text);font-family:var(--font-mono);font-size:11px;resize:none;" placeholder="# Título do documento&#10;&#10;Escreva em markdown..." oninput="updateDocPreview()"></textarea>
        <button class="btn-sm btn-primary" style="margin-top:8px;" onclick="sendDocToAgent()"><i class="fas fa-robot"></i> Melhorar com IA</button>
      </div>
      <div>
        <div style="font-size:10px;color:var(--text-dim);margin-bottom:6px;">PREVIEW</div>
        <div id="doc-preview" style="background:white;border-radius:6px;padding:16px;height:340px;overflow-y:auto;color:#1a1a1a;font-family:Georgia,serif;font-size:13px;line-height:1.7;"></div>
      </div>
    </div>`;
  loadDocTemplate();
};

const DOC_TEMPLATES = {
  blank:"# Título\n\nConteúdo aqui...\n",
  readme:`# Projeto\n\n## Descrição\nBreve descrição do projeto.\n\n## Instalação\n\`\`\`bash\nnpm install\n\`\`\`\n\n## Uso\n\`\`\`bash\nnpm start\n\`\`\`\n\n## Contribuição\nVeja [CONTRIBUTING.md](CONTRIBUTING.md).\n\n## Licença\nMIT\n`,
  "api-docs":"# API Reference\n\n## Endpoints\n\n### GET /api/users\n\nRetorna lista de usuários.\n\n**Response:**\n```json\n[{\"id\": 1, \"name\": \"Alice\"}]\n```\n",
  meeting:"# Ata de Reunião\n\n**Data:** "+new Date().toLocaleDateString("pt-BR")+"\n**Participantes:** \n\n## Pauta\n1. Item 1\n2. Item 2\n\n## Decisões\n\n## Ações\n| Responsável | Ação | Prazo |\n|---|---|---|\n| | | |\n",
  postmortem:"# Post-mortem\n\n## Resumo\n\n## Timeline\n\n## Causa Raiz\n\n## Impacto\n\n## Ações de Melhoria\n",
  adr:"# ADR-001: Decisão Técnica\n\n**Status:** Proposto\n**Data:** "+new Date().toLocaleDateString("pt-BR")+"\n\n## Contexto\n\n## Decisão\n\n## Consequências\n\n### Positivas\n\n### Negativas\n",
};

function loadDocTemplate(){
  const tpl=_el("doc-template")?.value||"blank";
  const ed=_el("doc-editor"); if(ed) ed.value=DOC_TEMPLATES[tpl]||"";
  updateDocPreview();
}

function updateDocPreview(){
  const ed=_el("doc-editor"); if(!ed) return;
  const prev=_el("doc-preview"); if(!prev) return;
  prev.innerHTML=renderMarkdown(ed.value)||"<em style='color:#999'>Nenhum conteúdo</em>";
}

function exportDoc(format){
  const content=_el("doc-editor")?.value||"";
  let blob, ext;
  if(format==="html"){
    const html=`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Documento</title><style>body{font-family:Georgia,serif;max-width:800px;margin:40px auto;padding:20px;line-height:1.7;color:#1a1a1a;}h1,h2,h3{font-family:system-ui;}code{background:#f0f0f0;padding:2px 6px;border-radius:3px;}pre{background:#f0f0f0;padding:16px;border-radius:6px;overflow-x:auto;}</style></head><body>${renderMarkdown(content)}</body></html>`;
    blob=new Blob([html],{type:"text/html"}); ext="html";
  } else {
    blob=new Blob([content],{type:"text/markdown"}); ext="md";
  }
  const a=document.createElement("a"); a.href=URL.createObjectURL(blob);
  a.download=`documento-${Date.now()}.${ext}`; a.click();
  showToast("Documento exportado!","success");
}

function sendDocToAgent(){
  const content=_el("doc-editor")?.value||"";
  setAgentPrompt("Melhore este documento:\n\n"+content.substring(0,1000));
  switchTab("agent");
}

/* ─── INTERNAL COMMS ────────────────────────────────────────────── */
SKILL_RENDERERS["internal-comms"] = (container)=>{
  container.innerHTML=`
    <div class="skill-header">
      <button class="btn-sm" onclick="closeSkill()"><i class="fas fa-arrow-left"></i> Voltar</button>
      <div class="skill-title"><i class="fas fa-comments" style="color:#18d4f0;"></i> Internal Comms</div>
    </div>
    <div class="skill-body">
      <div class="row-2col" style="gap:12px;">
        <div>
          <div class="api-field">
            <div class="api-label"><span class="api-label-name">Tipo de Comunicado</span></div>
            <select id="comms-type" class="api-input" style="width:100%;">
              <option value="announcement">Anúncio Geral</option>
              <option value="outage">Alerta de Indisponibilidade</option>
              <option value="deploy">Comunicado de Deploy</option>
              <option value="onboarding">Boas-vindas</option>
              <option value="retrospective">Retrospectiva</option>
              <option value="changenote">Changelog / Release Notes</option>
            </select>
          </div>
          <div class="api-field">
            <div class="api-label"><span class="api-label-name">Tom</span></div>
            <select id="comms-tone" class="api-input" style="width:100%;">
              <option value="formal">Formal</option>
              <option value="friendly">Amigável</option>
              <option value="urgent">Urgente</option>
              <option value="celebratory">Comemorativo</option>
            </select>
          </div>
          <div class="api-field">
            <div class="api-label"><span class="api-label-name">Contexto / Informações</span></div>
            <textarea id="comms-context" class="api-input" rows="4" placeholder="Descreva o que aconteceu, o que muda, datas relevantes..." style="width:100%;"></textarea>
          </div>
          <button class="btn-primary" style="width:100%;" onclick="generateComms()"><i class="fas fa-robot"></i> Gerar com IA</button>
        </div>
        <div>
          <div class="card-title" style="margin-bottom:8px;">Resultado</div>
          <div id="comms-output" style="background:var(--bg2);border:1px solid var(--border);border-radius:6px;padding:12px;min-height:200px;font-size:11px;line-height:1.7;white-space:pre-wrap;color:var(--text);"></div>
          <div style="display:flex;gap:8px;margin-top:8px;">
            <button class="btn-sm" onclick="copyToClipboard(_el('comms-output').textContent,'Comunicado copiado!')"><i class="fas fa-copy"></i> Copiar</button>
            <button class="btn-sm" onclick="sendCommsToSlack()"><i class="fab fa-slack"></i> Slack</button>
          </div>
        </div>
      </div>
    </div>`;
};

async function generateComms(){
  if(!isConfigured()){ showToast("Configure Anthropic API Key","error"); return; }
  const type=_el("comms-type")?.value, tone=_el("comms-tone")?.value, ctx=_el("comms-context")?.value;
  const out=_el("comms-output"); if(!out) return;
  out.textContent="Gerando...";
  try {
    const res=await fetch(ANTHROPIC_API,{
      method:"POST",
      headers:{"Content-Type":"application/json","x-api-key":KEYS.anthropic,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
      body:JSON.stringify({model:MODEL,max_tokens:1500,messages:[{role:"user",content:`Crie um comunicado interno do tipo "${type}" com tom "${tone}". Contexto: ${ctx||"Uso geral"}. Responda APENAS com o texto do comunicado, sem explicações.`}]})
    });
    const data=await res.json();
    if(!res.ok) throw new Error(data.error?.message||"Erro");
    out.textContent=data.content?.[0]?.text||"Erro ao gerar";
    showToast("Comunicado gerado!","success");
  } catch(e){ out.textContent="Erro: "+e.message; showToast("Erro: "+e.message,"error"); }
}

/* ─── SKILL CREATOR ─────────────────────────────────────────────── */
SKILL_RENDERERS["skill-creator"] = (container)=>{
  container.innerHTML=`
    <div class="skill-header">
      <button class="btn-sm" onclick="closeSkill()"><i class="fas fa-arrow-left"></i> Voltar</button>
      <div class="skill-title"><i class="fas fa-magic" style="color:#d97757;"></i> Skill Creator</div>
    </div>
    <div class="skill-body">
      <div class="row-2col" style="gap:12px;">
        <div>
          <div class="api-field">
            <div class="api-label"><span class="api-label-name">Nome da Skill</span></div>
            <input id="new-skill-name" class="api-input" type="text" placeholder="Minha Nova Skill" style="width:100%;"/>
          </div>
          <div class="api-field">
            <div class="api-label"><span class="api-label-name">Descrição</span></div>
            <textarea id="new-skill-desc" class="api-input" rows="2" placeholder="O que essa skill faz?" style="width:100%;"></textarea>
          </div>
          <div class="api-field">
            <div class="api-label"><span class="api-label-name">Prompt do Sistema</span></div>
            <textarea id="new-skill-prompt" class="api-input" rows="5" placeholder="Você é um assistente especializado em..." style="width:100%;"></textarea>
          </div>
          <div class="api-field">
            <div class="api-label"><span class="api-label-name">Cor</span></div>
            <input id="new-skill-color" type="color" value="#d97757"/>
          </div>
          <button class="btn-primary" onclick="createNewSkill()"><i class="fas fa-plus"></i> Criar Skill</button>
        </div>
        <div>
          <div class="card-title" style="margin-bottom:8px;">Skills Customizadas</div>
          <div id="custom-skills-list" style="min-height:100px;"></div>
        </div>
      </div>
    </div>`;
  renderCustomSkillsList();
};

function createNewSkill(){
  const name=_el("new-skill-name")?.value?.trim();
  const desc=_el("new-skill-desc")?.value?.trim();
  const prompt=_el("new-skill-prompt")?.value?.trim();
  const color=_el("new-skill-color")?.value||"#d97757";
  if(!name||!desc){ showToast("Preencha nome e descrição","error"); return; }
  const skill={id:"custom-"+Date.now(),icon:"fas fa-star",title:name,desc,color,tags:["Custom"],prompt,isCustom:true};
  SKILLS.push(skill);
  SKILL_RENDERERS[skill.id]=(container)=>{
    container.innerHTML=`
      <div class="skill-header">
        <button class="btn-sm" onclick="closeSkill()"><i class="fas fa-arrow-left"></i> Voltar</button>
        <div class="skill-title"><i class="${skill.icon}" style="color:${skill.color};"></i> ${escHtml(skill.title)}</div>
      </div>
      <div class="skill-body">
        <div id="custom-skill-chat" style="min-height:200px;background:var(--bg2);border-radius:6px;padding:12px;margin-bottom:8px;"></div>
        <div style="display:flex;gap:8px;">
          <input id="custom-skill-input" class="api-input" type="text" placeholder="Sua mensagem..." style="flex:1;" onkeydown="if(event.key==='Enter')runCustomSkill('${escAttr(skill.id)}','${escAttr(skill.prompt||'')}')"/>
          <button class="btn-primary" onclick="runCustomSkill('${escAttr(skill.id)}','${escAttr(skill.prompt||'')}')"><i class="fas fa-paper-plane"></i></button>
        </div>
      </div>`;
  };
  buildSkillsGrid(); buildSkillsNav();
  renderCustomSkillsList();
  showToast("Skill criada: "+name,"success");
}

async function runCustomSkill(skillId, systemPrompt){
  const input=_el("custom-skill-input")?.value?.trim(); if(!input) return;
  if(!isConfigured()){ showToast("Configure Anthropic API Key","error"); return; }
  const chat=_el("custom-skill-chat"); if(!chat) return;
  chat.innerHTML+=`<div style="color:var(--accent);font-size:10px;margin-bottom:6px;"><strong>Você:</strong> ${escHtml(input)}</div>`;
  _el("custom-skill-input").value="";
  try {
    const res=await fetch(ANTHROPIC_API,{
      method:"POST",
      headers:{"Content-Type":"application/json","x-api-key":KEYS.anthropic,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
      body:JSON.stringify({model:MODEL,max_tokens:2000,system:systemPrompt||"Você é um assistente útil.",messages:[{role:"user",content:input}]})
    });
    const data=await res.json();
    if(!res.ok) throw new Error(data.error?.message||"Erro");
    const reply=data.content?.[0]?.text||"";
    chat.innerHTML+=`<div style="color:var(--text);font-size:10px;margin-bottom:12px;line-height:1.7;">${renderMarkdown(reply)}</div>`;
    chat.scrollTop=chat.scrollHeight;
  } catch(e){ chat.innerHTML+=`<div style="color:var(--red);font-size:10px;">Erro: ${escHtml(e.message)}</div>`; }
}

function renderCustomSkillsList(){
  const list=_el("custom-skills-list"); if(!list) return;
  const customs=SKILLS.filter(s=>s.isCustom);
  if(!customs.length){ list.innerHTML=`<div class="empty-state"><span class="empty-text">Nenhuma skill criada ainda</span></div>`; return; }
  list.innerHTML=customs.map(s=>`
    <div class="list-row">
      <div class="dot" style="background:${s.color};"></div>
      <div class="row-main">
        <div class="row-title">${escHtml(s.title)}</div>
        <div class="row-sub">${escHtml(s.desc)}</div>
      </div>
      <button class="btn-sm" onclick="openSkill('${escAttr(s.id)}')">Abrir</button>
    </div>`).join("");
}

/* ─── BRAND GUIDELINES ──────────────────────────────────────────── */
SKILL_RENDERERS["brand-guidelines"] = (container)=>{
  container.innerHTML=`
    <div class="skill-header">
      <button class="btn-sm" onclick="closeSkill()"><i class="fas fa-arrow-left"></i> Voltar</button>
      <div class="skill-title"><i class="fas fa-trademark" style="color:#2f78f0;"></i> Brand Guidelines</div>
    </div>
    <div class="skill-body">
      <div class="row-2col" style="gap:16px;">
        <div>
          <div class="api-field">
            <div class="api-label"><span class="api-label-name">Nome da Marca</span></div>
            <input id="brand-name" class="api-input" type="text" placeholder="ACME Corp" style="width:100%;"/>
          </div>
          <div class="api-field">
            <div class="api-label"><span class="api-label-name">Cor Primária</span></div>
            <div style="display:flex;gap:8px;"><input id="brand-primary" type="color" value="#2f78f0"/> <input id="brand-secondary" type="color" value="#d97757"/> <input id="brand-accent" type="color" value="#0fd98a"/></div>
          </div>
          <div class="api-field">
            <div class="api-label"><span class="api-label-name">Setor / Mercado</span></div>
            <input id="brand-sector" class="api-input" type="text" placeholder="Tecnologia, Saúde, Finanças..." style="width:100%;"/>
          </div>
          <div class="api-field">
            <div class="api-label"><span class="api-label-name">Valores da Marca</span></div>
            <textarea id="brand-values" class="api-input" rows="3" placeholder="Inovação, confiança, transparência..." style="width:100%;"></textarea>
          </div>
          <button class="btn-primary" onclick="generateBrandGuide()"><i class="fas fa-robot"></i> Gerar Guia com IA</button>
        </div>
        <div>
          <div id="brand-preview" style="background:white;border-radius:8px;padding:20px;color:#1a1a1a;min-height:300px;overflow-y:auto;font-size:12px;line-height:1.7;"></div>
        </div>
      </div>
    </div>`;
};

async function generateBrandGuide(){
  if(!isConfigured()){ showToast("Configure Anthropic API Key","error"); return; }
  const name=_el("brand-name")?.value||"Marca";
  const sector=_el("brand-sector")?.value||"Tecnologia";
  const values=_el("brand-values")?.value||"";
  const p=_el("brand-preview"); if(!p) return;
  p.innerHTML="<em>Gerando guia...</em>";
  try {
    const res=await fetch(ANTHROPIC_API,{
      method:"POST",
      headers:{"Content-Type":"application/json","x-api-key":KEYS.anthropic,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
      body:JSON.stringify({model:MODEL,max_tokens:2000,messages:[{role:"user",content:`Crie um Brand Guidelines completo para: ${name}\nSetor: ${sector}\nValores: ${values}\n\nInclua: Missão, Visão, Tom de Voz, Uso do Logo, Tipografia recomendada, Cores e uso, Exemplos de comunicação. Use markdown formatado.`}]})
    });
    const data=await res.json();
    if(!res.ok) throw new Error(data.error?.message||"Erro");
    p.innerHTML=renderMarkdown(data.content?.[0]?.text||"");
    showToast("Brand Guidelines gerado!","success");
  } catch(e){ p.innerHTML=`<em style="color:red;">Erro: ${escHtml(e.message)}</em>`; }
}

/* ─── MCP BUILDER ───────────────────────────────────────────────── */
SKILL_RENDERERS["mcp-builder"] = (container)=>{
  container.innerHTML=`
    <div class="skill-header">
      <button class="btn-sm" onclick="closeSkill()"><i class="fas fa-arrow-left"></i> Voltar</button>
      <div class="skill-title"><i class="fas fa-plug" style="color:#f5a623;"></i> MCP Builder</div>
    </div>
    <div class="skill-body">
      <div class="api-field">
        <div class="api-label"><span class="api-label-name">Nome do Servidor MCP</span></div>
        <input id="mcp-name" class="api-input" type="text" placeholder="meu-servidor" style="width:100%;"/>
      </div>
      <div class="api-field">
        <div class="api-label"><span class="api-label-name">Ferramentas (uma por linha)</span></div>
        <textarea id="mcp-tools" class="api-input" rows="4" placeholder="get_weather - Retorna clima de uma cidade&#10;send_email - Envia email" style="width:100%;"></textarea>
      </div>
      <button class="btn-primary" onclick="generateMCPServer()"><i class="fas fa-robot"></i> Gerar com IA</button>
      <div id="mcp-output" style="margin-top:12px;"></div>
    </div>`;
};

async function generateMCPServer(){
  if(!isConfigured()){ showToast("Configure Anthropic API Key","error"); return; }
  const name=_el("mcp-name")?.value||"meu-servidor";
  const tools=_el("mcp-tools")?.value||"";
  const out=_el("mcp-output"); if(!out) return;
  out.innerHTML="<em>Gerando servidor MCP...</em>";
  try {
    const res=await fetch(ANTHROPIC_API,{
      method:"POST",
      headers:{"Content-Type":"application/json","x-api-key":KEYS.anthropic,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
      body:JSON.stringify({model:MODEL,max_tokens:3000,messages:[{role:"user",content:`Crie um servidor MCP (Model Context Protocol) em TypeScript chamado "${name}" com as ferramentas:\n${tools}\n\nGere o código completo do servidor MCP usando @modelcontextprotocol/sdk com comentários explicativos.`}]})
    });
    const data=await res.json();
    if(!res.ok) throw new Error(data.error?.message||"Erro");
    out.innerHTML=renderMarkdown(data.content?.[0]?.text||"");
    if(window.hljs) out.querySelectorAll("pre code").forEach(el=>hljs.highlightElement(el));
    showToast("Servidor MCP gerado!","success");
  } catch(e){ out.innerHTML=`<em style="color:var(--red);">Erro: ${escHtml(e.message)}</em>`; }
}

/* ─── SLACK GIF CREATOR ─────────────────────────────────────────── */
SKILL_RENDERERS["slack-gif-creator"] = (container)=>{
  container.innerHTML=`
    <div class="skill-header">
      <button class="btn-sm" onclick="closeSkill()"><i class="fas fa-arrow-left"></i> Voltar</button>
      <div class="skill-title"><i class="fas fa-film" style="color:#f43060;"></i> Slack GIF Creator</div>
    </div>
    <div class="skill-body">
      <div class="row-2col" style="gap:12px;">
        <div>
          <div class="api-field">
            <div class="api-label"><span class="api-label-name">Texto / Emoji</span></div>
            <input id="gif-text" class="api-input" type="text" placeholder="🚀 Deploy!" style="width:100%;"/>
          </div>
          <div class="api-field">
            <div class="api-label"><span class="api-label-name">Estilo</span></div>
            <select id="gif-style" class="api-input" style="width:100%;">
              <option value="bounce">Bounce</option>
              <option value="pulse">Pulse</option>
              <option value="rotate">Rotate</option>
              <option value="glitch">Glitch</option>
              <option value="typewriter">Typewriter</option>
            </select>
          </div>
          <div class="api-field">
            <div class="api-label"><span class="api-label-name">Cor de Fundo</span></div>
            <input id="gif-bg" type="color" value="#080c12"/>
          </div>
          <div class="api-field">
            <div class="api-label"><span class="api-label-name">Cor do Texto</span></div>
            <input id="gif-color" type="color" value="#d97757"/>
          </div>
          <button class="btn-primary" onclick="generateSlackGif()"><i class="fas fa-play"></i> Gerar</button>
          <button class="btn-secondary" onclick="downloadSlackGif()" style="margin-left:8px;"><i class="fas fa-download"></i> PNG</button>
        </div>
        <div style="display:flex;flex-direction:column;align-items:center;">
          <canvas id="gif-canvas" width="200" height="100" style="border-radius:8px;border:1px solid var(--border);"></canvas>
          <div style="font-size:9px;color:var(--text-dim);margin-top:6px;">Preview em tempo real</div>
        </div>
      </div>
    </div>`;
  startGifAnimation();
};

let gifAnimFrame=null;
function startGifAnimation(){
  if(gifAnimFrame) cancelAnimationFrame(gifAnimFrame);
  const canvas=_el("gif-canvas"); if(!canvas) return;
  const ctx=canvas.getContext("2d");
  let t=0;
  function draw(){
    const text=_el("gif-text")?.value||"🚀";
    const style=_el("gif-style")?.value||"bounce";
    const bg=_el("gif-bg")?.value||"#080c12";
    const color=_el("gif-color")?.value||"#d97757";
    ctx.fillStyle=bg; ctx.fillRect(0,0,200,100);
    ctx.font="bold 24px system-ui"; ctx.textAlign="center"; ctx.textBaseline="middle";
    let x=100, y=50, alpha=1;
    if(style==="bounce") y=50+Math.sin(t*0.1)*15;
    else if(style==="pulse"){ const s=1+Math.sin(t*0.08)*0.2; ctx.scale(s,s); x=100/s; y=50/s; }
    else if(style==="rotate"){ ctx.translate(100,50); ctx.rotate(Math.sin(t*0.05)*0.2); x=0; y=0; }
    else if(style==="glitch"){ x=100+(Math.random()>0.9?(Math.random()-0.5)*10:0); }
    else if(style==="typewriter"){ const chars=text.substring(0,Math.floor((t*0.05)%text.length+1)); ctx.fillStyle=color; ctx.fillText(chars,x,y); t++; gifAnimFrame=requestAnimationFrame(draw); return; }
    ctx.fillStyle=color; ctx.fillText(text,x,y);
    ctx.setTransform(1,0,0,1,0,0);
    t++; gifAnimFrame=requestAnimationFrame(draw);
  }
  draw();
}

function generateSlackGif(){ startGifAnimation(); }
function downloadSlackGif(){
  const canvas=_el("gif-canvas"); if(!canvas) return;
  const a=document.createElement("a"); a.href=canvas.toDataURL("image/png");
  a.download="slack-sticker.png"; a.click(); showToast("Sticker exportado!","success");
}
