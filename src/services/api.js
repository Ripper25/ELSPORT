// API configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Check if we're using Netlify Functions
const isNetlifyFunctions = API_BASE_URL.includes('/.netlify/functions');

// Helper to construct the correct URL
function buildUrl(endpoint) {
  if (isNetlifyFunctions) {
    // For Netlify Functions, we need to handle the path differently
    return `${API_BASE_URL}${endpoint.replace('/api', '')}`;
  }
  return `${API_BASE_URL}${endpoint}`;
}

// Helper function for API calls
async function fetchAPI(endpoint, options = {}) {
  const response = await fetch(buildUrl(endpoint), {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'API request failed');
  }

  return response.json();
}

// Tender API methods
const tenderAPI = {
  // Get all tenders
  async getAll() {
    return fetchAPI('/tenders');
  },

  // Create a new tender
  async create(tender) {
    return fetchAPI('/tenders', {
      method: 'POST',
      body: JSON.stringify({
        tender_number: tender.tenderNumber,
        description: tender.description,
        closing_date: tender.closingDate,
        site_visits: tender.siteVisits,
      }),
    });
  },

  // Update a tender
  async update(id, tender) {
    return fetchAPI(`/tenders/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        tender_number: tender.tenderNumber,
        description: tender.description,
        closing_date: tender.closingDate,
        site_visits: tender.siteVisits,
      }),
    });
  },

  // Delete a tender
  async delete(id) {
    return fetchAPI(`/tenders/${id}`, {
      method: 'DELETE',
    });
  },
};

// Task API methods
const taskAPI = {
  // Get all tasks
  async getAll() {
    return fetchAPI('/tasks');
  },

  // Create a new task
  async create(task) {
    return fetchAPI('/tasks', {
      method: 'POST',
      body: JSON.stringify({
        description: task.description,
        assigned_to: task.assignedTo,
        due_date: task.dueDate,
        status: task.status,
      }),
    });
  },

  // Update a task
  async update(id, task) {
    return fetchAPI(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        description: task.description,
        assigned_to: task.assignedTo,
        due_date: task.dueDate,
        status: task.status,
      }),
    });
  },

  // Delete a task
  async delete(id) {
    return fetchAPI(`/tasks/${id}`, {
      method: 'DELETE',
    });
  },
};

// Helper to transform database records to frontend format
function transformTender(dbTender) {
  return {
    id: dbTender.id,
    tenderNumber: dbTender.tender_number,
    description: dbTender.description,
    closingDate: dbTender.closing_date,
    siteVisits: dbTender.site_visits,
    createdAt: dbTender.created_at,
  };
}

function transformTask(dbTask) {
  return {
    id: dbTask.id,
    description: dbTask.description,
    assignedTo: dbTask.assigned_to,
    dueDate: dbTask.due_date,
    status: dbTask.status,
    createdAt: dbTask.created_at,
  };
}

// Export all APIs and helpers
export { tenderAPI, taskAPI, transformTender, transformTask };
