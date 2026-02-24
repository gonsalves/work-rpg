export const CONFIG = {
  // External services
  EMAIL_DOMAIN: 'phonepe.com',
  GOOGLE_SHEET_URL: 'https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit',
  GOOGLE_SHEET_ID: '',  // Paste your sheet ID here

  // Data source: 'seed' | 'google-sheets'
  // Switch to 'google-sheets' once GOOGLE_SHEET_ID is set
  DATA_SOURCE: 'seed',
  SYNC_INTERVAL_MS: 60000,

  // Map
  MAP_SIZE: 80,
  BASE_RADIUS: 3,

  // Unit sight
  SCOUT_SIGHT_RADIUS: 3,
  GATHER_SIGHT_RADIUS: 1,
};
