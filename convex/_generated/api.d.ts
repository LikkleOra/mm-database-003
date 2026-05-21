/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as activities from "../activities.js";
import type * as creators from "../creators.js";
import type * as crons from "../crons.js";
import type * as discord from "../discord.js";
import type * as http from "../http.js";
import type * as leaderboard from "../leaderboard.js";
import type * as payouts from "../payouts.js";
import type * as social_accounts from "../social_accounts.js";
import type * as submissions from "../submissions.js";
import type * as users from "../users.js";
import type * as videos from "../videos.js";
import type * as youtube from "../youtube.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  activities: typeof activities;
  creators: typeof creators;
  crons: typeof crons;
  discord: typeof discord;
  http: typeof http;
  leaderboard: typeof leaderboard;
  payouts: typeof payouts;
  social_accounts: typeof social_accounts;
  submissions: typeof submissions;
  users: typeof users;
  videos: typeof videos;
  youtube: typeof youtube;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
