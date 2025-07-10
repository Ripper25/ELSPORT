import { LitElement, css, html } from 'lit'
import { Router } from '@vaadin/router';
import './components/tender-list.js';
import './components/task-list.js';

export class MyElement extends LitElement {
  static get properties() {
    return {
      currentView: { type: String },
    }
  }

  constructor() {
    super();
    this.currentView = 'tenders';
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
      </div>
    `
  }

  _handleNavClick(e, view) {
    this.currentView = view;
  }

  static get styles() {
    return css`
      :host {
        display: block;
        min-height: 100vh;
        font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif;
      }

      .app {
        display: flex;
        flex-direction: column;
        min-height: 100vh;
        background-color: var(--ios-bg, #F2F2F7);
        padding-top: env(safe-area-inset-top, 20px);
      }

      .app-header {
        background: linear-gradient(135deg, #007AFF 0%, #0051D5 100%);
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
        background-color: rgba(255, 255, 255, 0.98);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        box-shadow: 0 1px 0 0 var(--ios-separator, rgba(60, 60, 67, 0.12));
        position: sticky;
        top: 0;
        z-index: 100;
        margin-top: 8px;
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
      }
    `
  }
}

window.customElements.define('my-element', MyElement)
