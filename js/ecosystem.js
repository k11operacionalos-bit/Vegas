/* ═══════════════════════════════════════════════════════════════════
   TITAN v5 ECOSYSTEM — ecosystem.js
   Novas funções inovadoras e reutilizáveis para toda a plataforma
   Sistema de utilidades modernas para DevOps, IA e automação
═══════════════════════════════════════════════════════════════════ */

/* ── SISTEMA DE NOTIFICAÇÕES AVANÇADO ────────────────────────────── */
class NotificationManager {
  constructor() {
    this.queue = [];
    this.active = new Set();
    this.maxActive = 4;
  }

  show(type, title, message, duration = 5000, icon = null) {
    const id = Date.now() + Math.random();
    const notification = { id, type, title, message, duration, icon };

    if (this.active.size >= this.maxActive) {
      this.queue.push(notification);
      return;
    }

    this.render(notification);
  }

  render(notification) {
    const container = document.getElementById("toast-container") || document.body;
    const typeConfig = {
      success: { bg: "rgba(15,217,138,0.15)", border: "#0fd98a", icon: "fas fa-check-circle" },
      error: { bg: "rgba(244,48,96,0.15)", border: "#f43060", icon: "fas fa-exclamation-circle" },
      warning: { bg: "rgba(245,166,35,0.15)", border: "#f5a623", icon: "fas fa-warning" },
      info: { bg: "rgba(24,212,240,0.15)", border: "#18d4f0", icon: "fas fa-info-circle" },
    };

    const config = typeConfig[notification.type] || typeConfig.info;
    const el = document.createElement("div");
    el.className = "notification-toast";
    el.style.cssText = `
      position: fixed; bottom: 20px; right: 20px; z-index: 10000;
      background: ${config.bg}; border: 1px solid ${config.border};
      border-radius: 8px; padding: 16px 20px; backdrop-filter: blur(10px);
      color: #c4d4e8; font-family: 'JetBrains Mono', monospace;
      max-width: 320px; font-size: 13px; line-height: 1.5;
      animation: slideIn 0.3s ease-out; box-shadow: 0 8px 24px rgba(0,0,0,0.3);
    `;

    el.innerHTML = `
      <div style="display: flex; gap: 12px; align-items: flex-start;">
        <i class="${notification.icon || config.icon}" style="color: ${config.border}; margin-top: 2px; flex-shrink: 0;"></i>
        <div>
          <div style="font-weight: 600; color: #fff; margin-bottom: 4px;">${notification.title}</div>
          <div style="color: #a0b0c0; font-size: 12px;">${notification.message}</div>
        </div>
        <button onclick="this.parentElement.parentElement.remove()" style="
          background: none; border: none; color: #6888aa; cursor: pointer;
          font-size: 16px; padding: 0; flex-shrink: 0; margin-top: -2px;
        "><i class="fas fa-times"></i></button>
      </div>
    `;

    container.appendChild(el);
    this.active.add(notification.id);

    setTimeout(() => {
      el.style.animation = "slideOut 0.3s ease-in";
      setTimeout(() => {
        el.remove();
        this.active.delete(notification.id);
        if (this.queue.length > 0) {
          this.render(this.queue.shift());
        }
      }, 300);
    }, notification.duration);
  }
}

const notify = new NotificationManager();

/* ── SISTEMA DE CACHE INTELIGENTE ────────────────────────────────── */
class SmartCache {
  constructor(ttl = 3600000) {
    this.store = new Map();
    this.ttl = ttl;
  }

  set(key, value, ttl = this.ttl) {
    this.store.set(key, {
      value,
      expires: Date.now() + ttl,
    });
  }

  get(key) {
    const item = this.store.get(key);
    if (!item) return null;
    if (Date.now() > item.expires) {
      this.store.delete(key);
      return null;
    }
    return item.value;
  }

  clear() {
    this.store.clear();
  }

  cleanup() {
    for (const [key, item] of this.store.entries()) {
      if (Date.now() > item.expires) {
        this.store.delete(key);
      }
    }
  }
}

const cache = new SmartCache();

/* ── SISTEMA DE REQUISIÇÕES COM RETRY E TIMEOUT ──────────────────── */
class RequestManager {
  constructor(maxRetries = 3, timeout = 30000) {
    this.maxRetries = maxRetries;
    this.timeout = timeout;
  }

  async fetch(url, options = {}) {
    let lastError;
    
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok && response.status >= 500 && attempt < this.maxRetries) {
          throw new Error(`Server error: ${response.status}`);
        }

        return response;
      } catch (error) {
        lastError = error;
        if (attempt < this.maxRetries) {
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  async json(url, options = {}) {
    const response = await this.fetch(url, options);
    return response.json();
  }
}

const requester = new RequestManager();

/* ── PARSER E FORMATTER DE DADOS ─────────────────────────────────── */
class DataFormatter {
  static bytes(bytes) {
    const units = ["B", "KB", "MB", "GB", "TB"];
    let size = Math.abs(bytes);
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return (size > 0 ? (size < 10 ? size.toFixed(2) : Math.round(size)) : "0") + units[unitIndex];
  }

  static duration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  static timestamp(date = new Date()) {
    return date.toLocaleString("pt-BR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  static json(obj, indent = 2) {
    return JSON.stringify(obj, null, indent);
  }

  static parseJson(str) {
    try {
      return JSON.parse(str);
    } catch {
      return null;
    }
  }
}

/* ── EVENT BUS GLOBAL ────────────────────────────────────────────── */
class EventBus {
  constructor() {
    this.listeners = new Map();
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.set(
        event,
        this.listeners.get(event).filter(cb => cb !== callback)
      );
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(cb => cb(data));
    }
  }

  once(event, callback) {
    const wrapper = (data) => {
      callback(data);
      this.off(event, wrapper);
    };
    this.on(event, wrapper);
  }
}

const eventBus = new EventBus();

/* ── TITAN ECOSYSTEM v6 EXPANSION ─────────────────────────────── */
/* ═══════════════════════════════════════════════════════════════════
   Advanced ecosystem features for the largest development universe
═══════════════════════════════════════════════════════════════════ */

const TITAN_ECOSYSTEM = {
  version: '6.0',
  modules: {
    ai: { enabled: false, providers: [] },
    cloud: { enabled: false, providers: [] },
    blockchain: { enabled: false, networks: [] },
    collaboration: { enabled: false, sessions: [] },
    marketplace: { enabled: false, extensions: [] },
    analytics: { enabled: false, metrics: {} },
    vrar: { enabled: false, scenes: [] }
  },

  // AI Multi-Provider System
  ai: {
    providers: ['anthropic', 'openai', 'google', 'meta', 'mistral', 'huggingface'],
    activeProvider: 'anthropic',
    models: {
      anthropic: ['claude-sonnet-4-6', 'claude-opus-4-6', 'claude-haiku-4-5'],
      openai: ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'],
      google: ['gemini-pro', 'gemini-pro-vision'],
      meta: ['llama-2-70b', 'llama-2-13b'],
      mistral: ['mistral-large', 'mistral-medium'],
      huggingface: ['custom-models']
    },

    switchProvider(provider) {
      if (this.providers.includes(provider)) {
        this.activeProvider = provider;
        eventBus.emit('ai:provider:changed', provider);
        showToast(`Provider IA: ${provider}`, 'info');
      }
    },

    async query(prompt, options = {}) {
      const provider = options.provider || this.activeProvider;
      // Simulate AI query
      addLog('info', 'AI', `Querying ${provider}...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return `Response from ${provider}: ${prompt.substring(0, 50)}...`;
    }
  },

  // Cloud Multi-Provider System
  cloud: {
    providers: ['aws', 'azure', 'gcp', 'digitalocean', 'linode', 'heroku'],
    regions: {
      aws: ['us-east-1', 'eu-west-1', 'ap-southeast-1'],
      azure: ['East US', 'West Europe', 'Southeast Asia'],
      gcp: ['us-central1', 'europe-west1', 'asia-southeast1']
    },

    async deploy(service, config) {
      addLog('info', 'CLOUD', `Deploying ${service} to ${config.provider}...`);
      // Simulate deployment
      await new Promise(resolve => setTimeout(resolve, 3000));
      showToast(`Deploy concluído: ${service}`, 'success');
    }
  },

  // Blockchain Integration
  blockchain: {
    networks: ['ethereum', 'polygon', 'solana', 'bnb', 'avalanche'],
    wallets: {},
    contracts: {},

    async connectWallet(network = 'ethereum') {
      if (typeof window.ethereum !== 'undefined') {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
          this.wallets[network] = accounts[0];
          updateWalletBalance();
          showToast(`Wallet ${network} conectado`, 'success');
          return accounts[0];
        } catch (error) {
          showToast('Erro ao conectar wallet', 'error');
        }
      } else {
        showToast('Wallet não detectado', 'error');
      }
    },

    async getBalance(network = 'ethereum') {
      if (this.wallets[network]) {
        // Simulate balance check
        return Math.random() * 10;
      }
      return 0;
    }
  },

  // Real-time Collaboration
  collaboration: {
    sessions: [],
    activeSession: null,
    users: [],

    startSession(sessionId = null) {
      this.activeSession = sessionId || 'session_' + Date.now();
      this.sessions.push(this.activeSession);

      // Initialize WebRTC
      if (typeof SimplePeer !== 'undefined') {
        // WebRTC collaboration setup
      }

      // Initialize Socket.io
      if (typeof io !== 'undefined') {
        const socket = io();
        socket.emit('join-session', this.activeSession);
      }

      eventBus.emit('collaboration:session:started', this.activeSession);
      showToast('Sessão de colaboração iniciada', 'success');
    },

    inviteUser(userId) {
      // Simulate user invitation
      this.users.push({ id: userId, name: `User ${userId}`, status: 'online' });
      eventBus.emit('collaboration:user:joined', userId);
    }
  },

  // Marketplace System
  marketplace: {
    extensions: [],
    categories: ['ai', 'cloud', 'devops', 'security', 'ui', 'data', 'blockchain', 'vrar'],

    async loadExtensions() {
      // Simulate loading from API
      this.extensions = [
        { id: 1, name: 'AI Code Assistant Pro', category: 'ai', rating: 4.8, downloads: 12500, price: 0 },
        { id: 2, name: 'Cloud Deploy Master', category: 'cloud', rating: 4.6, downloads: 8900, price: 9.99 },
        { id: 3, name: 'Security Scanner Elite', category: 'security', rating: 4.9, downloads: 15600, price: 19.99 },
        { id: 4, name: 'UI Component Universe', category: 'ui', rating: 4.7, downloads: 21000, price: 0 },
        { id: 5, name: 'Data Pipeline Builder', category: 'data', rating: 4.5, downloads: 7800, price: 14.99 },
        { id: 6, name: 'Blockchain Dev Kit', category: 'blockchain', rating: 4.4, downloads: 3200, price: 29.99 },
        { id: 7, name: 'VR/AR Development Suite', category: 'vrar', rating: 4.3, downloads: 1800, price: 39.99 }
      ];
      this.renderMarketplace();
    },

    renderMarketplace() {
      const grid = _el('marketplace-grid');
      if (!grid) return;

      grid.innerHTML = this.extensions.map(ext => `
        <div class="extension-card animate-fade-in-up">
          <div class="ext-header">
            <h4>${ext.name}</h4>
            <span class="ext-category">${ext.category}</span>
          </div>
          <div class="ext-meta">
            <span class="rating">⭐ ${ext.rating}</span>
            <span class="downloads">${ext.downloads} downloads</span>
            <span class="price">${ext.price === 0 ? 'FREE' : '$' + ext.price}</span>
          </div>
          <button class="btn-sm ${ext.price === 0 ? 'btn-accent' : 'btn-primary'}"
                  onclick="TITAN_ECOSYSTEM.marketplace.installExtension(${ext.id})">
            ${ext.price === 0 ? 'INSTALAR' : 'COMPRAR'}
          </button>
        </div>
      `).join('');
    },

    installExtension(id) {
      const ext = this.extensions.find(e => e.id === id);
      if (ext) {
        showToast(`Instalando ${ext.name}...`, 'info');
        setTimeout(() => {
          showToast(`${ext.name} instalado!`, 'success');
          eventBus.emit('marketplace:extension:installed', ext);
        }, 2000);
      }
    }
  },

  // Analytics & Insights
  analytics: {
    metrics: {},
    charts: {},

    async updateMetrics(period = '24h') {
      // Simulate metrics collection
      this.metrics = {
        commits: Math.floor(Math.random() * 100),
        deployments: Math.floor(Math.random() * 50),
        users: Math.floor(Math.random() * 1000),
        errors: Math.floor(Math.random() * 10),
        performance: Math.random() * 100
      };

      this.renderCharts();
      eventBus.emit('analytics:metrics:updated', this.metrics);
    },

    renderCharts() {
      const canvas = _el('analytics-canvas');
      if (!canvas || typeof Chart === 'undefined') return;

      const ctx = canvas.getContext('2d');
      new Chart(ctx, {
        type: 'line',
        data: {
          labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'],
          datasets: [{
            label: 'Activity',
            data: [12, 19, 3, 5, 2, 3],
            borderColor: 'var(--accent)',
            backgroundColor: 'rgba(47, 120, 240, 0.1)',
            tension: 0.4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            y: { beginAtZero: true }
          }
        }
      });
    }
  },

  // VR/AR Studio
  vrar: {
    scenes: [],
    activeScene: null,

    initVR() {
      const canvas = _el('vr-ar-canvas');
      if (!canvas) return;

      canvas.innerHTML = `
        <a-scene embedded vr-mode-ui="enabled: true">
          <a-assets>
            <img id="sky" src="https://cdn.aframe.io/360-image-gallery-boilerplate/img/sechelt.jpg">
          </a-assets>

          <a-sky src="#sky"></a-sky>

          <a-box position="-1 0.5 -3" rotation="0 45 0" color="#4CC3D9" shadow></a-box>
          <a-sphere position="0 1.25 -5" radius="1.25" color="#EF2D5E" shadow></a-sphere>
          <a-cylinder position="1 0.75 -3" radius="0.5" height="1.5" color="#FFC65D" shadow></a-cylinder>

          <a-plane position="0 0 -4" rotation="-90 0 0" width="10" height="10" color="#7BC8A4" shadow></a-plane>

          <a-camera position="0 1.6 0">
            <a-cursor color="#2E3A87"></a-cursor>
          </a-camera>

          <a-light type="ambient" color="#ffffff" intensity="0.5"></a-light>
          <a-light type="directional" color="#ffffff" intensity="1" position="1 1 1"></a-light>
        </a-scene>
      `;

      showToast('VR/AR Studio ativado', 'success');
      eventBus.emit('vrar:studio:activated');
    },

    exitVR() {
      const canvas = _el('vr-ar-canvas');
      if (canvas) canvas.innerHTML = '';
      showToast('VR/AR Studio desativado', 'info');
    }
  },

  // Initialization
  init() {
    this.marketplace.loadExtensions();
    this.analytics.updateMetrics();

    // Initialize Web3 if available
    if (typeof Web3 !== 'undefined' && window.ethereum) {
      window.web3 = new Web3(window.ethereum);
    }

    addLog('success', 'ECOSYSTEM', `TITAN Ecosystem v${this.version} initialized - The Largest Development Universe Ever Created`);
    eventBus.emit('ecosystem:initialized', this.version);
  }
};

// Global access
window.TITAN_ECOSYSTEM = TITAN_ECOSYSTEM;

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => TITAN_ECOSYSTEM.init());
class Validator {
  static email(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  static url(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  static apiKey(key, type = "anthropic") {
    const patterns = {
      anthropic: /^sk-ant-api03-[a-zA-Z0-9_-]+$/,
      github: /^(ghp_|ghs_|ghu_)[a-zA-Z0-9_]{36,255}$/,
      render: /^rnd_[a-zA-Z0-9]{24}$/,
    };
    return patterns[type]?.test(key) ?? key.length > 10;
  }

  static required(value) {
    return value != null && value !== "";
  }

  static minLength(value, min) {
    return String(value).length >= min;
  }
}

/* ── GERENCIADOR DE PERFORMANCE ──────────────────────────────────── */
class PerformanceMonitor {
  constructor() {
    this.marks = new Map();
    this.metrics = [];
  }

  start(label) {
    this.marks.set(label, performance.now());
  }

  end(label) {
    if (!this.marks.has(label)) return 0;
    const duration = performance.now() - this.marks.get(label);
    this.metrics.push({ label, duration, timestamp: new Date() });
    this.marks.delete(label);
    return duration;
  }

  getMetrics(limit = 20) {
    return this.metrics.slice(-limit);
  }

  clear() {
    this.metrics = [];
    this.marks.clear();
  }

  report() {
    console.table(this.metrics.map(m => ({
      label: m.label,
      duration: `${m.duration.toFixed(2)}ms`,
      time: m.timestamp.toLocaleTimeString(),
    })));
  }
}

const perf = new PerformanceMonitor();

/* ── STORAGE COM VERSIONAMENTO ──────────────────────────────────── */
class VersionedStorage {
  constructor(prefix = "titan_") {
    this.prefix = prefix;
  }

  set(key, value, version = 1) {
    const data = {
      version,
      value,
      timestamp: Date.now(),
    };
    localStorage.setItem(this.prefix + key, JSON.stringify(data));
  }

  get(key) {
    const data = JSON.parse(localStorage.getItem(this.prefix + key) || "null");
    return data ? data.value : null;
  }

  getWithVersion(key) {
    return JSON.parse(localStorage.getItem(this.prefix + key) || "null");
  }

  remove(key) {
    localStorage.removeItem(this.prefix + key);
  }

  migrate(key, from, to, transformer) {
    const data = this.getWithVersion(key);
    if (data?.version === from) {
      const newValue = transformer(data.value);
      this.set(key, newValue, to);
      return true;
    }
    return false;
  }
}

const storage = new VersionedStorage();

/* ── ANIMAÇÃO FLUIDA DE VALORES ──────────────────────────────────── */
class AnimatedValue {
  constructor(initialValue = 0, duration = 500) {
    this.startValue = initialValue;
    this.currentValue = initialValue;
    this.endValue = initialValue;
    this.duration = duration;
    this.startTime = 0;
  }

  animate(endValue, callback) {
    this.startValue = this.currentValue;
    this.endValue = endValue;
    this.startTime = performance.now();

    const animate = (now) => {
      const elapsed = now - this.startTime;
      const progress = Math.min(elapsed / this.duration, 1);
      this.currentValue = this.startValue + (this.endValue - this.startValue) * progress;

      callback(this.currentValue);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }
}

/* ── EXPORTAR PARA USO GLOBAL ────────────────────────────────────── */
const Ecosystem = {
  notify,
  cache,
  requester,
  DataFormatter,
  EventBus: eventBus,
  Validator,
  perf,
  storage,
  AnimatedValue,
};

// Adicionar estilos de animação
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from { transform: translateX(400px); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
      from { transform: translateX(0); opacity: 1; }
      to { transform: translateX(400px); opacity: 0; }
    }
  `;
  document.head.appendChild(style);
}
