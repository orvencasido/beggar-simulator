# Project agent index

Codex project custom agents are configured in `.codex/agents/`. This `.agents/` index points to those self-contained definitions; it does not launch agents or duplicate their configuration.

| Agent name | TOML definition |
| --- | --- |
| `mobile_developer` | [Configuration](../.codex/agents/mobile-developer.toml) |
| `backend_developer` | [Configuration](../.codex/agents/backend-developer.toml) |
| `database_developer` | [Configuration](../.codex/agents/database-developer.toml) |
| `ui_designer` | [Configuration](../.codex/agents/ui-designer.toml) |

Each definition reads AGENTS.md, architecture.md, implementation.md before starting; detailed role guidance is embedded in the TOML. Model, reasoning effort, sandbox and tool settings inherit from the parent session. Role ownership is a coordination instruction, not filesystem isolation.

Example request: “Start Phase 1 of implementation.md. Delegate the visual specification to ui_designer and mobile implementation to mobile_developer. Review their results and run the required checks.”

Parallelize independent tasks after agreeing contracts. Database owns shared migration edits; UI/mobile coordinate shared theme edits. The parent integrates results and resolves conflicts. Creating these files starts no implementation work. Agent discovery depends on the Codex client/version; start a fresh session if new definitions are not available.

Official reference: https://learn.chatgpt.com/docs/agent-configuration/subagents

## Installed project skills

Full skill directories live in `.agents/skills/`, which Codex scans for repository skills. Newly installed skills are available on the next turn; restart the client if they do not appear. Each TOML also contains explicit local paths so its agent knows which instructions to read.

| Agents | Skill loading |
| --- | --- |
| `mobile_developer`, `ui_designer` | Start with [expo-overview](skills/expo-overview/SKILL.md); then load [expo-design-system](skills/expo-design-system/SKILL.md), [expo-native-ui](skills/expo-native-ui/SKILL.md), [expo-ui](skills/expo-ui/SKILL.md), [expo-router](skills/expo-router/SKILL.md), or [expo-animation](skills/expo-animation/SKILL.md) as the task requires. |
| `backend_developer`, `database_developer` | Load [supabase-postgres-best-practices](skills/supabase-postgres-best-practices/SKILL.md) before database work, including SQL functions, policies and tests. |

Downloads include supporting references/scripts, not just SKILL.md. Sources and per-file SHA-256 hashes are recorded in [skills-manifest.json](skills-manifest.json). Copies came from the official Expo and Supabase repositories at `main` on 2026-10-11; updates are deliberate downloads, not automatic. Skill scripts have not been executed during setup. Keep repository/user requirements and versioned Expo docs authoritative.

Discovery reference: https://learn.chatgpt.com/docs/build-skills

## Supabase backend target

Backend and database agents target project `tjegdubzwwgfkcdaufle` (`https://tjegdubzwwgfkcdaufle.supabase.co`). Their TOMLs authorize `npx supabase` for existing-backend discovery and local CLI setup, using configured authentication. They must inspect the actual remote schema/functions before implementation and report anything they cannot retrieve. This project ref is not a credential.

Schema/type/function discovery is authorized; remote migrations, deployment and data/config changes still follow their assigned task scope. `db pull` can update remote migration history, so agents use read-only schema discovery or decline that prompt during context retrieval. CLI reference: https://supabase.com/docs/reference/cli/introduction
