---
name: opt-tokens
description: Optimize token usage — read rules once, memorize, then work from memory. No re-reading, no chatter.
argument-hint: [rule files or description]
---

# Optimize Tokens

Minimize token waste. Read rules once, extract essentials into memory, then work from memory — never re-read the same rule file. No chatter, only decisions.

## Behavior Rules

1. **Silence** — Do NOT write explanatory messages to the user. No summaries, no progress updates, no confirmations. Only ask when a genuine decision is needed (ambiguous intent, conflicting rules, destructive action).

2. **Memorize, don't re-read** — When rule files are provided (via argument):
   - Read each rule file **once**
   - Extract the **critical constraints only** (naming, structure, banned patterns, required patterns)
   - Save them to memory with tags matching the rule scope (e.g. `opt-tokens`, `server`, `components`)
   - Never read that rule file again in this session — use the memory instead

3. **Act from memory** — After memorization, execute the actual task (refactor, generate, fix, etc.) using only what's stored in memory. If memory is incomplete, ask the user — don't silently re-read files.

4. **Paired skills** — When used with another skill (e.g. `opt-tokens` + `refr-module`):
   - Read and memorize the paired skill's referenced rules first
   - Then execute the paired skill's steps from memory

## Steps

1. **Identify scope** — Determine which rule files from `.agents/rules/` are relevant.

2. **Read & extract** — Read each relevant `.agents/rules/*.md` file once. For each, extract into memory:
   - Required patterns (must-do)
   - Banned patterns (must-not-do)
   - Naming / structure conventions
   - One-line summary of purpose
     Discard examples, rationale, and verbose descriptions.

3. **Execute** — Perform the actual task using only memorized constraints. No re-reading.

4. **Ask only when stuck** — If a decision is ambiguous or two rules conflict, ask the user concisely (one sentence + options).
