/**
 * Bolt AI Assist — Gemini Service
 * Adapted from bolt-ai-assist/src/services/geminiService.ts
 *
 * Routes all AI calls through /api/chat (server-side) so the API key
 * is never exposed in frontend code.
 * Manages localStorage persistence for conversation history.
 */

(function(global) {
  'use strict';

  var STORAGE_KEY = 'bolt_chat_history';

  var BoltChatService = {

    /** Save the full history array to localStorage */
    saveHistory: function(history) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
      } catch (e) {
        console.warn('[BoltAI] Failed to save history:', e);
      }
    },

    /** Load history from localStorage; returns [] if nothing stored */
    loadHistory: function() {
      try {
        var raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
      } catch (e) {
        return [];
      }
    },

    /** Erase all saved history */
    clearHistory: function() {
      try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
    },

    /**
     * Send the conversation history to /api/chat and return the AI reply string.
     * @param {Array<{role: 'user'|'model', text: string}>} history
     * @returns {Promise<string>}
     */
    sendMessage: async function(history) {
      var response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history: history })
      });
      if (!response.ok) {
        var errData = {};
        try { errData = await response.json(); } catch (_) {}
        throw new Error(errData.error || 'Server error ' + response.status);
      }
      var data = await response.json();
      return data.reply || '';
    }
  };

  global.BoltChatService = BoltChatService;

})(typeof window !== 'undefined' ? window : this);
