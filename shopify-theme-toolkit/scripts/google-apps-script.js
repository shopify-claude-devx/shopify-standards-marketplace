/**
 * Shopify Theme Toolkit — Skill Analytics
 *
 * SETUP:
 * 1. Create a new Google Sheet
 * 2. Go to Extensions → Apps Script
 * 3. Paste this entire script
 * 4. Set the API_KEY value below
 * 5. Deploy → New Deployment → Web app → Execute as: Me → Access: Anyone
 * 6. Copy the deployment URL
 */

var API_KEY = "4ca324ff71d45fd9a55adb24da2b1d8a32acb086";

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    if (data.api_key !== API_KEY) {
      return respond({ status: "unauthorized" });
    }

    if (!data.user || !data.skill) {
      return respond({ status: "error", message: "missing fields" });
    }

    var sheet = getOrCreateSheet("Usage", ["User", "Skill", "Plugin"]);
    sheet.appendRow([
      sanitize(data.user),
      sanitize(data.skill),
      sanitize(data.plugin || "shopify-theme-toolkit"),
    ]);

    return respond({ status: "ok" });
  } catch (err) {
    return respond({ status: "error", message: err.message });
  }
}

function sanitize(value) {
  if (typeof value !== "string") return value || "";
  if (/^[=+\-@\t\r]/.test(value)) return "'" + value;
  return value;
}

function getOrCreateSheet(name, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function respond(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}

function doGet() {
  return respond({ status: "ok", message: "Analytics webhook active" });
}
