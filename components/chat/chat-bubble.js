/**
 * Bolt AI Assist — Floating Chat Bubble
 * Self-contained; no external dependencies required at runtime.
 *
 * Injects a persistent ⚡ bubble in the bottom-right of every page
 * except /assistant. Chat history is persisted to localStorage so
 * clicking "Expand to Full View" seamlessly continues the conversation
 * on assistant.html.
 */

(function() {
    'use strict';

    // Don't render on the assistant page itself
    var path = window.location.pathname;
    if (path.indexOf('assistant') !== -1) return;

    var STORAGE_KEY = 'bolt_chat_history';
    var history = [];
    var isOpen = false;
    var isLoading = false;

    /* ── Storage helpers ─────────────────────────────────────────── */

    function loadHistory() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (e) { return []; }
    }

    function saveHistory() {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(history)); } catch (e) {}
    }

    function clearHistory() {
        history = [];
        try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
    }

    /* ── DOM build ───────────────────────────────────────────────── */

    function buildBubble() {
        var wrap = document.createElement('div');
        wrap.id = 'bolt-bubble-wrap';

        var win = document.createElement('div');
        win.id = 'bolt-chat-window';
        win.className = 'bolt-hidden';
        win.innerHTML =
            '<div class="boltcw-header">' +
            '  <div class="boltcw-title">' +
            '    <span class="boltcw-title-icon">⚡</span>' +
            '    <span>Bolt AI Assist</span>' +
            '  </div>' +
            '  <div class="boltcw-actions">' +
            '    <button class="boltcw-action-btn boltcw-expand-btn" id="boltcw-expand" title="Open full assistant">⤢ Full View</button>' +
            '    <button class="boltcw-action-btn" id="boltcw-clear" title="Clear conversation">↺</button>' +
            '    <button class="boltcw-action-btn" id="boltcw-close" title="Close">✕</button>' +
            '  </div>' +
            '</div>' +
            '<div class="boltcw-messages" id="boltcw-messages"></div>' +
            '<div class="boltcw-input-area">' +
            '  <textarea class="boltcw-input" id="boltcw-input" placeholder="Ask about any equipment…" rows="1" autocomplete="off"></textarea>' +
            '  <button class="boltcw-send-btn" id="boltcw-send" title="Send">➤</button>' +
            '</div>';

        var btn = document.createElement('button');
        btn.id = 'bolt-bubble-btn';
        btn.title = 'Bolt AI Assist';
        btn.innerHTML =
            '<span>⚡</span>' +
            '<span class="bolt-unread-badge" id="bolt-unread" style="display:none;">•</span>';

        wrap.appendChild(win);
        wrap.appendChild(btn);
        document.body.appendChild(wrap);
    }

    /* ── Render helpers ──────────────────────────────────────────── */

    function escHtml(str) {
        var d = document.createElement('div');
        d.appendChild(document.createTextNode(str));
        return d.innerHTML;
    }

    function renderMessages() {
        var el = document.getElementById('boltcw-messages');
        if (!el) return;

        if (history.length === 0) {
            el.innerHTML =
                '<div class="boltcw-welcome">' +
                '  <div class="boltcw-welcome-icon">⚡</div>' +
                '  <h4>Bolt AI Assist</h4>' +
                '  <p>Ask me about serial numbers, equipment age, specifications, or replacement values.</p>' +
                '</div>';
            return;
        }

        el.innerHTML = history.map(function(msg) {
            return '<div class="bolt-msg bolt-msg-' + msg.role + '">' +
                escHtml(msg.text).replace(/\n/g, '<br>') +
                '</div>';
        }).join('');

        el.scrollTop = el.scrollHeight;
    }

    function showTyping() {
        var el = document.getElementById('boltcw-messages');
        if (!el) return;
        var t = document.createElement('div');
        t.id = 'bolt-typing-ind';
        t.className = 'bolt-msg bolt-msg-typing';
        t.innerHTML = '<div class="bolt-typing-dots"><span></span><span></span><span></span></div>';
        el.appendChild(t);
        el.scrollTop = el.scrollHeight;
    }

    function hideTyping() {
        var t = document.getElementById('bolt-typing-ind');
        if (t) t.parentNode.removeChild(t);
    }

    /* ── Open / close ────────────────────────────────────────────── */

    function openChat() {
        isOpen = true;
        document.getElementById('bolt-chat-window').classList.remove('bolt-hidden');
        document.getElementById('bolt-bubble-btn').classList.add('is-open');
        document.getElementById('bolt-unread').style.display = 'none';
        renderMessages();
        setTimeout(function() {
            var inp = document.getElementById('boltcw-input');
            if (inp) inp.focus();
        }, 80);
    }

    function closeChat() {
        isOpen = false;
        document.getElementById('bolt-chat-window').classList.add('bolt-hidden');
        document.getElementById('bolt-bubble-btn').classList.remove('is-open');
    }

    function toggleChat() { if (isOpen) closeChat(); else openChat(); }

    /* ── Send message ────────────────────────────────────────────── */

    async function submit() {
        var inputEl = document.getElementById('boltcw-input');
        var sendBtn = document.getElementById('boltcw-send');
        var text = (inputEl.value || '').trim();
        if (!text || isLoading) return;

        inputEl.value = '';
        inputEl.style.height = 'auto';
        isLoading = true;
        sendBtn.disabled = true;

        history.push({ role: 'user', text: text });
        saveHistory();
        renderMessages();
        showTyping();

        try {
            var res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ history: history })
            });

            var data = {};
            try { data = await res.json(); } catch (_) {}
            hideTyping();

            if (!res.ok) throw new Error(data.error || 'Server error ' + res.status);

            history.push({ role: 'model', text: data.reply || '' });
            saveHistory();
            renderMessages();

            if (!isOpen) {
                var badge = document.getElementById('bolt-unread');
                if (badge) { badge.textContent = '•'; badge.style.display = 'flex'; }
            }
        } catch (err) {
            console.error('[BoltAI]', err);
            hideTyping();
            history.push({ role: 'model', text: 'Something went wrong. Please try again.' });
            saveHistory();
            renderMessages();
        }

        isLoading = false;
        sendBtn.disabled = false;
        var inp = document.getElementById('boltcw-input');
        if (inp) inp.focus();
    }

    /* ── Wire up events ──────────────────────────────────────────── */

    function init() {
        history = loadHistory();
        buildBubble();

        document.getElementById('bolt-bubble-btn').addEventListener('click', toggleChat);
        document.getElementById('boltcw-close').addEventListener('click', closeChat);
        document.getElementById('boltcw-send').addEventListener('click', submit);

        document.getElementById('boltcw-expand').addEventListener('click', function() {
            saveHistory();
            window.location.href = 'assistant.html';
        });

        document.getElementById('boltcw-clear').addEventListener('click', function() {
            clearHistory();
            renderMessages();
        });

        var inputEl = document.getElementById('boltcw-input');
        inputEl.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submit();
            }
        });
        inputEl.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 100) + 'px';
        });

        // Show badge if prior history exists
        if (history.length > 0) {
            var badge = document.getElementById('bolt-unread');
            if (badge) { badge.textContent = '•'; badge.style.display = 'flex'; }
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
