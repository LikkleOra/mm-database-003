/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Creator, Activity, User } from './types';

export const MOCK_USERS: User[] = [
  { id: 'u1', name: 'Admin User', email: 'admin@shah.com', role: 'admin' },
  { id: 'u2', name: 'Manager Sarah', email: 'sarah@shah.com', role: 'manager' },
];

export const MOCK_CREATORS: Creator[] = [
  {
    id: 'c1',
    name: 'Achetr',
    discordHandle: 'achterkamper97',
    tier: 'Silver',
    isActive: true,
    commissionRate: 1,
    accounts: [
      { platform: 'TikTok', handle: 'achetr_ugc', url: '#' },
      { platform: 'Instagram', handle: 'achetr.content', url: '#' }
    ],
    joinedAt: '2026-01-15T10:00:00Z',
    metrics: {
      mtd: { gmv: 12540, posts: 12, lives: 2, orders: 450 },
      sevenDay: { gmv: 3420, posts: 4, lives: 1, orders: 120 }
    },
    managerId: 'u2'
  },
  {
    id: 'c2',
    name: 'SarahContent',
    discordHandle: 'sarah_ugc_99',
    tier: 'Gold',
    isActive: true,
    commissionRate: 2,
    accounts: [
      { platform: 'TikTok', handle: 'sarah_skincare', url: '#' }
    ],
    joinedAt: '2026-02-01T10:00:00Z',
    metrics: {
      mtd: { gmv: 45200, posts: 24, lives: 8, orders: 1800 },
      sevenDay: { gmv: 12400, posts: 6, lives: 2, orders: 520 }
    }
  },
  {
    id: 'c3',
    name: 'Mikey Creator',
    discordHandle: 'mikey_vlog',
    tier: 'Bronze',
    isActive: false,
    commissionRate: 1,
    accounts: [
      { platform: 'YouTube', handle: 'mikeyvlogs', url: '#' }
    ],
    joinedAt: '2026-03-10T10:00:00Z',
    metrics: {
      mtd: { gmv: 1200, posts: 2, lives: 0, orders: 45 },
      sevenDay: { gmv: 0, posts: 0, lives: 0, orders: 0 }
    }
  },
  {
    id: 'c4',
    name: 'Lila Grace',
    discordHandle: 'lila_g',
    tier: 'Platinum',
    isActive: true,
    commissionRate: 3,
    accounts: [
      { platform: 'TikTok', handle: 'lila_fashion', url: '#' },
      { platform: 'Instagram', handle: 'lila.grace', url: '#' }
    ],
    joinedAt: '2025-11-20T10:00:00Z',
    metrics: {
      mtd: { gmv: 89000, posts: 30, lives: 12, orders: 3200 },
      sevenDay: { gmv: 21000, posts: 8, lives: 3, orders: 850 }
    }
  }
];

export const MOCK_ACTIVITIES: Activity[] = [
  {
    id: 'a1',
    creatorId: 'c1',
    type: 'win',
    title: 'TikTok Viral Moment',
    description: 'Video reached 100k views, GMV spiked by $2k in 24h.',
    recordedBy: 'u2',
    recordedAt: '2026-05-14T14:30:00Z',
    impact: 'high'
  },
  {
    id: 'a2',
    creatorId: 'c1',
    type: 'adjustment',
    title: 'Commission Bump',
    description: 'Raised from 1% to 1.5% due to consistent performance.',
    recordedBy: 'u2',
    recordedAt: '2026-05-15T09:00:00Z'
  },
  {
    id: 'a3',
    creatorId: 'c3',
    type: 'loss',
    title: 'Inactive for 7 days',
    description: 'Creator hasn\'t responded to Discord messages.',
    recordedBy: 'u2',
    recordedAt: '2026-05-13T16:00:00Z',
    impact: 'medium'
  }
];
