import { UserMetadata } from "@context/authContext";

interface UserTableProps {
  users: UserMetadata[];
  selectedUserId: number | null;
  roleInput: string;
  setRoleInput: (role: string) => void;
  handleEditRole: (userId: number, currentRole: string) => void;
  handleRoleUpdate: () => void;
  handleDeleteUser: (userId: number) => void;
  setSelectedUserId: (id: number | null) => void;
}

const UserTable = ({
  users,
  selectedUserId,
  roleInput,
  setRoleInput,
  handleEditRole,
  handleRoleUpdate,
  handleDeleteUser,
  setSelectedUserId,
}: UserTableProps) => {
  return (
    <table className="w-full border-collapse mb-8">
      <thead>
        <tr className="border-b border-secondary">
          <th className="text-left p-2 text-dark font-medium">Email</th>
          <th className="text-left p-2 text-dark font-medium">Name</th>
          <th className="text-left p-2 text-dark font-medium">Role</th>
          <th className="text-left p-2 text-dark font-medium">Actions</th>
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
  );
};

export default UserTable;
