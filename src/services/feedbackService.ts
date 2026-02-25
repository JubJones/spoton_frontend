// src/services/feedbackService.ts
// Lightweight local persistence for user feedback submissions

export interface SubmitFeedbackPayload {
  message: string;
  contact?: string;
}

export interface FeedbackEntry extends SubmitFeedbackPayload {
  id: string;
  createdAt: string;
}

const STORAGE_KEY = 'spoton.feedback.entries';
const MAX_ENTRIES = 50;
let inMemoryFallback: FeedbackEntry[] = [];

const hasWindowStorage = () => typeof window !== 'undefined' && typeof localStorage !== 'undefined';

const readEntries = (): FeedbackEntry[] => {
  if (!hasWindowStorage()) {
    return inMemoryFallback;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as FeedbackEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('Failed to read feedback entries:', error);
    return [];
  }
};

const persistEntries = (entries: FeedbackEntry[]) => {
  if (!hasWindowStorage()) {
    inMemoryFallback = entries;
    return;
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch (error) {
    console.warn('Failed to persist feedback entries:', error);
    inMemoryFallback = entries;
  }
};

const generateId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `feedback-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

export const feedbackService = {
  async submitFeedback(payload: SubmitFeedbackPayload): Promise<FeedbackEntry> {
    const trimmedMessage = payload.message.trim();

    if (!trimmedMessage) {
      throw new Error('Feedback message cannot be empty');
    }

    const newEntry: FeedbackEntry = {
      id: generateId(),
      message: trimmedMessage,
      contact: payload.contact?.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    const existing = readEntries();
    const nextEntries = [newEntry, ...existing].slice(0, MAX_ENTRIES);
    persistEntries(nextEntries);
    return newEntry;
  },

  async listFeedback(): Promise<FeedbackEntry[]> {
    return readEntries();
  },

  async clearFeedback(): Promise<void> {
    persistEntries([]);
  }
};

export default feedbackService;
