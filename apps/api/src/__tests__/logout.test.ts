import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";

// Logout invalidation is persistence-bound (it bumps the stored tokenVersion
// and relies on requireAuth comparing it to the token claim), so it only runs
// against a real DB. Skipped locally (no DATABASE_URL); runs in CI.
const hasDb = !!process.env.DATABASE_URL;

describe.skipIf(!hasDb)("logout token revocation (R23)", () => {
  let app: typeof import("../app").default;
  let db: typeof import("@workspace/database").db;
  let usersTable: typeof import("@workspace/database").usersTable;
  let eq: typeof import("drizzle-orm").eq;

  const email = `logout_${Date.now()}@test.in`;
  let token = "";
  let userId = 0;

  beforeAll(async () => {
    app = (await import("../app")).default;
    ({ db, usersTable } = await import("@workspace/database"));
    ({ eq } = await import("drizzle-orm"));

    await request(app)
      .post("/api/auth/register")
      .send({ email, password: "Password1!", name: "Logout User", phone: "1234567890" });
    const login = await request(app)
      .post("/api/auth/login")
      .send({ email, password: "Password1!" });
    token = login.body.token;
    userId = login.body.user.id;
  });

  afterAll(async () => {
    if (!hasDb) return;
    await db.delete(usersTable).where(eq(usersTable.id, userId));
  });

  // Validates: Requirements 23.1, 23.3
  it("rejects the old token after logout bumps tokenVersion", async () => {
    // Token works before logout.
    const before = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`);
    expect(before.status).toBe(200);

    const logout = await request(app).post("/api/auth/logout").set("Authorization", `Bearer ${token}`);
    expect(logout.status).toBe(200);
    expect(logout.body).toHaveProperty("message");

    // Same token is now rejected because the stored tokenVersion advanced.
    const after = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`);
    expect(after.status).toBe(401);
  });

  // Validates: Requirements 23.1
  it("requires authentication to log out", async () => {
    const res = await request(app).post("/api/auth/logout");
    expect(res.status).toBe(401);
  });
});
