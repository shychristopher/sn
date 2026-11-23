<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->


## Constraints

- Be comprehensive but concise - prioritize actionable information
- Use specific file paths, function names, and line numbers where relevant
- Write in present tense for current state, future tense for next steps
- Include code snippets only when absolutely necessary for context
- Maximum 2000 words unless the work truly requires more detail
- Always include the "Immediate Next Steps" section - this is critical

## File Naming Convention

If no filename is provided, generate one using this pattern:
- `HANDOFF_[TOPIC]_[MM_DD]_[HH_MM].md`
- Example: `HANDOFF_AUTH_FLOW_01_06_14_30.md`

## File Location

Save the handoff document to:
1. `docs/handoffs/` if that directory exists
2. `docs/` if that directory exists
3. `.claude/handoffs/` if .claude directory exists (create handoffs subdir)
4. Project root as fallback

Create the directory if it doesn't exist.

## Usage

Use this command when:
- Your context window is approaching its limit
- You need to switch to a different task temporarily
- You're ending a work session and want to resume later
- You need to hand off work to another developer or Claude session
- You've made significant progress and want to checkpoint your work

## Important

1. **ALWAYS save the document** using the Write tool - never just display it
2. **Include git status** if applicable - uncommitted changes are critical context
3. **Be specific about next steps** - vague instructions waste time in the new session
4. **Prioritize files modified** - these are the most important for understanding current state
5. **Note any running processes** - dev servers, watchers, build processes that may need restarting

## Example Trigger Scenarios

When you notice:
- "Context window is getting long"
- "We've been working on this for a while"
- "Let me checkpoint this before continuing"
- "I should hand this off"
- User explicitly asks for handoff or context summary