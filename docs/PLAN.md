## 🎼 Orchestration Report: Debugging Supabase Connection

### Task

Systematic investigation and fixing of the `Tenant or user not found` standard PostgreSQL error when connecting Next.js to Supabase via Drizzle.

### Mode

`plan`

### Agents Invoked (MINIMUM 3)

| #   | Agent             | Focus Area                                | Status  |
| --- | ----------------- | ----------------------------------------- | ------- |
| 1   | `project-planner` | Task breakdown & PLAN.md generation       | ✅      |
| 2   | `explorer-agent`  | Codebase discovery & log analysis         | ✅      |
| 3   | `debugger`        | Error isolation and hypothesis generation | ✅      |
| 4   | `test-engineer`   | Verification scripts planning             | Pending |

### 1. Symptom

The Next.js app is throwing a database error during the onboarding process (`src/app/actions/onboarding.ts`):

```text
[cause]: Error [PostgresError]: Tenant or user not found
```

This error natively originates from Supabase's Supavisor connection pooler when it cannot resolve the project ref/tenant from the connection string.

### 2. Information Gathered

- `src/lib/db.ts` correctly uses `postgres(process.env.DATABASE_URL, { prepare: false })` which is required for Drizzle when hitting a transaction pooler.
- `.env.local` uses the Supavisor pooler URL: `postgres://postgres.pakjnadgcyshcnzpbwhs:...@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require`
- Next.js development server is repeatedly crashing on DB queries due to this authentication rejection by the pooler.

### 3. Hypotheses

1. ❓ **Supavisor Parsing/Routing Issue:** The `postgres.js` driver may be passing parameters in a way Supavisor rejects, or the `?sslmode=require` flag might be interfering with the pooler's SSL termination.
2. ❓ **Direct Connection Alternative:** Since this is a standard Next.js app without edge-functions strictly enforcing connection constraints, using the direct database URL (port 5432) circumvents Supavisor completely, solving tenant-resolution issues.

### 4. Proposed Fix (Implementation Plan)

1. **Test Pooler vs Direct Modes:** Execute the `src/scripts/test-connection.ts` script using `npx -y tsx` to isolate if the issue is strictly with the `6543` port.
2. **Update Environment Variables:** Switch `.env.local`'s `DATABASE_URL` to the direct connection: `postgres://postgres:[PASSWORD]@db.pakjnadgcyshcnzpbwhs.supabase.co:5432/postgres`.
3. **Validate:** Rerun `npm run dev` and test the onboarding query again.

### Verification Scripts Executed

- [ ] `src/scripts/test-connection.ts` -> Pending execution during Implementation Phase.

### Deliverables

- [x] PLAN.md created
- [ ] Code/Env implemented
- [ ] Tests passing
- [ ] Scripts verified
