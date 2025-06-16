# barterverse-cicd Repository Structure

## Proposed Directory Layout

```
barterverse-cicd/
├── README.md
├── package.json
├── .gitignore
├── github-workflows/
│   ├── issue-management.js
│   ├── project-automation.js
│   ├── branch-integration.js
│   ├── build-monitoring.js
│   ├── claude-context-helper.js
│   └── startup-build-check.js
├── deployment/
│   ├── firebase-configs/
│   │   ├── dev-firebase.json
│   │   ├── staging-firebase.json
│   │   └── prod-firebase.json
│   ├── hosting-configs/
│   │   ├── dev-apphosting.yaml
│   │   ├── staging-apphosting.yaml
│   │   └── prod-apphosting.yaml
│   └── deployment-scripts/
│       ├── deploy.js
│       └── config-injection.js
├── templates/
│   ├── issue-templates/
│   │   ├── bug-report.md
│   │   ├── feature-request.md
│   │   ├── cicd-extraction.md
│   │   └── build-failure.md
│   └── pr-templates/
│       └── default.md
└── docs/
    ├── workflow-guide.md
    ├── deployment-guide.md
    └── development-setup.md
```

## Migration Plan

### Files to Move from Main Repo:
- `scripts/github-issues-workflow.js` → `github-workflows/issue-management.js`
- `scripts/github-projects-integration.js` → `github-workflows/project-automation.js`
- `scripts/jules-branch-integration.js` → `github-workflows/branch-integration.js`
- `scripts/build-health-report.js` → `github-workflows/build-monitoring.js`
- `scripts/claude-context-helper.js` → `github-workflows/claude-context-helper.js`
- `scripts/startup-build-check.js` → `github-workflows/startup-build-check.js`
- `firebase.json` → `deployment/firebase-configs/`
- `apphosting.yaml` → `deployment/hosting-configs/`
- `issue-templates/` → `templates/issue-templates/`

### New Files to Create:
- Cross-repository deployment scripts
- Environment-specific configs
- Documentation for new workflow
- Package.json with CI/CD-only dependencies

## Configuration Updates

### Main Repo (barterverse) - Keep Only:
```json
{
  "scripts": {
    "dev": "next dev --turbopack -p 9002",
    "build": "next build", 
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "genkit:dev": "genkit start -- tsx src/ai/dev.ts",
    "genkit:watch": "genkit start -- tsx --watch src/ai/dev.ts"
  }
}
```

### CI/CD Repo (barterverse-cicd) - Add:
```json
{
  "scripts": {
    "issues:report": "node github-workflows/issue-management.js report",
    "issues:create": "node github-workflows/issue-management.js create",
    "issues:update": "node github-workflows/issue-management.js update",
    "deploy:dev": "node deployment/deployment-scripts/deploy.js dev",
    "deploy:staging": "node deployment/deployment-scripts/deploy.js staging",
    "deploy:prod": "node deployment/deployment-scripts/deploy.js prod",
    "monitor:builds": "node github-workflows/build-monitoring.js"
  }
}
```

This structure separates concerns while maintaining all existing functionality.