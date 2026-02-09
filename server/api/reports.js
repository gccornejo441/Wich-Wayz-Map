import { executeQuery } from "./lib/db.js";
import { withDbUser } from "./lib/withAuth.js";
import {
  isMissingReportsTableError,
  mapReportRow,
  parsePositiveInt,
  REPORT_REASON_ACTION_MAP,
  sanitizeReason,
  VALID_MODERATOR_OUTCOMES,
  VALID_REPORT_REASONS,
  VALID_REPORT_STATUSES,
} from "./lib/reportModeration.js";

async function createReport(req, res) {
  const rawShopId = req.body?.shopId ?? req.body?.shop_id;
  const shopId = parsePositiveInt(rawShopId);
  const reason = sanitizeReason(req.body?.reason);
  const details =
    typeof req.body?.details === "string"
      ? req.body.details.trim().slice(0, 1000)
      : "";

  if (!shopId) {
    res.status(400).json({ message: "Invalid shopId" });
    return;
  }

  if (!VALID_REPORT_REASONS.includes(reason)) {
    res.status(400).json({ message: "Invalid report reason" });
    return;
  }

  const shopRows = await executeQuery(
    "SELECT id FROM shops WHERE id = ? LIMIT 1",
    [shopId],
  );

  if (!Array.isArray(shopRows) || shopRows.length === 0) {
    res.status(404).json({ message: "Shop not found" });
    return;
  }

  const moderationActions = REPORT_REASON_ACTION_MAP[reason];

  const insertSql = `
    INSERT INTO shop_reports (
      shop_id,
      reporter_user_id,
      reason,
      details,
      moderator_outcome,
      moderation_actions,
      report_status
    )
    VALUES (?, ?, ?, ?, 'needs_more_information', ?, 'open')
    RETURNING
      id,
      shop_id,
      reporter_user_id,
      reason,
      details,
      moderator_outcome,
      moderation_actions,
      report_status,
      date_created,
      date_modified;
  `;

  const rows = await executeQuery(insertSql, [
    shopId,
    req.dbUser.id,
    reason,
    details || null,
    JSON.stringify(moderationActions),
  ]);

  const inserted = rows?.[0];
  if (!inserted) {
    res.status(500).json({ message: "Failed to submit report" });
    return;
  }

  res.status(201).json(mapReportRow(inserted));
}

async function getReports(req, res) {
  if (req.dbUser.role !== "admin") {
    res.status(403).json({ message: "Insufficient permissions" });
    return;
  }

  const requestedLimit = parsePositiveInt(req.query?.limit);
  const limit = requestedLimit ? Math.min(requestedLimit, 500) : 100;
  const status =
    typeof req.query?.status === "string" ? req.query.status.trim() : "";
  const outcome =
    typeof req.query?.outcome === "string" ? req.query.outcome.trim() : "";

  const conditions = [];
  const args = [];

  if (status) {
    if (!VALID_REPORT_STATUSES.includes(status)) {
      res.status(400).json({ message: "Invalid report status" });
      return;
    }
    conditions.push("report_status = ?");
    args.push(status);
  }

  if (outcome) {
    if (!VALID_MODERATOR_OUTCOMES.includes(outcome)) {
      res.status(400).json({ message: "Invalid moderator outcome" });
      return;
    }
    conditions.push("moderator_outcome = ?");
    args.push(outcome);
  }

  const whereClause = conditions.length
    ? `WHERE ${conditions.join(" AND ")}`
    : "";

  const query = `
    SELECT
      r.id,
      r.shop_id,
      s.name AS shop_name,
      r.reporter_user_id,
      u.email AS reporter_email,
      r.reason,
      r.details,
      r.moderator_outcome,
      r.moderation_actions,
      r.report_status,
      r.date_created,
      r.date_modified
    FROM shop_reports r
    LEFT JOIN shops s ON s.id = r.shop_id
    LEFT JOIN users u ON u.id = r.reporter_user_id
    ${whereClause}
    ORDER BY r.date_created DESC
    LIMIT ?;
  `;

  const rows = await executeQuery(query, [...args, limit]);
  const items = Array.isArray(rows) ? rows.map(mapReportRow) : [];

  res.status(200).json({ items });
}

async function handler(req, res) {
  try {
    if (req.method === "POST") {
      await createReport(req, res);
      return;
    }

    if (req.method === "GET") {
      await getReports(req, res);
      return;
    }

    res.status(405).json({ message: "Method Not Allowed" });
  } catch (error) {
    console.error("Failed to handle report request:", error);

    if (isMissingReportsTableError(error)) {
      res.status(409).json({
        message:
          "Database not migrated for reports yet. Run migration 004_shop_reports.sql",
      });
      return;
    }

    res.status(500).json({ message: "Failed to process report request" });
  }
}

export default withDbUser(handler);
