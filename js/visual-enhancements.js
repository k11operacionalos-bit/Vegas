/* ═══════════════════════════════════════════════════════════════════
   TITAN v6 — visual-enhancements.js
   Melhorias visuais, renderMarkdown aprimorado, helpers adicionais
   Parte da fusão Nga + Claw Code
═══════════════════════════════════════════════════════════════════ */

/* ── MARKDOWN RENDERER APRIMORADO ───────────────────────────────── */
// Estende o renderMarkdown do core.js com suporte a mais padrões
(function patchMarkdown(){
  if(typeof window === 'undefined') return;
  // Aguarda core.js carregar
  const original = window.renderMarkdown;
  window.renderMarkdown = function(text){
    if(typeof original === 'function') return original(text);
    // Fallback simples
    return (text||'')
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code)=>
        `<pre><code class="language-${lang||'text'}">${code}</code></pre>`)
      .replace(/`([^`]+)`/g,'<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g,'<em>$1</em>')
      .replace(/^#{3}\s+(.+)$/gm,'<h3>$1</h3>')
      .replace(/^#{2}\s+(.+)$/gm,'<h2>$1</h2>')
      .replace(/^#\s+(.+)$/gm,'<h1>$1</h1>')
      .replace(/^[-*]\s+(.+)$/gm,'<li>$1</li>')
      .replace(/\n\n/g,'</p><p>')
      .replace(/\n/g,'<br>');
  };
})();

/* ── TOAST APRIMORADO ───────────────────────────────────────────── */
// Garante que showToast existe mesmo se NotificationManager não inicializou
if(typeof window.showToast === 'undefined'){
  window.showToast = function(msg, type='info'){
    const toast = document.createElement('div');
    toast.style.cssText = `
      position:fixed;bottom:80px;right:20px;z-index:99999;
      padding:10px 16px;border-radius:8px;
      font-size:12px;font-family:var(--font-ui,sans-serif);font-weight:700;
      color:#fff;max-width:300px;
      background:${type==='success'?'#0fd98a':type==='error'?'#f43060':type==='warn'?'#f5a623':'#2f78f0'};
      box-shadow:0 4px 20px rgba(0,0,0,.4);
      animation:slideIn .25s ease;
    `;
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(()=>toast.remove(), 3000);
  };
}

/* ── SCROLL SUAVE PARA ELEMENTOS ────────────────────────────────── */
window.smoothScrollTo = function(elementId){
  const el = document.getElementById(elementId);
  if(el) el.scrollIntoView({ behavior:'smooth', block:'start' });
};

/* ── HIGHLIGHT.JS INIT ──────────────────────────────────────────── */
(function initHljs(){
  if(typeof hljs === 'undefined') return;
  try {
    hljs.configure({ ignoreUnescapedHTML: true });
    // Re-highlight quando agente adiciona código
    if(typeof Bus !== 'undefined'){
      Bus.on('agent-msg', ()=>{
        setTimeout(()=>{
          document.querySelectorAll('pre code:not(.hljs)').forEach(el=>{
            try{ hljs.highlightElement(el); }catch(_){}
          });
        }, 100);
      });
    }
  } catch(_){}
})();

/* ── KEYBOARD SHORTCUTS ─────────────────────────────────────────── */
document.addEventListener('keydown', function(e){
  // Ctrl+K → focar agente
  if((e.ctrlKey||e.metaKey) && e.key==='k'){
    e.preventDefault();
    if(typeof switchTab==='function') switchTab('agent');
    setTimeout(()=>{ const inp=document.getElementById('agent-input'); if(inp) inp.focus(); }, 100);
  }
  // Ctrl+/ → toggle sidebar
  if((e.ctrlKey||e.metaKey) && e.key==='/'){
    e.preventDefault();
    const sidebar = document.getElementById('sidebar');
    if(sidebar) sidebar.classList.toggle('open');
  }
  // Esc → fechar modais
  if(e.key==='Escape'){
    const modal = document.getElementById('api-modal');
    if(modal && modal.classList.contains('show')) modal.classList.remove('show');
  }
});

/* ── CLAW TAB BADGE UPDATE ──────────────────────────────────────── */
// Atualiza badge da aba Claw quando loop muda de estado
(function setupClawBadgeUpdate(){
  if(typeof Bus === 'undefined') return;
  Bus.on('loop-phase-change', ()=>{
    const cb = document.getElementById('claw-badge-tab');
    if(!cb) return;
    const loopActive = (typeof LOOP_STATE !== 'undefined') && LOOP_STATE.active;
    const phase = (typeof LOOP_STATE !== 'undefined') ? LOOP_STATE.phase : 'idle';
    if(loopActive && phase !== 'idle'){
      cb.textContent = phase.substring(0,4).toUpperCase();
      cb.style.display = 'inline-block';
      cb.style.background = phase === 'error' ? 'rgba(244,48,96,.8)' : 'rgba(15,217,138,.8)';
    } else {
      cb.style.display = 'none';
    }
  });
})();

/* ── AUTO-EXTRACT FACTS FROM AGENT RESPONSES ────────────────────── */
// Integra memAutoExtract com o bus do agente
(function setupMemAutoExtract(){
  if(typeof Bus === 'undefined') return;
  Bus.on('agent-msg', (data)=>{
    if(!data || data.role !== 'assistant') return;
    if(typeof memAutoExtract === 'function'){
      try{ memAutoExtract(data.text || ''); }catch(_){}
    }
  });
})();

/* ── COST TRACKING INTEGRATION ──────────────────────────────────── */
// Intercepta respostas da API para rastrear tokens automaticamente
(function setupCostTracking(){
  if(typeof Bus === 'undefined') return;
  Bus.on('api-response', (data)=>{
    if(data && data.usage && typeof costTrack === 'function'){
      try{
        costTrack(data.model || (typeof MODEL !== 'undefined' ? MODEL : 'default'),
          data.usage.input_tokens || 0, data.usage.output_tokens || 0);
      }catch(_){}
    }
  });
})();

/* ── MOBILE UX IMPROVEMENTS ─────────────────────────────────────── */
(function setupMobileUX(){
  // Previne zoom duplo-clique em botões mobile
  document.addEventListener('touchend', function(e){
    if(e.target.matches('button, .tab-item, .bottom-tab')){
      e.preventDefault();
      e.target.click();
    }
  }, { passive: false });

  // Fecha sidebar ao clicar fora (mobile)
  document.addEventListener('click', function(e){
    const sidebar = document.getElementById('sidebar');
    const toggle = document.getElementById('menu-toggle');
    if(!sidebar || !toggle) return;
    if(sidebar.classList.contains('open') &&
       !sidebar.contains(e.target) &&
       !toggle.contains(e.target)){
      sidebar.classList.remove('open');
      if(typeof STATE !== 'undefined') STATE.sidebarOpen = false;
    }
  });
})();

/* ── PANEL CLAW REFRESH ON VISIBILITY ───────────────────────────── */
// Quando o painel Claw fica visível, atualiza os dados
(function setupClawTabRefresh(){
  if(typeof Bus === 'undefined') return;
  // Re-render do painel Claw quando há updates de custo ou loop
  Bus.on('cost-update', ()=>{
    if(typeof STATE !== 'undefined' && STATE.tab === 'claw'){
      const el = document.getElementById('cost-panel-container');
      if(el && typeof renderCostPanel === 'function'){
        el.innerHTML = renderCostPanel();
      }
    }
  });
  Bus.on('loop-phase-change', ()=>{
    if(typeof STATE !== 'undefined' && STATE.tab === 'claw'){
      const el = document.getElementById('loop-panel-container');
      if(el && typeof renderLoopPanel === 'function'){
        el.innerHTML = renderLoopPanel();
        if(typeof updateLoopStatusUI === 'function') updateLoopStatusUI();
      }
    }
  });
})();

/* ── INIT COMPLETE LOG ───────────────────────────────────────────── */
(function logInit(){
  if(typeof addLog === 'function'){
    addLog('success', 'TITAN', 'v6.0-fused online — Nga + Claw Code fusão completa');
  }
})();
