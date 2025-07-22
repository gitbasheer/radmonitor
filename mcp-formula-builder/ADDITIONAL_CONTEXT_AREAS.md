# Additional Context Areas - Team Quokka RADs

## Overview
This document captures additional context areas discovered beyond the initial RAD system documentation, providing deeper technical, experimental, and operational insights.

## 1. GraphQL Queries and Entity Architecture

### GraphQL Query Structure
Team Quokka uses specific GraphQL patterns for entity fetching:

```javascript
// Example from Quokka RADsets graphQL queries
{
  appIds: [defaultAppId],
  entity: 'projectslite',
  radSets: ['discover'],
  query: `
    query GetVenture ($ventureId: UUID!){
      venture(ventureId: $ventureId) {
        id
        projects {
          group
          domain
          billing {
            id
          }
          product {
            // ... product fields
          }
        }
      }
    }
  `
}
```

### Entity Types and Usage
- **projects**: Legacy entity being phased out
- **projectslite**: Lightweight performance-optimized version
- **vnextgraph**: New GraphQL service with enhanced data
- **vnext-accounts**: Account and billing information
- **mktgasst**: Marketing assistant data
- **wsbvnext**: Website builder data

### Key Learning
The entity system is hierarchical, with synthesizers using "joinEntities" and "entityPick" to select needed data from multiple sources.

## 2. Active Experiments and Business Impact

### DOP (Domain Protection) Experiments

#### 1. Social Proof Messaging (VNEXT-67441)
- **Hypothesis**: Social proof increases CVR by 3%
- **Test**: "Join 250,000+ customers who protect their domains"
- **Projected Revenue**: $17,850 annually
- **Surfaces**: MyProducts, MyAccount, Domain Control Center

#### 2. Cart Term Incentives (VNEXT-67443)
- **Hypothesis**: Free year incentive increases 3-year term selection
- **Test**: Offer free year when switching from 3-year to 2-year
- **Projected Revenue**: $374,000 annually
- **Target**: 550,000 annual cart orders

#### 3. VH Dashboard DOP Card (VNEXT-64505)
- **Current Status**: In Development
- **Target**: 8.9M unique pageviews/year
- **Projected Impact**: $450k annual GCR with 10% CVR lift

### Key Business Metrics
- **DOP Average Price**: $17/year
- **Current DOP CVR**: 1.4% on VH Dashboard
- **Target Improvements**: 3-10% CVR lift across experiments

## 3. User Research and UX Insights

### Recent Findings
1. **International Markets**: Users don't understand features like SSL and Built-in SEO
2. **Header Flexibility**: Customers want more control over website headers
3. **Preview Pane**: Coming soon websites need clearer upgrade paths
4. **Mobile Issues**: RAD card images getting squished on mobile (fixed)

### Active UX Improvements
- Flex header layouts for websites
- Airo carousel hero card responsiveness
- International UPP (Upgrade Path) optimization
- Progressive bundling for Conversations

## 4. Technical Implementation Details

### RAD API Client Architecture
```javascript
// From rad-api-client documentation
// Higher-level abstraction for RAD API access
import { RadApiClient } from '@gdcorp-uxp/rad-api-client';

// Features:
// - Data denormalization
// - Request timeout handling
// - Built-in error handling
// - Caching strategies
```

### Synthesizer Optimization Patterns
```javascript
// Optimization to reduce response bloat
const synthesizer = (entities) => {
  // Pick only needed entity data
  const relevantData = entities.filter(e => e.type === 'projectslite');

  // Return minimal data for card rules
  return relevantData.map(data => ({
    id: data.id,
    eligible: checkEligibility(data),
    score: calculateScore(data)
  }));
};
```

### Performance Considerations
- RAD API response time target: < 1 second
- Entity fetch optimization through lightweight versions
- Synthesizer execution should be < 100ms
- Bulk impression handling issues (must push one at a time)

## 5. Monitoring and Performance Infrastructure

### SPAQ Platform Integration
- **Dashboard**: Venture Home uses GoDaddy's SPAQ for monitoring
- **Key Metrics**:
  - Speed: Page load times
  - Performance: API response times
  - Availability: Uptime tracking
  - Quality: Error rates

### Event Tracking Architecture
```javascript
// Standard EID structure
{namespace}.{product}.{component}.{radset}.{action}.{event_type}

// Example:
"pandc.vnext.recommendations.feed.feed_dop_protection.impression"
```

### Alert Thresholds
- Individual RAD impression drops > 50% baseline
- API latency > 1 second
- Error rate > 5%
- Empty response rate above baseline

## 6. Development Workflow and Tools

### RAD Development Tools
1. **RAD Admin**: radar.uxp.godaddy.com
2. **Card Authoring Tool (CAT)**: For creating/editing RADs
3. **Switchboard**: Feature flag management
4. **Hivemind**: Experiment management platform

### Testing Infrastructure
- **ET Sessions**: Weekly Monday 2-3pm MST
- **Test Accounts**: TLA (3-letter accounts) for easier management
- **Environments**: Test, Stage, Production
- **FullStory**: User session replay for debugging

## 7. Organizational Context

### Budget and Resources
- **Team Velocity**: 3-5 RAD stories per sprint
- **Experiment Target**: 4 experiments/month for Core Experience
- **Active Engineers**: 4 team members on RAD work

### Cross-Team Dependencies
- **Editor Team**: Uses wam-general RADset
- **Marketing Teams**: Depend on venture-feed for recommendations
- **Platform Teams**: RAD API, vnext-graph maintenance

## 8. Upcoming Technical Initiatives

### Q3-Q4 2025 Technical Roadmap

1. **Complete vnext-graph Migration**
   - Audit all RADsets for entity usage
   - Update synthesizer logic
   - Maintain backward compatibility

2. **Enhanced Monitoring**
   - Per-RAD performance dashboards
   - Automated synthesizer validation
   - Real-time alert system

3. **Performance Optimization**
   - Reduce entity payload sizes
   - Implement smarter caching
   - Optimize synthesizer execution

4. **Developer Experience**
   - Improve RAD testing tools
   - Better documentation
   - Automated validation

## 9. Lessons from Production Incidents

### Key Takeaways
1. **Validation is Critical**: Missing fields can cause silent failures
2. **Monitor Individual RADs**: Aggregate metrics hide problems
3. **Test Entity Changes**: Always validate field mappings
4. **Document Dependencies**: Keep clear records of data requirements

### Incident Response Process
1. Detection: Automated alerts or manual discovery
2. Triage: Assess impact and affected RADs
3. Mitigation: Feature flag rollback if needed
4. Root Cause: Detailed analysis
5. Prevention: Add validation and monitoring

## 10. Integration Points and APIs

### External System Dependencies
- **Product Graph**: Product ownership data
- **Offer Graph**: Pricing and offer information
- **Customer Stats API**: Metrics and analytics
- **Subscriptions API**: Billing and subscription data

### API Rate Limits and Performance
- Entity fetch timeout: 5 seconds
- Maximum entities per request: 10
- Cache TTL: Varies by entity (5min - 1hr)
- Retry strategy: Exponential backoff

## Conclusion

This additional context reveals a complex, mature system with:
- Strong technical infrastructure
- Active experimentation culture
- Clear business metrics and goals
- Ongoing modernization efforts
- Robust monitoring and testing practices

The key to success appears to be balancing stability with innovation while maintaining high performance and reliability standards.
