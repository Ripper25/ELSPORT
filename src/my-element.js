import { LitElement, css, html } from 'lit'
import { Router } from '@vaadin/router';
import './components/tender-list.js';
import './components/task-list.js';

export class MyElement extends LitElement {
  static get properties() {
    return {
      currentView: { type: String },
      isDarkMode: { type: Boolean },
    }
  }

  constructor() {
    super();
    this.currentView = 'tenders';
    this.isDarkMode = localStorage.getItem('theme') === 'dark' || 
                      (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    this._applyTheme();
  }

  firstUpdated() {
    const outlet = this.shadowRoot.getElementById('outlet');
    const router = new Router(outlet);
    
    router.setRoutes([
      { 
        path: '/', 
        component: 'tender-list',
        action: () => { 
          this.currentView = 'tenders';
        }
      },
      { 
        path: '/tasks', 
        component: 'task-list',
        action: () => { 
          this.currentView = 'tasks';
        }
      },
      { path: '(.*)', redirect: '/' }
    ]);

    // Update current view based on initial route
    if (window.location.pathname === '/tasks') {
      this.currentView = 'tasks';
    }
  }

  render() {
    return html`
      <div class="app">
        <header class="app-header">
          <h1>ELSPORT ENTERPRISE</h1>
          <p>Tender & Task Management</p>
        </header>

        <nav class="nav-tabs">
          <a 
            href="/" 
            class="nav-tab ${this.currentView === 'tenders' ? 'active' : ''}"
            @click=${(e) => this._handleNavClick(e, 'tenders')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 11H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-5" />
              <rect x="6" y="3" width="12" height="10" rx="2" />
            </svg>
            <span>Tenders</span>
          </a>
          <a 
            href="/tasks" 
            class="nav-tab ${this.currentView === 'tasks' ? 'active' : ''}"
            @click=${(e) => this._handleNavClick(e, 'tasks')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
            </svg>
            <span>Tasks</span>
          </a>
        </nav>

        <main class="main-content">
          <div id="outlet"></div>
        </main>
        
        <button 
          class="theme-switcher ${this.isDarkMode ? 'dark' : 'light'}"
          @click="${this._toggleTheme}"
          aria-label="Toggle theme"
        >
          <div class="theme-icon-wrapper">
            <svg class="sun-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="5"></circle>
              <line x1="12" y1="1" x2="12" y2="3"></line>
              <line x1="12" y1="21" x2="12" y2="23"></line>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
              <line x1="1" y1="12" x2="3" y2="12"></line>
              <line x1="21" y1="12" x2="23" y2="12"></line>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
            </svg>
            <svg class="moon-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
            </svg>
          </div>
        </button>
      </div>
    `
  }

  _handleNavClick(e, view) {
    this.currentView = view;
  }

  _toggleTheme() {
    this.isDarkMode = !this.isDarkMode;
    this._applyTheme();
    localStorage.setItem('theme', this.isDarkMode ? 'dark' : 'light');
  }

  _applyTheme() {
    if (this.isDarkMode) {
      document.documentElement.setAttribute('data-theme', 'dark');
      this.setAttribute('dark-mode', '');
    } else {
      document.documentElement.removeAttribute('data-theme');
      this.removeAttribute('dark-mode');
    }
  }

  static get styles() {
    return css`
      :host {
        display: block;
        min-height: 100vh;
        font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif;
      }

      /* Dark mode CSS variables for shadow DOM */
      :host {
        /* Light mode defaults */
        --ios-blue: #007AFF;
        --ios-green: #34C759;
        --ios-orange: #FF9500;
        --ios-red: #FF3B30;
        --ios-purple: #AF52DE;
        --ios-teal: #5AC8FA;
        --ios-gray: #8E8E93;
        --ios-gray2: #AEAEB2;
        --ios-gray3: #C7C7CC;
        --ios-gray4: #D1D1D6;
        --ios-gray5: #E5E5EA;
        --ios-gray6: #F2F2F7;
        --ios-bg: #F2F2F7;
        --ios-card: #FFFFFF;
        --ios-text: #000000;
        --ios-text-secondary: #3C3C43;
        --ios-separator: rgba(60, 60, 67, 0.12);
      }

      :host([dark-mode]) {
        /* Dark mode overrides */
        --ios-blue: #0A84FF;
        --ios-green: #32D74B;
        --ios-orange: #FF9F0A;
        --ios-red: #FF453A;
        --ios-purple: #BF5AF2;
        --ios-teal: #64D2FF;
        --ios-gray: #8E8E93;
        --ios-gray2: #636366;
        --ios-gray3: #48484A;
        --ios-gray4: #3A3A3C;
        --ios-gray5: #2C2C2E;
        --ios-gray6: #1C1C1E;
        --ios-bg: #000000;
        --ios-card: #1C1C1E;
        --ios-text: #FFFFFF;
        --ios-text-secondary: #EBEBF5;
        --ios-separator: rgba(84, 84, 88, 0.65);
      }

      .app {
        display: flex;
        flex-direction: column;
        min-height: 100vh;
        background-color: var(--ios-bg);
        padding-top: env(safe-area-inset-top, 20px);
        transition: background-color 0.3s ease;
      }

      .app-header {
        background: linear-gradient(135deg, var(--ios-blue) 0%, #0051D5 100%);
        color: white;
        margin: 16px;
        padding: 12px 20px;
        border-radius: 25px;
        text-align: center;
        box-shadow: 0 8px 32px rgba(0, 122, 255, 0.25);
        backdrop-filter: blur(20px);
        position: relative;
        z-index: 101;
        animation: floatIn 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        transition: all 0.3s ease;
      }

      :host([dark-mode]) .app-header {
        background: linear-gradient(135deg, var(--ios-blue) 0%, #0066FF 100%);
        box-shadow: 0 8px 32px rgba(10, 132, 255, 0.3);
      }

      @keyframes floatIn {
        from {
          opacity: 0;
          transform: translateY(-20px) scale(0.9);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      .app-header h1 {
        margin: 0;
        font-size: 34px;
        font-weight: 700;
        letter-spacing: -0.5px;
      }

      .app-header p {
        margin: 8px 0 0;
        font-size: 17px;
        font-weight: 400;
        opacity: 0.85;
      }

      .nav-tabs {
        display: flex;
        background-color: var(--ios-card);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        box-shadow: 0 1px 0 0 var(--ios-separator);
        position: sticky;
        top: 0;
        z-index: 100;
        margin-top: 8px;
        transition: all 0.3s ease;
      }

      :host([dark-mode]) .nav-tabs {
        background-color: rgba(28, 28, 30, 0.98);
      }

      .nav-tab {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
        padding: 12px;
        text-decoration: none;
        color: var(--ios-gray, #8E8E93);
        border-bottom: 2px solid transparent;
        transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        cursor: pointer;
        font-size: 17px;
        font-weight: 500;
        position: relative;
      }

      .nav-tab:active {
        transform: scale(0.95);
        opacity: 0.7;
      }

      .nav-tab.active {
        color: var(--ios-blue, #007AFF);
      }

      .nav-tab.active::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 20%;
        right: 20%;
        height: 3px;
        background-color: var(--ios-blue, #007AFF);
        border-radius: 1.5px;
      }

      .nav-tab svg {
        flex-shrink: 0;
        width: 22px;
        height: 22px;
      }

      .nav-tab span {
        font-weight: 500;
      }

      .main-content {
        flex: 1;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
        scrollbar-width: thin;
        scrollbar-color: rgba(0, 122, 255, 0.7) transparent;
      }

      /* Animated scrollbar with blur effect */
      .main-content::-webkit-scrollbar {
        width: 12px;
        opacity: 0;
        transition: opacity 0.3s ease;
      }

      .main-content:hover::-webkit-scrollbar {
        opacity: 1;
      }

      .main-content::-webkit-scrollbar-track {
        background: transparent;
      }

      .main-content::-webkit-scrollbar-thumb {
        background-color: rgba(0, 122, 255, 0.5);
        border-radius: 6px;
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        transition: background-color 0.3s ease;
        border: 2px solid transparent;
        background-clip: padding-box;
      }

      .main-content::-webkit-scrollbar-thumb:hover {
        background-color: rgba(0, 122, 255, 0.8);
      }

      .main-content::-webkit-scrollbar-thumb:active {
        background-color: rgba(0, 122, 255, 1);
      }

      #outlet {
        animation: contentFade 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
      }

      @keyframes contentFade {
        from {
          opacity: 0;
          filter: blur(8px);
        }
        to {
          opacity: 1;
          filter: blur(0);
        }
      }

      /* Theme Switcher Styles */
      .theme-switcher {
        position: fixed;
        bottom: 24px;
        right: 24px;
        width: 56px;
        height: 56px;
        border-radius: 28px;
        background: linear-gradient(135deg, #007AFF 0%, #0051D5 100%);
        border: none;
        box-shadow: 0 8px 32px rgba(0, 122, 255, 0.3);
        cursor: pointer;
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        overflow: hidden;
      }

      .theme-switcher:hover {
        transform: scale(1.05);
        box-shadow: 0 12px 40px rgba(0, 122, 255, 0.4);
      }

      .theme-switcher:active {
        transform: scale(0.95);
      }

      .theme-switcher.dark {
        background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
      }

      .theme-switcher.dark:hover {
        box-shadow: 0 12px 40px rgba(0, 0, 0, 0.6);
      }

      .theme-icon-wrapper {
        position: relative;
        width: 24px;
        height: 24px;
      }

      .sun-icon, .moon-icon {
        position: absolute;
        top: 0;
        left: 0;
        color: white;
        transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
      }

      .theme-switcher.light .sun-icon {
        opacity: 1;
        transform: rotate(0deg) scale(1);
      }

      .theme-switcher.light .moon-icon {
        opacity: 0;
        transform: rotate(180deg) scale(0.5);
      }

      .theme-switcher.dark .sun-icon {
        opacity: 0;
        transform: rotate(180deg) scale(0.5);
      }

      .theme-switcher.dark .moon-icon {
        opacity: 1;
        transform: rotate(0deg) scale(1);
      }

      /* Ripple effect on click */
      .theme-switcher::before {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        width: 0;
        height: 0;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.5);
        transform: translate(-50%, -50%);
        transition: width 0.6s, height 0.6s;
      }

      .theme-switcher:active::before {
        width: 120px;
        height: 120px;
      }

      @media (max-width: 768px) {
        .app-header {
          margin: 12px;
          padding: 10px 16px;
        }

        .app-header h1 {
          font-size: 28px;
        }
        
        .app-header p {
          font-size: 15px;
        }
        
        .nav-tab {
          padding: 10px 6px;
          font-size: 10px;
          flex-direction: column;
          gap: 2px;
        }
        
        .nav-tab svg {
          width: 20px;
          height: 20px;
        }

        .nav-tab span {
          font-size: 10px;
        }

        .nav-tab.active::after {
          left: 10%;
          right: 10%;
          height: 2px;
        }

        .theme-switcher {
          bottom: 20px;
          right: 20px;
          width: 48px;
          height: 48px;
        }
      }
    `
  }
}

window.customElements.define('my-element', MyElement)
