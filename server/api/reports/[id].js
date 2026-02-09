import { executeQuery } from "../lib/db.js";
import { withDbUser } from "../lib/withAuth.js";
import {
  isMissingReportsTableError,
  mapReportRow,
  parsePositiveInt,
  REPORT_REASON_ACTION_MAP,
  sanitizeModerationActions,
  sanitizeReason,
  VALID_MODERATOR_OUTCOMES,
  VALID_REPORT_STATUSES,
} from "../lib/reportModeration.js";

const selectReportByIdSql = `
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
  WHERE r.id = ?
  LIMIT 1;
`;

async function getReport(req, res, reportId) {
  if (req.dbUser.role !== "admin") {
    res.status(403).json({ message: "Insufficient permissions" });
    return;
  }

  const rows = await executeQuery(selectReportByIdSql, [reportId]);
  const row = rows?.[0];

  if (!row) {
    res.status(404).json({ message: "Report not found" });
    return;
  }

  res.status(200).json(mapReportRow(row));
}

async function patchReport(req, res, reportId) {
  if (req.dbUser.role !== "admin") {
    res.status(403).json({ message: "Insufficient permissions" });
    return;
  }

  const rawOutcome = req.body?.moderatorOutcome ?? req.body?.moderator_outcome;
  const rawStatus = req.body?.status ?? req.body?.report_status;
  const rawActions =
    req.body?.moderationActions ?? req.body?.moderation_actions;

  const moderatorOutcome =
    typeof rawOutcome === "string" ? rawOutcome.trim() : undefined;
  const reportStatus =
    typeof rawStatus === "string" ? rawStatus.trim() : undefined;

  if (
    moderatorOutcome === undefined &&
    reportStatus === undefined &&
    rawActions === undefined
  ) {
    res.status(400).json({ message: "No moderation updates provided" });
    return;
  }

  if (
    moderatorOutcome !== undefined &&
    !VALID_MODERATOR_OUTCOMES.includes(moderatorOutcome)
  ) {
    res.status(400).json({ message: "Invalid moderator outcome" });
    return;
  }

  if (
    reportStatus !== undefined &&
    !VALID_REPORT_STATUSES.includes(reportStatus)
  ) {
    res.status(400).json({ message: "Invalid report status" });
    return;
  }

  const updates = [];
  const args = [];

  if (moderatorOutcome !== undefined) {
    updates.push("moderator_outcome = ?");
    args.push(moderatorOutcome);
  }

  if (reportStatus !== undefined) {
    updates.push("report_status = ?");
    args.push(reportStatus);
  }

  let moderationActions;
  if (rawActions !== undefined) {
    moderationActions = sanitizeModerationActions(rawActions);
    if (!moderationActions) {
      res.status(400).json({ message: "Invalid moderation actions" });
      return;
    }
  }

  if (moderationActions === undefined && moderatorOutcome === "action_taken") {
    const rows = await executeQuery(
      "SELECT reason FROM shop_reports WHERE id = ? LIMIT 1",
      [reportId],
    );
    const reason = sanitizeReason(rows?.[0]?.reason);
    if (!reason || !REPORT_REASON_ACTION_MAP[reason]) {
      res.status(404).json({ message: "Report not found" });
      return;
    }
    moderationActions = REPORT_REASON_ACTION_MAP[reason];
  }

  if (moderationActions !== undefined) {
    updates.push("moderation_actions = ?");
    args.push(JSON.stringify(moderationActions));
  }

  if (!updates.length) {
    res.status(400).json({ message: "No valid moderation updates provided" });
    return;
  }

  updates.push("date_modified = CURRENT_TIMESTAMP");

  await executeQuery(
    `
      UPDATE shop_reports
      SET ${updates.join(", ")}
      WHERE id = ?
    `,
    [...args, reportId],
  );

  const rows = await executeQuery(selectReportByIdSql, [reportId]);
  const row = rows?.[0];
  if (!row) {
    res.status(404).json({ message: "Report not found" });
    return;
  }

  res.status(200).json(mapReportRow(row));
}

async function handler(req, res) {
  try {
    const reportId = parsePositiveInt(req.query?.id);
    if (!reportId) {
      res.status(400).json({ message: "Invalid report id" });
      return;
    }

    if (req.method === "GET") {
      await getReport(req, res, reportId);
      return;
    }

    if (req.method === "PATCH") {
      await patchReport(req, res, reportId);
      return;
    }

    res.status(405).json({ message: "Method Not Allowed" });
  } catch (error) {
    console.error("Failed to process report moderation request:", error);

    if (isMissingReportsTableError(error)) {
      res.status(409).json({
        message:
          "Database not migrated for reports yet. Run migration 004_shop_reports.sql",
      });
      return;
    }

    res.status(500).json({ message: "Failed to update report" });
  }
}

export default withDbUser(handler);
