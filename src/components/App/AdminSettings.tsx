import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@context/authContext";
import CategoriesList from "../CategoriesList/CategoriesList";
import CategoryActions from "../Utilites/CategoryActions";
import UserTable from "../Utilites/UserTable";
import { useAdminPage } from "@hooks/useAdminPage";

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
  } = useAdminPage();

  const [description, setDescription] = useState("");

  if (!isAuthenticated) return <Navigate to="/" replace />;
  if (userMetadata?.role !== "admin") return <Navigate to="/" replace />;

  return (
    <div className="max-w-5xl mx-auto p-4 lg:my-5 rounded-lg bg-background">
      <div className="p-6 mx-auto bg-background pb-4 border-b border-secondary">
        <h2 className="text-2xl font-semibold text-dark mb-2">
          Admin Dashboard
        </h2>
        <p className="text-dark mt-2 text-sm">
          Manage application users, their roles, and access.
        </p>
      </div>

      {isLoading ? (
        <p className="p-4 text-center">Loading users...</p>
      ) : (
        <div className="p-4">
          {users.length === 0 ? (
            <p>No users found.</p>
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
            handleDownloadCategories={() => {}}
          />
        </div>
      )}

      <CategoriesList />

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
