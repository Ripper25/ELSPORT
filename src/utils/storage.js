// Storage utility for persisting data
const STORAGE_KEYS = {
  TENDERS: 'elsport_tenders',
  TASKS: 'elsport_tasks'
};

export const storage = {
  // Tender operations
  getTenders: () => {
    try {
      const tenders = localStorage.getItem(STORAGE_KEYS.TENDERS);
      return tenders ? JSON.parse(tenders) : [];
    } catch (error) {
      console.error('Error loading tenders:', error);
      return [];
    }
  },

  saveTenders: (tenders) => {
    try {
      localStorage.setItem(STORAGE_KEYS.TENDERS, JSON.stringify(tenders));
      return true;
    } catch (error) {
      console.error('Error saving tenders:', error);
      return false;
    }
  },

  // Task operations
  getTasks: () => {
    try {
      const tasks = localStorage.getItem(STORAGE_KEYS.TASKS);
      return tasks ? JSON.parse(tasks) : [];
    } catch (error) {
      console.error('Error loading tasks:', error);
      return [];
    }
  },

  saveTasks: (tasks) => {
    try {
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
      return true;
    } catch (error) {
      console.error('Error saving tasks:', error);
      return false;
    }
  },

  // Clear all data
  clearAll: () => {
    localStorage.removeItem(STORAGE_KEYS.TENDERS);
    localStorage.removeItem(STORAGE_KEYS.TASKS);
  }
};
