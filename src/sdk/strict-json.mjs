function error(code, path, offset) {
  const value = new SyntaxError(code);
  value.code = code;
  value.path = path;
  value.offset = offset;
  return value;
}

export function parseStrictJson(text, limits = {}) {
  if (typeof text !== "string") throw new TypeError("JSON input must be text");
  const maximumBytes = limits.maximumBytes ?? 10 * 1024 * 1024;
  const maximumDepth = limits.maximumDepth ?? 64;
  const maximumStringLength = limits.maximumStringLength ?? 1024 * 1024;
  if (new TextEncoder().encode(text).length > maximumBytes) throw error("JSON_RESOURCE_LIMIT", "", 0);
  let index = 0;
  const whitespace = () => { while (/\s/u.test(text[index] ?? "")) index += 1; };
  const string = (path) => {
    if (text[index] !== '"') throw error("JSON_STRING_EXPECTED", path, index);
    const start = index++;
    let escaped = false;
    while (index < text.length) {
      const char = text[index++];
      if (!escaped && char === '"') {
        const raw = text.slice(start, index);
        let value;
        try { value = JSON.parse(raw); } catch { throw error("JSON_STRING_INVALID", path, start); }
        if ([...value].length > maximumStringLength) throw error("JSON_RESOURCE_LIMIT", path, start);
        return value;
      }
      if (!escaped && char === "\\") escaped = true;
      else escaped = false;
      if (!escaped && char < " ") throw error("JSON_STRING_INVALID", path, index - 1);
    }
    throw error("JSON_UNTERMINATED_STRING", path, start);
  };
  const value = (path, depth) => {
    if (depth > maximumDepth) throw error("JSON_RESOURCE_LIMIT", path, index);
    whitespace();
    if (text[index] === "{") {
      index += 1; whitespace(); const object = {}; const names = new Set();
      if (text[index] === "}") { index += 1; return object; }
      while (index < text.length) {
        const name = string(path); if (names.has(name)) throw error("JSON_DUPLICATE_MEMBER", `${path}/${name.replaceAll("~", "~0").replaceAll("/", "~1")}`, index); names.add(name);
        whitespace(); if (text[index++] !== ":") throw error("JSON_COLON_EXPECTED", path, index - 1);
        const childPath = `${path}/${name.replaceAll("~", "~0").replaceAll("/", "~1")}`;
        object[name] = value(childPath, depth + 1); whitespace();
        if (text[index] === "}") { index += 1; return object; }
        if (text[index++] !== ",") throw error("JSON_COMMA_EXPECTED", path, index - 1); whitespace();
      }
      throw error("JSON_UNTERMINATED_OBJECT", path, index);
    }
    if (text[index] === "[") {
      index += 1; whitespace(); const array = [];
      if (text[index] === "]") { index += 1; return array; }
      while (index < text.length) { array.push(value(`${path}/${array.length}`, depth + 1)); whitespace(); if (text[index] === "]") { index += 1; return array; } if (text[index++] !== ",") throw error("JSON_COMMA_EXPECTED", path, index - 1); }
      throw error("JSON_UNTERMINATED_ARRAY", path, index);
    }
    if (text[index] === '"') return string(path);
    const rest = text.slice(index); const token = /^(?:true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/u.exec(rest)?.[0];
    if (!token) throw error("JSON_VALUE_INVALID", path, index);
    index += token.length; const parsed = JSON.parse(token); if (typeof parsed === "number" && !Number.isFinite(parsed)) throw error("JSON_NUMBER_INVALID", path, index - token.length); return parsed;
  };
  const parsed = value("", 0); whitespace(); if (index !== text.length) throw error("JSON_TRAILING_DATA", "", index); return parsed;
}
