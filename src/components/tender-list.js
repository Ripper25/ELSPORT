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
  };

  constructor() {
    super();
    this.tenders = [];
    this.showForm = false;
    this.formData = {
      tenderNumber: '',
      description: '',
      closingDate: '',
      siteVisits: ''
    };
    this.loading = true;
    this.error = null;
    this._locationObserver = null;
    this.editingId = null;
    this.siteVisitInputs = [''];
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
          <button class="fab" @click="${this._toggleForm}">
            ${this.showForm ? '×' : '+'}
          </button>
        </div>

        ${this.showForm ? this._renderForm() : ''}

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

  _renderForm() {
    return html`
      <div class="form-container">
        <h3>${this.editingId ? 'Edit Tender' : 'Add New Tender'}</h3>
        <form @submit="${this._handleSubmit}">
          <div class="form-group">
            <label>Tender Number *</label>
            <input
              type="text"
              .value="${this.formData.tenderNumber}"
              @input="${(e) => this._updateFormData('tenderNumber', e.target.value)}"
              required
              placeholder="Enter tender number"
            />
          </div>

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
              ${this.siteVisitInputs.map((visit, index) => html`
                <div class="site-visit-row">
                  <input
                    type="text"
                    .value="${visit}"
                    @input="${(e) => this._updateSiteVisit(index, e.target.value)}"
                    placeholder="Enter site visit date (e.g., 15/01/2025)"
                    class="site-visit-input"
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
              `)}
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
          <span class="tender-number">${tender.tenderNumber}</span>
          <span class="closing-date ${isClosed ? 'closed' : closingToday ? 'closing-today' : ''}">
            ${isClosed ? 'Closed' : closingToday ? 'Closing Today' : 'Closing'}: ${format(closingDate, 'dd/MM/yyyy')}
          </span>
        </div>
        <p class="description">${tender.description}</p>
        ${tender.siteVisits ? this._renderSiteVisits(tender.siteVisits) : ''}
        <div class="card-actions">
          <button class="btn-edit" @click="${() => this._editTender(tender)}">Edit</button>
          <button class="btn-delete" @click="${() => this._deleteTender(tender.id)}">Delete</button>
        </div>
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
          ${visits.map(visit => html`
            <span class="site-visit-tag">${visit}</span>
          `)}
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
      tenderNumber: '',
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

  _updateSiteVisit(index, value) {
    this.siteVisitInputs = this.siteVisitInputs.map((visit, i) => 
      i === index ? value : visit
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

  _editTender(tender) {
    this.editingId = tender.id;
    this.formData = {
      tenderNumber: tender.tenderNumber,
      description: tender.description,
      closingDate: tender.closingDate,
      siteVisits: tender.siteVisits || ''
    };
    
    // Parse existing site visits into individual inputs
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

    .form-container {
      background: var(--ios-card, #FFFFFF);
      padding: 0;
      border-radius: 16px;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
      margin-bottom: 24px;
      overflow: hidden;
      animation: slideDown 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
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

    h3 {
      margin: 0;
      padding: 20px 20px 16px;
      color: var(--ios-text, #000);
      font-size: 22px;
      font-weight: 600;
      letter-spacing: -0.3px;
      border-bottom: 1px solid var(--ios-separator, rgba(60, 60, 67, 0.12));
    }

    .form-group {
      margin-bottom: 0;
      border-bottom: 1px solid var(--ios-separator, rgba(60, 60, 67, 0.12));
    }

    .form-group:last-of-type {
      border-bottom: none;
    }

    label {
      display: block;
      padding: 12px 20px 6px;
      font-weight: 600;
      color: var(--ios-text-secondary, #3C3C43);
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: -0.08px;
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
    }

    input[type="date"] {
      cursor: pointer;
    }

    /* Restore native appearance for date inputs */
    input[type="date"]::-webkit-calendar-picker-indicator {
      cursor: pointer;
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
      transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
      animation: cardEntry 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) backwards;
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
      flex-wrap: wrap;
      gap: 8px;
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
      gap: 6px;
    }

    .site-visit-tag {
      display: inline-block;
      background: var(--ios-blue, #007AFF);
      color: white;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
      white-space: nowrap;
      animation: fadeInTag 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
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

    .card-actions {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid var(--ios-separator, rgba(60, 60, 67, 0.12));
      display: flex;
      gap: 12px;
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
    }

    .site-visits-container {
      padding: 0 20px 16px;
    }

    .site-visit-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }

    .site-visit-input {
      flex: 1;
      padding: 10px 14px !important;
      border: 1px solid var(--ios-gray4, #D1D1D6);
      border-radius: 8px;
      background-color: var(--ios-gray6, #F2F2F7);
      font-size: 15px;
    }

    .site-visit-input:focus {
      border-color: var(--ios-blue, #007AFF);
      background-color: var(--ios-card, #FFFFFF);
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
      padding: 10px;
      background-color: var(--ios-blue, #007AFF);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 15px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
      margin-top: 4px;
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
