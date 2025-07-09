# Team Quokka MCP

## Overview

Specialized Model Context Protocol (MCP) server designed specifically for **Team Quokka** at GoDaddy. This MCP provides AI-powered tools tailored to the team's RAD (Rapid API Development) monitoring, experiment management, and DOP (Domain Protection) operations.

## Team Context

- **Ownership:** VH/Venture Home/vnext-dashboard
- **Organization:** Core Experience, US Independents
- **Primary RADsets:** venture-feed, venture-metrics, discover, venture-setup, wam-general
- **Key Goals:** DOP monetization, silent failure prevention, vnext-graph migration

## Available Tools

### 1. `detectSilentFailures`
**Purpose:** Monitor RAD impressions for silent failures and drops
**Critical Context:** Prevents incidents like the June 9-17, 2025 failure (18,500 → 0 impressions)

**Parameters:**
- `radsets` - RAD sets to monitor (default: all Team Quokka RADsets)
- `threshold` - Drop threshold (0-1, default: 0.5 for 50% drop)
- `timeWindow` - Analysis window (default: "24h")

**Example:**
```
detectSilentFailures({
  radsets: ["venture-feed", "venture-metrics"],
  threshold: 0.3
})
```

### 2. `manageDOPExperiment`
**Purpose:** Manage Domain Protection experiments and social proof testing
**Team Goal:** $374K annual GCR lift from DOP optimization

**Parameters:**
- `action` - 'status', 'start', 'stop', 'analyze'
- `experiment` - DOP experiment ID (default: ind_mon_dop_mwtg_card_vh)
- `socialProof` - Enable "Join 250K+ customers" messaging
- `cartIncentive` - Enable cart term incentives

**Example:**
```
manageDOPExperiment({
  action: "analyze",
  socialProof: true
})
```

### 3. `validateEntityMigration`
**Purpose:** Validate vnext-graph entity migration status and field consistency
**Critical Context:** Missing `planType` field caused the June silent failure

**Parameters:**
- `entity` - 'projectslite', 'vnextgraph', 'all'
- `checkFields` - Critical fields to validate (default: ['planType', 'currency', 'domain'])
- `environment` - 'dev', 'test', 'prod'

**Example:**
```
validateEntityMigration({
  entity: "all",
  checkFields: ["planType", "currency"]
})
```

### 4. `generateTeamReport`
**Purpose:** Generate status reports for stakeholders and leadership

**Parameters:**
- `reportType` - 'weekly', 'sprint', 'experiment', 'health'
- `includeMetrics` - Include performance metrics
- `stakeholders` - Target audience

**Example:**
```
generateTeamReport({
  reportType: "weekly",
  stakeholders: ["leadership", "core-experience"]
})
```

## Q3 2025 Team Goals

### 1. **DOP Monetization** 💰
- **Target:** $374K annual GCR lift
- **Strategy:** Social proof ("Join 250K+ customers") + cart incentives
- **Owner:** Maurya Ramadurgam

### 2. **OLA Integration** 🎯
- **Target:** 130K OLA intenders
- **Opportunity:** $7M+ potential
- **Method:** Airo carousel optimization

### 3. **Silent Failure Prevention** 🚨
- **Goal:** Zero failures, <24hr detection
- **Implementation:** Per-RAD monitoring + validation
- **Owner:** Basheer Alkhalil

### 4. **Experiment Velocity** 🧪
- **Target:** 4+ experiments per month
- **Focus:** Feed simplification, DOP social proof
- **Success Metric:** 3-4% CVR lift

## Team Members & Focus Areas

- **Basheer Alkhalil** - vnext-graph migration, post-mortem
- **Maurya Ramadurgam** - DOP experiments, trigger events
- **Shalaka Kadam** - Event tracking, test plans, dashboards
- **Isabel Alvarado** - WAM general updates

## Critical Learnings Applied

### June 2025 Silent Failure Incident
- **Duration:** 8 days undetected
- **Impact:** 18,500 → 0 impressions
- **Root Cause:** Missing `planType` field in projectslite entity
- **Prevention:** Individual RAD monitoring, field validation

### Best Practices Implemented
1. **Per-RAD monitoring** instead of aggregate only
2. **Entity field validation** before synthesizer execution
3. **Real-time alerting** to @quokka-oncall
4. **Experiment coordination** with migration work

## Usage Examples

### Morning Health Check
```javascript
// Check all Team Quokka RADsets for issues
await detectSilentFailures({
  radsets: ["venture-feed", "venture-metrics", "discover", "venture-setup", "wam-general"],
  threshold: 0.5
});
```

### DOP Experiment Status
```javascript
// Get current DOP experiment performance
await manageDOPExperiment({
  action: "status",
  experiment: "ind_mon_dop_mwtg_card_vh"
});
```

### Migration Validation
```javascript
// Validate critical fields before deployment
await validateEntityMigration({
  entity: "all",
  checkFields: ["planType", "currency", "domain"],
  environment: "prod"
});
```

### Weekly Status Report
```javascript
// Generate comprehensive team status
await generateTeamReport({
  reportType: "weekly",
  includeMetrics: true,
  stakeholders: ["leadership", "core-experience"]
});
```

## Installation & Setup

1. **Install dependencies:**
```bash
cd ~/mcp-servers/team-quokka
npm install
```

2. **Test the MCP:**
```bash
node index.js
```

3. **Add to Cursor configuration:**
```json
{
  "mcpServers": {
    "team-quokka": {
      "command": "node",
      "args": ["~/mcp-servers/team-quokka/index.js"]
    }
  }
}
```

## Integration with Other MCPs

Team Quokka MCP works alongside:
- **RAD Monitor MCP** - Real-time monitoring
- **RAD Analytics MCP** - Deep analysis
- **Formula Builder MCP** - Formula creation
- **Atlassian MCP** - Jira/Confluence documentation

## Team Resources

- **Slack:** #team-quokka
- **On-call:** @quokka-oncall
- **ET Sessions:** Mondays 2-3pm MST (#im-vnext-et-sessions)
- **Dashboard:** DOP experiment tracking (Shalaka)

## Success Metrics

- ✅ Zero silent failures (<24hr detection)
- ✅ $374K+ DOP revenue lift
- ✅ 100% vnext-graph migration by Q4
- ✅ 4+ experiments per month
- ✅ 3-4% CVR improvement from optimizations

## Support

For issues specific to Team Quokka operations:
1. Check Team Quokka context in `mcp-formula-builder/TEAM_QUOKKA_2025_UPDATES.md`
2. Review recent RAD summary in `mcp-formula-builder/QUOKKA_RECENT_RAD_SUMMARY.md`
3. Alert @quokka-oncall for critical issues
4. Use #team-quokka for general questions

---

**Version:** 1.0.0
**Last Updated:** June 28, 2025
**Status:** Production Ready ✅
