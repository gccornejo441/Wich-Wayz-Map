import { useState, useEffect } from "react";
import {
  getAllUsers,
  updateUserRole,
  deleteUserAccount,
  getAllCategories,
  addCategoryIfNotExists,
} from "@services/apiClient";
import { useToast } from "@context/toastContext";
import * as yup from "yup";
import { UserMetadata } from "@context/authContext";

const userRoleSchema = yup.object().shape({
  role: yup
    .string()
    .oneOf(["admin", "editor", "viewer"], "Invalid role selected.")
    .required("Role is required."),
});

export const useAdminPage = () => {
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
    } catch {
      addToast("Failed to delete user account.", "error");
    }
  };

  const handleAddCategory = async (
    categoryName: string,
    description: string,
  ) => {
    try {
      if (!categoryName.trim()) {
        setValidationErrors(["Category name cannot be empty"]);
        return;
      }

      if (!description.trim()) {
        setValidationErrors(["Description cannot be empty"]);
        return;
      }

      await addCategoryIfNotExists(categoryName, description);

      addToast("Category added successfully!", "success");

      setValidationErrors([]);
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === "CategoryExistsError") {
          addToast("Category already exists!", "error");
        } else {
          addToast(`Failed to add category: ${error.message}`, "error");
        }
      } else {
        addToast("An unknown error occurred", "error");
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
    } catch {
      addToast("Failed to download categories.", "error");
    }
  };

  return {
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
  };
};
