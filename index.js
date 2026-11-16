import { eventSource, event_types } from '/script.js';
import { getContext } from '/scripts/extensions.js';

// ─── Patterns ──────────────────────────────────────────────────────────────────

const HUD_RE = /`?\[\s*🌐\s*HUD\s*:?\s*([^\]]*)\]`?/;

const IM_RE = /💭 Inner Monologue\s*\n+\s*\*([\s\S]*?)\*(?=\s*(?:\n|$))/;

const STATS_RE = /📊 STATS\s*\n+\s*Trust:\s*(\d{1,3})\s*\n+\s*Tension:\s*(\d{1,3})\s*\n+\s*Attraction:\s*(\d{1,3})\s*\n+\s*Loyalty:\s*(\d{1,3})\s*\n+\s*Emotion:\s*([^\n]+?)\s*\n+\s*([^\n]+?)\s+Virginity:\s*([^\n]+?)\s*\n+\s*([^\n]+?)\s+Virginity:\s*([^\n]+?)\s*\n+\s*([^\n]+?)\s+Status:\s*([^\n]+?)\s*\n+\s*([^\n]+?)\s+Status:\s*([^\n]+?)\s*\n+\s*Current Dynamic:\s*([^\n]+)/;

// ─── HTML builders ─────────────────────────────────────────────────────────────

function buildHUDHTML(content) {
    return `<div style="background:rgba(14,116,144,.15);border:1px solid rgba(103,232,249,.35);border-radius:10px;padding:8px 12px;margin:4px 0;width:100%;box-sizing:border-box;"><div style="font-weight:700;color:#67e8f9;font-size:.82em;margin-bottom:3px;">🌐 HUD</div><div style="font-family:monospace;font-size:.82em;color:#a5f3fc;">${content.trim()}</div></div>`;
}

function buildIMHTML(rawContent) {
    const content = rawContent
        .replace(/\*\*([^*\n]+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*\n<>]+?)\*/g, '<em>$1</em>');
    return `<div style="background:rgba(120,53,15,.15);border:1px solid rgba(234,88,12,.35);border-radius:10px;padding:8px 12px;margin:4px 0;width:100%;box-sizing:border-box;"><div style="font-weight:700;color:#fb923c;font-size:.82em;margin-bottom:3px;">💭 Inner Monologue</div><div style="font-style:italic;color:#fde68a;font-size:.88em;line-height:1.5;">${content}</div></div>`;
}

function buildStatsHTML(t, ten, att, loy, emo, v1n, v1, v2n, v2, s1n, s1, s2n, s2, dyn) {
    const bar = (val, grad) =>
        `<div style="flex:1;height:5px;border-radius:3px;background:rgba(255,255,255,.1);overflow:hidden;"><div style="height:100%;width:${val}%;background:${grad};border-radius:3px;"></div></div>`;
    const row = (label, val, grad) =>
        `<div style="display:flex;align-items:center;gap:6px;"><span style="flex:0 0 90px;font-weight:700;color:#c4b5fd;">${label}</span>${bar(val, grad)}<span style="color:#ede9fe;min-width:24px;text-align:right;">${val}</span></div>`;
    return (
        `<div style="background:rgba(46,16,101,.18);border:1px solid rgba(109,40,217,.4);border-radius:10px;padding:8px 12px;margin:4px 0;color:#d4c8f0;font-family:inherit;font-size:.8em;">` +
        `<div style="font-weight:700;color:#c4b5fd;letter-spacing:.5px;margin-bottom:5px;">📊 STATS</div>` +
        `<div style="display:flex;flex-direction:column;gap:3px;">` +
        row('TRUST',      t,   'linear-gradient(90deg,#22d3ee,#0891b2)') +
        row('TENSION',    ten, 'linear-gradient(90deg,#fb923c,#ea580c)') +
        row('ATTRACTION', att, 'linear-gradient(90deg,#f472b6,#db2777)') +
        row('LOYALTY',    loy, 'linear-gradient(90deg,#a78bfa,#7c3aed)') +
        `</div>` +
        `<div style="margin-top:5px;padding-top:4px;border-top:1px solid rgba(124,58,237,.25);display:flex;flex-direction:column;gap:2px;">` +
        `<div><b style="color:#c4b5fd;">${v1n}</b> Virginity: ${v1}</div>` +
        `<div><b style="color:#c4b5fd;">${v2n}</b> Virginity: ${v2}</div>` +
        `<div><b style="color:#c4b5fd;">${s1n}</b> Status: ${s1}</div>` +
        `<div><b style="color:#c4b5fd;">${s2n}</b> Status: ${s2}</div>` +
        `<div>Emotion: <span style="color:#ede9fe;">${emo.trim()}</span></div>` +
        `<div>Current Dynamic: <b style="color:#ede9fe;">${dyn.trim()}</b></div>` +
        `</div></div>`
    );
}

// ─── Details styles ─────────────────────────────────────────────────────────────

const DETAILS_STYLES = {
    '🎲': {
        emoji:   '🎲',
        wrapper: 'margin:4px 2px;display:inline-block;vertical-align:top;',
        summary: 'list-style:none;display:inline-flex;align-items:center;justify-content:center;padding:4px 10px;background:#450a0a;border:1px solid #991b1b;border-radius:16px;font-size:1.15em;cursor:pointer;user-select:none;',
        content: 'margin-top:5px;padding:7px 10px;background:#1a0808;border:1px solid #7f1d1d;border-radius:8px;color:#fca5a5;font-size:.82em;',
    },
    '🔫': {
        emoji:   '🔫🌎',
        wrapper: 'margin:4px 2px;display:inline-block;vertical-align:top;',
        summary: 'list-style:none;display:inline-flex;align-items:center;justify-content:center;padding:4px 10px;background:#051a14;border:1px solid #0f766e;border-radius:16px;font-size:1.15em;cursor:pointer;user-select:none;',
        content: 'margin-top:5px;padding:7px 10px;background:#081a14;border:1px solid #0f766e;border-radius:8px;color:#99f6e4;font-size:.82em;',
    },
    '🎭': {
        emoji:   '🎭',
        wrapper: 'margin:4px 2px;display:inline-block;vertical-align:top;',
        summary: 'list-style:none;display:inline-flex;align-items:center;justify-content:center;padding:4px 10px;background:#050c1f;border:1px solid #1e3a8a;border-radius:16px;font-size:1.15em;cursor:pointer;user-select:none;',
        content: 'margin-top:5px;padding:7px 10px;background:#060d1f;border:1px solid #1e40af;border-radius:8px;color:#93c5fd;font-size:.82em;',
    },
};

function styleDetails(details) {
    const summary = details.querySelector('summary');
    if (!summary) return;
    const sumText = summary.textContent || '';
    let style = null;
    for (const [trigger, s] of Object.entries(DETAILS_STYLES)) {
        if (sumText.includes(trigger)) { style = s; break; }
    }
    if (!style) return;

    details.style.cssText = style.wrapper;
    summary.style.cssText = style.summary;
    summary.textContent   = style.emoji;

    let contentDiv = details.querySelector(':scope > div');
    if (!contentDiv) {
        contentDiv = document.createElement('div');
        const frag = document.createDocumentFragment();
        Array.from(details.childNodes).filter(n => n !== summary).forEach(n => frag.appendChild(n));
        contentDiv.appendChild(frag);
        details.appendChild(contentDiv);
    }
    contentDiv.style.cssText = style.content;
}

// ─── DOM surgery ────────────────────────────────────────────────────────────────

// Remove all direct child nodes of mesEl that belong to a tracker block.
// Collects from the first node whose textContent includes startMarker through
// the first node whose textContent includes endMarker (or the first node if no endMarker).
// Works for both styled divs (textContent traverses descendants) and raw <p> nodes.
function removeRawBlock(mesEl, startMarker, endMarker = null) {
    const toRemove = [];
    let collecting = false;

    for (const node of Array.from(mesEl.childNodes)) {
        const text = node.textContent || '';
        if (!collecting && text.includes(startMarker)) {
            collecting = true;
            toRemove.push(node);
            if (!endMarker || text.includes(endMarker)) break;
        } else if (collecting) {
            toRemove.push(node);
            if (!endMarker || text.includes(endMarker)) break;
        }
    }

    toRemove.forEach(n => n.parentNode?.removeChild(n));
}

function appendHTML(mesEl, html) {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    const el = temp.firstElementChild;
    if (el) mesEl.appendChild(el);
    return el;
}

// ─── Per-tracker processors ─────────────────────────────────────────────────────

function processHUD(mesEl, raw) {
    const m = raw.match(HUD_RE);
    if (!m) return;
    removeRawBlock(mesEl, '🌐 HUD');
    appendHTML(mesEl, buildHUDHTML(m[1]));
}

function processIM(mesEl, raw) {
    const m = raw.match(IM_RE);
    if (!m) return;
    removeRawBlock(mesEl, '💭 Inner Monologue');
    appendHTML(mesEl, buildIMHTML(m[1]));
}

function processStats(mesEl, raw) {
    const m = raw.match(STATS_RE);
    if (!m) return;
    removeRawBlock(mesEl, '📊 STATS', 'Current Dynamic');
    appendHTML(mesEl, buildStatsHTML(...m.slice(1)));
}

function processDetails(mesEl) {
    for (const details of mesEl.querySelectorAll('details')) {
        styleDetails(details);
    }
}

// ─── Ordering ──────────────────────────────────────────────────────────────────

const TRACKER_SEQUENCE = ['hud', 'im', 'stats', 'dnd', 'chekhov', 'sprite'];

function getTrackerKey(el) {
    if (el.tagName === 'DETAILS') {
        const sumText = el.querySelector('summary')?.textContent || '';
        if (sumText.includes('🎲')) return 'dnd';
        if (sumText.includes('🔫')) return 'chekhov';
        if (sumText.includes('🎭')) return 'sprite';
        return null;
    }
    const headerText = el.querySelector(':scope > div')?.textContent || '';
    if (headerText.includes('🌐 HUD'))             return 'hud';
    if (headerText.includes('💭 Inner Monologue')) return 'im';
    if (headerText.includes('📊 STATS'))           return 'stats';
    return null;
}

function enforceOrder(mesEl) {
    const found = {};
    for (const child of mesEl.children) {
        const key = getTrackerKey(child);
        if (key && !found[key]) found[key] = child;
    }

    const present = TRACKER_SEQUENCE.filter(k => found[k]);
    if (present.length < 1) return;

    if (found.hud) mesEl.prepend(found.hud);
    for (const key of ['im', 'stats', 'dnd', 'chekhov', 'sprite']) {
        if (found[key]) mesEl.appendChild(found[key]);
    }
}

// ─── Main ───────────────────────────────────────────────────────────────────────

function fixMessage(messageId) {
    const context = getContext();
    if (!context?.chat?.[messageId]) return;
    if (context.chat[messageId].is_user) return;

    const mesEl = document.querySelector(`#chat .mes[mesid="${messageId}"] .mes_text`);
    if (!mesEl) return;

    const raw = context.chat[messageId].mes;

    processHUD(mesEl, raw);
    processIM(mesEl, raw);
    processStats(mesEl, raw);
    processDetails(mesEl);
    enforceOrder(mesEl);
}

// ─── Events ─────────────────────────────────────────────────────────────────────

function onMessageRendered(messageId) {
    requestAnimationFrame(() => fixMessage(messageId));
}

async function onChatLoaded() {
    await new Promise(r => setTimeout(r, 800));
    for (const mesEl of document.querySelectorAll('#chat .mes[mesid]')) {
        const id = parseInt(mesEl.getAttribute('mesid'), 10);
        if (!isNaN(id)) fixMessage(id);
    }
}

// ─── Init ────────────────────────────────────────────────────────────────────────

export async function init() {
    eventSource.on(event_types.CHARACTER_MESSAGE_RENDERED, onMessageRendered);
    eventSource.on(event_types.CHAT_CHANGED, onChatLoaded);
    console.log('[message-fixer] SR Message Fixer v2.0 initialized — regex-free');
}
