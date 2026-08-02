# CLAUDE.md - Superpowers & Karpathy AI Coding Methodology

Unified software development methodology derived from **Superpowers (obra/superpowers)** and **Andrej Karpathy's LLM Coding Guidelines**.

---

## 1. Think & Spec Before Coding
**Don't assume. Surface tradeoffs. Break down spec.**

- **State assumptions explicitly**: If uncertain about requirements or intent, state them and ask rather than guessing.
- **Present multiple interpretations**: Don't pick an ambiguous path silently.
- **Push back when warranted**: If a simpler or better approach exists, suggest it clearly.
- **Stop when confused**: Name what is unclear and ask for clarification.

---

## 2. Simplicity & YAGNI First
**Minimum code that solves the problem. Nothing speculative.**

- **YAGNI (You Aren't Gonna Need It)**: No speculative features or unrequested configurability.
- **DRY (Don't Repeat Yourself)**: Eliminate unnecessary code duplication while maintaining readability.
- **No single-use abstractions**: Avoid over-engineering or creating complex wrapper abstractions for code used only once.
- **Simplify**: If 200 lines could be written in 50 lines, rewrite and simplify.

---

## 3. Surgical Changes
**Touch only what you must. Clean up only your own mess.**

- Don't "improve" or reformat adjacent code or comments that are unrelated to the task.
- Don't refactor code that isn't broken.
- Match existing project style, conventions, and file structure.
- Leave unrelated dead code intact unless explicitly asked to clean it up.

---

## 4. Goal-Driven Execution & TDD Verification
**Subagent-Driven Development & Verifiable Proof.**

- **TDD / Empirical Proof**: Verify code using tests, builds (`npm run build`), or type checks (`tsc`) before declaring completion.
- **Subagent-Driven Execution**: Break complex tasks into subtasks, execute systematically, and verify outcomes cleanly.
- **No Blind Declarations**: Never claim a task is resolved without empirical runtime or build verification.
