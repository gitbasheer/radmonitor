# Team Quokka 2025 Updates - Quick Reference

## Team Overview
- **Ownership**: VH/Venture Home/vnext-dashboard
- **Part of**: Core Experience organization, US Independents
- **Primary RADsets**: venture-feed, venture-metrics, discover, venture-setup, wam-general

## Critical Updates (June 2025)

### 🚨 Silent Failure Incident (VNEXT-67248)
- **When**: June 9-17, 2025 (went undetected for ~1 week)
- **Impact**: RAD impressions dropped 18,500 → ~0
- **Affected Cards**: APMC, CreateGMB, StartSEO, PoyntSetup, Feed-Conversations
- **Root Cause**: Missing `planType` field in projectslite entity
- **Lesson**: Need per-RAD monitoring and synthesizer validation

### 🤖 GenAI Integration
- **Status**: Fully rolled out for venture-feed ranking
- **Next**: Adding DOP (Domain Protection) cards with $0.72 VPI
- **Experiments**: Testing 2, 4, or all cards vs no feed display

### 🔄 vnext-graph Migration
- **Progress**: venture-feed and venture-metrics migrated
- **Issues**: Field mismatches, currency inconsistencies
- **Todo**: Complete entity migration for all RADsets

## Current Work (June-July 2025)

### Active Development
1. **Airo Carousel RADs** - 11 new cards in 2 batches
2. **DOP Enhancement** - Dynamic pricing, social proof messaging
3. **Trigger Events** - Adding wasEligible-based events
4. **Event Tracking** - DOP experiment dashboard

### Recently Completed
- ✅ Domain Protection eligibility fix
- ✅ Metrics vnext-graph migration
- ✅ Mobile display issues resolved
- 🧪 Post-activation simplification in test

## ET Session Standards

### Schedule
- **When**: Mondays 2-3pm MST
- **Where**: #im-vnext-et-sessions
- **Who**: Cross-team testers (not familiar with feature)

### Recent ET Sessions
1. **DOP Card Testing** - Domain protection eligibility scenarios
2. **Metrics Insights** - AI-powered traffic change messaging
3. **Feed GenAI Guardrail** - Flat file audience validation

### Testing Checklist
- [ ] Use TLA (3-letter) test accounts
- [ ] Test multiple markets/languages
- [ ] Verify all tracking events fire
- [ ] Document with screenshots + shopper IDs
- [ ] Create bug tickets from findings

## Active Experiments

| Experiment | Purpose | Status |
|------------|---------|--------|
| ind_mon_dop_mwtg_card_vh | Domain Protection in feed | In Dev |
| vh-dashboard-feed-simplified | Test showing 2/4/all cards | Active |
| vh_airo_carousel_lifecycle | Simplify post-activation | Planning |

## Upcoming Projections (Q3-Q4 2025)

### Q3 2025 Focus
1. **DOP Monetization**
   - Social proof: "Join 250K+ customers"
   - Cart incentives: Free year for 3-year terms
   - Projected: $374K annual GCR lift

2. **OLA Integration**
   - Target: 130K OLA intenders
   - Opportunity: $7M+ potential
   - Via: Airo carousel optimization

3. **Infrastructure**
   - Zero-fill metrics data
   - Per-RAD monitoring
   - Synthesizer validation

### H2 2025 Themes
- **Customer Intelligence**: Enhanced targeting & personalization
- **Simplification**: Optimal feed sizes, streamlined journeys
- **Monetization**: 4 experiments/month target

## Key Metrics & Monitoring

### Dashboard Links
- **Kibana**: Event Horizon for RAD tracking
- **SPAQ**: Performance monitoring
- **Hivemind**: Experiment management

### Alert Thresholds
- Individual RAD drops > 50% baseline
- API latency > 1 second
- Error rate > 5%
- Empty response rate > baseline

### Current Performance
- GenAI ranking: ✅ Deployed
- API latency: ✅ < 1s
- Error rate: ✅ < 5%
- RAD monitoring: 🚧 Implementing

## Development Best Practices

### 1. Data Validation
```javascript
// Always check entity fields exist
if (!entities.projectslite?.planType) {
  logger.error('Missing required field', { radId, field: 'planType' });
  return false;
}
```

### 2. Entity Migration Support
```javascript
// Support both old and new structures
const planType = entities.projectslite?.planType ||
                 entities.projects?.planType ||
                 entities.vnextgraph?.account?.planType;
```

### 3. Experiment Tracking
```javascript
// Include index for feed position tracking
trackImpression(radId, {
  index: position,
  experiment: 'vh-dashboard-feed-simplified',
  treatment: cohort
});
```

## Team Resources

### Active on RADs
- Basheer Alkhalil: Post-mortem, vnext-graph
- Maurya Ramadurgam: Trigger events, DOP
- Shalaka Kadam: Event tracking, test plans
- Isabel Alvarado: WAM general updates

### Capacity
- Sprint velocity: 3-5 RAD stories
- ET sessions: Weekly commitment
- Experiment target: 4/month (Core Experience)

## Contact Information

- **Team Slack**: #team-quokka
- **On-call**: @quokka-oncall
- **ET Sessions**: #im-vnext-et-sessions
- **RAD Support**: #rad-support

## Quick Links
- [vnext-dashboard repo](https://github.com/gdcorp-im/vnext-dashboard)
- [RAD Admin](https://radar.uxp.godaddy.com)
- [Switchboard (Feature Flags)](https://switchboard.int.gdcorp.tools/vnext-dashboard)

## Risk Mitigation Priorities
1. Silent failure prevention via monitoring
2. Safe entity migration with flags
3. Experiment guardrails and rollback

## Success Metrics
- Zero silent failures (< 24hr detection)
- 100% vnext-graph migration by Q4
- 3-4% CVR lift from optimizations
- 4+ experiments per month
