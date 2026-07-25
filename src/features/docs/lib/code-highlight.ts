/**
 * A small, dependency-free syntax tokenizer — this project doesn't have
 * Shiki/Prism installed and this phase doesn't add new runtime dependencies
 * (consistent with every prior phase), so "beautiful syntax highlighting"
 * is a real, hand-built regex tokenizer instead. It covers the language set
 * this docs portal actually uses (JS/TS/TSX/JSON/bash/python/http) with
 * comment/string/keyword/number/function-call/punctuation classification —
 * not exhaustive language-spec-correct parsing, but genuinely tokenized,
 * not a static color splash.
 */

import type { CodeLanguage } from "../types";

export type TokenType =
  | "comment"
  | "string"
  | "keyword"
  | "number"
  | "function"
  | "punctuation"
  | "tag"
  | "property"
  | "plain";

export interface Token {
  text: string;
  type: TokenType;
}

const JS_KEYWORDS = new Set([
  "const",
  "let",
  "var",
  "function",
  "return",
  "import",
  "export",
  "from",
  "default",
  "async",
  "await",
  "new",
  "class",
  "extends",
  "if",
  "else",
  "for",
  "while",
  "try",
  "catch",
  "finally",
  "throw",
  "typeof",
  "instanceof",
  "interface",
  "type",
  "implements",
  "public",
  "private",
  "protected",
  "readonly",
  "void",
  "true",
  "false",
  "null",
  "undefined",
  "this",
  "of",
  "in",
  "as",
  "extends",
  "enum",
  "namespace",
  "declare",
  "static",
  "get",
  "set",
  "yield",
  "case",
  "break",
  "continue",
  "switch",
  "do",
]);

const PY_KEYWORDS = new Set([
  "def",
  "class",
  "return",
  "import",
  "from",
  "as",
  "if",
  "elif",
  "else",
  "for",
  "while",
  "try",
  "except",
  "finally",
  "raise",
  "with",
  "async",
  "await",
  "True",
  "False",
  "None",
  "self",
  "in",
  "is",
  "not",
  "and",
  "or",
  "lambda",
  "yield",
  "pass",
  "break",
  "continue",
  "global",
  "print",
]);

const BASH_KEYWORDS = new Set([
  "npm",
  "yarn",
  "pnpm",
  "bun",
  "npx",
  "install",
  "add",
  "run",
  "cd",
  "echo",
  "export",
  "if",
  "then",
  "fi",
  "for",
  "do",
  "done",
  "curl",
  "sudo",
]);

const HTTP_METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]);

function keywordsFor(language: CodeLanguage): Set<string> {
  switch (language) {
    case "python":
      return PY_KEYWORDS;
    case "bash":
      return BASH_KEYWORDS;
    case "javascript":
    case "typescript":
    case "tsx":
    case "jsx":
      return JS_KEYWORDS;
    default:
      return new Set();
  }
}

const MASTER_PATTERN =
  /(\/\/[^\n]*)|(#[^\n]*)|(\/\*[\s\S]*?\*\/)|("""[\s\S]*?"""|'''[\s\S]*?''')|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_$][\w$]*(?=\())|([A-Za-z_$][\w$.]*)|([{}()[\];,.:<>=+\-*/%!&|?~^]+)/g;

/** Tokenizes a single line of code for the given language into typed spans, ready to render with per-type CSS classes. */
export function tokenizeLine(line: string, language: CodeLanguage): Token[] {
  if (language === "json") return tokenizeJson(line);

  const keywords = keywordsFor(language);
  const tokens: Token[] = [];
  let lastIndex = 0;
  MASTER_PATTERN.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = MASTER_PATTERN.exec(line))) {
    if (match.index > lastIndex) {
      tokens.push({ text: line.slice(lastIndex, match.index), type: "plain" });
    }
    const [
      full,
      lineComment,
      hashComment,
      blockComment,
      tripleString,
      str,
      num,
      fnCall,
      ident,
      punct,
    ] = match;
    if (lineComment || hashComment || blockComment) {
      tokens.push({ text: full, type: "comment" });
    } else if (tripleString || str) {
      tokens.push({ text: full, type: "string" });
    } else if (num) {
      tokens.push({ text: full, type: "number" });
    } else if (fnCall) {
      tokens.push({ text: full, type: "function" });
    } else if (ident) {
      if (keywords.has(ident) || (language === "http" && HTTP_METHODS.has(ident))) {
        tokens.push({ text: full, type: "keyword" });
      } else {
        tokens.push({ text: full, type: "plain" });
      }
    } else if (punct) {
      tokens.push({ text: full, type: "punctuation" });
    } else {
      tokens.push({ text: full, type: "plain" });
    }
    lastIndex = match.index + full.length;
  }
  if (lastIndex < line.length) {
    tokens.push({ text: line.slice(lastIndex), type: "plain" });
  }
  return tokens;
}

const JSON_PATTERN =
  /("(?:[^"\\]|\\.)*")(\s*:)?|(\b-?\d+(?:\.\d+)?\b)|(\btrue\b|\bfalse\b|\bnull\b)|([{}[\],:])/g;

function tokenizeJson(line: string): Token[] {
  const tokens: Token[] = [];
  let lastIndex = 0;
  JSON_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = JSON_PATTERN.exec(line))) {
    if (match.index > lastIndex)
      tokens.push({ text: line.slice(lastIndex, match.index), type: "plain" });
    const [full, key, colon, num, bool, punct] = match;
    if (key) {
      tokens.push({ text: key, type: colon ? "property" : "string" });
      if (colon) tokens.push({ text: colon, type: "punctuation" });
    } else if (num) {
      tokens.push({ text: full, type: "number" });
    } else if (bool) {
      tokens.push({ text: full, type: "keyword" });
    } else if (punct) {
      tokens.push({ text: full, type: "punctuation" });
    }
    lastIndex = match.index + full.length;
  }
  if (lastIndex < line.length) tokens.push({ text: line.slice(lastIndex), type: "plain" });
  return tokens;
}

/**
 * `CodeBlock` renders on a permanently-dark surface regardless of the site's
 * light/dark theme (the established convention for code blocks on virtually
 * every major docs site) — so these are fixed light-on-dark colors, not the
 * theme-adaptive `text-foreground`/`dark:` pairs used elsewhere in the app.
 */
export const TOKEN_CLASS: Record<TokenType, string> = {
  comment: "text-neutral-500 italic",
  string: "text-success-500",
  keyword: "text-accent-400 font-medium",
  number: "text-warning-500",
  function: "text-info-500",
  punctuation: "text-neutral-500",
  tag: "text-accent-400",
  property: "text-info-500",
  plain: "text-neutral-100",
};
