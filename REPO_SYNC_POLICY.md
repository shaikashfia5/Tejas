# Primary GitHub Repository & Agent Sync Policy

## 📌 Primary Remote
- **Repository URL**: `https://github.com/Sahil-Hub-Cloud/Tejas.git`
- **Default Branch**: `main`
- **Project Root**: `c:\tejas\Antigravity IDE\tejas-app`

---

## 🚨 MANDATORY INSTRUCTION FOR ALL AI AGENTS & DEVELOPERS

This repository (`https://github.com/Sahil-Hub-Cloud/Tejas.git`) is the **primary and official source of truth** for the Tejas project.

Whenever any AI agent, coding assistant, automated tool, or human developer:
1. **Creates, modifies, or deletes any code or documentation**
2. **Refactors or verifies features or tests**
3. **Applies bug fixes or dependency changes**

The changes **MUST BE IMMEDIATELY TRANSFERRED, COMMITTED, AND PUSHED** to this GitHub repository.

### Workflow Required for Every Agent Session:
Before concluding a task:
```bash
# 1. Check status
git status

# 2. Stage all modifications (secrets are excluded by .gitignore)
git add -A

# 3. Create a clear commit message
git commit -m "type(scope): descriptive summary of changes"

# 4. Push directly to primary remote
git push origin main
```

### Safety Rules:
- **Never commit environment secrets**: `.env` and `.env.local` are strictly protected in `.gitignore` and must never be committed.
- **Never leave unpushed local changes**: Ensure that `origin main` is always up to date with the latest workspace state.
