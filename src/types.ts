/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Tier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum';

export type PostingStatus = 'posting_consistently' | 'posting_occasionally' | 'not_posting';

export interface SocialAccount {
  _id: string;
  platform: 'TikTok' | 'Instagram' | 'YouTube' | 'Facebook' | 'Twitch' | 'Threads';
  handle: string;
  url: string;
  postingStatus?: PostingStatus;
}

export interface MetricRollup {
  gmv: number;
  posts: number;
  lives: number;
  orders: number;
}

export interface Creator {
  id: string;
  name: string;
  discordHandle: string;
  tier: Tier;
  isActive: boolean;
  commissionRate: number; // The "1%" column in the original
  accounts: SocialAccount[];
  joinedAt: string;
  metrics: {
    mtd: MetricRollup;
    sevenDay: MetricRollup;
  };
  managerId?: string;
}

export type ActivityType = 'win' | 'loss' | 'observation' | 'adjustment';

export interface Activity {
  id: string;
  creatorId: string;
  type: ActivityType;
  title: string;
  description: string;
  recordedBy: string;
  recordedAt: string;
  impact?: 'high' | 'medium' | 'low';
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'viewer';
}
