/* ═══════════════════════════════════════════════════════════════════
   TITAN v6 — agent.js  [FUSED: Nga + Claw Code]
   Agentic loop + ClawBridge + MemoryEngine + CostTracker
   Novas tools: ultraplan, bughunter, teleport, memread/write, provider
   Loop autônomo: plan → execute → test → deploy
═══════════════════════════════════════════════════════════════════ */

const AGENT_TOOLS = [
  /* READ TOOLS (low risk — auto-execute) */
  { name:"github_read_file",        description:"Lê o conteúdo de um arquivo do repositório GitHub.", input_schema:{type:"object",properties:{path:{type:"string"},branch:{type:"string"}},required:["path"]} },
  { name:"github_list_files",       description:"Lista arquivos e pastas de um diretório do repositório.", input_schema:{type:"object",properties:{path:{type:"string"},branch:{type:"string"}}} },
  { name:"github_list_branches",    description:"Lista todas as branches do repositório.", input_schema:{type:"object",properties:{limit:{type:"number"}}} },
  { name:"github_list_commits",     description:"Lista commits recentes de uma branch.", input_schema:{type:"object",properties:{branch:{type:"string"},limit:{type:"number"},path:{type:"string"}}} },
  { name:"github_list_issues",      description:"Lista as issues do repositório.", input_schema:{type:"object",properties:{state:{type:"string",enum:["open","closed","all"]},limit:{type:"number"},label:{type:"string"}}} },
  { name:"github_list_prs",         description:"Lista Pull Requests do repositório.", input_schema:{type:"object",properties:{state:{type:"string",enum:["open","closed","all"]},limit:{type:"number"}}} },
  { name:"github_get_commit",       description:"Obtém detalhes de um commit específico.", input_schema:{type:"object",properties:{sha:{type:"string"}},required:["sha"]} },
  { name:"github_search_code",      description:"Busca código no repositório GitHub.", input_schema:{type:"object",properties:{query:{type:"string"},extension:{type:"string"}},required:["query"]} },
  { name:"github_get_repo_info",    description:"Obtém informações completas do repositório.", input_schema:{type:"object",properties:{}} },
  { name:"render_get_logs",         description:"Busca os logs mais recentes do Render.com.", input_schema:{type:"object",properties:{lines:{type:"number"},filter:{type:"string"}}} },
  { name:"render_get_metrics",      description:"Obtém métricas do serviço Render.", input_schema:{type:"object",properties:{period:{type:"string",enum:["1h","24h","7d"]}}} },
  { name:"supabase_list_tables",    description:"Lista todas as tabelas do banco Supabase.", input_schema:{type:"object",properties:{}} },
  { name:"supabase_run_query",      description:"Executa uma query SELECT no Supabase.", input_schema:{type:"object",properties:{sql:{type:"string"}},required:["sql"]} },
  { name:"analyze_error",           description:"Analisa um erro e sugere correção detalhada.", input_schema:{type:"object",properties:{error_message:{type:"string"},stack_trace:{type:"string"},file_path:{type:"string"}},required:["error_message"]} },
  { name:"generate_report",         description:"Gera relatório de status completo do projeto.", input_schema:{type:"object",properties:{format:{type:"string",enum:["markdown","text","json"]}}} },
  { name:"web_search",              description:"Busca informações na web sobre tecnologias e erros.", input_schema:{type:"object",properties:{query:{type:"string"},limit:{type:"number"}},required:["query"]} },

  /* WRITE TOOLS (high risk — require approval) */
  { name:"github_create_or_update_file", description:"[ALTO RISCO] Cria ou atualiza um arquivo no GitHub.", input_schema:{type:"object",properties:{path:{type:"string"},content:{type:"string"},message:{type:"string"},branch:{type:"string"}},required:["path","content","message"]} },
  { name:"github_delete_file",      description:"[ALTO RISCO] Deleta um arquivo do repositório.", input_schema:{type:"object",properties:{path:{type:"string"},message:{type:"string"},branch:{type:"string"}},required:["path","message"]} },
  { name:"github_create_branch",    description:"[ALTO RISCO] Cria uma nova branch.", input_schema:{type:"object",properties:{branch:{type:"string"},from:{type:"string"}},required:["branch"]} },
  { name:"github_push_multiple_files", description:"[ALTO RISCO] Push de múltiplos arquivos em um commit.", input_schema:{type:"object",properties:{branch:{type:"string"},message:{type:"string"},files:{type:"array",items:{type:"object",properties:{path:{type:"string"},content:{type:"string"}},required:["path","content"]}}},required:["branch","message","files"]} },
  { name:"github_create_pr",        description:"[ALTO RISCO] Cria um Pull Request.", input_schema:{type:"object",properties:{title:{type:"string"},branch:{type:"string"},base:{type:"string"},description:{type:"string"}},required:["title","branch"]} },
  { name:"github_merge_pr",         description:"[ALTO RISCO] Faz merge de um Pull Request.", input_schema:{type:"object",properties:{pr_number:{type:"number"},merge_method:{type:"string",enum:["merge","squash","rebase"]},message:{type:"string"}},required:["pr_number"]} },
  { name:"github_close_issue",      description:"[ALTO RISCO] Fecha uma issue.", input_schema:{type:"object",properties:{issue_number:{type:"number"},comment:{type:"string"}},required:["issue_number"]} },
  { name:"render_trigger_deploy",   description:"[ALTO RISCO] Dispara redeploy no Render.", input_schema:{type:"object",properties:{reason:{type:"string"},service_id:{type:"string"}},required:["reason"]} },
  { name:"supabase_run_migration",  description:"[ALTO RISCO] Executa migration SQL no Supabase.", input_schema:{type:"object",properties:{name:{type:"string"},sql:{type:"string"}},required:["name","sql"]} },
  { name:"edit_file",               description:"[ALTO RISCO] Edita arquivo no editor local.", input_schema:{type:"object",properties:{path:{type:"string"},new_content:{type:"string"},description:{type:"string"}},required:["path","new_content","description"]} },
  { name:"create_github_issue",     description:"[ALTO RISCO] Cria uma nova issue no GitHub.", input_schema:{type:"object",properties:{title:{type:"string"},body:{type:"string"},labels:{type:"array",items:{type:"string"}}},required:["title"]} },

  /* ══ CLAW CODE TOOLS (fusão v6) ═══════════════════════════════ */
  { name:"claw_ultraplan",  description:"Decomposição profunda de task complexa em plano de execução detalhado com passos, arquivos a tocar, riscos e critério de conclusão.", input_schema:{type:"object",properties:{task:{type:"string"},context:{type:"string"}},required:["task"]} },
  { name:"claw_bughunter",  description:"Scan automático de bugs, vulnerabilidades (XSS, injection), memory leaks e code smells em código fornecido.", input_schema:{type:"object",properties:{code:{type:"string"},file_path:{type:"string"}},required:["code"]} },
  { name:"claw_teleport",   description:"Navegação instantânea: busca símbolo, função ou padrão em todos os arquivos carregados em memória.", input_schema:{type:"object",properties:{query:{type:"string"},file:{type:"string"}},required:["query"]} },
  { name:"claw_memread",    description:"Lê fatos e contexto persistente da memória cross-sessão do TITAN (usa para lembrar decisões anteriores).", input_schema:{type:"object",properties:{category:{type:"string"},query:{type:"string"}}} },
  { name:"claw_memwrite",   description:"Salva fato importante na memória persistente do TITAN para uso em sessões futuras.", input_schema:{type:"object",properties:{category:{type:"string"},content:{type:"string"}},required:["category","content"]} },
  { name:"claw_provider",   description:"Consulta ou troca o provider de LLM ativo (claude/ollama/claw-local) e lista modelos Ollama disponíveis.", input_schema:{type:"object",properties:{action:{type:"string",enum:["status","set"]},mode:{type:"string"},model:{type:"string"}}} },
];

const HIGH_RISK_TOOLS_SET = new Set([
  "github_create_or_update_file","github_delete_file","github_create_branch",
  "github_push_multiple_files","github_create_pr","github_merge_pr","github_close_issue",
  "render_trigger_deploy","supabase_run_migration","edit_file","create_github_issue",
]);

// Claw tools: auto-executadas (sem risco de escrita externa)
const CLAW_TOOLS_SET = new Set([
  "claw_ultraplan","claw_bughunter","claw_teleport",
  "claw_memread","claw_memwrite","claw_provider",
]);

/* ── SYSTEM PROMPT ──────────────────────────────────────────────── */
function buildSystemPrompt(){
  const g=STATE.ghStatus, r=STATE.renderStatus, sb=STATE.sbStatus;
  const memCtx = (typeof memBuildContextBlock==='function') ? memBuildContextBlock() : "";
  const clawInfo = (typeof clawGetProviderInfo==='function') ? clawGetProviderInfo() : null;
  const providerLine = clawInfo
    ? `Provider: ${clawInfo.mode.toUpperCase()}${clawInfo.currentModel?' ('+clawInfo.currentModel+')':''} | Claw: ${clawInfo.clawOnline?'✓':'✗'} | Ollama: ${clawInfo.ollamaOnline?'✓':'✗'}`
    : '';
  return `Você é o TITAN Super Agent v6 — agente autônomo de DevOps de alta performance. [FUSED: Nga + Claw Code]

CONEXÕES ATIVAS:
${KEYS.anthropic?"✓ Claude AI ("+MODEL+")":"✗ Claude AI — não configurado"}
${KEYS.github?"✓ GitHub ("+(KEYS.githubRepo||"sem repo definido")+")":"✗ GitHub — não configurado"}
${KEYS.render?"✓ Render.com":"✗ Render — não configurado"}
${KEYS.supabase?"✓ Supabase":"✗ Supabase — não configurado"}

ESTADO DO PROJETO:
- GitHub: branch \`${g.branch}\`, commit \`${g.sha}\` — "${g.lastCommit}"
  CI: ${g.ci} | ${g.openPRs} PRs abertos | ${g.issues} issues | Stars: ${g.stars}
- Render: ${r.status} | URL: ${r.url} | Último deploy: ${r.lastDeploy}
- Supabase: ${sb.status} (latência: ${sb.latency||"—"}ms) | ${sb.tables} tabelas
- Erros ativos: ${STATE.errors.length} | Aprovações pendentes: ${STATE.pending.length}
- Arquivos em memória: ${Object.keys(STATE.files).length}
${providerLine ? '- ' + providerLine : ''}

REGRAS CRÍTICAS DE OPERAÇÃO:
1. SEMPRE retornar tool_result para TODAS as tool_use calls
2. NUNCA deixar tool_use sem tool_result correspondente
3. Processar todas as ferramentas antes de responder ao usuário
4. Usar markdown completo nas respostas (code blocks, tabelas, listas)
5. Responder SEMPRE em Português Brasileiro
6. Ser direto, técnico e preciso nas análises

FERRAMENTAS DE LEITURA (executar automaticamente):
github_read_file, github_list_*, github_get_commit, github_search_code,
github_get_repo_info, render_get_*, supabase_list_*, supabase_run_query,
analyze_error, generate_report, web_search

FERRAMENTAS DE ESCRITA (enfileirar para aprovação humana):
github_create_or_update_file, github_delete_file, github_create_branch,
github_push_multiple_files, github_create_pr, github_merge_pr, github_close_issue,
render_trigger_deploy, supabase_run_migration, edit_file, create_github_issue

FERRAMENTAS CLAW CODE (use proativamente):
claw_ultraplan — decomposição profunda de tasks complexas
claw_bughunter — scan de bugs/vulnerabilidades em código
claw_teleport  — busca de símbolos/funções em arquivos carregados
claw_memread   — consulta memória persistente cross-sessão
claw_memwrite  — salva fatos importantes para sessões futuras
claw_provider  — status/troca do provider LLM

CAPACIDADES ESPECIAIS:
- Analisar código e sugerir melhorias arquiteturais
- Detectar bugs e vulnerabilidades em arquivos lidos
- Criar branches, PRs e fazer commits automatizados
- Monitorar CI/CD e interpretar logs de erro
- Gerar relatórios de status completos
- Buscar soluções na web para problemas técnicos
- Memória persistente cross-sessão via MemoryEngine v6
- Loop autônomo plan→execute→test→deploy${memCtx}`;
}

/* ── GITHUB API ─────────────────────────────────────────────────── */
async function githubFetch(path, method="GET", body=null){
  if(!KEYS.github) throw new Error("GitHub token não configurado. Configure em ⚙ KEYS.");
  const repo = KEYS.githubRepo||"";
  const base = repo?`https://api.github.com/repos/${repo}`:"https://api.github.com";
  const opts = {method, headers:{Authorization:"Bearer "+KEYS.github, Accept:"application/vnd.github+json", "Content-Type":"application/json"}};
  if(body) opts.body = JSON.stringify(body);
  const res = await fetch(base+path, opts);
  const text = await res.text();
  let data; try{ data=JSON.parse(text); }catch(e){ data={message:text}; }
  if(!res.ok) throw new Error("GitHub "+res.status+": "+(data.message||text.substring(0,120)));
  return data;
}

async function githubGetFileSha(path, branch="main"){
  try{
    const f = await githubFetch(`/contents/${encodeURIComponent(path)}?ref=${branch}`);
    return f.sha||null;
  }catch(e){ return null; }
}

/* ── RENDER / SUPABASE API ──────────────────────────────────────── */
async function renderFetch(path, method="GET", body=null){
  if(!KEYS.render) throw new Error("Render key não configurada");
  const opts = {method, headers:{Authorization:"Bearer "+KEYS.render, "Content-Type":"application/json"}};
  if(body) opts.body=JSON.stringify(body);
  const res = await fetch("https://api.render.com/v1"+path, opts);
  if(!res.ok) throw new Error("Render API "+res.status);
  return res.json();
}

async function supabaseFetch(path, method="GET", body=null){
  if(!KEYS.supabase||!KEYS.supabaseUrl) throw new Error("Supabase não configurado");
  const url = KEYS.supabaseUrl.replace(/\/$/,"")+path;
  const opts = {method, headers:{apikey:KEYS.supabase, Authorization:"Bearer "+KEYS.supabase, "Content-Type":"application/json"}};
  if(body) opts.body=JSON.stringify(body);
  const res = await fetch(url, opts);
  if(!res.ok) throw new Error("Supabase API "+res.status);
  return res.json();
}

/* ── EXECUTE TOOL ───────────────────────────────────────────────── */
async function executeTool(toolName, input){
  if(!KEYS.github && toolName.startsWith("github_"))
    return "⚠ GitHub Token não configurado. Vá em ⚙ API KEYS para configurar.";

  try {
    switch(toolName){

      case "github_read_file": {
        const branch = input.branch||KEYS.githubBranch||"main";
        const file   = await githubFetch(`/contents/${encodeURIComponent(input.path)}?ref=${branch}`);
        const content = atob(file.content.replace(/\n/g,""));
        STATE.files[input.path] = content;
        STATE._fileShas[input.path] = file.sha;
        addLog("info","EDITOR",`Carregado: ${input.path}`);
        return `✓ **${input.path}** (branch: ${branch} | ${file.size} bytes)\n\n\`\`\`${langFromPath(input.path).toLowerCase()}\n${content.substring(0,4000)}${content.length>4000?"\n\n...(truncado — "+content.length+" chars total)":""}\n\`\`\``;
      }

      case "github_list_files": {
        const branch = input.branch||KEYS.githubBranch||"main";
        const path   = input.path||"";
        const items  = await githubFetch(`/contents/${path}?ref=${branch}`);
        const list   = Array.isArray(items)?items:[items];
        return `📁 **/${path}** (${branch}) — ${list.length} items:\n\n`+
          list.map(i=>`${i.type==="dir"?"📂":"📄"} \`${i.name}\`${i.type==="file"?" ("+i.size+"b)":""}`).join("\n");
      }

      case "github_list_branches": {
        const branches = await githubFetch(`/branches?per_page=${input.limit||30}`);
        return `🌿 **Branches** (${branches.length}):\n\n`+
          branches.map(b=>`${b.name===STATE.ghStatus.branch?"→ ":"  "}\`${b.name}\` [${b.commit.sha.substring(0,7)}]`).join("\n");
      }

      case "github_list_commits": {
        const branch = input.branch||KEYS.githubBranch||"main";
        const limit  = input.limit||20;
        let url = `/commits?sha=${branch}&per_page=${limit}`;
        if(input.path) url+=`&path=${input.path}`;
        const commits = await githubFetch(url);
        return `📜 **Commits em ${branch}** (${commits.length}):\n\n`+
          commits.map(c=>`\`${c.sha.substring(0,7)}\` ${c.commit.author.date.substring(0,10)} — ${c.commit.message.split("\n")[0]} *(${c.commit.author.name})*`).join("\n");
      }

      case "github_list_issues": {
        const state = input.state||"open"; const limit = input.limit||20;
        let url = `/issues?state=${state}&per_page=${limit}`;
        if(input.label) url+=`&labels=${input.label}`;
        const issues = await githubFetch(url);
        const filtered = issues.filter(i=>!i.pull_request);
        if(!filtered.length) return `✓ Nenhuma issue ${state}.`;
        return `🐛 **Issues ${state}** (${filtered.length}):\n\n`+
          filtered.map(i=>`**#${i.number}** [${(i.labels||[]).map(l=>l.name).join(",")||"sem label"}] ${i.title}\n   └ ${i.user.login} · ${i.created_at.substring(0,10)}`).join("\n\n");
      }

      case "github_list_prs": {
        const state = input.state||"open"; const limit = input.limit||20;
        const prs = await githubFetch(`/pulls?state=${state}&per_page=${limit}`);
        if(!prs.length) return `✓ Nenhum PR ${state}.`;
        return `🔀 **PRs ${state}** (${prs.length}):\n\n`+
          prs.map(p=>`**#${p.number}** ${p.title}\n   └ \`${p.head.ref}\` → \`${p.base.ref}\` | ${p.user.login} · ${p.created_at.substring(0,10)}`).join("\n\n");
      }

      case "github_get_commit": {
        const commit = await githubFetch(`/commits/${input.sha}`);
        const files  = (commit.files||[]).map(f=>`  \`${f.status.padEnd(8)}\` ${f.filename} (+${f.additions}/-${f.deletions})`).join("\n");
        return `📦 **${commit.sha.substring(0,7)}** — ${commit.commit.author.name} (${commit.commit.author.date.substring(0,10)})\n\n${commit.commit.message}\n\n**Arquivos modificados:**\n${files}`;
      }

      case "github_get_repo_info": {
        const repo = await githubFetch("");
        return `📊 **${repo.full_name}**\n\n- Descrição: ${repo.description||"—"}\n- Linguagem: ${repo.language||"—"}\n- Stars: ${repo.stargazers_count} | Forks: ${repo.forks_count}\n- Issues Abertas: ${repo.open_issues_count}\n- Visibilidade: ${repo.private?"privado":"público"}\n- Licença: ${repo.license?.name||"—"}\n- Tamanho: ${formatBytes(repo.size*1024)}\n- Branch padrão: ${repo.default_branch}\n- Criado: ${repo.created_at?.substring(0,10)}\n- Último push: ${timeAgo(repo.pushed_at)}`;
      }

      case "github_search_code": {
        const query = `${input.query}+repo:${KEYS.githubRepo}${input.extension?"+extension:"+input.extension:""}`;
        const res = await fetch(`https://api.github.com/search/code?q=${encodeURIComponent(query)}&per_page=10`,
          {headers:{Authorization:"Bearer "+KEYS.github, Accept:"application/vnd.github+json"}});
        const data = await res.json();
        if(!data.items?.length) return "Nenhum resultado para: "+input.query;
        return `🔍 **Busca: "${input.query}"** — ${data.total_count} resultados:\n\n`+
          data.items.map(i=>`📄 \`${i.path}\`\n   Branch: ${i.repository.name}`).join("\n\n");
      }

      case "render_get_logs": {
        if(!KEYS.render||!KEYS.renderService) return "⚠ Configure RENDER_API_KEY e RENDER_SERVICE_ID.";
        const res = await fetch(`https://api.render.com/v1/services/${KEYS.renderService}/logs?limit=${input.lines||100}`,
          {headers:{Authorization:"Bearer "+KEYS.render}});
        if(!res.ok) return "⚠ Render logs: HTTP "+res.status;
        const data = await res.json();
        const logs = (data.logs||data||[]).slice(0,100);
        const filtered = input.filter ? logs.filter(l=>(l.message||"").toLowerCase().includes(input.filter.toLowerCase())) : logs;
        const lines = filtered.map(l=>`\`[${l.level||"INFO"}]\` ${l.timestamp||""} ${l.message||l}`).join("\n");
        return lines||"Nenhum log encontrado.";
      }

      case "render_get_metrics": {
        if(!KEYS.render||!KEYS.renderService) return "⚠ Configure RENDER_API_KEY e RENDER_SERVICE_ID.";
        const svc = await renderFetch(`/services/${KEYS.renderService}`);
        const s = svc.service||svc;
        return `**Serviço Render:**\n\n- Nome: ${s.name||"—"}\n- Status: ${s.suspended?"suspended":"active"}\n- URL: ${s.serviceDetails?.url||s.url||"—"}\n- Região: ${s.serviceDetails?.region||"—"}`;
      }

      case "supabase_list_tables": {
        if(!KEYS.supabase||!KEYS.supabaseUrl) return "⚠ Supabase não configurado.";
        try {
          const data = await supabaseFetch("/rest/v1/");
          return "**Tabelas Supabase:**\n\n```json\n"+JSON.stringify(data,null,2)+"\n```";
        } catch(e){ return "⚠ Não foi possível listar tabelas: "+e.message; }
      }

      case "supabase_run_query": {
        if(!KEYS.supabase||!KEYS.supabaseUrl) return "⚠ Supabase não configurado.";
        try {
          const data = await supabaseFetch("/rest/v1/rpc/execute_sql","POST",{query:input.sql});
          return "**Resultado da Query:**\n\n```json\n"+JSON.stringify(data,null,2)+"\n```";
        } catch(e){ return "⚠ Erro na query: "+e.message; }
      }

      case "analyze_error": {
        const stackInfo = input.stack_trace?`\n\n**Stack Trace:**\n\`\`\`\n${input.stack_trace}\n\`\`\``:"";
        const fileInfo = input.file_path?`\n\n**Arquivo:** \`${input.file_path}\` — use \`github_read_file\` para análise detalhada.`:"";
        return `## Análise do Erro\n\n\`\`\`\n${input.error_message}\n\`\`\`${stackInfo}\n\n**Possíveis causas:**\n- Acesso a propriedade de objeto null/undefined\n- Variável não inicializada antes do uso\n- Erro de importação/dependência\n- Problema de escopo ou closures\n- Race condition em código assíncrono\n\n**Sugestões de correção:**\n1. Use optional chaining (\`?.\`) para acesso seguro a propriedades\n2. Adicione validações de tipo com TypeScript\n3. Verifique se todas as dependências estão instaladas e com versões corretas\n4. Use \`console.trace()\` para rastrear a origem do erro\n5. Adicione try/catch em operações assíncronas${fileInfo}`;
      }

      case "generate_report": {
        const fmt = input.format||"markdown";
        const report = {
          timestamp: new Date().toISOString(),
          github:    STATE.ghStatus,
          render:    STATE.renderStatus,
          supabase:  STATE.sbStatus,
          errors:    STATE.errors.length,
          pending:   STATE.pending.length,
          files:     Object.keys(STATE.files).length,
        };
        if(fmt==="json") return "```json\n"+JSON.stringify(report,null,2)+"\n```";
        return `# 📊 Relatório de Status — TITAN v5\n\n**Data:** ${new Date().toLocaleString("pt-BR")}\n\n## GitHub\n- Branch: \`${STATE.ghStatus.branch}\`\n- Último Commit: ${STATE.ghStatus.lastCommit}\n- SHA: \`${STATE.ghStatus.sha}\`\n- CI: **${STATE.ghStatus.ci}**\n- PRs Abertos: ${STATE.ghStatus.openPRs}\n- Issues: ${STATE.ghStatus.issues}\n- Stars: ${STATE.ghStatus.stars}\n\n## Render.com\n- Status: **${STATE.renderStatus.status}**\n- URL: ${STATE.renderStatus.url}\n- Último Deploy: ${STATE.renderStatus.lastDeploy}\n\n## Supabase\n- Status: **${STATE.sbStatus.status}**\n- Latência: ${STATE.sbStatus.latency||"—"}ms\n- Tabelas: ${STATE.sbStatus.tables}\n\n## Sistema\n- Erros: ${STATE.errors.length}\n- Aprovações Pendentes: ${STATE.pending.length}\n- Arquivos em Memória: ${Object.keys(STATE.files).length}`;
      }

      case "web_search": {
        return `🔍 **Busca Web: "${input.query}"**\n\nA busca web está disponível como referência. Para pesquisas técnicas específicas, consulte:\n- [MDN Web Docs](https://developer.mozilla.org)\n- [Stack Overflow](https://stackoverflow.com/search?q=${encodeURIComponent(input.query)})\n- [GitHub Issues](https://github.com/search?q=${encodeURIComponent(input.query)}&type=issues)\n- [npm](https://www.npmjs.com/search?q=${encodeURIComponent(input.query)})`;
      }

      /* HIGH RISK TOOLS */
      case "github_create_or_update_file": {
        const branch  = input.branch||KEYS.githubBranch||"main";
        const content = btoa(unescape(encodeURIComponent(input.content)));
        const sha     = await githubGetFileSha(input.path, branch);
        const body    = {message:input.message, content, branch};
        if(sha) body.sha = sha;
        const result = await githubFetch(`/contents/${encodeURIComponent(input.path)}`, "PUT", body);
        const action = sha?"atualizado":"criado";
        STATE.files[input.path] = input.content;
        STATE._fileShas[input.path] = result.content?.sha;
        addLog("success","GITHUB",`Arquivo ${action}: ${input.path} [${result.commit?.sha?.substring(0,7)||"?"}]`);
        return `✅ **Arquivo ${action}!**\n\n- Path: \`${input.path}\`\n- Branch: \`${branch}\`\n- Commit: \`${result.commit?.sha?.substring(0,7)||"?"}\``;
      }

      case "github_delete_file": {
        const branch = input.branch||KEYS.githubBranch||"main";
        const sha    = await githubGetFileSha(input.path, branch);
        if(!sha) return `⚠ Arquivo não encontrado: \`${input.path}\``;
        const result = await githubFetch(`/contents/${encodeURIComponent(input.path)}`, "DELETE", {message:input.message, sha, branch});
        delete STATE.files[input.path];
        addLog("success","GITHUB",`Deletado: ${input.path}`);
        return `🗑 \`${input.path}\` deletado. Commit: \`${result.commit?.sha?.substring(0,7)||"?"}\``;
      }

      case "github_create_branch": {
        const from = input.from||KEYS.githubBranch||"main";
        const src  = await githubFetch(`/branches/${from}`);
        await githubFetch(`/git/refs`, "POST", {ref:`refs/heads/${input.branch}`, sha:src.commit.sha});
        addLog("success","GITHUB",`Branch criada: ${input.branch}`);
        return `🌿 Branch criada: \`${input.branch}\` ← \`${from}\` [\`${src.commit.sha.substring(0,7)}\`]`;
      }

      case "github_push_multiple_files": {
        const branch = input.branch||KEYS.githubBranch||"main";
        const files  = input.files||[];
        if(!files.length) return "⚠ Nenhum arquivo fornecido.";
        const branchData = await githubFetch(`/branches/${branch}`);
        const baseTree   = branchData.commit.commit.tree.sha;
        const baseSha    = branchData.commit.sha;
        const treeItems  = await Promise.all(files.map(async f=>{
          const blob = await githubFetch(`/git/blobs`, "POST", {content:btoa(unescape(encodeURIComponent(f.content))), encoding:"base64"});
          return {path:f.path, mode:"100644", type:"blob", sha:blob.sha};
        }));
        const tree   = await githubFetch(`/git/trees`, "POST", {base_tree:baseTree, tree:treeItems});
        const commit = await githubFetch(`/git/commits`, "POST", {message:input.message, tree:tree.sha, parents:[baseSha]});
        await githubFetch(`/git/refs/heads/${branch}`, "PATCH", {sha:commit.sha});
        files.forEach(f=>{ STATE.files[f.path]=f.content; });
        addLog("success","GITHUB",`Push: ${files.length} arquivo(s) → ${branch} [${commit.sha.substring(0,7)}]`);
        return `🚀 **Push realizado!**\n- Branch: \`${branch}\`\n- Commit: \`${commit.sha.substring(0,7)}\`\n\nArquivos:\n${files.map(f=>"  ✓ `"+f.path+"`").join("\n")}`;
      }

      case "github_create_pr": {
        const pr = await githubFetch(`/pulls`, "POST", {
          title:input.title, head:input.branch,
          base:input.base||KEYS.githubBranch||"main",
          body:input.description||""
        });
        STATE.ghStatus.openPRs++;
        addLog("success","GITHUB",`PR criado: #${pr.number}`);
        return `🔀 **PR #${pr.number} criado!**\n- Título: ${pr.title}\n- \`${pr.head.ref}\` → \`${pr.base.ref}\`\n- URL: ${pr.html_url}`;
      }

      case "github_merge_pr": {
        const method = input.merge_method||"squash";
        const result = await githubFetch(`/pulls/${input.pr_number}/merge`, "PUT", {merge_method:method, commit_message:input.message||""});
        addLog("success","GITHUB",`PR #${input.pr_number} merged`);
        return `✅ **PR #${input.pr_number} merged** (${method})!\nCommit: \`${result.sha?.substring(0,7)||"?"}\``;
      }

      case "github_close_issue": {
        if(input.comment) await githubFetch(`/issues/${input.issue_number}/comments`, "POST", {body:input.comment});
        await githubFetch(`/issues/${input.issue_number}`, "PATCH", {state:"closed"});
        addLog("success","GITHUB",`Issue #${input.issue_number} fechada`);
        return `✅ **Issue #${input.issue_number} fechada!**${input.comment?"\nComentário adicionado.":""}`;
      }

      case "create_github_issue": {
        const issue = await githubFetch(`/issues`, "POST", {
          title:input.title, body:input.body||"",
          labels:input.labels||[]
        });
        addLog("success","GITHUB",`Issue criada: #${issue.number}`);
        return `🐛 **Issue #${issue.number} criada!**\n- Título: ${issue.title}\n- URL: ${issue.html_url}`;
      }

      case "render_trigger_deploy": {
        if(!KEYS.render||!KEYS.renderService) return "⚠ Configure RENDER_API_KEY e RENDER_SERVICE_ID.";
        const result = await renderFetch(`/services/${KEYS.renderService}/deploys`, "POST", {});
        addLog("success","RENDER",`Deploy: ${result.deploy?.id||"?"}`);
        return `🚀 **Deploy iniciado!**\n- ID: \`${result.deploy?.id||"?"}\`\n- Motivo: ${input.reason}`;
      }

      case "supabase_run_migration":
        return "⚠ Migration SQL requer acesso admin direto ao Supabase. Configure via CLI ou Supabase Dashboard.";

      case "edit_file": {
        STATE.files[input.path] = input.new_content;
        STATE.modifiedFiles.add(input.path);
        if(STATE.activeFile===input.path){
          const ta=_el("code-editor"); if(ta) ta.value=input.new_content;
          updateEditorStats?.();
        }
        addLog("success","EDITOR",`Editado localmente: ${input.path}`);
        return `✅ **\`${input.path}\` editado localmente!**\n\n${input.description}\n\nVá ao **Editor → ⬆ COMMIT** para enviar ao GitHub.`;
      }

      /* ═══ CLAW CODE TOOLS (fusão v6) ═══════════════════════════════ */

      case "claw_ultraplan": {
        if(!KEYS.anthropic) return "⚠ Configure a Anthropic API Key para usar o UltraPlan.";
        appendAgentMsg("assistant", `⚡ **UltraPlan iniciando…** para: *${(input.task||"").substring(0,60)}*`);
        try {
          const planText = await ultraplan(
            input.context ? `${input.task}\n\nContexto adicional: ${input.context}` : input.task,
            null
          );
          addLog("success","CLAW","UltraPlan concluído");
          return planText || "Plano não gerado.";
        } catch(e) { return "⚠ UltraPlan erro: "+e.message; }
      }

      case "claw_bughunter": {
        if(!KEYS.anthropic) return "⚠ Configure a Anthropic API Key para usar o BugHunter.";
        appendAgentMsg("assistant", `🔍 **BugHunter escaneando…** ${input.file_path ? '`'+input.file_path+'`' : 'trecho de código'}`);
        try {
          const bugs = await bughunter(input.code, input.file_path);
          addLog("success","CLAW","BugHunter concluído");
          return bugs;
        } catch(e) { return "⚠ BugHunter erro: "+e.message; }
      }

      case "claw_teleport": {
        const results = (typeof teleport==='function') ? teleport(input.query) : [];
        if(!results||!results.length) return `🔭 Nenhuma ocorrência de \`${input.query}\` nos arquivos em memória.\n\nUse \`github_read_file\` para carregar arquivos primeiro.`;
        return `🔭 **Teleport: "${input.query}"** — ${results.length} resultado(s):\n\n`+
          results.map(r=>`\`${r.file}:${r.line}\` — ${r.content.substring(0,90)}`).join("\n");
      }

      case "claw_memread": {
        if(typeof memSearchFacts!=='function') return "⚠ MemoryEngine não carregado.";
        const q = input.query||"";
        const facts = q ? memSearchFacts(q, input.category) : (MEM?MEM.facts.slice(-10):[]);
        const ctx = memBuildContextBlock();
        if(!facts.length && !ctx.trim()) return "📭 Memória vazia. Use claw_memwrite para registrar fatos importantes.";
        let out = "📚 **Memória persistente (TITAN v6)**\n\n";
        if(facts.length) out += facts.map(f=>`- **[${f.category}]** ${f.content} *(${f.createdAt?f.createdAt.substring(0,10):'?'})*`).join("\n")+"\n";
        if(ctx.trim()) out += "\n"+ctx;
        return out;
      }

      case "claw_memwrite": {
        if(typeof memAddFact!=='function') return "⚠ MemoryEngine não carregado.";
        memAddFact(input.category, input.content, "agent");
        return `💾 Fato registrado na memória persistente:\n- **Categoria:** ${input.category}\n- **Conteúdo:** ${input.content}`;
      }

      case "claw_provider": {
        if(typeof clawGetProviderInfo!=='function') return "⚠ ClawBridge não carregado.";
        if(input.action==='set' && input.mode) {
          const ok = clawSetMode(input.mode, input.model);
          return ok
            ? `✅ Provider alterado para: **${input.mode}**${input.model?' · modelo: '+input.model:''}\n\nUse \`claw_provider\` com action=status para verificar.`
            : "⚠ Modo inválido. Opções: \`claude\` | \`ollama\` | \`claw-local\`";
        }
        const info = clawGetProviderInfo();
        const mem = (typeof memGetStats==='function') ? memGetStats() : null;
        return `## 🔌 Provider Status\n\n` +
          `- **Modo ativo:** \`${info.mode}\`\n` +
          `- **Claw local (port ${(typeof CLAW_CONFIG!=='undefined'?CLAW_CONFIG.clawServerPort:8765)}):** ${info.clawOnline?'✅ online':'❌ offline'}\n` +
          `- **Ollama (port 11434):** ${info.ollamaOnline?'✅ online':'❌ offline'}\n` +
          `- **Modelo atual:** ${info.currentModel||'— (usando Claude API)'}\n` +
          `- **Modelos Ollama:** ${info.models.length?info.models.join(', '):'(nenhum detectado)'}\n\n` +
          `**Requisições:** ${info.stats.claudeRequests} Claude · ${info.stats.ollamaRequests} Ollama · ${info.stats.clawRequests} Claw\n\n` +
          (mem ? `**Memória:** ${mem.facts} fatos · ${mem.sessions} sessões · ${mem.sizeKB}KB\n` : '') +
          `\n> Para usar Ollama gratuitamente: instale [ollama.ai](https://ollama.ai), execute \`ollama pull qwen2.5-coder\` e então use \`claw_provider\` com action=set, mode=ollama.`;
      }

      default:
        return `⚠ Tool \`${toolName}\` não implementada.`;
    }
  } catch(e){
    addLog("warn","TOOL",`${toolName} falhou: ${e.message}`);
    return `⚠ Erro em \`${toolName}\`: ${e.message}`;
  }
}

/* ── DESCRIBE ACTION ────────────────────────────────────────────── */
function describeAction(toolName, input){
  const descs = {
    github_create_or_update_file: `Criar/atualizar: ${input.path}\nBranch: ${input.branch||"main"}\nCommit: "${input.message}"`,
    github_delete_file:           `Deletar: ${input.path}\nBranch: ${input.branch||"main"}`,
    github_create_branch:         `Nova branch: ${input.branch} ← ${input.from||"main"}`,
    github_push_multiple_files:   `Push de ${(input.files||[]).length} arquivo(s) → ${input.branch}\nCommit: "${input.message}"`,
    github_create_pr:             `PR: "${input.title}"\n${input.branch} → ${input.base||"main"}`,
    github_merge_pr:              `Merge PR #${input.pr_number} (${input.merge_method||"squash"})`,
    github_close_issue:           `Fechar issue #${input.issue_number}`,
    create_github_issue:          `Criar issue: "${input.title}"`,
    render_trigger_deploy:        `Deploy Render: ${input.reason}`,
    supabase_run_migration:       `Migration SQL: "${input.name}"\n${(input.sql||"").substring(0,200)}`,
    edit_file:                    `Editar: ${input.path}\n${input.description}`,
  };
  return descs[toolName]||JSON.stringify(input,null,2).substring(0,300);
}

/* ═══════════════════════════════════════════════════════════
   AGENTIC LOOP — CORRIGIDO
   Garante que todo tool_use recebe um tool_result
   Sanitiza o histórico antes de enviar
   Trata múltiplas tools na mesma resposta
═══════════════════════════════════════════════════════════ */

/* ── SANITIZE HISTORY ── Remove mensagens orphaned tool_use/result */
function sanitizeHistory(history){
  const clean = [];
  for(let i=0; i<history.length; i++){
    const msg = history[i];
    if(msg.role==="assistant"){
      const content = Array.isArray(msg.content)?msg.content:[{type:"text",text:msg.content||""}];
      const toolUses = content.filter(b=>b.type==="tool_use");
      if(toolUses.length===0){ clean.push(msg); continue; }
      // Check next message provides all tool_results
      const next = history[i+1];
      if(!next||next.role!=="user") continue; // orphan — skip
      const nextContent = Array.isArray(next.content)?next.content:[next.content];
      const resultIds = new Set(nextContent.filter(b=>b?.type==="tool_result").map(b=>b.tool_use_id));
      const allCovered = toolUses.every(tu=>resultIds.has(tu.id));
      if(!allCovered) continue; // incomplete — skip pair
      clean.push(msg);
      clean.push(next);
      i++; // skip next since we already added it
    } else if(msg.role==="user"){
      const content = Array.isArray(msg.content)?msg.content:[msg.content];
      const hasOnlyResults = content.every(b=>!b||b.type==="tool_result"||typeof b==="string");
      if(hasOnlyResults && content.some(b=>b?.type==="tool_result")){
        // user msg with only tool_results without preceding assistant — skip
        const lastClean = clean[clean.length-1];
        if(!lastClean||lastClean.role!=="assistant") continue;
        const lastContent = Array.isArray(lastClean.content)?lastClean.content:[lastClean.content];
        if(!lastContent.some(b=>b?.type==="tool_use")) continue;
      }
      clean.push(msg);
    }
  }
  return clean;
}

async function runAgentLoop(userMessage){
  if(!isConfigured()){ appendAgentMsg("assistant","⚠ Configure a Anthropic API Key em **⚙ API KEYS** para usar o agente."); return; }

  STATE.agentLoading = true;
  setAgentLoading(true);

  // Add user message to display and history
  appendAgentMsg("user", userMessage);
  STATE.agentHistory.push({ role:"user", content: userMessage });

  const MAX_ITERATIONS = 8;

  for(let iteration=0; iteration<MAX_ITERATIONS; iteration++){
    try {
      // Sanitize history before sending
      const cleanHistory = sanitizeHistory(STATE.agentHistory);

      const payload = {
        model: MODEL,
        max_tokens: 8096,
        system: buildSystemPrompt(),
        tools: AGENT_TOOLS,
        messages: cleanHistory,
      };

      const res = await fetch(ANTHROPIC_API, {
        method:"POST",
        headers:{
          "Content-Type":"application/json",
          "x-api-key": KEYS.anthropic,
          "anthropic-version":"2023-06-01",
          "anthropic-dangerous-direct-browser-access":"true",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if(!res.ok){
        const errMsg = data?.error?.message||"Erro "+res.status;
        appendAgentMsg("assistant",`❌ **Erro na API Anthropic:**\n\n\`${errMsg}\`\n\n**Verifique:** API key configurada? (⚙ API KEYS)`);
        addLog("error","AGENT",errMsg);
        break;
      }

      const stopReason = data.stop_reason;
      const blocks     = data.content||[];

      // Build assistant message for history
      const assistantMsg = { role:"assistant", content: blocks };
      STATE.agentHistory.push(assistantMsg);

      // Extract text and tool_use blocks
      const textBlocks    = blocks.filter(b=>b.type==="text");
      const toolUseBlocks = blocks.filter(b=>b.type==="tool_use");

      // Display text content if any
      if(textBlocks.length>0){
        const combinedText = textBlocks.map(b=>b.text).join("\n\n");
        appendAgentMsg("assistant", combinedText);
      }

      // If no tool calls or end_turn — we're done
      if(stopReason==="end_turn" || toolUseBlocks.length===0){
        if(textBlocks.length===0 && toolUseBlocks.length===0){
          appendAgentMsg("assistant","✓ Tarefa concluída.");
        }
        break;
      }

      // Process ALL tool calls and collect results
      const toolResults = [];

      for(const toolUse of toolUseBlocks){
        const toolName = toolUse.name;
        const toolInput = toolUse.input||{};
        const toolId    = toolUse.id;

        addLog("info","AGENT",`Tool: ${toolName}`);

        let result;

        if(HIGH_RISK_TOOLS_SET.has(toolName)){
          // Queue for approval — return placeholder immediately
          result = await new Promise(resolve=>{
            const actionId = "action-"+Date.now()+"-"+Math.random().toString(36).substring(2,8);
            appendAgentMsg("assistant",`⚡ **Ação de alto risco enfileirada para aprovação:**\n\n\`${toolName}\`\n\n${describeAction(toolName,toolInput)}\n\n*Vá em **⚡ Aprovações** para autorizar.*`);
            STATE.pending.push({
              id:actionId, toolName, description:describeAction(toolName,toolInput),
              input:toolInput, autoGenerated:true,
              onApprove:async()=>{
                const execResult = await executeTool(toolName, toolInput);
                resolve(execResult);
                // After approval, continue the loop by appending result to history
                STATE.agentHistory.push({
                  role:"user",
                  content:[{ type:"tool_result", tool_use_id:toolId, content:String(execResult) }]
                });
                appendAgentMsg("assistant",`✅ **${toolName}** executado após aprovação.\n\n${execResult}`);
                Bus.emit("badges-update");
              }
            });
            Bus.emit("badges-update");
            renderApprovals();
            // Return a placeholder result immediately for the tool_result
            resolve(`⏳ Ação enfileirada para aprovação. ID: ${actionId}`);
          });
        } else {
          result = await executeTool(toolName, toolInput);
        }

        toolResults.push({
          type:"tool_result",
          tool_use_id: toolId,
          content: String(result),
        });
      }

      // Add ALL tool_results as a single user message (CRITICAL for API compliance)
      STATE.agentHistory.push({
        role:"user",
        content: toolResults,
      });

      // Continue loop for next iteration
      if(stopReason==="tool_use") continue;
      break;

    } catch(e){
      addLog("error","AGENT","Loop error: "+e.message);
      appendAgentMsg("assistant",`❌ **Erro interno:**\n\n\`${e.message}\`\n\nVerifique o console para mais detalhes.`);
      break;
    }
  }

  STATE.agentLoading = false;
  setAgentLoading(false);

  // Registra turno na memória persistente
  if(typeof memRecordTurn==='function'){
    const toolsUsed = STATE.agentHistory
      .filter(m=>m.role==='assistant'&&Array.isArray(m.content))
      .flatMap(m=>m.content.filter(b=>b.type==='tool_use').map(b=>b.name));
    memRecordTurn(toolsUsed, [...STATE.modifiedFiles]);
  }
}

/* ── AGENT UI HELPERS ───────────────────────────────────────────── */
function appendAgentMsg(role, text){
  STATE.agentMsgs.push({role, text});
  renderAgentMsg({role, text});
}

function renderAgentMsg({role, text}){
  const msgs = _el("chat-messages"); if(!msgs) return;
  const isUser = role==="user";
  const div = document.createElement("div");
  div.className = `chat-msg ${isUser?"chat-user":"chat-assistant"}`;

  const avatar = isUser
    ? `<div class="msg-avatar user-avatar">${KEYS.githubAvatar?`<img src="${escAttr(KEYS.githubAvatar)}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`:"<i class='fas fa-user'></i>"}</div>`
    : `<div class="msg-avatar titan-avatar"><svg viewBox="0 0 24 24" width="16" height="16"><polygon points="12,2 22,8 22,16 12,22 2,16 2,8" fill="none" stroke="#d97757" stroke-width="1.5"/><text x="12" y="16" text-anchor="middle" font-family="Syne,sans-serif" font-size="8" font-weight="900" fill="#d97757">T</text></svg></div>`;

  const content = isUser
    ? `<div class="msg-bubble user-bubble"><span>${escHtml(text)}</span></div>`
    : `<div class="msg-bubble assistant-bubble">${renderMarkdown(text)}</div>`;

  const time = `<div class="msg-time">${timePT()}</div>`;

  div.innerHTML = isUser
    ? `${time}<div class="msg-body">${content}${avatar}</div>`
    : `<div class="msg-body">${avatar}${content}</div>${time}`;

  // Add copy button to assistant messages
  if(!isUser){
    const copyBtn = document.createElement("button");
    copyBtn.className = "msg-copy-btn";
    copyBtn.innerHTML = `<i class="fas fa-copy"></i>`;
    copyBtn.title = "Copiar resposta";
    copyBtn.onclick = ()=>copyToClipboard(text,"Resposta copiada!");
    div.querySelector(".msg-bubble")?.appendChild(copyBtn);
  }

  msgs.appendChild(div);
  // Highlight code blocks
  if(window.hljs) div.querySelectorAll("pre code").forEach(el=>hljs.highlightElement(el));
  msgs.scrollTop = msgs.scrollHeight;
}

function setAgentLoading(loading){
  const thinking = _el("agent-thinking");
  const sendBtn  = _el("agent-send");
  if(thinking) thinking.style.display = loading?"flex":"none";
  if(sendBtn)  sendBtn.disabled = loading;
}

function clearAgentHistory(){
  // Arquiva sessão antes de limpar
  if(typeof memEndSession==='function' && STATE.agentMsgs.length>2){
    const last = STATE.agentMsgs[STATE.agentMsgs.length-1];
    memEndSession(last?.text?.substring(0,200)||"Sessão encerrada");
  }
  STATE.agentMsgs  = [];
  STATE.agentHistory = [];
  const msgs = _el("chat-messages"); if(msgs) msgs.innerHTML="";
  appendAgentMsg("assistant","# ⚡ TITAN Super Agent v6\n\nHistórico limpo. Sessão anterior arquivada na memória.\n\n**Novas capacidades ativas:**\n- 🧠 Memória persistente cross-sessão\n- ⚡ Claw Code: ultraplan, bughunter, teleport\n- 🔌 Multi-provider: Claude / Ollama / Claw local\n- 🤖 Loop autônomo Fase 1/2/3\n\nComo posso ajudar?");
  addLog("info","AGENT","Histórico limpo e sessão arquivada");
}

function sendAgent(){
  const inp = _el("agent-input"); if(!inp) return;
  const text = inp.value.trim(); if(!text) return;
  inp.value=""; inp.style.height="";
  runAgentLoop(text);
}

function setAgentPrompt(text){
  const inp = _el("agent-input"); if(!inp) return;
  inp.value = text; inp.focus();
  agentInputResize(inp);
}

function agentInputResize(ta){
  ta.style.height="auto";
  ta.style.height=Math.min(ta.scrollHeight,200)+"px";
}

function agentInputKeydown(e){
  if(e.key==="Enter"&&!e.shiftKey){ e.preventDefault(); sendAgent(); }
}

function attachFile(){
  const input=document.createElement("input"); input.type="file"; input.accept="text/*,.json,.md,.js,.ts,.py,.rs,.go";
  input.onchange=async()=>{
    const file=input.files[0]; if(!file) return;
    const text=await file.text();
    const inp=_el("agent-input"); if(!inp) return;
    inp.value=`Analise o arquivo ${file.name}:\n\n\`\`\`${file.name.split(".").pop()}\n${text.substring(0,3000)}\n\`\`\``;
    agentInputResize(inp);
  };
  input.click();
}
