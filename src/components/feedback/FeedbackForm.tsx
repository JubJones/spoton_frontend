// src/components/feedback/FeedbackForm.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { MessageCircle, Send } from 'lucide-react';
import feedbackService, { FeedbackEntry } from '../../services/feedbackService';

const MAX_RECENTS = 5;

const FeedbackForm: React.FC = () => {
  const [message, setMessage] = useState('');
  const [contact, setContact] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<FeedbackEntry[]>([]);
  const [lastSubmittedId, setLastSubmittedId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    feedbackService
      .listFeedback()
      .then((stored) => {
        if (mounted) {
          setEntries(stored);
        }
      })
      .catch((err) => {
        console.warn('Failed to load feedback entries', err);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const recentEntries = useMemo(() => entries.slice(0, MAX_RECENTS), [entries]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!message.trim()) {
      setError('Please enter some feedback before sending.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const entry = await feedbackService.submitFeedback({
        message,
        contact: contact.trim() || undefined,
      });

      setEntries((prev) => [entry, ...prev]);
      setMessage('');
      setLastSubmittedId(entry.id);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unable to send feedback. Please try again.';
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-gray-900/80 to-gray-900 border border-gray-800 rounded-2xl p-8 shadow-xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center border border-orange-500/30">
          <MessageCircle className="w-6 h-6 text-orange-400" />
        </div>
        <div>
          <h2 className="text-2xl font-semibold">We'd love your feedback</h2>
          <p className="text-sm text-gray-400">Share issues, ideas, or anything that could make SpotOn better.</p>
        </div>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="flex flex-col gap-2 text-sm text-gray-300" htmlFor="feedback-message">
          Message
          <textarea
            id="feedback-message"
            className="bg-black/30 border border-gray-700 rounded-xl px-4 py-3 text-base text-white focus:outline-none focus:ring-2 focus:ring-orange-500 min-h-[120px]"
            placeholder="Let us know what you think..."
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            disabled={submitting}
            required
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-gray-300" htmlFor="feedback-contact">
          Contact (optional)
          <input
            id="feedback-contact"
            type="text"
            className="bg-black/30 border border-gray-700 rounded-xl px-4 py-3 text-base text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            placeholder="Email, Slack handle, etc."
            value={contact}
            onChange={(event) => setContact(event.target.value)}
            disabled={submitting}
            autoComplete="email"
          />
        </label>

        {error && <p className="text-sm text-red-400" role="alert">{error}</p>}

        {lastSubmittedId && !error && (
          <p className="text-sm text-green-400">Thanks! Your feedback was saved locally.</p>
        )}

        <button
          type="submit"
          className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-400 focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 focus:ring-offset-gray-900 text-black font-semibold px-6 py-3 rounded-xl transition disabled:opacity-50"
          disabled={submitting}
        >
          <Send className="w-4 h-4" />
          {submitting ? 'Sending...' : 'Send Feedback'}
        </button>
      </form>

      {recentEntries.length > 0 && (
        <div className="mt-8">
          <p className="text-sm text-gray-400 mb-3">Recent feedback (stored locally on this browser):</p>
          <ul className="space-y-3">
            {recentEntries.map((entry) => (
              <li
                key={entry.id}
                className="bg-black/30 border border-gray-800 rounded-xl px-4 py-3 text-sm text-gray-300"
              >
                <p className="whitespace-pre-line text-gray-100 mb-1">{entry.message}</p>
                <div className="flex flex-wrap text-xs text-gray-500 gap-3">
                  <span>{new Date(entry.createdAt).toLocaleString()}</span>
                  {entry.contact && <span>Contact: {entry.contact}</span>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default FeedbackForm;
