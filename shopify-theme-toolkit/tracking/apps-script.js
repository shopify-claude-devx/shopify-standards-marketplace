// ================================================================
// SHOPIFY THEME TOOLKIT — USAGE TRACKING
// Google Apps Script
//
// SETUP STEPS (do once):
//   1. Open a new Google Sheet
//   2. Extensions → Apps Script → paste this entire file
//   3. Change TRACKING_TOKEN below to a secret string you choose
//   4. Run initializeSheets() manually (Run menu → initializeSheets)
//   5. Deploy → New deployment → Web App
//      Execute as: Me | Who has access: Anyone
//   6. Copy the Web App URL — this is SHOPIFY_TOOLKIT_TRACKING_URL
//      Current: https://script.google.com/macros/s/AKfycbxBQ90rMnmE-AYkQlaTF1XVretzK2pE2UN9XPgleOVHV-4BYwWaV0esQT6ymtGsjlvD7A/exec
//   7. Share the URL + token with your team for setup.sh
// ================================================================

const TRACKING_TOKEN = 'shopify-theme-toolkit';

const VALID_SKILLS = [
  'clarify', 'plan', 'execute', 'test', 'code-review',
  'fix', 'figma', 'compare', 'research', 'understand',
  'liquid-standards', 'section-standards', 'css-standards',
  'js-standards', 'theme-architecture'
];

// Skills grouped for column ordering in User Level sheet
const WORKFLOW_SKILLS    = ['clarify', 'plan', 'execute', 'test', 'code-review'];
const STANDALONE_SKILLS  = ['fix', 'figma', 'compare', 'research', 'understand'];
const STANDARDS_SKILLS   = ['liquid-standards', 'section-standards', 'css-standards', 'js-standards', 'theme-architecture'];


// ----------------------------------------------------------------
// HTTP ENDPOINT — receives POST from track-skill.sh
// ----------------------------------------------------------------

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    if (data.token !== TRACKING_TOKEN) {
      return jsonResponse({ error: 'Unauthorized' });
    }

    if (!VALID_SKILLS.includes(data.skill)) {
      return jsonResponse({ skipped: 'not a tracked skill' });
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const logSheet = ss.getSheetByName('Usage Log');

    logSheet.appendRow([
      new Date(data.timestamp),
      data.user    || 'unknown',
      data.skill,
      data.project || 'unknown'
    ]);

    refreshDashboards_();

    return jsonResponse({ success: true });

  } catch (err) {
    return jsonResponse({ error: err.message });
  }
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}


// ----------------------------------------------------------------
// DASHBOARD COMPUTATION
// ----------------------------------------------------------------

function refreshDashboards_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const logSheet = ss.getSheetByName('Usage Log');

  if (logSheet.getLastRow() < 2) return;

  const rows = logSheet
    .getRange(2, 1, logSheet.getLastRow() - 1, 4)
    .getValues();

  // ---- Aggregate raw data ----

  // skillStats[skill] = { count, users: Set, lastUsed }
  const skillStats = {};
  for (const skill of VALID_SKILLS) {
    skillStats[skill] = { count: 0, users: new Set(), lastUsed: null };
  }

  // userStats[user] = { skills: {skill: count}, lastActive }
  const userStats = {};

  for (const [timestamp, user, skill, project] of rows) {
    if (!skill || !VALID_SKILLS.includes(skill)) continue;

    // Skills
    skillStats[skill].count++;
    skillStats[skill].users.add(user);
    const ts = new Date(timestamp);
    if (!skillStats[skill].lastUsed || ts > skillStats[skill].lastUsed) {
      skillStats[skill].lastUsed = ts;
    }

    // Users
    if (!userStats[user]) {
      userStats[user] = {
        skills: Object.fromEntries(VALID_SKILLS.map(s => [s, 0])),
        lastActive: null
      };
    }
    userStats[user].skills[skill]++;

    if (!userStats[user].lastActive || ts > userStats[user].lastActive) {
      userStats[user].lastActive = ts;
    }
  }

  // Compute total uses per user
  for (const user of Object.keys(userStats)) {
    userStats[user].totalUses = Object.values(userStats[user].skills).reduce((a, b) => a + b, 0);
  }

  const tz = Session.getScriptTimeZone();
  const fmt = (d) => d ? Utilities.formatDate(d, tz, 'yyyy-MM-dd') : 'Never';
  const totalUses = Object.values(skillStats).reduce((a, s) => a + s.count, 0);

  writeSkillLevel_(ss, skillStats, totalUses, fmt);
  writeUserLevel_(ss, userStats, fmt);
}


// ---- Skill Level Sheet ----

function writeSkillLevel_(ss, skillStats, totalUses, fmt) {
  const sheet = ss.getSheetByName('Skill Level');
  sheet.clearContents();

  const header = ['Skill', 'Total Uses', '% of All', 'Unique Users', 'Last Used'];
  const sorted = [...VALID_SKILLS].sort((a, b) => skillStats[b].count - skillStats[a].count);

  const rows = [header];
  for (const skill of sorted) {
    const s = skillStats[skill];
    rows.push([
      skill,
      s.count,
      totalUses > 0 ? (s.count / totalUses * 100).toFixed(1) + '%' : '0%',
      s.users.size,
      fmt(s.lastUsed)
    ]);
  }

  sheet.getRange(1, 1, rows.length, header.length).setValues(rows);
  sheet.getRange(1, 1, 1, header.length).setFontWeight('bold');
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, header.length);
}


// ---- User Level Sheet ----

function writeUserLevel_(ss, userStats, fmt) {
  const sheet = ss.getSheetByName('User Level');
  sheet.clearContents();

  const skillColumns = [...WORKFLOW_SKILLS, ...STANDALONE_SKILLS, ...STANDARDS_SKILLS];
  const header = [
    'User',
    'Last Active',
    'Total Uses',
    ...skillColumns
  ];

  const sorted = Object.keys(userStats).sort(
    (a, b) => userStats[b].totalUses - userStats[a].totalUses
  );

  const rows = [header];
  for (const user of sorted) {
    const u = userStats[user];
    rows.push([
      user,
      fmt(u.lastActive),
      u.totalUses,
      ...skillColumns.map(s => u.skills[s] || 0)
    ]);
  }

  sheet.getRange(1, 1, rows.length, header.length).setValues(rows);

  // Bold header
  sheet.getRange(1, 1, 1, header.length).setFontWeight('bold');

  // Section dividers: color workflow skills blue, standalone green, standards purple
  const colOffset = 4; // first skill is column 4 (User=1, Last Active=2, Total Uses=3)
  colorRange_(sheet, 1, colOffset,                                             WORKFLOW_SKILLS.length,   '#d0e4ff'); // blue
  colorRange_(sheet, 1, colOffset + WORKFLOW_SKILLS.length,                   STANDALONE_SKILLS.length, '#d6f5d6'); // green
  colorRange_(sheet, 1, colOffset + WORKFLOW_SKILLS.length + STANDALONE_SKILLS.length, STANDARDS_SKILLS.length,  '#ede0ff'); // purple

  sheet.setFrozenRows(1);
  sheet.setFrozenColumns(1);
  sheet.autoResizeColumns(1, header.length);
}

function colorRange_(sheet, row, col, numCols, hex) {
  sheet.getRange(row, col, 1, numCols).setBackground(hex);
}


// ----------------------------------------------------------------
// ONE-TIME SETUP — run manually from the Apps Script editor
// ----------------------------------------------------------------

function initializeSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  function ensureSheet(name, headers) {
    let sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
    }
    if (headers) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
      sheet.setFrozenRows(1);
    }
    return sheet;
  }

  ensureSheet('Usage Log',   ['Timestamp', 'User', 'Skill', 'Project']);
  ensureSheet('Skill Level', null);
  ensureSheet('User Level',  null);

  // Remove default empty sheet if present
  const defaultSheet = ss.getSheetByName('Sheet1');
  if (defaultSheet && ss.getSheets().length > 1) {
    ss.deleteSheet(defaultSheet);
  }

  Logger.log('Done. Now deploy as Web App: Deploy → New deployment → Web App.');
  Logger.log('Token in use: ' + TRACKING_TOKEN);
  Logger.log('Copy the Web App URL — that is SHOPIFY_TOOLKIT_TRACKING_URL.');
}


// ----------------------------------------------------------------
// OPTIONAL: Set up an hourly auto-refresh trigger
// Run once from the Apps Script editor if you want background refresh
// ----------------------------------------------------------------

function createHourlyTrigger() {
  ScriptApp.newTrigger('refreshDashboards_')
    .timeBased()
    .everyHours(1)
    .create();
  Logger.log('Hourly refresh trigger created.');
}
