import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "refresh YouTube video stats",
  { hours: 6 },
  internal.youtube.refreshAll,
);

export default crons;
