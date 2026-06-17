#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const apiRoot = path.join(root, "frontend/app/api");
const mutatingMethodPattern = /export\s+async\s+function\s+(POST|PATCH|PUT|DELETE)\b/g;
const auditedWorkflowCalls = [
  "appendAuditEvent(",
  "appendRequiredAuditEvent(",
  "runReviewActionWorkflow(",
  "runApprovedDeliveryGate("
];

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(fullPath);
    return entry.name === "route.ts" ? [fullPath] : [];
  });
}

function skipCommentOrString(source, index) {
  const char = source[index];
  const next = source[index + 1];

  if (char === "/" && next === "/") {
    let cursor = index + 2;
    while (cursor < source.length && source[cursor] !== "\n") cursor += 1;
    return cursor;
  }

  if (char === "/" && next === "*") {
    let cursor = index + 2;
    while (cursor < source.length && !(source[cursor] === "*" && source[cursor + 1] === "/")) cursor += 1;
    return Math.min(source.length, cursor + 2);
  }

  if (char === "'" || char === '"' || char === "`") {
    const quote = char;
    let cursor = index + 1;
    while (cursor < source.length) {
      if (source[cursor] === "\\") {
        cursor += 2;
        continue;
      }
      if (source[cursor] === quote) return cursor + 1;
      cursor += 1;
    }
    return source.length;
  }

  return index;
}

function matchingDelimiterIndex(source, openIndex, openChar, closeChar) {
  let depth = 0;
  for (let index = openIndex; index < source.length; index += 1) {
    const skippedIndex = skipCommentOrString(source, index);
    if (skippedIndex !== index) {
      index = skippedIndex - 1;
      continue;
    }

    const char = source[index];
    if (char === openChar) depth += 1;
    if (char === closeChar) depth -= 1;
    if (depth === 0) return index;
  }
  return -1;
}

function functionBodyAt(source, startIndex) {
  const paramsOpenIndex = source.indexOf("(", startIndex);
  if (paramsOpenIndex === -1) return "";
  const paramsCloseIndex = matchingDelimiterIndex(source, paramsOpenIndex, "(", ")");
  if (paramsCloseIndex === -1) return "";
  const openIndex = source.indexOf("{", paramsCloseIndex);
  if (openIndex === -1) return "";
  const closeIndex = matchingDelimiterIndex(source, openIndex, "{", "}");
  return closeIndex === -1 ? "" : source.slice(openIndex, closeIndex + 1);
}

function withoutCommentsAndStrings(source) {
  let output = "";
  let index = 0;
  while (index < source.length) {
    const char = source[index];
    const next = source[index + 1];

    if (char === "/" && next === "/") {
      while (index < source.length && source[index] !== "\n") index += 1;
      output += "\n";
      index += 1;
      continue;
    }

    if (char === "/" && next === "*") {
      index += 2;
      while (index < source.length && !(source[index] === "*" && source[index + 1] === "/")) index += 1;
      index += 2;
      output += " ";
      continue;
    }

    if (char === "'" || char === '"' || char === "`") {
      const quote = char;
      output += " ";
      index += 1;
      while (index < source.length) {
        if (source[index] === "\\") {
          index += 2;
          continue;
        }
        if (source[index] === quote) {
          index += 1;
          break;
        }
        index += 1;
      }
      continue;
    }

    output += char;
    index += 1;
  }
  return output;
}

const failures = [];
for (const fullPath of walk(apiRoot)) {
  const relativePath = path.relative(root, fullPath);
  const source = fs.readFileSync(fullPath, "utf8");
  for (const match of source.matchAll(mutatingMethodPattern)) {
    const method = match[1];
    const body = functionBodyAt(source, match.index || 0);
    const executableBody = withoutCommentsAndStrings(body);
    const hasAudit = auditedWorkflowCalls.some((call) => executableBody.includes(call));
    if (!hasAudit) {
      failures.push(`${relativePath} exposes ${method} without appendAuditEvent, appendRequiredAuditEvent, or audited workflow delegation in that handler`);
    }
  }
}

if (failures.length) {
  console.error("API audit guard failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("API audit guard passed.");
