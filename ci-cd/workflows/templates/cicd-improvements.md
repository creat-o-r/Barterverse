# Improve CI/CD commands and issue creation process

## Problem Statement

The current CI/CD issue management system has several usability and reliability issues:

### Current Pain Points:
- **Manual issue creation** - No direct `npm run issues:create` command
- **Error-prone templating** - Complex issue descriptions fail with syntax errors
- **Poor formatting** - Template literals break in bash command contexts
- **Limited functionality** - No bulk operations or issue templates
- **Inconsistent API handling** - Different error handling patterns across scripts

### Specific Issues Encountered:
- Creating issues requires manual `node -e` commands with string concatenation
- Template literals cause `SyntaxError: Unexpected identifier` errors
- Issue body formatting gets corrupted in one-line commands
- No standardized way to create complex, detailed issues
- Update operations are unreliable and inconsistent

## Proposed Improvements

### 1. Enhanced Issue Management Commands
```bash
npm run issues:create <title> [template] [labels]
npm run issues:update <number> [template|body]
npm run issues:bulk-create <template-dir>
npm run issues:template <template-name>
```

### 2. Issue Template System
```
issue-templates/
├── bug-report.md
├── feature-request.md  
├── cicd-extraction.md
├── build-failure.md
└── security-issue.md
```

### 3. Improved Error Handling
- Better GitHub API error messages
- Retry mechanisms for network failures
- Validation before API calls
- Clear usage instructions

### 4. Template Processing
- Support for markdown template files
- Variable substitution in templates
- Proper escaping for special characters
- Multi-line content handling

## Implementation Plan

### Phase 1: Command Structure (2 hours)
- [ ] Add `create` and `update` commands to github-issues-workflow.js
- [ ] Implement template file reading and processing
- [ ] Add proper error handling and validation
- [ ] Update package.json scripts

### Phase 2: Template System (2 hours)
- [ ] Create `issue-templates/` directory structure
- [ ] Build template processing engine
- [ ] Add variable substitution support
- [ ] Create standard templates for common issue types

### Phase 3: API Improvements (1 hour)
- [ ] Standardize GitHub API error handling
- [ ] Add retry mechanisms for transient failures
- [ ] Improve response parsing and validation
- [ ] Add rate limiting awareness

### Phase 4: Documentation & Testing (1 hour)
- [ ] Document new commands and usage patterns
- [ ] Test all commands with various scenarios
- [ ] Add examples for common workflows
- [ ] Update CLAUDE.md with new capabilities

## Technical Details

### Command Implementation:
```javascript
async createIssue(title, template, labels = []) {
  // Read template file if provided
  const body = template.endsWith('.md') 
    ? fs.readFileSync(`issue-templates/${template}`, 'utf8')
    : template;
    
  // Process template variables
  const processedBody = this.processTemplate(body);
  
  // Create issue with proper error handling
  return await this.makeGitHubRequest('/repos/.../issues', {
    method: 'POST',
    body: JSON.stringify({ title, body: processedBody, labels })
  });
}
```

### Template Processing:
- Support for `{{variable}}` substitution
- Date/time injection: `{{date}}`, `{{timestamp}}`
- Git context: `{{branch}}`, `{{commit}}`
- Issue context: `{{related_issues}}`, `{{priority}}`

## Success Criteria
- [ ] `npm run issues:create` works reliably with complex descriptions
- [ ] Template system supports markdown files with variable substitution
- [ ] Error messages are clear and actionable
- [ ] All existing functionality continues working
- [ ] Documentation covers new workflows
- [ ] Common issue types have standardized templates

## Impact
- **Improved developer experience** - Easier issue creation and management
- **Reduced errors** - Reliable templating and API handling
- **Standardized processes** - Consistent issue formats and workflows
- **Better automation** - Support for bulk operations and complex workflows

**Priority: MEDIUM** - Improves tooling efficiency and developer experience

🤖 Generated with [Claude Code](https://claude.ai/code)