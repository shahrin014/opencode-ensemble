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

  return `Team "${team.name}" unarchived. Use team_spawn to add teammates — existing member names can be reused.`
}