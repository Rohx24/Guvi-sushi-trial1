function stripCodeFences(text) {
  const s = String(text ?? '');
  // Extract the first fenced block if present; otherwise return original.
  const fenceMatch = s.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenceMatch && fenceMatch[1]) return fenceMatch[1].trim();
  return s.trim();
}

function findBalancedJsonSubstring(s, startIdx) {
  const open = s[startIdx];
  const close = open === '{' ? '}' : open === '[' ? ']' : null;
  if (!close) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = startIdx; i < s.length; i++) {
    const ch = s[i];

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === '\\\\') {
        escaped = true;
        continue;
      }
      if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === open) depth++;
    if (ch === close) depth--;

    if (depth === 0) {
      return s.slice(startIdx, i + 1);
    }
  }

  return null;
}

function extractFirstJsonValue(text) {
  const cleaned = stripCodeFences(text);
  if (!cleaned) return null;

  // Scan for the first parseable JSON object/array.
  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (ch !== '{' && ch !== '[') continue;

    const candidate = findBalancedJsonSubstring(cleaned, i);
    if (!candidate) continue;

    try {
      return JSON.parse(candidate);
    } catch {
      // Keep scanning.
    }
  }

  return null;
}

module.exports = {
  stripCodeFences,
  extractFirstJsonValue,
};

