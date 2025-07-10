import { LitElement, html, css } from 'lit';
import { Router } from '@vaadin/router';
import { taskAPI, transformTask } from '../services/api';
import { format } from 'date-fns';

class TaskList extends LitElement {
  static properties = {
    tasks: { type: Array },
    showForm: { type: Boolean },
    formData: { type: Object },
    statusOptions: { type: Array },
    loading: { type: Boolean },
    error: { type: String },
    editingId: { type: Number },
  };

  constructor() {
    super();
    this.tasks = [];
    this.showForm = false;
    this.formData = {
      description: '',
      assignedTo: '',
      dueDate: '',
      status: 'PENDING'
    };
    this.statusOptions = ['PENDING', 'SENT', 'COMPLETED'];
    this.loading = true;
    this.error = null;
    this._locationObserver = null;
    this.editingId = null;
  }

  async connectedCallback() {
    super.connectedCallback();
    
    // Load tasks when first connected
    await this._loadTasks();
    
    // Set up location observer to reload when navigating back to this route
    if (!this._locationObserver) {
      this._locationObserver = () => {
        if (window.location.pathname === '/tasks') {
          this._loadTasks();
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
    await this._loadTasks();
  }

  async _loadTasks() {
    try {
      this.loading = true;
      this.error = null;
      const dbTasks = await taskAPI.getAll();
      this.tasks = dbTasks.map(transformTask);
    } catch (error) {
      console.error('Error loading tasks:', error);
      this.error = 'Failed to load tasks. Please try again.';
    } finally {
      this.loading = false;
    }
  }

  render() {
    return html`
      <div class="container">
        <div class="header">
          <h2>Task Management (OUR PRODUCTIVITY)</h2>
          <button class="fab" @click="${this._toggleForm}">
            ${this.showForm ? '×' : '+'}
          </button>
        </div>

        ${this.showForm ? this._renderModal() : ''}

        ${this.error ? html`<div class="error-message">${this.error}</div>` : ''}

        <div class="task-list">
          ${this.loading
            ? html`<p class="loading-message">Loading tasks...</p>`
            : this.tasks.length === 0
            ? html`<p class="empty-message">No tasks assigned yet. Click + to add your first task.</p>`
            : this.tasks.map(task => this._renderTaskCard(task))
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
          <h3>${this.editingId ? 'Edit Task' : 'Add New Task'}</h3>
          <button type="button" class="modal-close" @click="${this._cancelForm}" aria-label="Close">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <form @submit="${this._handleSubmit}">
          <div class="form-group">
            <label>Task Description *</label>
            <textarea
              .value="${this.formData.description}"
              @input="${(e) => this._updateFormData('description', e.target.value)}"
              required
              placeholder="Enter task description"
              rows="3"
            ></textarea>
          </div>

          <div class="form-group">
            <label>Assigned To *</label>
            <input
              type="text"
              .value="${this.formData.assignedTo}"
              @input="${(e) => this._updateFormData('assignedTo', e.target.value)}"
              required
              placeholder="Enter assignee name"
            />
          </div>

          <div class="form-group">
            <label>Due Date *</label>
            <input
              type="date"
              .value="${this.formData.dueDate}"
              @input="${(e) => this._updateFormData('dueDate', e.target.value)}"
              required
            />
          </div>

          <div class="form-group">
            <label>Status</label>
            <select
              .value="${this.formData.status}"
              @change="${(e) => this._updateFormData('status', e.target.value)}"
            >
              ${this.statusOptions.map(status => html`
                <option value="${status}" ?selected="${this.formData.status === status}">
                  ${status}
                </option>
              `)}
            </select>
          </div>

          <div class="form-actions">
            <button type="submit" class="btn-primary">${this.editingId ? 'Update' : 'Save'} Task</button>
            <button type="button" class="btn-secondary" @click="${this._cancelForm}">Cancel</button>
          </div>
        </form>
      </div>
    `;
  }

  _renderTaskCard(task) {
    return html`
      <div class="task-card">
        <div class="task-header">
          <span class="task-description">${task.description}</span>
          <span class="status-badge status-${task.status.toLowerCase()}">${task.status}</span>
        </div>
        <div class="task-details">
          <p><strong>Assigned to:</strong> ${task.assignedTo}</p>
          <p><strong>Due:</strong> ${format(new Date(task.dueDate), 'dd/MM/yyyy')}</p>
        </div>
        <div class="card-actions">
          <select 
            class="status-select" 
            .value="${task.status}"
            @change="${(e) => this._updateTaskStatus(task.id, e.target.value)}"
          >
            ${this.statusOptions.map(status => html`
              <option value="${status}" ?selected="${task.status === status}">
                ${status}
              </option>
            `)}
          </select>
          <button class="btn-edit" @click="${() => this._editTask(task)}">Edit</button>
          <button class="btn-delete" @click="${() => this._deleteTask(task.id)}">Delete</button>
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
      assignedTo: '',
      dueDate: '',
      status: 'PENDING'
    };
  }

  async _handleSubmit(e) {
    e.preventDefault();

    try {
      this.error = null;
      
      if (this.editingId) {
        // Update existing task
        const dbTask = await taskAPI.update(this.editingId, this.formData);
        const updatedTask = transformTask(dbTask);
        this.tasks = this.tasks.map(t => 
          t.id === this.editingId ? updatedTask : t
        );
      } else {
        // Create new task
        const dbTask = await taskAPI.create(this.formData);
        const newTask = transformTask(dbTask);
        this.tasks = [newTask, ...this.tasks];
      }
      
      this._cancelForm();
    } catch (error) {
      console.error('Error saving task:', error);
      this.error = `Failed to ${this.editingId ? 'update' : 'create'} task. Please try again.`;
    }
    this.requestUpdate();
  }

  async _updateTaskStatus(id, newStatus) {
    try {
      this.error = null;
      const task = this.tasks.find(t => t.id === id);
      if (task) {
        const updatedTask = { ...task, status: newStatus };
        const dbTask = await taskAPI.update(id, updatedTask);
        const transformedTask = transformTask(dbTask);
        this.tasks = this.tasks.map(t => 
          t.id === id ? transformedTask : t
        );
      }
    } catch (error) {
      console.error('Error updating task status:', error);
      this.error = 'Failed to update task status. Please try again.';
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

  _editTask(task) {
    this.editingId = task.id;
    this.formData = {
      description: task.description,
      assignedTo: task.assignedTo,
      dueDate: task.dueDate,
      status: task.status
    };
    this.showForm = true;
    this.requestUpdate();
  }

  async _deleteTask(id) {
    if (confirm('Are you sure you want to delete this task?')) {
      try {
        this.error = null;
        await taskAPI.delete(id);
        this.tasks = this.tasks.filter(t => t.id !== id);
      } catch (error) {
        console.error('Error deleting task:', error);
        this.error = 'Failed to delete task. Please try again.';
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

    select {
      background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2714%27%20height%3D%278%27%20viewBox%3D%270%200%2014%208%27%20xmlns%3D%27http%3A//www.w3.org/2000/svg%27%3E%3Cpath%20d%3D%27M1%201l6%206%206-6%27%20stroke%3D%27%238E8E93%27%20stroke-width%3D%272%27%20fill%3D%27none%27%20fill-rule%3D%27evenodd%27/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 20px center;
      padding-right: 40px;
    }

    input::placeholder, textarea::placeholder {
      color: var(--ios-gray3, #C7C7CC);
    }

    input:focus, textarea:focus, select:focus {
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

    .task-list {
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

    .task-card {
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

    .task-card:nth-child(1) { animation-delay: 0.1s; }
    .task-card:nth-child(2) { animation-delay: 0.2s; }
    .task-card:nth-child(3) { animation-delay: 0.3s; }
    .task-card:nth-child(4) { animation-delay: 0.4s; }
    .task-card:nth-child(5) { animation-delay: 0.5s; }

    .task-card:active {
      transform: scale(0.98);
      box-shadow: 0 1px 6px rgba(0, 0, 0, 0.04);
    }

    .task-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 12px;
      flex-wrap: wrap;
      gap: 8px;
    }

    .task-description {
      font-weight: 600;
      color: var(--ios-text, #000);
      font-size: 17px;
      letter-spacing: -0.3px;
      flex: 1;
      margin-right: 12px;
    }

    .status-badge {
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      backdrop-filter: blur(20px);
    }

    .status-pending {
      background-color: var(--ios-orange, #FF9500);
      color: white;
    }

    .status-sent {
      background-color: var(--ios-blue, #007AFF);
      color: white;
    }

    .status-completed {
      background-color: var(--ios-green, #34C759);
      color: white;
    }

    .task-details {
      margin-bottom: 16px;
    }

    .task-details p {
      margin: 6px 0;
      font-size: 15px;
      color: var(--ios-text-secondary, #3C3C43);
      line-height: 1.4;
    }

    .task-details strong {
      color: var(--ios-text, #000);
      font-weight: 600;
    }

    .card-actions {
      display: flex;
      gap: 12px;
      align-items: center;
      padding-top: 16px;
      border-top: 1px solid var(--ios-separator, rgba(60, 60, 67, 0.12));
    }

    .status-select {
      flex: 1;
      padding: 10px 14px;
      font-size: 15px;
      border: 1px solid var(--ios-gray4, #D1D1D6);
      border-radius: 10px;
      background-color: var(--ios-gray6, #F2F2F7);
      color: var(--ios-text, #000);
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
      -webkit-appearance: none;
      background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2714%27%20height%3D%278%27%20viewBox%3D%270%200%2014%208%27%20xmlns%3D%27http%3A//www.w3.org/2000/svg%27%3E%3Cpath%20d%3D%27M1%201l6%206%206-6%27%20stroke%3D%27%238E8E93%27%20stroke-width%3D%272%27%20fill%3D%27none%27%20fill-rule%3D%27evenodd%27/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 14px center;
      padding-right: 36px;
    }

    .status-select:focus {
      outline: none;
      border-color: var(--ios-blue, #007AFF);
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

      .task-header {
        flex-direction: column;
        gap: 8px;
      }

      .status-badge {
        align-self: flex-start;
      }
    }
  `;
}

customElements.define('task-list', TaskList);
