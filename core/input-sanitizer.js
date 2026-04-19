import { NODE_TYPES } from './graph-utils.js';

export const ALLOWED_NODE_TYPES = new Set(Object.values(NODE_TYPES));
const MAX_EVENT_ID_LENGTH = 64;
const MAX_NODE_ID_LENGTH = 64;
const MAX_STRING_PARAM_LENGTH = 128;
const SAFE_ID_PATTERN = /^[A-Za-z0-9_.:-]+$/;
const SAFE_TEXT_PATTERN = /^[\p{L}\p{N}\s_.:\-\/()#]+$/u;

function normalizePlainString(raw, { maxLength = MAX_STRING_PARAM_LENGTH, pattern = SAFE_TEXT_PATTERN } = {}) {
  const text = String(raw ?? '').trim().slice(0, maxLength);
  if (!text) return '';
  const filtered = text.replace(/[<>`"'\\]/g, '');
  return pattern.test(filtered) ? filtered : filtered.replace(/[^\p{L}\p{N}\s_.:\-\/()#]/gu, '');
}

export function normalizeEventId(raw, fallback = 'event_1') {
  const text = String(raw ?? '').trim().slice(0, MAX_EVENT_ID_LENGTH);
  if (!text) return fallback;
  if (!SAFE_ID_PATTERN.test(text)) return fallback;
  return text;
}

export function normalizeNodeId(raw, fallback = 'node_1') {
  const text = String(raw ?? '').trim().slice(0, MAX_NODE_ID_LENGTH);
  if (!text) return fallback;
  if (!SAFE_ID_PATTERN.test(text)) return fallback;
  return text;
}

export function normalizeNodeType(raw, fallback = NODE_TYPES.spawn) {
  const type = String(raw ?? '').trim();
  return ALLOWED_NODE_TYPES.has(type) ? type : fallback;
}

export function normalizeStringParam(raw, fallback = '') {
  const normalized = normalizePlainString(raw);
  return normalized || fallback;
}

export function normalizeUnsafePayload(raw, fallback = '') {
  const text = String(raw ?? '');
  if (/[<>]|javascript:|on\w+=/i.test(text)) return fallback;
  return normalizePlainString(text);
}

export function sanitizeParams(rawParams = {}) {
  const out = {};
  Object.entries(rawParams || {}).forEach(([key, value]) => {
    if (typeof value === 'string') {
      out[key] = normalizeUnsafePayload(value, '');
      return;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      out[key] = value;
      return;
    }
    out[key] = '';
  });
  return out;
}
