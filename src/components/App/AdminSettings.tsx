import React, { useCallback, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { FaHome } from "react-icons/fa";

import { useAuth } from "@context/authContext";
import { useAdminPage } from "@hooks/useAdminPage";
import { useModerationReports } from "@hooks/useModerationReports";
import { useBrandModeration } from "@hooks/useBrandModeration";

import CategoriesList from "../CategoriesList/CategoriesList";
import UserTable from "../Utilites/UserTable";
import { DuplicateLocationsTable } from "../Utilites/DuplicateLocationsTable";
import ModerationReportsTable from "@components/Utilites/ModerationReportsTable";
import { BulkUploadCard } from "@components/Admin/BulkUploadCard";

import { Button, Input, Select } from "@components/ui";
import {
  AdminCard,
  BrandStatusPill,
  ConfirmModal,
  TableShell,
} from "@components/Admin/components";
import type {
  BrandStatus,
  ModalState,
} from "@components/Admin/types/admin.types";

type NavigateButtonProps = Omit<
  React.ComponentProps<typeof Button>,
  "onClick"
> & {
  to: string;
  replace?: boolean;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
};

const NavigateButton = ({
  to,
  replace = true,
  onClick,
  ...buttonProps
}: NavigateButtonProps) => {
  const navigate = useNavigate();

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(event);
      if (event.defaultPrevented) return;
      navigate(to, { replace });
    },
    [navigate, onClick, replace, to],
  );

  return <Button type="button" onClick={handleClick} {...buttonProps} />;
};

type BackToMapButtonProps = Omit<NavigateButtonProps, "to" | "children"> & {
  label?: string;
};

const BackToMapButton = ({
  label = "Back to Map",
  ...props
}: BackToMapButtonProps) => {
  return (
    <NavigateButton
      to="/"
      variant="secondary"
      aria-label={label}
      title={label}
      className="flex items-center gap-2"
      {...props}
    >
      <FaHome size={14} aria-hidden="true" focusable="false" />
      <span>{label}</span>
    </NavigateButton>
  );
};

const AdminPage = () => {
  const { isAuthenticated, userMetadata } = useAuth();

  const {
    users,
    selectedUserId,
    roleInput,
    validationErrors,
    isLoading,
    setRoleInput,
    setSelectedUserId,
    handleEditRole,
    handleRoleUpdate,
    handleDeleteUser,
  } = useAdminPage();

  const {
    reports,
    isLoadingReports,
    statusFilter,
    outcomeFilter,
    updatingReportId,
    setStatusFilter,
    setOutcomeFilter,
    refreshReports,
    updateReport,
  } = useModerationReports();

  const {
    brands,
    submissions,
    isLoadingBrands,
    isLoadingSubmissions,
    updatingBrandKey,
    updatingSubmissionId,
    brandSearch,
    brandStatusFilter,
    setBrandSearch,
    setBrandStatusFilter,
    refreshBrands,
    refreshSubmissions,
    setBrandStatus,
    approveSubmission,
    rejectSubmission,
  } = useBrandModeration();

  const [modal, setModal] = useState<ModalState>({ kind: "none" });
  const [modalNote, setModalNote] = useState("");

  const brandCount = brands.length;
  const submissionCount = submissions.length;

  const headerBadges = useMemo(() => {
    return [
      { label: "Reports", value: String(reports.length) },
      { label: "Brands", value: String(brandCount) },
      { label: "Queue", value: String(submissionCount) },
      { label: "Users", value: String(users.length) },
    ];
  }, [reports.length, brandCount, submissionCount, users.length]);

  const refreshAll = useCallback(() => {
    refreshReports();
    refreshBrands();
    refreshSubmissions();
  }, [refreshBrands, refreshReports, refreshSubmissions]);

  if (!isAuthenticated) return <Navigate to="/" replace />;
  if (userMetadata?.role !== "admin") return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-surface-light text-text-base dark:bg-surface-dark dark:text-text-inverted pt-12">
      <div className="sticky top-12 z-10 border-b border-black/5 bg-surface-light/85 backdrop-blur supports-[backdrop-filter]:bg-surface-light/70 dark:border-white/10 dark:bg-surface-dark/80">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto] sm:items-start">
            <div className="space-y-1">
              <nav
                aria-label="Breadcrumb"
                className="flex items-center gap-2 text-xs font-medium text-text-muted dark:text-white/70"
              >
                <span className="text-text-base dark:text-white">Admin</span>
                <span className="opacity-60">/</span>
                <span className="text-text-base dark:text-white">
                  Dashboard
                </span>
              </nav>

              <div>
                <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                  Admin Dashboard
                </h1>
                <p className="mt-1 text-sm text-text-muted dark:text-white/70">
                  Moderation, brand controls, submissions, users, and
                  categories.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                {headerBadges.map((b) => (
                  <div
                    key={b.label}
                    className="rounded-full border border-black/10 bg-black/[0.02] px-3 py-1 text-xs font-semibold text-text-base dark:border-white/10 dark:bg-white/[0.06] dark:text-text-inverted"
                  >
                    {b.label}: <span className="ml-1">{b.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <BackToMapButton />

              <Button variant="primary" type="button" onClick={refreshAll}>
                Refresh All
              </Button>
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <AdminCard
              title="Moderation Reports"
              subtitle="Review reports, set outcomes, and keep the queue clean."
              actions={
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => refreshReports()}
                >
                  Refresh
                </Button>
              }
            >
              <ModerationReportsTable
                reports={reports}
                isLoading={isLoadingReports}
                statusFilter={statusFilter}
                outcomeFilter={outcomeFilter}
                updatingReportId={updatingReportId}
                setStatusFilter={setStatusFilter}
                setOutcomeFilter={setOutcomeFilter}
                onRefresh={refreshReports}
                onUpdateReport={updateReport}
              />
            </AdminCard>
          </div>

          <div className="lg:col-span-5 space-y-6">
            <AdminCard
              title="Brand Moderation"
              subtitle="Search brands, filter status, and apply policy decisions."
              actions={
                <Button
                  variant="primary"
                  type="button"
                  onClick={() => refreshBrands()}
                >
                  Refresh
                </Button>
              }
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Input
                  type="text"
                  value={brandSearch}
                  onChange={(event) => setBrandSearch(event.target.value)}
                  placeholder="Search brand key or name"
                />
                <Select
                  value={brandStatusFilter}
                  onChange={(event) =>
                    setBrandStatusFilter(
                      event.target.value as typeof brandStatusFilter,
                    )
                  }
                >
                  <option value="all">All statuses</option>
                  <option value="unknown">Unknown</option>
                  <option value="needs_review">Needs review</option>
                  <option value="allowed">Allowed</option>
                  <option value="blocked">Blocked</option>
                </Select>
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => refreshBrands()}
                >
                  Apply Filters
                </Button>
              </div>

              <div className="mt-4">
                <TableShell
                  isLoading={isLoadingBrands}
                  isEmpty={!isLoadingBrands && brands.length === 0}
                  emptyText="No brands found"
                >
                  <table className="w-full text-sm">
                    <thead className="bg-black/[0.03] text-xs font-semibold uppercase tracking-wide text-black/60 dark:bg-white/[0.04] dark:text-white/60">
                      <tr>
                        <th className="px-3 py-3 text-left">Brand</th>
                        <th className="px-3 py-3 text-left">Status</th>
                        <th className="px-3 py-3 text-left">Active Shops</th>
                        <th className="px-3 py-3 text-left">Last Score</th>
                        <th className="px-3 py-3 text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {brands.map((brand) => (
                        <tr
                          key={brand.brandKey}
                          className="border-t border-black/5 hover:bg-black/[0.02] dark:border-white/10 dark:hover:bg-white/[0.03]"
                        >
                          <td className="px-3 py-3">
                            <div className="font-medium">
                              {brand.displayName}
                            </div>
                            <div className="mt-0.5 text-xs text-text-muted dark:text-white/70">
                              {brand.brandKey}
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <BrandStatusPill
                              status={brand.status as BrandStatus}
                            />
                          </td>
                          <td className="px-3 py-3">{brand.activeShopCount}</td>
                          <td className="px-3 py-3">
                            {brand.lastChainScore === null
                              ? "—"
                              : brand.lastChainScore.toFixed(1)}
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex flex-wrap gap-2">
                              <Button
                                variant="danger"
                                type="button"
                                disabled={updatingBrandKey === brand.brandKey}
                                onClick={() => {
                                  setModal({
                                    kind: "blockBrand",
                                    brandKey: brand.brandKey,
                                  });
                                  setModalNote(
                                    "Blocked by admin policy review",
                                  );
                                }}
                                className="px-2 py-1 text-xs"
                              >
                                Block
                              </Button>

                              <Button
                                variant="primary"
                                type="button"
                                disabled={updatingBrandKey === brand.brandKey}
                                onClick={() =>
                                  setBrandStatus(
                                    brand.brandKey,
                                    "allowed",
                                    "Allowed by admin review",
                                  )
                                }
                                className="px-2 py-1 text-xs"
                              >
                                Allow
                              </Button>

                              <Button
                                variant="secondary"
                                type="button"
                                disabled={updatingBrandKey === brand.brandKey}
                                onClick={() =>
                                  setBrandStatus(
                                    brand.brandKey,
                                    "needs_review",
                                    "Marked for follow-up review",
                                  )
                                }
                                className="px-2 py-1 text-xs"
                              >
                                Needs Review
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TableShell>
              </div>
            </AdminCard>

            <AdminCard
              title="Pending Shop Submissions"
              subtitle="Approve or reject new shop submissions with notes."
              actions={
                <Button
                  variant="primary"
                  type="button"
                  onClick={() => refreshSubmissions()}
                >
                  Refresh Queue
                </Button>
              }
            >
              <TableShell
                isLoading={isLoadingSubmissions}
                isEmpty={!isLoadingSubmissions && submissions.length === 0}
                emptyText="No pending submissions"
              >
                <table className="w-full text-sm">
                  <thead className="bg-black/[0.03] text-xs font-semibold uppercase tracking-wide text-black/60 dark:bg-white/[0.04] dark:text-white/60">
                    <tr>
                      <th className="px-3 py-3 text-left">ID</th>
                      <th className="px-3 py-3 text-left">Shop</th>
                      <th className="px-3 py-3 text-left">Brand Key</th>
                      <th className="px-3 py-3 text-left">Score</th>
                      <th className="px-3 py-3 text-left">Submitted By</th>
                      <th className="px-3 py-3 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map((submission) => (
                      <tr
                        key={submission.id}
                        className="border-t border-black/5 hover:bg-black/[0.02] dark:border-white/10 dark:hover:bg-white/[0.03]"
                      >
                        <td className="px-3 py-3">#{submission.id}</td>
                        <td className="px-3 py-3">
                          {String(
                            submission.payload?.shopName ?? "Unknown Shop",
                          )}
                        </td>
                        <td className="px-3 py-3">
                          {submission.brandKey || "—"}
                        </td>
                        <td className="px-3 py-3">{submission.chainScore}</td>
                        <td className="px-3 py-3">
                          {submission.submittedByEmail || "—"}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap gap-2">
                            <Button
                              variant="primary"
                              type="button"
                              disabled={updatingSubmissionId === submission.id}
                              onClick={() => approveSubmission(submission.id)}
                              className="px-2 py-1 text-xs"
                            >
                              Approve
                            </Button>
                            <Button
                              variant="danger"
                              type="button"
                              disabled={updatingSubmissionId === submission.id}
                              onClick={() => {
                                setModal({
                                  kind: "rejectSubmission",
                                  submissionId: submission.id,
                                });
                                setModalNote("Rejected by admin review");
                              }}
                              className="px-2 py-1 text-xs"
                            >
                              Reject
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableShell>
            </AdminCard>
          </div>
        </div>

        <AdminCard
          title="Bulk Shop Upload"
          subtitle="Upload CSV to add multiple shops at once (admin only)."
        >
          <BulkUploadCard />
        </AdminCard>

        <AdminCard
          title="User Management"
          subtitle="Manage roles and remove users when necessary."
        >
          {isLoading ? (
            <div className="rounded-xl border border-black/5 p-6 text-sm text-text-muted dark:border-white/10 dark:text-white/70">
              Loading users…
            </div>
          ) : users.length === 0 ? (
            <div className="rounded-xl border border-dashed border-black/10 p-6 text-sm dark:border-white/15">
              No users found.
            </div>
          ) : (
            <UserTable
              users={users}
              selectedUserId={selectedUserId}
              roleInput={roleInput}
              setRoleInput={setRoleInput}
              handleEditRole={handleEditRole}
              handleRoleUpdate={handleRoleUpdate}
              handleDeleteUser={handleDeleteUser}
              setSelectedUserId={setSelectedUserId}
            />
          )}
        </AdminCard>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <AdminCard
              title="Categories"
              subtitle="View and manage the category list."
            >
              <CategoriesList />
            </AdminCard>
          </div>

          <div className="lg:col-span-6">
            <AdminCard
              title="Duplicate Locations"
              subtitle="Review and resolve duplicate locations detected by the system."
            >
              <DuplicateLocationsTable />
            </AdminCard>
          </div>
        </div>

        {validationErrors.length > 0 && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
            <p className="text-sm font-semibold text-red-700 dark:text-red-300">
              Please fix the following:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-red-700 dark:text-red-200">
              {validationErrors.map((err, idx) => (
                <li key={idx}>{err}</li>
              ))}
            </ul>
          </div>
        )}
      </main>

      <ConfirmModal
        open={modal.kind !== "none"}
        title={
          modal.kind === "blockBrand"
            ? "Block this brand?"
            : modal.kind === "rejectSubmission"
              ? "Reject this submission?"
              : ""
        }
        description={
          modal.kind === "blockBrand"
            ? "Provide a reason for audit trail and future reviews."
            : modal.kind === "rejectSubmission"
              ? "Optionally include a note that explains why it was rejected."
              : undefined
        }
        placeholder={
          modal.kind === "blockBrand"
            ? "e.g., Chain / franchise policy violation"
            : "Optional rejection note"
        }
        confirmText={modal.kind === "blockBrand" ? "Block" : "Reject"}
        confirmVariant="danger"
        requireText={modal.kind === "blockBrand"}
        value={modalNote}
        onChange={setModalNote}
        onCancel={() => setModal({ kind: "none" })}
        onConfirm={() => {
          if (modal.kind === "blockBrand") {
            setBrandStatus(modal.brandKey, "blocked", modalNote.trim());
          }
          if (modal.kind === "rejectSubmission") {
            rejectSubmission(
              modal.submissionId,
              modalNote.trim() || "Rejected by admin review",
            );
          }
          setModal({ kind: "none" });
        }}
        isBusy={
          modal.kind === "blockBrand"
            ? updatingBrandKey === modal.brandKey
            : modal.kind === "rejectSubmission"
              ? updatingSubmissionId === modal.submissionId
              : false
        }
      />
    </div>
  );
};

export default AdminPage;
