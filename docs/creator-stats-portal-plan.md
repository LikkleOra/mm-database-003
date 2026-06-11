# Creator Stats Portal

The Creator Stats Portal is a performance reporting layer that aggregates data from partner-exported CSV files. It mirrors the "SIGMA 3000 Creator Stats Portal" and provides internal visibility into creator performance across multiple platforms.

## Key Features

- **CSV Import Source of Truth**: Data is primarily sourced from partner-provided CSV exports.
- **Period Support**: Tracks performance for two distinct periods:
    - **Bonus Collection**: Full month or custom performance snapshots.
    - **Mid Month**: Performance from the 1st to the 15th of the month.
- **Aggregate Metrics**: Real-time totals for orders, views (total and US-specific), affiliate clicks, and posts.
- **Platform Breakdown**: Detailed views for Facebook, Instagram, TikTok, Threads, and YouTube.
- **Creator Linking**: Imported stats are automatically linked to existing creator records in the database via Discord handle matching.

## Data Model

### `creator_stats` table
Stores individual performance rows. Key fields include:
- `creatorId`: Reference to the `creators` table.
- `discordHandle`: Normalized handle used for matching and display.
- `month`: The reporting period (formatted as `YYYY-MM`).
- `period`: `bonus_collection` or `mid_month`.
- `retainer`: Base pay for the creator.
- `directOrders`, `indirectOrders`, `totalOrders`: Performance metrics.
- Platform views: Views and US-specific views for each platform.

## Import Workflow

1. Navigate to **Import Creators** in the sidebar.
2. Select the **Creator Stats** tab.
3. Upload a CSV file exported from the partner portal.
4. **Validation**: The system detects the reporting period from the filename (e.g., "mid-month" or "bonus").
5. **Deduplication**: If an entry for the same creator, month, and period already exists, the system will **update** the record instead of creating a duplicate.
6. **Confirmation**: Preview the parsed data before confirming the import.

## Dashboard Usage

1. Select **Creator Stats** from the sidebar.
2. Toggle between **Bonus Collection** and **Mid Month** tabs.
3. Use the **Campaign Toggle** (Afina/Sigma) to filter data.
4. Filter by **Month** using the date selector.
5. Use the **Search** box to find specific creators.
6. Click **Export CSV** to download the currently filtered view.

## Backend Implementation

- **File**: `convex/creator_stats.ts`
- **Mutations**: `bulkImport`
- **Queries**: `list`, `getSummary`
- **Indexes**: `by_campaign_period_month`, `by_discord`
