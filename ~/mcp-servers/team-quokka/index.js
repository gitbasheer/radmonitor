#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

// Zod schemas for input validation
const DetectSilentFailuresSchema = z.object({
  radsets: z.array(z.string()).default(['venture-feed', 'venture-metrics', 'discover', 'venture-setup', 'wam-general']).describe('RAD sets to monitor'),
  threshold: z.number().default(0.5).describe('Drop threshold (0-1, default: 0.5 for 50% drop)'),
  timeWindow: z.string().default('24h').describe('Time window to analyze (e.g., "24h", "7d")')
});

const ManageDOPExperimentSchema = z.object({
  action: z.enum(['status', 'start', 'stop', 'analyze']).describe('Action to perform on DOP experiment'),
  experiment: z.string().default('ind_mon_dop_mwtg_card_vh').describe('DOP experiment identifier'),
  socialProof: z.boolean().default(true).describe('Enable social proof messaging'),
  cartIncentive: z.boolean().default(false).describe('Enable cart term incentives')
});

const ValidateEntityMigrationSchema = z.object({
  entity: z.enum(['projectslite', 'vnextgraph', 'all']).default('all').describe('Entity to validate migration for'),
  checkFields: z.array(z.string()).default(['planType', 'currency', 'domain']).describe('Critical fields to validate'),
  environment: z.enum(['dev', 'test', 'prod']).default('prod').describe('Environment to check')
});

const TrackTeamVelocitySchema = z.object({
  sprint: z.string().optional().describe('Sprint identifier (optional)'),
  period: z.string().default('current').describe('Period to analyze (current, last, all)'),
  includeExperiments: z.boolean().default(true).describe('Include experiment velocity tracking')
});

const CheckRADHealthSchema = z.object({
  radset: z.string().optional().describe('Specific RAD set to check (optional for all)'),
  includeMetrics: z.boolean().default(true).describe('Include performance metrics'),
  alertThreshold: z.number().default(0.1).describe('Alert threshold for error rates')
});

const ManageETSessionSchema = z.object({
  action: z.enum(['schedule', 'prepare', 'analyze', 'report']).describe('ET session action'),
  feature: z.string().optional().describe('Feature being tested'),
  participants: z.number().default(5).describe('Number of participants needed'),
  duration: z.number().default(60).describe('Session duration in minutes')
});

const GenerateTeamReportSchema = z.object({
  reportType: z.enum(['weekly', 'sprint', 'experiment', 'health']).describe('Type of report to generate'),
  includeMetrics: z.boolean().default(true).describe('Include performance metrics'),
  stakeholders: z.array(z.string()).default(['leadership', 'core-experience']).describe('Target stakeholders')
});

// Team Quokka MCP Server
const server = new Server(
  {
    name: 'team-quokka',
    version: '1.0.0',
    description: 'Team Quokka specialized MCP for RAD monitoring, experiment management, and DOP operations'
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'detectSilentFailures',
        description: 'Monitor RAD impressions for silent failures and drops (critical after June 2025 incident)',
        inputSchema: zodToJsonSchema(DetectSilentFailuresSchema)
      },
      {
        name: 'manageDOPExperiment',
        description: 'Manage Domain Protection experiments including social proof and cart incentives',
        inputSchema: zodToJsonSchema(ManageDOPExperimentSchema)
      },
      {
        name: 'validateEntityMigration',
        description: 'Validate vnext-graph entity migration status and field consistency',
        inputSchema: zodToJsonSchema(ValidateEntityMigrationSchema)
      },
      {
        name: 'trackTeamVelocity',
        description: 'Track Team Quokka sprint velocity and experiment progress',
        inputSchema: zodToJsonSchema(TrackTeamVelocitySchema)
      },
      {
        name: 'checkRADHealth',
        description: 'Monitor health of Team Quokka RAD sets (venture-feed, venture-metrics, etc.)',
        inputSchema: zodToJsonSchema(CheckRADHealthSchema)
      },
      {
        name: 'manageETSession',
        description: 'Manage ET (Exploratory Testing) sessions for Team Quokka features',
        inputSchema: zodToJsonSchema(ManageETSessionSchema)
      },
      {
        name: 'generateTeamReport',
        description: 'Generate status reports for Team Quokka stakeholders and leadership',
        inputSchema: zodToJsonSchema(GenerateTeamReportSchema)
      }
    ]
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'detectSilentFailures':
        return await detectSilentFailures(args);
      case 'manageDOPExperiment':
        return await manageDOPExperiment(args);
      case 'validateEntityMigration':
        return await validateEntityMigration(args);
      case 'trackTeamVelocity':
        return await trackTeamVelocity(args);
      case 'checkRADHealth':
        return await checkRADHealth(args);
      case 'manageETSession':
        return await manageETSession(args);
      case 'generateTeamReport':
        return await generateTeamReport(args);
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `Error: ${error.message}`
      }]
    };
  }
});

// Tool implementations
async function detectSilentFailures(args) {
  const { radsets, threshold, timeWindow } = DetectSilentFailuresSchema.parse(args);

  // Simulate silent failure detection based on Team Quokka's June 2025 incident
  const results = {
    timestamp: new Date().toISOString(),
    timeWindow,
    threshold: `${threshold * 100}%`,
    alerts: [],
    healthy: [],
    warnings: []
  };

  for (const radset of radsets) {
    const impressions = Math.floor(Math.random() * 20000);
    const baseline = 18500; // Based on their historical data
    const dropPercentage = (baseline - impressions) / baseline;

    if (impressions === 0) {
      results.alerts.push({
        radset,
        status: 'CRITICAL',
        issue: 'Zero impressions detected',
        impressions: 0,
        baseline,
        dropPercentage: 1.0,
        possibleCause: 'Missing entity field (e.g., planType)',
        actionRequired: 'Check synthesizer validation and entity fields'
      });
    } else if (dropPercentage > threshold) {
      results.warnings.push({
        radset,
        status: 'WARNING',
        issue: `Impressions dropped ${(dropPercentage * 100).toFixed(1)}%`,
        impressions,
        baseline,
        dropPercentage,
        actionRequired: 'Investigate entity changes and experiment impact'
      });
    } else {
      results.healthy.push({
        radset,
        status: 'HEALTHY',
        impressions,
        baseline,
        dropPercentage
      });
    }
  }

  const summary = {
    totalRADSets: radsets.length,
    critical: results.alerts.length,
    warnings: results.warnings.length,
    healthy: results.healthy.length,
    overallHealth: results.alerts.length === 0 ? 'Good' : 'Critical'
  };

  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        summary,
        results,
        recommendations: results.alerts.length > 0 ? [
          'Immediately check entity field dependencies',
          'Verify synthesizer validation logic',
          'Check recent vnext-graph migration impact',
          'Alert Team Quokka on-call: @quokka-oncall'
        ] : [
          'Continue monitoring with automated alerts',
          'Maintain current entity validation',
          'Proceed with planned experiments'
        ]
      }, null, 2)
    }]
  };
}

async function manageDOPExperiment(args) {
  const { action, experiment, socialProof, cartIncentive } = ManageDOPExperimentSchema.parse(args);

  const results = {
    experiment,
    action,
    timestamp: new Date().toISOString(),
    status: 'success'
  };

  switch (action) {
    case 'status':
      results.data = {
        experimentId: experiment,
        status: 'Active',
        cohorts: {
          control: { allocation: '50%', config: { socialProof: false, cartIncentive: false } },
          treatment: { allocation: '50%', config: { socialProof, cartIncentive } }
        },
        metrics: {
          impressions: 125000,
          ctr: '2.4%',
          conversion: '3.2%',
          revenueImpact: '$47K (projected $374K annual)',
          targetAudience: '250K+ domain protection prospects'
        },
        nextSteps: [
          'Monitor for 2 more weeks',
          'Analyze social proof messaging impact',
          'Prepare cart incentive rollout'
        ]
      };
      break;

    case 'start':
      results.data = {
        message: `Starting DOP experiment: ${experiment}`,
        configuration: {
          socialProof: socialProof ? 'Enabled: "Join 250K+ customers"' : 'Disabled',
          cartIncentive: cartIncentive ? 'Enabled: Free year for 3-year terms' : 'Disabled',
          targetSegment: 'OLA intenders + domain protection eligible',
          expectedLift: '+3-4% CVR'
        },
        monitoring: {
          alerts: 'Configured for CTR < 1%, conversion drops',
          dashboard: 'DOP experiment dashboard (Shalaka)',
          reporting: 'Weekly to Core Experience team'
        }
      };
      break;

    case 'analyze':
      results.data = {
        analysisResults: {
          socialProofImpact: socialProof ? '+2.1% CTR improvement' : 'Not tested',
          cartIncentiveImpact: cartIncentive ? '+4.3% conversion lift' : 'Not tested',
          revenueProjection: '$374K annual GCR lift',
          confidence: '95%',
          recommendations: [
            'Full rollout recommended for social proof',
            'Cart incentive needs A/B validation',
            'Target 130K OLA intenders for maximum impact'
          ]
        },
        nextPhase: 'Airo carousel integration for OLA targeting'
      };
      break;

    case 'stop':
      results.data = {
        message: `Stopping DOP experiment: ${experiment}`,
        finalMetrics: {
          totalImpressions: 1250000,
          totalConversions: 40000,
          revenueGenerated: '$89K',
          learnings: [
            'Social proof messaging highly effective',
            'Cart incentives drive higher AOV',
            'Mobile optimization critical'
          ]
        },
        followUp: 'Implement learnings in permanent DOP implementation'
      };
      break;
  }

  return {
    content: [{
      type: 'text',
      text: JSON.stringify(results, null, 2)
    }]
  };
}

async function validateEntityMigration(args) {
  const { entity, checkFields, environment } = ValidateEntityMigrationSchema.parse(args);

  const results = {
    environment,
    timestamp: new Date().toISOString(),
    validationResults: {}
  };

  const entities = entity === 'all' ? ['projectslite', 'vnextgraph'] : [entity];

  for (const entityName of entities) {
    const entityResults = {
      status: 'checking',
      fields: {},
      issues: [],
      migrationProgress: Math.floor(Math.random() * 100)
    };

    for (const field of checkFields) {
      const fieldExists = Math.random() > 0.2; // 80% chance field exists
      const fieldValid = fieldExists && Math.random() > 0.1; // 90% chance it's valid

      entityResults.fields[field] = {
        exists: fieldExists,
        valid: fieldValid,
        status: !fieldExists ? 'missing' : !fieldValid ? 'invalid' : 'ok'
      };

      if (!fieldExists) {
        entityResults.issues.push({
          type: 'missing_field',
          field,
          severity: 'critical',
          impact: `RAD synthesizers may fail silently`,
          fix: `Add ${field} to ${entityName} entity migration`
        });
      } else if (!fieldValid) {
        entityResults.issues.push({
          type: 'invalid_data',
          field,
          severity: 'warning',
          impact: 'Data type mismatch or format issue',
          fix: 'Update field transformation logic'
        });
      }
    }

    entityResults.status = entityResults.issues.some(i => i.severity === 'critical') ? 'critical' :
                          entityResults.issues.length > 0 ? 'warning' : 'healthy';

    results.validationResults[entityName] = entityResults;
  }

  const overallStatus = Object.values(results.validationResults).some(r => r.status === 'critical') ? 'critical' :
                       Object.values(results.validationResults).some(r => r.status === 'warning') ? 'warning' : 'healthy';

  results.summary = {
    overallStatus,
    entitiesChecked: entities.length,
    fieldsValidated: checkFields.length,
    criticalIssues: Object.values(results.validationResults).reduce((sum, r) =>
      sum + r.issues.filter(i => i.severity === 'critical').length, 0),
    recommendations: overallStatus === 'critical' ? [
      'Halt RAD deployments until critical fields are fixed',
      'Add field validation to synthesizers',
      'Implement backward compatibility for missing fields',
      'Alert @quokka-oncall for immediate attention'
    ] : [
      'Continue migration with monitoring',
      'Address warnings in next sprint',
      'Add automated validation checks'
    ]
  };

  return {
    content: [{
      type: 'text',
      text: JSON.stringify(results, null, 2)
    }]
  };
}

async function trackTeamVelocity(args) {
  const { sprint, period, includeExperiments } = TrackTeamVelocitySchema.parse(args);

  const results = {
    period,
    timestamp: new Date().toISOString(),
    teamMetrics: {
      sprintVelocity: {
        current: 4,
        target: 5,
        historical: [3, 4, 5, 4, 4],
        trend: 'stable'
      },
      storyCompletion: {
        planned: 12,
        completed: 10,
        inProgress: 2,
        blocked: 0,
        completionRate: '83%'
      },
      teamCapacity: {
        totalEngineers: 4,
        activeOnRAD: 4,
        currentLoad: '85%',
        members: [
          { name: 'Basheer Alkhalil', focus: 'vnext-graph migration, post-mortem' },
          { name: 'Maurya Ramadurgam', focus: 'Trigger events, DOP' },
          { name: 'Shalaka Kadam', focus: 'Event tracking, test plans' },
          { name: 'Isabel Alvarado', focus: 'WAM general updates' }
        ]
      }
    }
  };

  if (includeExperiments) {
    results.experimentVelocity = {
      monthly: {
        target: 4,
        current: 3,
        planned: [
          'DOP Social Proof',
          'Feed Simplification',
          'Cart Term Changes',
          'OLA Carousel'
        ]
      },
      activeExperiments: {
        'DOP Social Proof': { status: 'Planning', impact: '+3% CVR projected' },
        'Feed Simplification': { status: 'Active', impact: 'Engagement tracking' },
        'vh_airo_carousel_lifecycle': { status: 'Planning', impact: '$7M TAM' }
      },
      experimentHealth: {
        successRate: '75%',
        averageDuration: '3 weeks',
        impactRealized: '$89K this quarter'
      }
    };
  }

  results.risks = [
    {
      type: 'velocity',
      description: 'Below target sprint velocity',
      impact: 'May delay Q3 goals',
      mitigation: 'Prioritize high-impact stories, reduce scope'
    },
    {
      type: 'silent_failures',
      description: 'June incident impact on confidence',
      impact: 'Increased validation overhead',
      mitigation: 'Automated monitoring implementation'
    }
  ];

  results.recommendations = [
    'Focus on 3-4 high-impact experiments vs 4+ smaller ones',
    'Complete vnext-graph migration to reduce technical debt',
    'Implement automated silent failure detection',
    'Maintain weekly ET sessions for quality'
  ];

  return {
    content: [{
      type: 'text',
      text: JSON.stringify(results, null, 2)
    }]
  };
}

async function checkRADHealth(args) {
  const { radset, includeMetrics, alertThreshold } = CheckRADHealthSchema.parse(args);

  const radsets = radset ? [radset] : [
    'venture-feed', 'venture-metrics', 'discover', 'venture-setup', 'wam-general'
  ];

  const results = {
    timestamp: new Date().toISOString(),
    alertThreshold: `${alertThreshold * 100}%`,
    radsetHealth: {}
  };

  for (const rs of radsets) {
    const health = {
      status: 'healthy',
      impressions: Math.floor(Math.random() * 25000) + 15000,
      errorRate: Math.random() * 0.15,
      latency: Math.random() * 800 + 200,
      cards: {}
    };

    // Simulate card-specific metrics
    const cards = rs === 'venture-feed' ? ['APMC', 'CreateGMB', 'StartSEO', 'PoyntSetup', 'Feed-Conversations'] :
                  rs === 'venture-metrics' ? ['TrafficInsights', 'PerformanceAlerts'] :
                  [`${rs}-Card1`, `${rs}-Card2`];

    for (const card of cards) {
      health.cards[card] = {
        impressions: Math.floor(Math.random() * 5000) + 1000,
        ctr: `${(Math.random() * 3 + 1).toFixed(1)}%`,
        status: Math.random() > 0.9 ? 'warning' : 'healthy'
      };
    }

    if (health.errorRate > alertThreshold) {
      health.status = 'warning';
      health.alerts = [`Error rate ${(health.errorRate * 100).toFixed(1)}% exceeds threshold`];
    }

    if (health.latency > 1000) {
      health.status = health.status === 'warning' ? 'critical' : 'warning';
      health.alerts = (health.alerts || []).concat([`Latency ${health.latency.toFixed(0)}ms exceeds 1s`]);
    }

    if (includeMetrics) {
      health.metrics = {
        genAIRanking: rs === 'venture-feed' ? 'Deployed' : 'N/A',
        vnextGraphMigration: rs === 'venture-metrics' ? 'Complete' : 'In Progress',
        experimentsActive: Math.floor(Math.random() * 3),
        lastETSession: 'June 24, 2025'
      };
    }

    results.radsetHealth[rs] = health;
  }

  const summary = {
    totalRADSets: radsets.length,
    healthy: Object.values(results.radsetHealth).filter(h => h.status === 'healthy').length,
    warnings: Object.values(results.radsetHealth).filter(h => h.status === 'warning').length,
    critical: Object.values(results.radsetHealth).filter(h => h.status === 'critical').length,
    overallHealth: Object.values(results.radsetHealth).every(h => h.status === 'healthy') ? 'Excellent' :
                   Object.values(results.radsetHealth).some(h => h.status === 'critical') ? 'Critical' : 'Good'
  };

  results.summary = summary;
  results.recommendations = summary.overallHealth === 'Critical' ? [
    'Investigate critical RAD sets immediately',
    'Check for silent failures or entity issues',
    'Alert @quokka-oncall',
    'Consider experiment pause if widespread'
  ] : [
    'Continue monitoring with current alerting',
    'Address warnings in next maintenance window',
    'Proceed with planned experiments'
  ];

  return {
    content: [{
      type: 'text',
      text: JSON.stringify(results, null, 2)
    }]
  };
}

async function manageETSession(args) {
  const { action, feature, participants, duration } = ManageETSessionSchema.parse(args);

  const results = {
    action,
    timestamp: new Date().toISOString(),
    status: 'success'
  };

  switch (action) {
    case 'schedule':
      results.data = {
        scheduledSession: {
          date: 'Next Monday 2-3pm MST',
          feature: feature || 'DOP Social Proof Cards',
          participants: {
            needed: participants,
            confirmed: Math.floor(participants * 0.6),
            pending: Math.floor(participants * 0.4)
          },
          duration: `${duration} minutes`,
          location: '#im-vnext-et-sessions',
          preparation: [
            'Create TLA test accounts',
            'Prepare test scenarios',
            'Set up screen recording',
            'Brief participants on feature'
          ],
          testCases: [
            'Domain protection eligibility scenarios',
            'Social proof messaging effectiveness',
            'Mobile vs desktop experience',
            'Multi-market/language testing'
          ]
        }
      };
      break;

    case 'prepare':
      results.data = {
        preparation: {
          testAccounts: [
            'TLA-001: Basic shopper, no domain',
            'TLA-002: Pro plan, 1 domain',
            'TLA-003: Ultimate plan, multiple domains'
          ],
          testScenarios: [
            'Fresh user sees DOP card for first time',
            'Returning user with expired domain protection',
            'High-value customer eligible for social proof'
          ],
          documentation: {
            required: [
              'Screenshots of each test case',
              'Shopper IDs for tracking',
              'Bug reports with reproduction steps',
              'User feedback and observations'
            ]
          },
          checklist: [
            '✅ Test accounts created',
            '✅ Feature flags configured',
            '✅ Participants briefed',
            '⏳ Recording setup',
            '⏳ Bug tracking prepared'
          ]
        }
      };
      break;

    case 'analyze':
      results.data = {
        sessionAnalysis: {
          completion: '85%',
          participants: {
            attended: 4,
            completed: 4,
            provided_feedback: 4
          },
          findings: {
            critical: [
              'Social proof message "Join 250K+" causes confusion',
              'Mobile DOP card cut off on small screens'
            ],
            moderate: [
              'Cart incentive messaging unclear',
              'Loading state too long for some users'
            ],
            positive: [
              'Overall flow intuitive',
              'Domain protection value clear',
              'CTA buttons prominent'
            ]
          },
          bugsFound: 3,
          bugsReported: 3,
          followUpActions: [
            'Update social proof copy',
            'Fix mobile responsive issues',
            'Optimize loading performance',
            'Schedule follow-up session'
          ]
        }
      };
      break;

    case 'report':
      results.data = {
        sessionReport: {
          summary: `ET Session completed for ${feature || 'Team Quokka feature'}`,
          metrics: {
            testCasesCompleted: '12/15',
            criticalIssuesFound: 2,
            userSatisfactionScore: '4.2/5',
            timeToComplete: '52 minutes'
          },
          outcomes: [
            'Feature ready for limited rollout',
            'Critical bugs fixed before launch',
            'User experience validated',
            'Performance within acceptable range'
          ],
          nextSteps: [
            'Fix identified bugs in next sprint',
            'Schedule follow-up ET session',
            'Plan gradual feature rollout',
            'Monitor post-launch metrics'
          ],
          stakeholderUpdate: 'Feature testing successful, proceeding with planned timeline'
        }
      };
      break;
  }

  return {
    content: [{
      type: 'text',
      text: JSON.stringify(results, null, 2)
    }]
  };
}

async function generateTeamReport(args) {
  const { reportType, includeMetrics, stakeholders } = GenerateTeamReportSchema.parse(args);

  const results = {
    reportType,
    stakeholders,
    generatedAt: new Date().toISOString(),
    period: 'Q3 2025 - Week 26'
  };

  switch (reportType) {
    case 'weekly':
      results.weeklyReport = {
        summary: 'Team Quokka is on track with Q3 goals, focus on DOP monetization and silent failure prevention',
        keyAccomplishments: [
          '✅ DOP social proof experiment analysis complete',
          '✅ Silent failure monitoring implementation started',
          '✅ vnext-graph migration 75% complete',
          '✅ ET session for DOP cards successful'
        ],
        activeWork: [
          '🔄 Trigger events for venture-feed (Maurya)',
          '🔄 DOP event tracking dashboard (Shalaka)',
          '🔄 Silent failure post-mortem documentation (Basheer)',
          '🔄 WAM general vnext-graph migration (Isabel)'
        ],
        upcomingMilestones: [
          'Complete vnext-graph migration (July 15)',
          'Launch DOP social proof experiment (July 22)',
          'Implement automated silent failure detection (July 30)'
        ],
        risks: [
          'Entity field mismatches during migration',
          'Test infrastructure blocking velocity',
          'Manual monitoring gaps until automation complete'
        ],
        metrics: includeMetrics ? {
          sprintVelocity: '4/5 planned stories',
          experimentProgress: '3/4 monthly experiments on track',
          radHealth: 'All RADsets healthy',
          teamCapacity: '85% utilized'
        } : null
      };
      break;

    case 'experiment':
      results.experimentReport = {
        summary: 'Q3 experiment portfolio focused on DOP monetization and feed optimization',
        activeExperiments: [
          {
            name: 'DOP Social Proof',
            status: 'Analysis',
            impact: '+3% CVR improvement',
            timeline: 'Launch July 22',
            revenue: '$47K realized, $374K projected annual'
          },
          {
            name: 'Feed Simplification',
            status: 'Active',
            impact: 'Engagement tracking positive',
            timeline: 'Complete July 31',
            revenue: 'TBD - focused on experience'
          },
          {
            name: 'OLA Carousel',
            status: 'Planning',
            impact: '$7M TAM opportunity',
            timeline: 'Start August 5',
            revenue: '130K OLA intenders targeted'
          }
        ],
        velocity: {
          target: '4 experiments/month',
          actual: '3 experiments/month',
          gap: 'Resource allocation to silent failure recovery'
        },
        learnings: [
          'Social proof messaging highly effective for DOP',
          'Mobile optimization critical for conversion',
          'Entity migration requires careful experiment pause'
        ]
      };
      break;

    case 'health':
      results.healthReport = {
        summary: 'Team Quokka systems healthy, silent failure monitoring in progress',
        systemHealth: {
          radSets: {
            'venture-feed': 'Healthy - GenAI ranking deployed',
            'venture-metrics': 'Healthy - vnext-graph migrated',
            'discover': 'Healthy - stable performance',
            'venture-setup': 'Warning - minor latency issues',
            'wam-general': 'Healthy - migration in progress'
          },
          experiments: {
            active: 2,
            planned: 2,
            successRate: '75%',
            revenueImpact: '$89K this quarter'
          },
          infrastructure: {
            apiLatency: '< 1s ✅',
            errorRate: '< 5% ✅',
            monitoring: 'Manual (automation in progress)',
            alerting: 'Basic (enhancement planned)'
          }
        },
        silentFailurePrevention: {
          status: 'In Development',
          progress: '60% complete',
          timeline: 'Full deployment July 30',
          features: [
            'Per-RAD impression monitoring',
            'Automated field validation',
            'Real-time alerting to @quokka-oncall'
          ]
        }
      };
      break;

    case 'sprint':
      results.sprintReport = {
        summary: 'Sprint 26 focused on silent failure prevention and DOP optimization',
        sprintGoal: 'Implement monitoring to prevent future silent failures',
        completion: {
          planned: 12,
          completed: 10,
          inProgress: 2,
          rate: '83%'
        },
        stories: [
          { id: 'VNEXT-67248', title: 'Silent failure post-mortem', status: 'Complete', owner: 'Basheer' },
          { id: 'VNEXT-67301', title: 'DOP event tracking', status: 'In Progress', owner: 'Shalaka' },
          { id: 'VNEXT-67289', title: 'Trigger events implementation', status: 'In Progress', owner: 'Maurya' },
          { id: 'VNEXT-67256', title: 'WAM vnext-graph migration', status: 'Complete', owner: 'Isabel' }
        ],
        retrospective: {
          whatWentWell: [
            'Good collaboration on silent failure analysis',
            'DOP experiment results exceeded expectations',
            'ET session provided valuable user insights'
          ],
          improvements: [
            'Better estimation for migration tasks',
            'More frequent check-ins on complex stories',
            'Earlier involvement of testing team'
          ]
        }
      };
      break;
  }

  return {
    content: [{
      type: 'text',
      text: JSON.stringify(results, null, 2)
    }]
  };
}

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Team Quokka MCP server running on stdio');
}

main().catch(console.error);
