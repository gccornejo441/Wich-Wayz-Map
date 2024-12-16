import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/authContext";
import { useToast } from "../../context/toastContext";
import {
  getAllUsers,
  updateUserRole,
  deleteUserAccount,
  insertData,
  getAllCategories,
} from "../../services/apiClient";
import * as yup from "yup";
import { UserMetadata } from "../../context/authContext";
import CategoriesList from "../CategoriesList/CategoriesList";

const userRoleSchema = yup.object().shape({
  role: yup
    .string()
    .oneOf(["admin", "editor", "viewer"], "Invalid role selected.")
    .required("Role is required."),
});

const categorySchema = yup.object().shape({
  categoryName: yup.string().trim().required("Category name is required."),
});

const AdminPage = () => {
  const { isAuthenticated, userMetadata } = useAuth();
  const { addToast } = useToast();

  const [users, setUsers] = useState<UserMetadata[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [roleInput, setRoleInput] = useState("");
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [categoryName, setCategoryName] = useState("");

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setIsLoading(true);
        const fetchedUsers = await getAllUsers();
        setUsers(fetchedUsers);
      } catch (error) {
        console.error("Error fetching users:", error);
        addToast("Failed to fetch users.", "error");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, [addToast]);

  if (!isAuthenticated) return <Navigate to="/" replace />;
  if (userMetadata?.role !== "admin") return <Navigate to="/" replace />;

  const handleEditRole = (userId: number, currentRole: string) => {
    setSelectedUserId(userId);
    setRoleInput(currentRole);
    setValidationErrors([]);
  };

  const handleRoleUpdate = async () => {
    if (selectedUserId === null) return;

    try {
      setValidationErrors([]);
      const validatedData = await userRoleSchema.validate(
        { role: roleInput },
        { abortEarly: false },
      );
      await updateUserRole(selectedUserId, validatedData.role);
      setUsers(
        users.map((u) =>
          u.id === selectedUserId ? { ...u, role: validatedData.role } : u,
        ),
      );
      addToast("User role updated successfully.", "success");
      setSelectedUserId(null);
      setRoleInput("");
    } catch (error) {
      if (error instanceof yup.ValidationError) {
        setValidationErrors(error.errors);
      } else {
        console.error("Error updating user role:", error);
        addToast("Failed to update user role.", "error");
      }
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;

    try {
      await deleteUserAccount(userId);
      setUsers(users.filter((u) => u.id !== userId));
      addToast("User account deleted successfully.", "success");
    } catch (error) {
      console.error("Error deleting user:", error);
      addToast("Failed to delete user account.", "error");
    }
  };

  const handleAddCategory = async () => {
    try {
      setValidationErrors([]);
      const validated = await categorySchema.validate(
        { categoryName },
        { abortEarly: false },
      );

      await insertData(
        "categories",
        ["category_name"],
        [validated.categoryName],
      );
      addToast("Category added successfully.", "success");
      setCategoryName("");
    } catch (error) {
      if (error instanceof yup.ValidationError) {
        setValidationErrors(error.errors);
      } else {
        console.error("Error adding category:", error);
        addToast("Failed to add category.", "error");
      }
    }
  };

  const handleDownloadCategories = async () => {
    try {
      const categories = await getAllCategories();

      const jsonStr = JSON.stringify(categories, null, 2);

      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "categories.json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      addToast("Categories downloaded successfully.", "success");
    } catch (error) {
      console.error("Error downloading categories:", error);
      addToast("Failed to download categories.", "error");
    }
  };

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
            <table className="w-full border-collapse mb-8">
              <thead>
                <tr className="border-b border-secondary">
                  <th className="text-left p-2 text-dark font-medium">Email</th>
                  <th className="text-left p-2 text-dark font-medium">Name</th>
                  <th className="text-left p-2 text-dark font-medium">Role</th>
                  <th className="text-left p-2 text-dark font-medium">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((usr) => (
                  <tr
                    key={usr.id}
                    className="border-b border-secondary hover:bg-gray-50"
                  >
                    <td className="p-2 text-sm text-dark">{usr.email}</td>
                    <td className="p-2 text-sm text-dark">
                      {usr.firstName} {usr.lastName}
                    </td>
                    <td className="p-2 text-sm text-dark">
                      {selectedUserId === usr.id ? (
                        <select
                          value={roleInput}
                          onChange={(e) => setRoleInput(e.target.value)}
                          className="border border-gray-300 rounded p-1"
                        >
                          <option value="">Select a role</option>
                          <option value="admin">Admin</option>
                          <option value="editor">Editor</option>
                          <option value="viewer">Viewer</option>
                        </select>
                      ) : (
                        usr.role
                      )}
                    </td>
                    <td className="p-2 text-sm flex items-center space-x-2">
                      {selectedUserId === usr.id ? (
                        <>
                          <button
                            onClick={handleRoleUpdate}
                            className="bg-primary text-white px-2 py-1 rounded"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setSelectedUserId(null);
                              setRoleInput("");
                            }}
                            className="bg-gray-200 text-dark px-2 py-1 rounded"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleEditRole(usr.id, usr.role)}
                            className="text-blue-600 hover:underline"
                          >
                            Edit Role
                          </button>
                          <button
                            onClick={() => handleDeleteUser(usr.id)}
                            className="text-red-600 hover:underline"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="mt-8 p-4 border rounded bg-white">
            <h3 className="text-xl font-semibold text-dark mb-4">
              Add a New Category
            </h3>
            <div className="flex items-center space-x-2 mb-4">
              <input
                type="text"
                className="border border-gray-300 rounded p-2 flex-1"
                placeholder="Enter category name"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
              />
              <button
                onClick={handleAddCategory}
                className="bg-primary text-white px-4 py-2 rounded"
              >
                Add Category
              </button>
            </div>
          </div>

          <div className="mt-8 p-4 border rounded bg-white">
            <h3 className="text-xl font-semibold text-dark mb-4">
              Download Categories JSON
            </h3>
            <button
              onClick={handleDownloadCategories}
              className="bg-primary text-white px-4 py-2 rounded"
            >
              Download JSON
            </button>
          </div>
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
