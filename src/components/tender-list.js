import { LitElement, html, css } from 'lit';
import { Router } from '@vaadin/router';
import { tenderAPI, transformTender } from '../services/api';
import { format, parseISO, isPast, isToday } from 'date-fns';

class TenderList extends LitElement {
  static properties = {
    tenders: { type: Array },
    showForm: { type: Boolean },
    formData: { type: Object },
    loading: { type: Boolean },
    error: { type: String },
    editingId: { type: Number },
    siteVisitInputs: { type: Array },
    openMenuId: { type: String },
  };

  constructor() {
    super();
    this.tenders = [];
    this.showForm = false;
    this.formData = {
      description: '',
      closingDate: '',
      siteVisits: ''
    };
    this.loading = true;
    this.error = null;
    this._locationObserver = null;
    this.editingId = null;
    this.siteVisitInputs = [''];
    this.openMenuId = null;
  }

  async connectedCallback() {
    super.connectedCallback();
    
    // Load tenders when first connected
    await this._loadTenders();
    
    // Set up location observer to reload when navigating back to this route
    if (!this._locationObserver) {
      this._locationObserver = () => {
        if (window.location.pathname === '/') {
          this._loadTenders();
        }
      };
      window.addEventListener('vaadin-router-location-changed', this._locationObserver);
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._locationObserver) {
      window.removeEventListener('vaadin-router-location-changed', this._locationObserver);
      this._locationObserver = null;
    }
  }

  // Called by Vaadin Router when navigating to this component
  async onAfterEnter() {
    // Always reload data when navigating to this route
    await this._loadTenders();
  }

  async _loadTenders() {
    try {
      this.loading = true;
      this.error = null;
      const dbTenders = await tenderAPI.getAll();
      this.tenders = dbTenders.map(transformTender);
    } catch (error) {
      console.error('Error loading tenders:', error);
      this.error = 'Failed to load tenders. Please try again.';
    } finally {
      this.loading = false;
    }
  }

  render() {
    return html`
      <div class="container">
        <div class="header">
          <h2>Tender Management</h2>
          <div class="header-actions">
            <button class="fab" @click="${this._toggleForm}">
              ${this.showForm ? '×' : '+'}
            </button>
          </div>
        </div>

        ${this.showForm ? this._renderModal() : ''}

        ${this.error ? html`<div class="error-message">${this.error}</div>` : ''}

        <div class="tender-list">
          ${this.loading
            ? html`<p class="loading-message">Loading tenders...</p>`
            : this.tenders.length === 0
            ? html`<p class="empty-message">No tenders logged yet. Click + to add your first tender.</p>`
            : this.tenders.map(tender => this._renderTenderCard(tender))
          }
        </div>
      </div>
    `;
  }

  _renderModal() {
    return html`
      <div class="modal-overlay" @click="${this._handleOverlayClick}">
        <div class="modal-container" @click="${this._stopPropagation}">
          ${this._renderForm()}
        </div>
      </div>
    `;
  }

  _renderForm() {
    return html`
      <div class="form-container">
        <div class="form-header">
          <h3>${this.editingId ? 'Edit Tender' : 'Add New Tender'}</h3>
          <button type="button" class="modal-close" @click="${this._cancelForm}" aria-label="Close">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <form @submit="${this._handleSubmit}">
          <div class="form-group">
            <label>Description *</label>
            <textarea
              .value="${this.formData.description}"
              @input="${(e) => this._updateFormData('description', e.target.value)}"
              required
              placeholder="Enter tender description"
              rows="3"
            ></textarea>
          </div>

          <div class="form-group">
            <label>Closing Date *</label>
            <input
              type="date"
              .value="${this.formData.closingDate}"
              @input="${(e) => this._updateFormData('closingDate', e.target.value)}"
              required
            />
          </div>

          <div class="form-group site-visits-group">
            <label>Site Visits</label>
            <div class="site-visits-container">
              ${this.siteVisitInputs.map((visit, index) => {
                // Check if visit is completed and get clean text for input
                const isCompleted = visit.startsWith('✓');
                const inputValue = isCompleted ? visit.substring(1).trim() : visit;
                
                return html`
                  <div class="site-visit-row ${isCompleted ? 'completed-visit' : ''}">
                    ${isCompleted ? html`
                      <div class="completion-indicator">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                          <polyline points="20,6 9,17 4,12"></polyline>
                        </svg>
                      </div>
                    ` : ''}
                    <input
                      type="text"
                      .value="${inputValue}"
                      @input="${(e) => this._updateSiteVisit(index, e.target.value, isCompleted)}"
                      placeholder="Enter site visit date (e.g., 15/01/2025)"
                      class="site-visit-input ${isCompleted ? 'completed' : ''}"
                    />
                    ${this.siteVisitInputs.length > 1 ? html`
                      <button 
                        type="button" 
                        class="btn-remove-visit"
                        @click="${() => this._removeSiteVisit(index)}"
                        aria-label="Remove site visit"
                      >
                        ×
                      </button>
                    ` : ''}
                  </div>
                `;
              })}
              <button 
                type="button" 
                class="btn-add-visit"
                @click="${this._addSiteVisit}"
              >
                + Add Site Visit
              </button>
            </div>
          </div>

          <div class="form-actions">
            <button type="submit" class="btn-primary">${this.editingId ? 'Update' : 'Save'} Tender</button>
            <button type="button" class="btn-secondary" @click="${this._cancelForm}">Cancel</button>
          </div>
        </form>
      </div>
    `;
  }

  _renderTenderCard(tender) {
    const closingDate = new Date(tender.closingDate);
    const isClosed = isPast(closingDate) && !isToday(closingDate);
    const closingToday = isToday(closingDate);
    
    return html`
      <div class="tender-card ${isClosed ? 'closed' : ''}">
        <div class="tender-header">
          <div class="tender-info">
            <span class="tender-number">${tender.tenderNumber}</span>
            <span class="closing-date ${isClosed ? 'closed' : closingToday ? 'closing-today' : ''}">
              ${isClosed ? 'Closed' : closingToday ? 'Closing Today' : 'Closing'}: ${format(closingDate, 'dd/MM/yyyy')}
            </span>
          </div>
          <div class="card-menu" @click="${(e) => this._toggleMenu(e, tender.id)}">
            <button class="menu-trigger" aria-label="More options">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="1"></circle>
                <circle cx="12" cy="5" r="1"></circle>
                <circle cx="12" cy="19" r="1"></circle>
              </svg>
            </button>
            ${this.openMenuId === tender.id ? html`
              <div class="menu-dropdown">
                <button class="menu-item" @click="${(e) => this._handleMenuAction(e, 'edit', tender)}">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="m18 2 4 4L8 20l-4 4-4-4L14 6l4-4z"></path>
                    <path d="M18 6l4 4"></path>
                  </svg>
                  Edit
                </button>
                <button class="menu-item delete" @click="${(e) => this._handleMenuAction(e, 'delete', tender)}">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3,6 5,6 21,6"></polyline>
                    <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"></path>
                  </svg>
                  Delete
                </button>
              </div>
            ` : ''}
          </div>
        </div>
        <p class="description">${tender.description}</p>
        ${tender.siteVisits ? this._renderSiteVisits(tender.siteVisits) : ''}
      </div>
    `;
  }

  _renderSiteVisits(siteVisits) {
    const visits = siteVisits.split(';').map(visit => visit.trim()).filter(visit => visit !== '');
    
    if (visits.length === 0) return '';
    
    return html`
      <div class="site-visits-display">
        <span class="site-visits-label">Site Visits:</span>
        <div class="site-visits-list">
          ${visits.map((visit, index) => {
            // Check if visit is marked as completed (starts with ✓)
            const isCompleted = visit.startsWith('✓');
            const visitText = isCompleted ? visit.substring(1).trim() : visit;
            
            return html`
              <div class="site-visit-item ${isCompleted ? 'completed' : ''}" 
                   @click="${(e) => this._toggleSiteVisitStatus(e, index, visit)}">
                <div class="visit-checkbox ${isCompleted ? 'checked' : ''}">
                  <svg class="check-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                    <polyline points="20,6 9,17 4,12"></polyline>
                  </svg>
                </div>
                <span class="visit-text">${visitText}</span>
              </div>
            `;
          })}
        </div>
      </div>
    `;
  }

  _toggleForm() {
    this.showForm = !this.showForm;
    if (!this.showForm) {
      this._resetForm();
    }
  }

  _cancelForm() {
    this.showForm = false;
    this._resetForm();
    this.editingId = null;
  }

  _resetForm() {
    this.formData = {
      description: '',
      closingDate: '',
      siteVisits: ''
    };
    this.siteVisitInputs = [''];
  }

  _addSiteVisit() {
    this.siteVisitInputs = [...this.siteVisitInputs, ''];
    this.requestUpdate();
  }

  _removeSiteVisit(index) {
    if (this.siteVisitInputs.length > 1) {
      this.siteVisitInputs = this.siteVisitInputs.filter((_, i) => i !== index);
      this._updateSiteVisitsFormData();
      this.requestUpdate();
    }
  }

  _updateSiteVisit(index, value, wasCompleted = false) {
    // If the visit was completed and we're editing it, preserve the completion status
    const updatedValue = wasCompleted ? '✓' + value : value;
    
    this.siteVisitInputs = this.siteVisitInputs.map((visit, i) => 
      i === index ? updatedValue : visit
    );
    this._updateSiteVisitsFormData();
    this.requestUpdate();
  }

  _updateSiteVisitsFormData() {
    // Join non-empty site visits with semicolons
    const validVisits = this.siteVisitInputs.filter(visit => visit.trim() !== '');
    this.formData = { 
      ...this.formData, 
      siteVisits: validVisits.join('; ') 
    };
  }

  async _handleSubmit(e) {
    e.preventDefault();
    
    try {
      this.error = null;
      
      if (this.editingId) {
        // Update existing tender
        const dbTender = await tenderAPI.update(this.editingId, this.formData);
        const updatedTender = transformTender(dbTender);
        this.tenders = this.tenders.map(t => 
          t.id === this.editingId ? updatedTender : t
        );
      } else {
        // Create new tender
        const dbTender = await tenderAPI.create(this.formData);
        const newTender = transformTender(dbTender);
        this.tenders = [newTender, ...this.tenders];
      }
      
      this._cancelForm();
    } catch (error) {
      console.error('Error saving tender:', error);
      this.error = `Failed to ${this.editingId ? 'update' : 'create'} tender. Please try again.`;
    }
    this.requestUpdate();
  }

  _updateFormData(field, value) {
    this.formData = { ...this.formData, [field]: value };
    this.requestUpdate();
  }

  _handleOverlayClick(e) {
    if (e.target === e.currentTarget) {
      this._cancelForm();
    }
  }

  _stopPropagation(e) {
    e.stopPropagation();
  }

  _toggleMenu(e, tenderId) {
    e.stopPropagation();
    this.openMenuId = this.openMenuId === tenderId ? null : tenderId;
    this.requestUpdate();
    
    // Close menu when clicking outside
    if (this.openMenuId) {
      setTimeout(() => {
        document.addEventListener('click', this._closeMenu.bind(this), { once: true });
      }, 0);
    }
  }

  _closeMenu() {
    this.openMenuId = null;
    this.requestUpdate();
  }


  _handleMenuAction(e, action, tender) {
    e.stopPropagation();
    this.openMenuId = null;
    
    if (action === 'edit') {
      this._editTender(tender);
    } else if (action === 'delete') {
      this._deleteTender(tender.id);
    }
    
    this.requestUpdate();
  }

  async _toggleSiteVisitStatus(e, index, currentVisit) {
    e.stopPropagation();
    
    // Find the tender that contains this site visit
    const tender = this.tenders.find(t => {
      if (!t.siteVisits) return false;
      const visits = t.siteVisits.split(';').map(v => v.trim());
      return visits.includes(currentVisit);
    });
    
    if (!tender) return;
    
    try {
      const visits = tender.siteVisits.split(';').map(v => v.trim());
      const isCompleted = currentVisit.startsWith('✓');
      
      // Toggle completion status
      if (isCompleted) {
        // Remove checkmark
        visits[index] = currentVisit.substring(1).trim();
      } else {
        // Add checkmark
        visits[index] = '✓' + currentVisit;
      }
      
      const updatedSiteVisits = visits.join('; ');
      const updatedTender = { ...tender, siteVisits: updatedSiteVisits };
      
      // Update in database
      const dbTender = await tenderAPI.update(tender.id, {
        description: tender.description,
        closingDate: tender.closingDate,
        siteVisits: updatedSiteVisits
      });
      
      // Update local state
      const transformedTender = transformTender(dbTender);
      this.tenders = this.tenders.map(t => 
        t.id === tender.id ? transformedTender : t
      );
      
      this.requestUpdate();
    } catch (error) {
      console.error('Error updating site visit status:', error);
      this.error = 'Failed to update site visit status. Please try again.';
      this.requestUpdate();
    }
  }

  _editTender(tender) {
    this.editingId = tender.id;
    
    // Format the closing date for the date input (YYYY-MM-DD)
    let formattedClosingDate = '';
    if (tender.closingDate) {
      try {
        // Parse the date and format it as YYYY-MM-DD for the date input
        const date = new Date(tender.closingDate);
        formattedClosingDate = format(date, 'yyyy-MM-dd');
      } catch (error) {
        console.warn('Error formatting closing date for edit:', error);
        formattedClosingDate = tender.closingDate;
      }
    }
    
    this.formData = {
      description: tender.description,
      closingDate: formattedClosingDate,
      siteVisits: tender.siteVisits || ''
    };
    
    // Parse existing site visits into individual inputs, preserving completion status
    if (tender.siteVisits && tender.siteVisits.trim() !== '') {
      this.siteVisitInputs = tender.siteVisits.split(';').map(visit => visit.trim());
    } else {
      this.siteVisitInputs = [''];
    }
    
    this.showForm = true;
    this.requestUpdate();
  }

  async _deleteTender(id) {
    if (confirm('Are you sure you want to delete this tender?')) {
      try {
        this.error = null;
        await tenderAPI.delete(id);
        this.tenders = this.tenders.filter(t => t.id !== id);
      } catch (error) {
        console.error('Error deleting tender:', error);
        this.error = 'Failed to delete tender. Please try again.';
      }
      this.requestUpdate();
    }
  }

  static styles = css`
    .container {
      padding: 20px;
      max-width: 600px;
      margin: 0 auto;
      animation: fadeIn 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(10px);
        filter: blur(5px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
        filter: blur(0);
      }
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      padding: 0 4px;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 12px;
      position: relative;
      z-index: 2;
    }


    h2 {
      margin: 0;
      color: var(--ios-text, #000);
      font-size: 8.5px;
      font-weight: 700;
      letter-spacing: -0.5px;
    }

    .fab {
      width: 60px;
      height: 60px;
      border-radius: 30px;
      background: linear-gradient(180deg, #007AFF 0%, #0051D5 100%);
      color: white;
      border: none;
      font-size: 32px;
      font-weight: 300;
      cursor: pointer;
      box-shadow: 0 8px 32px rgba(0, 122, 255, 0.3);
      transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .fab:active {
      transform: scale(0.92);
      box-shadow: 0 4px 16px rgba(0, 122, 255, 0.3);
    }

    /* Modal Styles */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      animation: modalFadeIn 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    }

    @keyframes modalFadeIn {
      from {
        opacity: 0;
        backdrop-filter: blur(0px);
        -webkit-backdrop-filter: blur(0px);
      }
      to {
        opacity: 1;
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
      }
    }

    .modal-container {
      width: 100%;
      max-width: 540px;
      max-height: 95vh;
      overflow-y: auto;
      animation: modalSlideIn 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
      margin: 20px;
    }

    @keyframes modalSlideIn {
      from {
        opacity: 0;
        transform: translateY(40px) scale(0.95);
        filter: blur(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
        filter: blur(0);
      }
    }

    .form-container {
      background: var(--ios-card, #FFFFFF);
      padding: 0;
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      overflow: hidden;
      position: relative;
    }

    .form-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 24px 24px 16px;
      border-bottom: 1px solid var(--ios-separator, rgba(60, 60, 67, 0.12));
    }

    .modal-close {
      width: 32px;
      height: 32px;
      border-radius: 16px;
      background: var(--ios-gray6, #F2F2F7);
      border: none;
      color: var(--ios-gray, #8E8E93);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    }

    .modal-close:hover {
      background: var(--ios-gray5, #E5E5EA);
      color: var(--ios-text, #000);
      transform: scale(1.05);
    }

    .modal-close:active {
      transform: scale(0.95);
    }

    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-20px) scale(0.95);
        filter: blur(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
        filter: blur(0);
      }
    }

    .form-header h3 {
      margin: 0;
      color: var(--ios-text, #000);
      font-size: 22px;
      font-weight: 600;
      letter-spacing: -0.3px;
    }

    .form-group {
      margin-bottom: 0;
      border-bottom: 1px solid var(--ios-separator, rgba(60, 60, 67, 0.12));
      position: relative;
      transition: all 0.2s ease;
    }

    .form-group:last-of-type {
      border-bottom: none;
    }

    .form-group:hover {
      background-color: var(--ios-gray6, rgba(242, 242, 247, 0.3));
    }

    label {
      display: block;
      padding: 16px 20px 6px;
      font-weight: 600;
      color: var(--ios-text-secondary, #3C3C43);
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: -0.08px;
      margin-bottom: 0;
    }

    input, textarea, select {
      width: 100%;
      padding: 12px 20px 16px;
      border: none;
      font-size: 17px;
      font-family: inherit;
      background: transparent;
      color: var(--ios-text, #000);
      transition: background-color 0.2s;
      box-sizing: border-box;
    }

    /* Apply -webkit-appearance: none to all inputs except date */
    input:not([type="date"]), textarea, select {
      -webkit-appearance: none;
    }

    input::placeholder, textarea::placeholder {
      color: var(--ios-gray3, #C7C7CC);
    }

    input:focus, textarea:focus {
      outline: none;
      background-color: var(--ios-gray6, #F2F2F7);
    }

    textarea {
      resize: vertical;
      line-height: 1.4;
      min-height: 80px;
    }

    /* Enhanced date input styling */
    input[type="date"] {
      cursor: pointer;
      position: relative;
      padding-right: 50px;
      min-height: 44px;
      display: flex;
      align-items: center;
    }

    /* Make date picker icon more visible */
    input[type="date"]::-webkit-calendar-picker-indicator {
      cursor: pointer;
      position: absolute;
      right: 15px;
      top: 50%;
      transform: translateY(-50%);
      width: 20px;
      height: 20px;
      opacity: 0.6;
      transition: opacity 0.2s ease;
    }

    input[type="date"]:hover::-webkit-calendar-picker-indicator {
      opacity: 1;
    }

    /* Firefox date picker styling */
    input[type="date"]::-moz-calendar-picker-indicator {
      cursor: pointer;
      width: 20px;
      height: 20px;
      opacity: 0.6;
    }

    .form-actions {
      display: flex;
      gap: 12px;
      padding: 20px;
      background-color: var(--ios-gray6, #F2F2F7);
      border-top: 1px solid var(--ios-separator, rgba(60, 60, 67, 0.12));
    }

    .btn-primary, .btn-secondary {
      flex: 1;
      padding: 14px 20px;
      border: none;
      border-radius: 12px;
      font-size: 17px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    }

    .btn-primary {
      background-color: var(--ios-blue, #007AFF);
      color: white;
    }

    .btn-primary:active {
      transform: scale(0.97);
      opacity: 0.8;
    }

    .btn-secondary {
      background-color: var(--ios-gray5, #E5E5EA);
      color: var(--ios-text, #000);
    }

    .btn-secondary:active {
      transform: scale(0.97);
      background-color: var(--ios-gray4, #D1D1D6);
    }

    .tender-list {
      display: grid;
      grid-template-columns: 1fr;
      gap: 16px;
    }

    .empty-message, .loading-message {
      text-align: center;
      color: var(--ios-gray, #8E8E93);
      padding: 60px 40px;
      background: var(--ios-card, #FFFFFF);
      border-radius: 16px;
      font-size: 17px;
      line-height: 1.4;
      animation: fadeIn 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    }

    .error-message {
      background: var(--ios-red, #FF3B30);
      color: white;
      padding: 12px 16px;
      border-radius: 12px;
      margin-bottom: 16px;
      font-size: 15px;
      animation: fadeIn 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    }

    .tender-card {
      background: var(--ios-card, #FFFFFF);
      padding: 16px;
      border-radius: 16px;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
      transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94), transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
      animation: cardEntry 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) backwards;
      will-change: transform;
    }


    @keyframes cardEntry {
      from {
        opacity: 0;
        transform: translateY(20px) scale(0.9);
        filter: blur(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
        filter: blur(0);
      }
    }

    .tender-card:nth-child(1) { animation-delay: 0.1s; }
    .tender-card:nth-child(2) { animation-delay: 0.2s; }
    .tender-card:nth-child(3) { animation-delay: 0.3s; }
    .tender-card:nth-child(4) { animation-delay: 0.4s; }
    .tender-card:nth-child(5) { animation-delay: 0.5s; }

    .tender-card:active {
      transform: scale(0.98);
      box-shadow: 0 1px 6px rgba(0, 0, 0, 0.04);
    }

    .tender-card.closed {
      opacity: 0.8;
      background: var(--ios-gray6, #F2F2F7);
    }

    .tender-card.closed .tender-number {
      color: var(--ios-gray, #8E8E93);
    }

    .tender-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 12px;
      position: relative;
    }

    .tender-info {
      flex: 1;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      flex-wrap: wrap;
      gap: 8px;
      margin-right: 8px;
    }

    .tender-number {
      font-weight: 600;
      color: var(--ios-blue, #007AFF);
      font-size: 17px;
      letter-spacing: -0.3px;
    }

    .closing-date {
      font-size: 13px;
      font-weight: 500;
      color: var(--ios-gray, #8E8E93);
      background: var(--ios-gray6, #F2F2F7);
      padding: 4px 10px;
      border-radius: 6px;
    }

    .closing-date.closed {
      background: var(--ios-red, #FF3B30);
      color: white;
    }

    .closing-date.closing-today {
      background: var(--ios-orange, #FF9500);
      color: white;
    }

    .description {
      color: var(--ios-text, #000);
      margin: 0 0 12px;
      line-height: 1.4;
      font-size: 15px;
    }

    /* Site Visits Display Styles */
    .site-visits-display {
      margin: 12px 0 0;
    }

    .site-visits-label {
      font-size: 13px;
      font-weight: 600;
      color: var(--ios-gray, #8E8E93);
      display: block;
      margin-bottom: 6px;
    }

    .site-visits-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .site-visit-item {
      display: flex;
      align-items: center;
      gap: 8px;
      background: var(--ios-gray6, #F2F2F7);
      padding: 8px 12px;
      border-radius: 20px;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
      animation: fadeInTag 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
      user-select: none;
    }

    .site-visit-item:hover {
      background: var(--ios-gray5, #E5E5EA);
      transform: translateY(-1px);
    }

    .site-visit-item:active {
      transform: translateY(0) scale(0.98);
    }

    .site-visit-item.completed {
      background: rgba(52, 199, 89, 0.1);
      color: var(--ios-green, #34C759);
    }

    .site-visit-item.completed:hover {
      background: rgba(52, 199, 89, 0.15);
    }

    .visit-checkbox {
      width: 18px;
      height: 18px;
      border: 2px solid var(--ios-gray4, #D1D1D6);
      border-radius: 9px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    }

    .visit-checkbox.checked {
      background: var(--ios-green, #34C759);
      border-color: var(--ios-green, #34C759);
    }

    .check-icon {
      color: white;
      opacity: 0;
      transform: scale(0.5);
      transition: all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    }

    .visit-checkbox.checked .check-icon {
      opacity: 1;
      transform: scale(1);
    }

    .visit-text {
      font-size: 13px;
      font-weight: 500;
      color: var(--ios-text, #000);
    }

    .site-visit-item.completed .visit-text {
      color: var(--ios-green, #34C759);
      text-decoration: line-through;
      opacity: 0.8;
    }

    @keyframes fadeInTag {
      from {
        opacity: 0;
        transform: scale(0.8);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }

    /* Three-dot menu styles */
    .card-menu {
      position: relative;
      flex-shrink: 0;
    }

    .menu-trigger {
      width: 32px;
      height: 32px;
      border-radius: 16px;
      background: transparent;
      border: none;
      color: var(--ios-gray, #8E8E93);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    }

    .menu-trigger:hover {
      background: var(--ios-gray6, #F2F2F7);
      color: var(--ios-text, #000);
    }

    .menu-trigger:active {
      transform: scale(0.9);
    }

    .menu-dropdown {
      position: absolute;
      top: 100%;
      right: 0;
      background: var(--ios-card, #FFFFFF);
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
      backdrop-filter: blur(20px);
      z-index: 1000;
      min-width: 120px;
      overflow: hidden;
      animation: menuSlideIn 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    }

    @keyframes menuSlideIn {
      from {
        opacity: 0;
        transform: translateY(-8px) scale(0.95);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    .menu-item {
      width: 100%;
      padding: 12px 16px;
      background: transparent;
      border: none;
      text-align: left;
      font-size: 15px;
      color: var(--ios-text, #000);
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 10px;
      transition: background-color 0.2s ease;
    }

    .menu-item:hover {
      background: var(--ios-gray6, #F2F2F7);
    }

    .menu-item:active {
      background: var(--ios-gray5, #E5E5EA);
    }

    .menu-item.delete {
      color: var(--ios-red, #FF3B30);
    }

    .menu-item.delete:hover {
      background: rgba(255, 59, 48, 0.1);
    }

    .menu-item svg {
      flex-shrink: 0;
    }

    .btn-edit {
      padding: 8px 16px;
      background-color: var(--ios-blue, #007AFF);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 15px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    }

    .btn-edit:active {
      transform: scale(0.95);
      opacity: 0.8;
    }

    .btn-delete {
      padding: 8px 16px;
      background-color: var(--ios-red, #FF3B30);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 15px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    }

    .btn-delete:active {
      transform: scale(0.95);
      opacity: 0.8;
    }

    /* Site Visits Styles */
    .site-visits-group {
      border-bottom: none !important;
      background-color: var(--ios-gray6, rgba(242, 242, 247, 0.5));
    }

    .site-visits-container {
      padding: 16px 20px 20px;
    }

    .site-visit-row {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
      transition: all 0.2s ease;
    }

    .site-visit-row:last-child {
      margin-bottom: 0;
    }

    .site-visit-input {
      flex: 1;
      padding: 12px 16px !important;
      border: 1px solid var(--ios-gray4, #D1D1D6);
      border-radius: 10px;
      background-color: var(--ios-card, #FFFFFF);
      font-size: 16px;
      transition: all 0.2s ease;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .site-visit-input:focus {
      border-color: var(--ios-blue, #007AFF);
      background-color: var(--ios-card, #FFFFFF);
      box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.1);
    }

    .btn-remove-visit {
      width: 32px;
      height: 32px;
      border-radius: 16px;
      background-color: var(--ios-red, #FF3B30);
      color: white;
      border: none;
      font-size: 18px;
      font-weight: 300;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
      flex-shrink: 0;
    }

    .btn-remove-visit:active {
      transform: scale(0.9);
      opacity: 0.8;
    }

    .btn-add-visit {
      width: 100%;
      padding: 12px 16px;
      background-color: var(--ios-blue, #007AFF);
      color: white;
      border: none;
      border-radius: 10px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
      margin-top: 8px;
      box-shadow: 0 2px 8px rgba(0, 122, 255, 0.3);
    }

    .btn-add-visit:hover {
      background-color: var(--ios-blue-dark, #0056D6);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 122, 255, 0.4);
    }

    .btn-add-visit:active {
      transform: scale(0.98);
      opacity: 0.8;
    }

    @media (max-width: 768px) {
      .container {
        padding: 16px;
      }

      .header {
        margin-bottom: 20px;
      }

      h2 {
        font-size: 28px;
      }

      .fab {
        width: 56px;
        height: 56px;
        font-size: 28px;
      }
    }
  `;
}

customElements.define('tender-list', TenderList);
