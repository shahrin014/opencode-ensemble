import { describe, test, expect, beforeEach } from "bun:test"
import { setupDeps, insertTeam, insertMember } from "../helpers"
import { executeTeamUnarchive } from "../../src/tools/team-unarchive"
import type { ToolDeps } from "../../src/types"

describe("team_unarchive", () => {
  let deps: ToolDeps

  beforeEach(() => {
    deps = setupDeps()
  })

  test("unarchives an archived team and updates status to active", async () => {
    insertTeam(deps.db, "team1", "my-team", "lead-sess", "archived")

    const result = await executeTeamUnarchive(deps, { name: "my-team" })
    expect(result).toContain("my-team")
    expect(result).toContain("unarchived")

    const row = deps.db.query("SELECT status FROM team WHERE name = ?").get("my-team") as { status: string }
    expect(row.status).toBe("active")
  })

  test("rejects unarchive of non-existent team", async () => {
    await expect(executeTeamUnarchive(deps, { name: "nonexistent" }))
      .rejects.toThrow('not found or not archived')
  })

  test("rejects unarchive of active team (not archived)", async () => {
    insertTeam(deps.db, "team1", "my-team", "lead-sess", "active")

    await expect(executeTeamUnarchive(deps, { name: "my-team" }))
      .rejects.toThrow('not found or not archived')
  })

  test("clears old member records so they can be re-spawned", async () => {
    insertTeam(deps.db, "team1", "my-team", "lead-sess", "archived")
    insertMember(deps.db, "team1", "alice", "alice-sess", "shutdown")

    await executeTeamUnarchive(deps, { name: "my-team" })

    const members = deps.db.query("SELECT name FROM team_member WHERE team_id = ?").all("team1")
    expect(members).toHaveLength(0)
  })

  test("updates time_updated when unarchiving", async () => {
    const before = Date.now() - 1000
    insertTeam(deps.db, "team1", "my-team", "lead-sess", "archived")
    deps.db.run("UPDATE team SET time_updated = ? WHERE id = ?", [before, "team1"])

    await executeTeamUnarchive(deps, { name: "my-team" })

    const row = deps.db.query("SELECT time_updated FROM team WHERE id = ?").get("team1") as { time_updated: number }
    expect(row.time_updated).toBeGreaterThan(before)
  })
})