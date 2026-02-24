import React, { useState, useRef } from "react";
import { HiDownload, HiUpload, HiCheckCircle, HiXCircle } from "react-icons/hi";

import { Button } from "@components/ui";
import {
  parseCsvFile,
  downloadCsvTemplate,
  type CsvParseResult,
} from "@/utils/csvParser";
import {
  submitBulkShops,
  type ShopSubmissionResult,
} from "@services/bulkShopService";
import { useToast } from "@context/toastContext";

type UploadStage = "idle" | "preview" | "uploading" | "complete";

export const BulkUploadCard: React.FC = () => {
  const { addToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stage, setStage] = useState<UploadStage>("idle");
  const [parseResult, setParseResult] = useState<CsvParseResult | null>(null);
  const [uploadProgress, setUploadProgress] = useState({
    current: 0,
    total: 0,
  });
  const [submissionResults, setSubmissionResults] = useState<
    ShopSubmissionResult[]
  >([]);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".csv")) {
      addToast("Please select a CSV file", "error");
      return;
    }

    try {
      const result = await parseCsvFile(file);
      setParseResult(result);
      setStage("preview");

      if (result.totalRows === 0) {
        addToast("CSV file is empty", "error");
      } else if (result.validRows.length === 0) {
        addToast(
          `No valid rows found. ${result.invalidRows.length} rows have errors.`,
          "error",
        );
      } else {
        addToast(
          `Parsed ${result.totalRows} rows: ${result.validRows.length} valid, ${result.invalidRows.length} invalid`,
          "success",
        );
      }
    } catch (error) {
      console.error("Failed to parse CSV:", error);
      addToast(
        error instanceof Error ? error.message : "Failed to parse CSV file",
        "error",
      );
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleUpload = async () => {
    if (!parseResult || parseResult.validRows.length === 0) return;

    setStage("uploading");
    setUploadProgress({ current: 0, total: parseResult.validRows.length });
    setSubmissionResults([]);

    try {
      const result = await submitBulkShops(
        parseResult.validRows.map((r) => r.data),
        (current, total, shopResult) => {
          setUploadProgress({ current, total });
          setSubmissionResults((prev) => [...prev, shopResult]);
        },
      );

      setStage("complete");
      addToast(
        `Upload complete: ${result.success} succeeded, ${result.failed} failed`,
        result.failed === 0 ? "success" : "error",
      );
    } catch (error) {
      console.error("Bulk upload failed:", error);
      addToast("Bulk upload failed. Please try again.", "error");
      setStage("preview");
    }
  };

  const handleReset = () => {
    setStage("idle");
    setParseResult(null);
    setUploadProgress({ current: 0, total: 0 });
    setSubmissionResults([]);
    setExpandedRow(null);
  };

  const renderIdleStage = () => (
    <div className="space-y-4">
      <p className="text-sm text-text-muted dark:text-white/70">
        Upload a CSV file to add multiple shops at once. Download the template
        to see the required format.
      </p>

      <div className="flex flex-wrap gap-3">
        <Button
          variant="primary"
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2"
        >
          <HiUpload className="h-4 w-4" />
          Choose CSV File
        </Button>

        <Button
          variant="secondary"
          type="button"
          onClick={downloadCsvTemplate}
          className="flex items-center gap-2"
        >
          <HiDownload className="h-4 w-4" />
          Download Template
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileSelect}
        className="hidden"
      />

      <div className="rounded-lg border border-black/10 bg-black/[0.02] p-4 text-xs dark:border-white/10 dark:bg-white/[0.04]">
        <p className="font-semibold mb-2">CSV Requirements:</p>
        <ul className="space-y-1 list-disc list-inside text-text-muted dark:text-white/70">
          <li>Headers must match template exactly</li>
          <li>All shops must be independently owned (no chains/franchises)</li>
          <li>Categories must match existing category names</li>
          <li>Coordinates must be valid latitude/longitude</li>
          <li>Rate limits bypassed for admin users</li>
        </ul>
      </div>
    </div>
  );

  const renderPreviewStage = () => {
    if (!parseResult) return null;

    const allRows = [...parseResult.validRows, ...parseResult.invalidRows].sort(
      (a, b) => a.rowNumber - b.rowNumber,
    );

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-sm">
            <span className="font-semibold">
              {parseResult.totalRows} rows parsed:
            </span>{" "}
            <span className="text-green-600 dark:text-green-400">
              {parseResult.validRows.length} valid
            </span>
            {parseResult.invalidRows.length > 0 && (
              <>
                ,{" "}
                <span className="text-red-600 dark:text-red-400">
                  {parseResult.invalidRows.length} invalid
                </span>
              </>
            )}
          </div>

          <div className="flex gap-2">
            <Button variant="secondary" type="button" onClick={handleReset}>
              Cancel
            </Button>
            <Button
              variant="primary"
              type="button"
              onClick={handleUpload}
              disabled={parseResult.validRows.length === 0}
            >
              Upload {parseResult.validRows.length} Shop
              {parseResult.validRows.length !== 1 ? "s" : ""}
            </Button>
          </div>
        </div>

        <div className="max-h-96 overflow-auto rounded-lg border border-black/10 dark:border-white/10">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-black/[0.03] text-xs font-semibold uppercase tracking-wide text-black/60 dark:bg-white/[0.04] dark:text-white/60">
              <tr>
                <th className="px-3 py-2 text-left">Row</th>
                <th className="px-3 py-2 text-left">Shop Name</th>
                <th className="px-3 py-2 text-left">City, State</th>
                <th className="px-3 py-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {allRows.map((row) => (
                <React.Fragment key={row.rowNumber}>
                  <tr
                    className={`border-t border-black/5 dark:border-white/10 cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.03] ${
                      !row.isValid ? "bg-red-50 dark:bg-red-900/10" : ""
                    }`}
                    onClick={() =>
                      setExpandedRow(
                        expandedRow === row.rowNumber ? null : row.rowNumber,
                      )
                    }
                  >
                    <td className="px-3 py-2">{row.rowNumber}</td>
                    <td className="px-3 py-2 font-medium">
                      {row.data.shop_name}
                    </td>
                    <td className="px-3 py-2">
                      {row.data.city}, {row.data.state}
                    </td>
                    <td className="px-3 py-2">
                      {row.isValid ? (
                        <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                          <HiCheckCircle className="h-4 w-4" />
                          Valid
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400">
                          <HiXCircle className="h-4 w-4" />
                          {row.errors.length} error
                          {row.errors.length !== 1 ? "s" : ""}
                        </span>
                      )}
                    </td>
                  </tr>
                  {expandedRow === row.rowNumber && !row.isValid && (
                    <tr className="bg-red-50 dark:bg-red-900/10">
                      <td colSpan={4} className="px-3 py-2">
                        <div className="text-xs text-red-700 dark:text-red-300">
                          <p className="font-semibold mb-1">Errors:</p>
                          <ul className="list-disc list-inside space-y-0.5">
                            {row.errors.map((error, idx) => (
                              <li key={idx}>{error}</li>
                            ))}
                          </ul>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderUploadingStage = () => (
    <div className="space-y-4">
      <div className="text-center">
        <p className="text-sm font-semibold mb-2">
          Uploading shops... {uploadProgress.current} / {uploadProgress.total}
        </p>
        <div className="w-full bg-black/10 rounded-full h-2 dark:bg-white/10">
          <div
            className="bg-brand-primary h-2 rounded-full transition-all duration-300"
            style={{
              width: `${(uploadProgress.current / uploadProgress.total) * 100}%`,
            }}
          />
        </div>
      </div>

      <div className="max-h-64 overflow-auto rounded-lg border border-black/10 dark:border-white/10">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-black/[0.03] text-xs font-semibold uppercase tracking-wide text-black/60 dark:bg-white/[0.04] dark:text-white/60">
            <tr>
              <th className="px-3 py-2 text-left">Shop Name</th>
              <th className="px-3 py-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {submissionResults.map((result) => (
              <tr
                key={result.rowNumber}
                className="border-t border-black/5 dark:border-white/10"
              >
                <td className="px-3 py-2">{result.shopName}</td>
                <td className="px-3 py-2">
                  {result.success ? (
                    <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                      <HiCheckCircle className="h-4 w-4" />
                      {result.status === "pending_review"
                        ? "Pending Review"
                        : "Success"}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400">
                      <HiXCircle className="h-4 w-4" />
                      {result.error || "Failed"}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderCompleteStage = () => {
    const successCount = submissionResults.filter((r) => r.success).length;
    const failedCount = submissionResults.filter((r) => !r.success).length;

    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
          <p className="text-sm font-semibold text-green-800 dark:text-green-300">
            Upload Complete
          </p>
          <p className="text-xs text-green-700 dark:text-green-400 mt-1">
            {successCount} shop{successCount !== 1 ? "s" : ""} added
            successfully
            {failedCount > 0 && `, ${failedCount} failed`}
          </p>
        </div>

        <div className="max-h-64 overflow-auto rounded-lg border border-black/10 dark:border-white/10">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-black/[0.03] text-xs font-semibold uppercase tracking-wide text-black/60 dark:bg-white/[0.04] dark:text-white/60">
              <tr>
                <th className="px-3 py-2 text-left">Shop Name</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Details</th>
              </tr>
            </thead>
            <tbody>
              {submissionResults.map((result) => (
                <tr
                  key={result.rowNumber}
                  className="border-t border-black/5 dark:border-white/10"
                >
                  <td className="px-3 py-2">{result.shopName}</td>
                  <td className="px-3 py-2">
                    {result.success ? (
                      <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                        <HiCheckCircle className="h-4 w-4" />
                        Success
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400">
                        <HiXCircle className="h-4 w-4" />
                        Failed
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-text-muted dark:text-white/70">
                    {result.success ? (
                      result.status === "pending_review" ? (
                        "Pending admin review"
                      ) : (
                        `ID: ${result.shopId}`
                      )
                    ) : (
                      <span className="text-red-600 dark:text-red-400">
                        {result.error}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end">
          <Button variant="primary" type="button" onClick={handleReset}>
            Upload More Shops
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {stage === "idle" && renderIdleStage()}
      {stage === "preview" && renderPreviewStage()}
      {stage === "uploading" && renderUploadingStage()}
      {stage === "complete" && renderCompleteStage()}
    </div>
  );
};
