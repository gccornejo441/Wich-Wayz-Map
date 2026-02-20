import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@context/authContext";
import CategoriesList from "../CategoriesList/CategoriesList";
import CategoryActions from "../Utilites/CategoryActions";
import UserTable from "../Utilites/UserTable";
import { useAdminPage } from "@hooks/useAdminPage";
import { DuplicateLocationsTable } from "../Utilites/DuplicateLocationsTable";
import { useModerationReports } from "@hooks/useModerationReports";
import ModerationReportsTable from "@components/Utilites/ModerationReportsTable";
import { useBrandModeration } from "@hooks/useBrandModeration";

const AdminPage = () => {
  const { isAuthenticated, userMetadata } = useAuth();
  const {
    users,
    selectedUserId,
    roleInput,
    categoryName,
    validationErrors,
    isLoading,
    setRoleInput,
    setCategoryName,
    setSelectedUserId,
    handleEditRole,
    handleRoleUpdate,
    handleDeleteUser,
    handleAddCategory,
    handleDownloadCategories,
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

  const [description, setDescription] = useState("");

  if (!isAuthenticated) return <Navigate to="/" replace />;
  if (userMetadata?.role !== "admin") return <Navigate to="/" replace />;

  return (
    <div className="mt-10 max-w-5xl mx-auto p-4 lg:my-5 rounded-lg bg-surface-light dark:bg-surface-dark text-text-base dark:text-text-inverted">
      <div className="p-6 mx-auto bg-surface-light dark:bg-surface-dark pb-4 border-b border-brand-secondary dark:border-brand-secondary">
        <h2 className="text-2xl font-semibold text-text-base dark:text-text-inverted mb-2">
          Admin Dashboard
        </h2>
        <p className="mt-2 text-sm text-text-muted dark:text-text-inverted">
          Manage application users, their roles, and access.
        </p>
      </div>

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

      <section className="p-4 space-y-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h3 className="text-lg font-semibold text-text-base dark:text-text-inverted">
            Brand Moderation
          </h3>
          <button
            type="button"
            onClick={() => refreshBrands()}
            className="rounded-lg bg-brand-primary px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-secondary hover:text-text-base transition-colors"
          >
            Refresh Brands
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            type="text"
            value={brandSearch}
            onChange={(event) => setBrandSearch(event.target.value)}
            placeholder="Search brand key or name"
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-surface-darker px-3 py-2 text-sm"
          />
          <select
            value={brandStatusFilter}
            onChange={(event) =>
              setBrandStatusFilter(
                event.target.value as typeof brandStatusFilter,
              )
            }
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-surface-darker px-3 py-2 text-sm"
          >
            <option value="all">All statuses</option>
            <option value="unknown">Unknown</option>
            <option value="needs_review">Needs review</option>
            <option value="allowed">Allowed</option>
            <option value="blocked">Blocked</option>
          </select>
          <button
            type="button"
            onClick={() => refreshBrands()}
            className="rounded-lg border border-brand-primary text-brand-primary px-3 py-2 text-sm font-semibold hover:bg-brand-primary hover:text-white transition-colors"
          >
            Apply Filters
          </button>
        </div>

        {isLoadingBrands ? (
          <p className="text-sm text-text-muted dark:text-text-inverted">
            Loading brands...
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="w-full text-sm">
              <thead className="bg-surface-muted dark:bg-surface-darker">
                <tr>
                  <th className="text-left px-3 py-2">Brand</th>
                  <th className="text-left px-3 py-2">Status</th>
                  <th className="text-left px-3 py-2">Active Shops</th>
                  <th className="text-left px-3 py-2">Last Score</th>
                  <th className="text-left px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {brands.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-3 py-3 text-text-muted dark:text-text-inverted"
                    >
                      No brands found.
                    </td>
                  </tr>
                ) : (
                  brands.map((brand) => (
                    <tr
                      key={brand.brandKey}
                      className="border-t border-gray-100 dark:border-gray-700"
                    >
                      <td className="px-3 py-2">
                        <div className="font-medium">{brand.displayName}</div>
                        <div className="text-xs text-text-muted dark:text-text-inverted">
                          {brand.brandKey}
                        </div>
                      </td>
                      <td className="px-3 py-2">{brand.status}</td>
                      <td className="px-3 py-2">{brand.activeShopCount}</td>
                      <td className="px-3 py-2">
                        {brand.lastChainScore === null
                          ? "-"
                          : brand.lastChainScore.toFixed(1)}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={updatingBrandKey === brand.brandKey}
                            onClick={() => {
                              const reason =
                                window.prompt(
                                  "Why are you blocking this brand?",
                                  "Blocked by admin policy review",
                                ) || "Blocked by admin policy review";
                              setBrandStatus(brand.brandKey, "blocked", reason);
                            }}
                            className="rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700 disabled:opacity-60"
                          >
                            Block
                          </button>
                          <button
                            type="button"
                            disabled={updatingBrandKey === brand.brandKey}
                            onClick={() =>
                              setBrandStatus(
                                brand.brandKey,
                                "allowed",
                                "Allowed by admin review",
                              )
                            }
                            className="rounded bg-green-600 px-2 py-1 text-xs text-white hover:bg-green-700 disabled:opacity-60"
                          >
                            Allow
                          </button>
                          <button
                            type="button"
                            disabled={updatingBrandKey === brand.brandKey}
                            onClick={() =>
                              setBrandStatus(
                                brand.brandKey,
                                "needs_review",
                                "Marked for follow-up review",
                              )
                            }
                            className="rounded bg-amber-500 px-2 py-1 text-xs text-black hover:bg-amber-400 disabled:opacity-60"
                          >
                            Needs Review
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="p-4 space-y-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h3 className="text-lg font-semibold text-text-base dark:text-text-inverted">
            Pending Shop Submissions
          </h3>
          <button
            type="button"
            onClick={() => refreshSubmissions()}
            className="rounded-lg bg-brand-primary px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-secondary hover:text-text-base transition-colors"
          >
            Refresh Queue
          </button>
        </div>

        {isLoadingSubmissions ? (
          <p className="text-sm text-text-muted dark:text-text-inverted">
            Loading pending submissions...
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="w-full text-sm">
              <thead className="bg-surface-muted dark:bg-surface-darker">
                <tr>
                  <th className="text-left px-3 py-2">ID</th>
                  <th className="text-left px-3 py-2">Shop</th>
                  <th className="text-left px-3 py-2">Brand Key</th>
                  <th className="text-left px-3 py-2">Score</th>
                  <th className="text-left px-3 py-2">Submitted By</th>
                  <th className="text-left px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {submissions.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-3 py-3 text-text-muted dark:text-text-inverted"
                    >
                      No pending submissions.
                    </td>
                  </tr>
                ) : (
                  submissions.map((submission) => (
                    <tr
                      key={submission.id}
                      className="border-t border-gray-100 dark:border-gray-700"
                    >
                      <td className="px-3 py-2">#{submission.id}</td>
                      <td className="px-3 py-2">
                        {String(submission.payload?.shopName ?? "Unknown Shop")}
                      </td>
                      <td className="px-3 py-2">
                        {submission.brandKey || "-"}
                      </td>
                      <td className="px-3 py-2">{submission.chainScore}</td>
                      <td className="px-3 py-2">
                        {submission.submittedByEmail || "-"}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={updatingSubmissionId === submission.id}
                            onClick={() => approveSubmission(submission.id)}
                            className="rounded bg-green-600 px-2 py-1 text-xs text-white hover:bg-green-700 disabled:opacity-60"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            disabled={updatingSubmissionId === submission.id}
                            onClick={() => {
                              const note =
                                window.prompt(
                                  "Optional rejection note for this submission",
                                  "Rejected by admin review",
                                ) || "Rejected by admin review";
                              rejectSubmission(submission.id, note);
                            }}
                            className="rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700 disabled:opacity-60"
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {isLoading ? (
        <p className="p-4 text-center text-text-base dark:text-text-inverted">
          Loading users...
        </p>
      ) : (
        <div className="p-4">
          {users.length === 0 ? (
            <p className="text-text-base dark:text-text-inverted">
              No users found.
            </p>
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
          <CategoryActions
            categoryName={categoryName}
            setCategoryName={setCategoryName}
            description={description}
            setDescription={setDescription}
            handleAddCategory={handleAddCategory}
            handleDownloadCategories={handleDownloadCategories}
          />
        </div>
      )}

      <CategoriesList />
      <DuplicateLocationsTable />

      {validationErrors.length > 0 && (
        <ul className="text-red-500 p-4">
          {validationErrors.map((err, idx) => (
            <li key={idx}>{err}</li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AdminPage;
