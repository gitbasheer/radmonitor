# ET (Exploratory Testing) Session Template

## Overview
This template is based on Team Quokka's ET session practices for vnext-dashboard/Venture Home features.

---

## Experiment Information

**Design Document**: [Link to design doc]
**Epic**: [VNEXT-XXXXX]
**Hivemind Experiment**: [https://hivemind.gdcorp.tools/experiments/{experiment-id}/settings?env=test]
**Feature Flag**: [Switchboard link if applicable]

## Pre-requisites

### Environment Setup
- [ ] Feature flag enabled in TEST environment
- [ ] Test accounts created (TLA - 3 letter accounts preferred)
- [ ] Hivemind experiment enabled
- [ ] All dependencies deployed

### Required Test Accounts
| Account Type | Shopper ID | Venture ID | Purpose |
|--------------|------------|------------|---------|
| New Airo user | | | Test new user flow |
| Existing WAM | | | Test existing customer |
| AAP customer | | | Test AAP-specific logic |
| Reseller | | | Test reseller exclusions |

## Eligibility Criteria

### Inclusion Criteria
- [ ] Market: [e.g., en-US, all markets]
- [ ] Product: [e.g., Airo, WAM, specific venture types]
- [ ] User state: [e.g., published site, new customer]
- [ ] Device: [Desktop/Mobile/Both]

### Exclusion Criteria
- [ ] [List any exclusions]
- [ ] [e.g., AAP customers, resellers]

## Test Scenarios

### Scenario 1: [Name]
**Setup**: [Description of initial state]
**Steps**:
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Expected Result**: [What should happen]
**Actual Result**: [ ]
**Pass/Fail**: [ ]

### Scenario 2: [Name]
[Repeat format above]

## Experiment Variants

### Control
- Description: [What control users see]
- Key differences: [List key points]

### Treatment 1
- Description: [What treatment users see]
- Key differences: [List changes from control]

### Treatment 2 (if applicable)
- Description: [What treatment users see]
- Key differences: [List changes from control]

## Event Tracking Verification

### Impression Events
- [ ] `pandc.vnext.recommendations.{radset}.{radId}.impression`
- [ ] Include index for feed position (e.g., `index_1`)
- [ ] Verify experiment trigger event fires

### Click Events
- [ ] Primary CTA: `.click`
- [ ] Secondary actions: `.{action}_click`
- [ ] Verify custom properties included

### Custom Properties to Verify
```javascript
{
  radId: "Feed-Example",
  radset: "venture-feed",
  index: 1,
  experiment: "experiment-id",
  treatment: "control|treatment1|treatment2"
}
```

## Bug Reporting Template

### Bug Description
**Reporter**: [Your name]
**Date/Time**: [When found]
**Severity**: [P1/P2/P3]

**Description**: [Clear description of the issue]

**Steps to Reproduce**:
1. [Step 1]
2. [Step 2]

**Expected Behavior**: [What should happen]
**Actual Behavior**: [What actually happened]

**Environment Details**:
- Shopper ID:
- Venture Name/ID:
- Browser/Device:
- Screenshot/Video: [Link or attach]

## ET Session Checklist

### Before Session
- [ ] Test plan reviewed by PM/UX
- [ ] Hivemind experiment configured
- [ ] Test accounts prepared
- [ ] Slack thread created in #im-vnext-et-sessions
- [ ] Session scheduled (Mondays 2-3pm MST preferred)

### During Session
- [ ] Cross-team testers included (not familiar with feature)
- [ ] All variants tested
- [ ] Events tracked in browser console
- [ ] Screenshots/videos captured
- [ ] Bugs documented in real-time

### After Session
- [ ] All bugs logged in JIRA
- [ ] Summary posted to Slack thread
- [ ] Follow-up tickets created
- [ ] PM/UX notified of findings

## Common Issues to Check

### RAD Display Issues
- [ ] Cards showing for ineligible users
- [ ] Cards NOT showing for eligible users
- [ ] Incorrect card ordering
- [ ] Missing images or broken layouts

### Data Issues
- [ ] Missing entity fields (e.g., planType)
- [ ] Incorrect synthesizer logic
- [ ] Entity migration issues (projects vs vnext-graph)

### Tracking Issues
- [ ] Missing impression events
- [ ] Incorrect event properties
- [ ] Trigger events not firing

### Performance Issues
- [ ] Slow RAD loading
- [ ] API timeouts
- [ ] Rendering delays

## Additional Resources

- **Kibana Dashboard**: [Event Horizon link]
- **FullStory Session**: [Recording link]
- **RAD Admin**: https://radar.uxp.godaddy.com
- **Team Slack**: #team-quokka
- **ET Sessions Channel**: #im-vnext-et-sessions

---

## Notes Section
[Space for additional observations, questions, or concerns during testing]
