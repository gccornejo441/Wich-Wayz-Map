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
