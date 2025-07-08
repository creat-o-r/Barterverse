#!/usr/bin/env node

/**
 * GitHub Projects Integration
 * Manages GitHub Projects and integrates with our issues workflow
 */

const { execSync } = require('child_process');
const fs = require('fs');

class GitHubProjectsIntegration {
  constructor() {
    this.githubToken = this.getGitHubToken();
    this.repo = process.env.GITHUB_REPOSITORY || 'creat-o-r/Barterverse';
    this.baseUrl = 'https://api.github.com';
  }

  getGitHubToken() {
    try {
      return execSync('gcloud secrets versions access latest --secret="github-token" --project="barterverse-l9uq3"', 
        { encoding: 'utf8' }).trim();
    } catch (error) {
      console.error('Failed to get GitHub token:', error.message);
      process.exit(1);
    }
  }

  async makeGitHubRequest(endpoint, options = {}) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `token ${this.githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Create a project milestone for large features
   */
  async createProjectMilestone(title, description, dueDate = null) {
    const milestone = await this.makeGitHubRequest(`/repos/${this.repo}/milestones`, {
      method: 'POST',
      body: JSON.stringify({
        title,
        description,
        due_on: dueDate,
        state: 'open'
      })
    });

    console.log(`✅ Created milestone: ${title} (#${milestone.number})`);
    return milestone;
  }

  /**
   * Create project structure using issues and milestones
   */
  async createItemMatchingProject() {
    console.log('🚀 Creating Item Matching System project structure...');

    // Create main milestone
    const milestone = await this.createProjectMilestone(
      'Item Matching System v2.0',
      'Comprehensive improvement of the AI-powered item matching system including algorithm enhancements, UI improvements, and performance optimizations.',
      '2025-08-01T00:00:00Z' // 6 weeks from now
    );

    // Define project epic issues
    const epics = [
      {
        title: 'Epic: Algorithm Performance Optimization',
        body: `## Epic: Algorithm Performance Optimization

**Goal:** Improve matching algorithm speed and accuracy

### Sub-issues to create:
- [ ] Profile current matching performance
- [ ] Optimize Simple Mode matching logic
- [ ] Enhance Advanced Mode with ML improvements
- [ ] Add caching for frequent matches
- [ ] Implement batch processing for bulk matches

**Success Metrics:**
- 50% reduction in matching time
- 10% improvement in match accuracy
- Support for 10k+ items without performance degradation

**Estimated Effort:** 40-60 hours`,
        labels: ['epic', 'algorithm', 'performance', 'high']
      },
      {
        title: 'Epic: Enhanced Matching UI/UX',
        body: `## Epic: Enhanced Matching UI/UX

**Goal:** Improve user experience for discovering and managing matches

### Sub-issues to create:
- [ ] Redesign match results display
- [ ] Add real-time match notifications
- [ ] Implement advanced filtering options
- [ ] Create match explanation tooltips
- [ ] Add match history and analytics

**Success Metrics:**
- Improved user engagement with matches
- Reduced time to find relevant items
- Better user understanding of match scores

**Estimated Effort:** 35-45 hours`,
        labels: ['epic', 'ui', 'ux', 'matching', 'medium']
      },
      {
        title: 'Epic: Smart Matching Features',
        body: `## Epic: Smart Matching Features

**Goal:** Add intelligent features to enhance matching capabilities

### Sub-issues to create:
- [ ] Implement location-based matching
- [ ] Add seasonal/temporal matching hints
- [ ] Create user preference learning
- [ ] Build reciprocal matching suggestions
- [ ] Add community-driven match validation

**Success Metrics:**
- Higher quality matches
- Increased successful trades
- Better user satisfaction scores

**Estimated Effort:** 30-40 hours`,
        labels: ['epic', 'ai', 'features', 'matching', 'medium']
      },
      {
        title: 'Epic: Matching Analytics & Insights',
        body: `## Epic: Matching Analytics & Insights

**Goal:** Provide data-driven insights for users and system optimization

### Sub-issues to create:
- [ ] Build matching analytics dashboard
- [ ] Create user matching reports
- [ ] Implement A/B testing framework
- [ ] Add matching success tracking
- [ ] Create admin analytics tools

**Success Metrics:**
- Data-driven matching improvements
- User insights into their trading patterns
- System optimization based on real usage

**Estimated Effort:** 25-35 hours`,
        labels: ['epic', 'analytics', 'insights', 'matching', 'low']
      }
    ];

    // Create epic issues
    for (const epic of epics) {
      try {
        const issue = await this.makeGitHubRequest(`/repos/${this.repo}/issues`, {
          method: 'POST',
          body: JSON.stringify({
            ...epic,
            milestone: milestone.number
          })
        });

        console.log(`✅ Created epic: ${epic.title} (#${issue.number})`);
      } catch (error) {
        console.error(`❌ Failed to create epic: ${epic.title}`, error.message);
      }
    }

    // Create project summary issue
    const projectSummary = await this.makeGitHubRequest(`/repos/${this.repo}/issues`, {
      method: 'POST',
      body: JSON.stringify({
        title: '📋 Item Matching System v2.0 - Project Hub',
        body: `# Item Matching System v2.0 Project Hub

This is the central tracking issue for the Item Matching System improvement project.

## Project Overview
Comprehensive enhancement of BarterVerse's AI-powered item matching system to improve performance, user experience, and matching quality.

## Project Goals
- 🚀 **Performance**: 50% faster matching with 10k+ items support
- 🎯 **Accuracy**: 10% improvement in match quality
- 👥 **UX**: Better user interface and match discovery
- 📊 **Analytics**: Data-driven insights and optimization

## Epic Progress
Track progress on major components:

### Algorithm Performance Optimization (Epic)
- Performance profiling and optimization
- ML algorithm improvements
- Caching and batch processing

### Enhanced Matching UI/UX (Epic)
- Redesigned match results
- Real-time notifications
- Advanced filtering and explanations

### Smart Matching Features (Epic)
- Location-based matching
- User preference learning
- Reciprocal suggestions

### Matching Analytics & Insights (Epic)
- Analytics dashboard
- User reports and insights
- A/B testing framework

## Development Workflow
1. **Epic Planning**: Break down epics into specific issues
2. **Sprint Planning**: Prioritize issues for development sprints
3. **Development**: Use feature branches for each issue
4. **Testing**: Comprehensive testing for each component
5. **Integration**: Staged rollout with monitoring

## Success Metrics
- **Technical**: Performance, accuracy, scalability
- **User**: Engagement, satisfaction, successful trades
- **Business**: User retention, feature adoption

---
*This project is managed using GitHub Issues and Milestones. All related issues should be tagged with the milestone "Item Matching System v2.0"*`,
        labels: ['project-hub', 'item-matching', 'epic', 'tracking'],
        milestone: milestone.number
      })
    });

    console.log(`✅ Created project hub: ${projectSummary.title} (#${projectSummary.number})`);

    return {
      milestone,
      projectHubIssue: projectSummary,
      projectUrl: `https://github.com/${this.repo}/milestone/${milestone.number}`
    };
  }

  /**
   * Create Firebase AI Web Builder project structure
   */
  async createFirebaseAIProject() {
    console.log('🚀 Creating Firebase AI Web Builder project structure...');

    // Create main milestone
    const milestone = await this.createProjectMilestone(
      'Firebase AI Web Builder v1.0',
      'Automated Firebase-based AI web application builder with native integrations and deployment automation.',
      '2025-09-01T00:00:00Z' // 10 weeks from now - larger project
    );

    // Define project epic issues
    const epics = [
      {
        title: 'Epic: Firebase Native Integrations',
        body: `## Epic: Firebase Native Integrations

**Goal:** Deep Firebase integration for seamless AI web app development

### Sub-issues to create:
- [ ] Firebase native secrets management
- [ ] Firestore auto-schema generation
- [ ] Firebase Auth integration templates
- [ ] Cloud Functions deployment automation
- [ ] Firebase Hosting optimization

**Success Metrics:**
- Zero-config Firebase setup
- Automated secret management
- Template-based auth flows

**Estimated Effort:** 30-40 hours`,
        labels: ['epic', 'firebase', 'integrations', 'high']
      },
      {
        title: 'Epic: AI-Powered Code Generation',
        body: `## Epic: AI-Powered Code Generation

**Goal:** Intelligent code generation for common web app patterns

### Sub-issues to create:
- [ ] Component auto-generation
- [ ] API route scaffolding
- [ ] Database schema inference
- [ ] UI pattern recognition
- [ ] Code optimization suggestions

**Success Metrics:**
- 80% reduction in boilerplate code
- Context-aware code generation
- Maintainable generated code

**Estimated Effort:** 40-50 hours`,
        labels: ['epic', 'ai', 'codegen', 'automation', 'high']
      },
      {
        title: 'Epic: Deployment & CI/CD Automation',
        body: `## Epic: Deployment & CI/CD Automation

**Goal:** Automated deployment pipeline with monitoring

### Sub-issues to create:
- [ ] One-click deployment to Firebase
- [ ] GitHub Actions integration
- [ ] Environment management
- [ ] Performance monitoring
- [ ] Rollback automation

**Success Metrics:**
- Sub-5-minute deployments
- Zero-downtime updates
- Automated quality gates

**Estimated Effort:** 25-35 hours`,
        labels: ['epic', 'deployment', 'ci-cd', 'automation', 'medium']
      }
    ];

    // Create epic issues
    for (const epic of epics) {
      try {
        const issue = await this.makeGitHubRequest(`/repos/${this.repo}/issues`, {
          method: 'POST',
          body: JSON.stringify({
            ...epic,
            milestone: milestone.number
          })
        });

        console.log(`✅ Created epic: ${epic.title} (#${issue.number})`);
      } catch (error) {
        console.error(`❌ Failed to create epic: ${epic.title}`, error.message);
      }
    }

    // Create project summary issue
    const projectSummary = await this.makeGitHubRequest(`/repos/${this.repo}/issues`, {
      method: 'POST',
      body: JSON.stringify({
        title: '🔥 Firebase AI Web Builder v1.0 - Project Hub',
        body: `# Firebase AI Web Builder v1.0 Project Hub

**Vision:** Automated Firebase-based AI web application builder that will become its own repository.

## Project Overview
Create intelligent tooling for rapid Firebase web app development with AI-powered code generation and native integrations.

## Project Goals
- 🔥 **Firebase Native**: Deep integration with all Firebase services
- 🤖 **AI-Powered**: Intelligent code generation and optimization  
- 🚀 **Zero-Config**: Automated setup and deployment
- 📦 **Standalone**: Prepare for separate repository

## Epic Progress
Track progress on major components:

### Firebase Native Integrations (Epic)
- Native secrets management (current: firebase-native-secrets branch)
- Auto-schema generation and optimization
- Template-based integrations

### AI-Powered Code Generation (Epic)
- Component and API scaffolding
- Database schema inference
- Pattern recognition and suggestions

### Deployment & CI/CD Automation (Epic)
- One-click Firebase deployment
- Environment management
- Performance monitoring

## Migration Plan
This project will be spun into its own repository once core features are proven in BarterVerse.

## Success Metrics
- **Developer Experience**: 90% reduction in setup time
- **Code Quality**: AI-generated code passes all quality gates
- **Deployment**: Sub-5-minute deployments with zero downtime

---
*🚨 This project will become its own repository - design with modularity in mind*`,
        labels: ['project-hub', 'firebase-ai', 'epic', 'tracking'],
        milestone: milestone.number
      })
    });

    console.log(`✅ Created project hub: ${projectSummary.title} (#${projectSummary.number})`);

    return {
      milestone,
      projectHubIssue: projectSummary,
      projectUrl: `https://github.com/${this.repo}/milestone/${milestone.number}`
    };
  }

  /**
   * Link existing issues to a project milestone
   */
  async linkIssuesToProject(milestoneNumber, issueNumbers) {
    for (const issueNumber of issueNumbers) {
      try {
        await this.makeGitHubRequest(`/repos/${this.repo}/issues/${issueNumber}`, {
          method: 'PATCH',
          body: JSON.stringify({
            milestone: milestoneNumber
          })
        });
        console.log(`✅ Linked issue #${issueNumber} to milestone`);
      } catch (error) {
        console.error(`❌ Failed to link issue #${issueNumber}:`, error.message);
      }
    }
  }

  /**
   * Get project status report
   */
  async getProjectStatus(milestoneNumber) {
    const milestone = await this.makeGitHubRequest(`/repos/${this.repo}/milestones/${milestoneNumber}`);
    const issues = await this.makeGitHubRequest(`/repos/${this.repo}/issues?milestone=${milestoneNumber}&state=all&per_page=100`);
    
    const openIssues = issues.filter(i => i.state === 'open');
    const closedIssues = issues.filter(i => i.state === 'closed');
    const epics = issues.filter(i => i.labels.some(l => l.name === 'epic'));
    
    const report = {
      milestone: milestone.title,
      totalIssues: issues.length,
      openIssues: openIssues.length,
      closedIssues: closedIssues.length,
      completionPercentage: Math.round((closedIssues.length / issues.length) * 100) || 0,
      epics: epics.length,
      dueDate: milestone.due_on,
      url: milestone.html_url
    };

    console.log(`\n📊 Project Status: ${report.milestone}`);
    console.log(`- Progress: ${report.completionPercentage}% (${report.closedIssues}/${report.totalIssues} issues)`);
    console.log(`- Open Issues: ${report.openIssues}`);
    console.log(`- Epics: ${report.epics}`);
    console.log(`- Due Date: ${report.dueDate ? new Date(report.dueDate).toDateString() : 'Not set'}`);
    console.log(`- URL: ${report.url}`);

    return report;
  }

  async run() {
    const command = process.argv[2];
    
    switch (command) {
      case 'create-item-matching':
        const project = await this.createItemMatchingProject();
        console.log(`\n🎉 Item Matching System project created!`);
        console.log(`📋 Project Hub: Issue #${project.projectHubIssue.number}`);
        console.log(`🎯 Milestone: ${project.projectUrl}`);
        break;
      
      case 'create-firebase-ai':
        const firebaseProject = await this.createFirebaseAIProject();
        console.log(`\n🎉 Firebase AI Web Builder project created!`);
        console.log(`📋 Project Hub: Issue #${firebaseProject.projectHubIssue.number}`);
        console.log(`🎯 Milestone: ${firebaseProject.projectUrl}`);
        break;
      
      case 'status':
        const milestoneNumber = process.argv[3];
        if (!milestoneNumber) {
          console.error('Usage: npm run projects:status <milestone-number>');
          process.exit(1);
        }
        await this.getProjectStatus(milestoneNumber);
        break;
      
      case 'link':
        const milestone = process.argv[3];
        const issueNumbers = process.argv.slice(4).map(n => parseInt(n));
        if (!milestone || issueNumbers.length === 0) {
          console.error('Usage: npm run projects:link <milestone-number> <issue1> <issue2> ...');
          process.exit(1);
        }
        await this.linkIssuesToProject(milestone, issueNumbers);
        break;
      
      default:
        console.log('GitHub Projects Integration');
        console.log('');
        console.log('Commands:');
        console.log('  create-item-matching - Create Item Matching System project');
        console.log('  status <milestone>   - Get project status report');
        console.log('  link <milestone> <issues...> - Link issues to project');
        console.log('');
        console.log('Examples:');
        console.log('  npm run projects:create-item-matching');
        console.log('  npm run projects:status 1');
        console.log('  npm run projects:link 1 13 14 15');
        break;
    }
  }
}

// Run if called directly
if (require.main === module) {
  new GitHubProjectsIntegration().run().catch(console.error);
}

module.exports = GitHubProjectsIntegration;