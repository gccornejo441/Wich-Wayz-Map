import React, { useEffect, useId, useRef, useState } from "react";
import type { SafeUserMetadata } from "@models/SafeUserMetadata";

interface UserTableProps {
  users: SafeUserMetadata[];
  selectedUserId: number | null;
  roleInput: string;
  setRoleInput: (role: string) => void;
  handleEditRole: (userId: number, currentRole: string) => void;
  handleRoleUpdate: () => Promise<void>;
  handleDeleteUser: (userId: number) => Promise<void>;
  setSelectedUserId: (userId: number | null) => void;
}

function ConfirmDeleteModal({
  open,
  title,
  description,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description?: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const titleId = useId();
  const descId = useId();
  const cancelRef = useRef<HTMLButtonElement | null>(null);
  const lastActiveRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    lastActiveRef.current = document.activeElement as HTMLElement | null;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };

    window.addEventListener("keydown", onKeyDown);

    requestAnimationFrame(() => {
      cancelRef.current?.focus();
    });

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      lastActiveRef.current?.focus?.();
    };
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
    >
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onCancel}
        tabIndex={-1}
      />

      <div className="relative w-full max-w-md animate-modalEnter rounded-2xl border border-black/10 bg-white shadow-card dark:border-white/10 dark:bg-surface-darker">
        <div className="border-b border-black/5 p-4 dark:border-white/10">
          <h3
            id={titleId}
            className="text-base font-semibold text-text-base dark:text-text-inverted"
          >
            {title}
          </h3>
          {description ? (
            <p
              id={descId}
              className="mt-1 text-sm text-text-muted dark:text-white/70"
            >
              {description}
            </p>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-2 p-4">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="inline-flex items-center justify-center rounded-lg border border-black/10 bg-white px-3 py-2 text-sm font-semibold text-text-base transition-colors hover:bg-black/5 dark:border-white/10 dark:bg-surface-dark dark:text-text-inverted dark:hover:bg-white/10"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex items-center justify-center rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

const UserTable: React.FC<UserTableProps> = ({
  users,
  selectedUserId,
  roleInput,
  setRoleInput,
  handleEditRole,
  handleRoleUpdate,
  handleDeleteUser,
  setSelectedUserId,
}) => {
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<SafeUserMetadata | null>(
    null,
  );

  const handleDeleteClick = (user: SafeUserMetadata) => {
    setUserToDelete(user);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (userToDelete) {
      await handleDeleteUser(userToDelete.id);
      setDeleteModalOpen(false);
      setUserToDelete(null);
    }
  };

  const cancelDelete = () => {
    setDeleteModalOpen(false);
    setUserToDelete(null);
  };

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-black/5 dark:border-white/10">
        <table className="w-full text-sm">
          <thead className="bg-black/[0.03] text-xs font-semibold uppercase tracking-wide text-black/60 dark:bg-white/[0.04] dark:text-white/60">
            <tr>
              <th className="px-3 py-3 text-left">Email</th>
              <th className="px-3 py-3 text-left">Role</th>
              <th className="px-3 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr
                key={user.id}
                className="border-t border-black/5 hover:bg-black/[0.02] dark:border-white/10 dark:hover:bg-white/[0.03]"
              >
                <td className="px-3 py-3">{user.email}</td>
                <td className="px-3 py-3">
                  {selectedUserId === user.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={roleInput}
                        onChange={(e) => setRoleInput(e.target.value)}
                        className="h-8 rounded-lg border border-black/10 bg-white px-2 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 dark:border-white/10 dark:bg-surface-darker dark:text-text-inverted"
                      />
                      <button
                        type="button"
                        onClick={handleRoleUpdate}
                        className="rounded-lg bg-brand-primary px-2 py-1 text-xs font-semibold text-white hover:bg-brand-secondary"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedUserId(null)}
                        className="rounded-lg border border-black/10 bg-white px-2 py-1 text-xs font-semibold text-text-base hover:bg-black/5 dark:border-white/10 dark:bg-surface-darker dark:text-text-inverted dark:hover:bg-white/10"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <span className="rounded-full border border-black/10 bg-white px-2 py-1 text-xs font-semibold dark:border-white/10 dark:bg-surface-darker">
                      {user.role}
                    </span>
                  )}
                </td>
                <td className="px-3 py-3">
                  <div className="flex gap-2">
                    {selectedUserId !== user.id && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleEditRole(user.id, user.role)}
                          className="rounded-lg border border-black/10 bg-white px-2 py-1 text-xs font-semibold text-text-base hover:bg-black/5 dark:border-white/10 dark:bg-surface-darker dark:text-text-inverted dark:hover:bg-white/10"
                        >
                          Edit Role
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteClick(user)}
                          className="rounded-lg bg-red-600 px-2 py-1 text-xs font-semibold text-white hover:bg-red-700"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmDeleteModal
        open={deleteModalOpen}
        title="Delete User"
        description={
          userToDelete
            ? `Are you sure you want to delete ${userToDelete.email}? This action cannot be undone.`
            : undefined
        }
        onCancel={cancelDelete}
        onConfirm={confirmDelete}
      />
    </>
  );
};

export default UserTable;
