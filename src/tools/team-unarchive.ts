import type { ToolDeps } from "../types"
import { generateId } from "../util"

/**
 * Execute the team_unarchive tool. Reactivates an archived team.
 * Bypasses session validation since archived teams have no active sessions.
 */
export async function executeTeamUnarchive(
  deps: ToolDeps,
  args: { name: string },
): Promise<string> {
  const team = deps.db.query(
    "SELECT id, name, lead_session_id, lead_agent FROM team WHERE name = ? AND status = 'archived'"
  ).get(args.name) as { id: string; name: string; lead_session_id: string; lead_agent: string | null } | null

  if (!team) throw new Error(`Team "${args.name}" not found or not archived`)

  deps.db.run("UPDATE team SET status = 'active', time_updated = ? WHERE id = ?", [Date.now(), team.id])

  const members = deps.db.query(
    "SELECT name, session_id FROM team_member WHERE team_id = ?"
  ).all(team.id) as Array<{ name: string; session_id: string }>

  for (const m of members) {
    deps.registry.register(team.id, m.name, m.session_id)
  }

  return `Team "${team.name}" unarchived. Note: worktrees and sessions from the previous run are gone — use team_spawn to add new teammates.`
}