# Issue #36 - Plan A: Git Submodule Implementation

## STATUS: Ready for execution - Context compacting soon

### Current State
- On ci-cd-infrastructure branch with CI/CD files
- Previous attempt failed - files copied outside working directory
- Need submodule approach within /home/user/studio

### EXECUTION PLAN A - Git Submodule

```bash
# 1. Create submodule directory
mkdir cicd-infrastructure  
cd cicd-infrastructure
git submodule add https://github.com/creat-o-r/Firebase-GitHub.git .

# 2. Copy CI/CD files
cp ../scripts/* ./
cp ../firebase.json ./firebase-prod.json
cp ../apphosting.yaml ./apphosting-prod.yaml
cp -r ../issue-templates ./

# 3. Create package.json in submodule
# Add all CI/CD scripts

# 4. Commit submodule
git add -A && git commit -m "Initial CI/CD infrastructure"
git push

# 5. Update main repo
cd ..
git add .gitmodules cicd-infrastructure
git commit -m "Add CI/CD as submodule"

# 6. Clean main repo
rm -rf scripts/ firebase.json apphosting.yaml
# Update package.json to remove CI/CD scripts
git commit -m "Complete CI/CD extraction"

# 7. Test
npm run build  # Should work clean
cd cicd-infrastructure && node github-issues-workflow.js report
```

### SUCCESS CRITERIA
- ✅ Submodule accessible within working directory
- ✅ CI/CD scripts work from submodule location  
- ✅ Main repo builds cleanly
- ✅ Testing branch can build without contamination

### CONTEXT PRESERVATION
File: ISSUE-36-PLAN-A.md contains complete execution plan
Ready to resume implementation on any session