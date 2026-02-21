// Seed data with a mix of phases and energy states
// Dates relative to "now" for meaningful energy calculations
function daysFromNow(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

export const SEED_DATA = [
  {
    id: 'seed-1',
    name: 'Aprajit Kar',
    role: 'Associate Director, Product Design - UX',
    color: '#E8422F',
    tasks: [
      {
        id: 'task-1a',
        name: 'Design System Overhaul',
        description: 'Restructure core design system components and tokens',
        discoveryPercent: 35,
        executionPercent: 65,
        expectedDate: daysFromNow(14),
        percentComplete: 55
      },
      {
        id: 'task-1b',
        name: 'UX Audit',
        description: 'Audit existing user flows for friction points',
        discoveryPercent: 70,
        executionPercent: 30,
        expectedDate: daysFromNow(7),
        percentComplete: 20
      }
    ]
  },
  {
    id: 'seed-2',
    name: 'Atul Kumar',
    role: 'Associate Director, Product Design',
    color: '#0078D7',
    tasks: [
      {
        id: 'task-2a',
        name: 'User Research Sprint',
        description: 'Conduct user interviews and synthesize findings',
        discoveryPercent: 85,
        executionPercent: 15,
        expectedDate: daysFromNow(-5),
        percentComplete: 40
      },
      {
        id: 'task-2b',
        name: 'Component Library v3',
        description: 'Update component library with new patterns',
        discoveryPercent: 20,
        executionPercent: 80,
        expectedDate: daysFromNow(21),
        percentComplete: 10
      }
    ]
  },
  {
    id: 'seed-3',
    name: 'Elson Jithesh Dsouza',
    role: 'Product Design Manager',
    color: '#FF6F00',
    tasks: [
      {
        id: 'task-3a',
        name: 'Dashboard Redesign',
        description: 'Rebuild analytics dashboard with new visual language',
        discoveryPercent: 15,
        executionPercent: 85,
        expectedDate: daysFromNow(10),
        percentComplete: 72
      }
    ]
  },
  {
    id: 'seed-4',
    name: 'Sindhu Shivaprasad',
    role: 'Lead Product Content Designer',
    color: '#9C27B0',
    tasks: [
      {
        id: 'task-4a',
        name: 'Content Strategy Research',
        description: 'Research content patterns and voice guidelines',
        discoveryPercent: 75,
        executionPercent: 25,
        expectedDate: daysFromNow(-10),
        percentComplete: 30
      },
      {
        id: 'task-4b',
        name: 'Microcopy Overhaul',
        description: 'Rewrite error messages and empty states across product',
        discoveryPercent: 40,
        executionPercent: 60,
        expectedDate: daysFromNow(5),
        percentComplete: 15
      }
    ]
  },
  {
    id: 'seed-5',
    name: 'Surabhi Vinod Manchalwar',
    role: 'Product Design Manager',
    color: '#00BCD4',
    tasks: [
      {
        id: 'task-5a',
        name: 'Onboarding Flow Redesign',
        description: 'Redesign first-time user onboarding experience',
        discoveryPercent: 25,
        executionPercent: 75,
        expectedDate: daysFromNow(3),
        percentComplete: 65
      }
    ]
  },
  {
    id: 'seed-6',
    name: 'Yugendran Muthuvel',
    role: 'Design Head, Share.Market',
    color: '#3F51B5',
    tasks: [
      {
        id: 'task-6a',
        name: 'Share.Market Visual Refresh',
        description: 'Lead visual design refresh for Share.Market platform',
        discoveryPercent: 70,
        executionPercent: 30,
        expectedDate: daysFromNow(2),
        percentComplete: 50
      },
      {
        id: 'task-6b',
        name: 'Competitive Analysis',
        description: 'Deep dive on competitor trading platform UX',
        discoveryPercent: 90,
        executionPercent: 10,
        expectedDate: daysFromNow(-3),
        percentComplete: 60
      }
    ]
  }
];
