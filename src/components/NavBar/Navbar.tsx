import { useState } from "react";
import { useAuth } from "../../context/authContext";
import { SidebarToggleButton } from "../SideMenu/SidebarButtons";
import { Toast, Dropdown, Avatar, Modal, Button } from "flowbite-react";
import Logo from "../Logo/Logo";
import { HiLogin, HiLogout } from "react-icons/hi";

interface NavBarProps {
  onToggleSidebar: () => void;
  onToggleLoginModel: () => void;
}

const NavBar = ({ onToggleSidebar, onToggleLoginModel }: NavBarProps) => {
  const { isAuthenticated, logout, user } = useAuth();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "error">("success");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_, setClickCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [phrase, setPhrase] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState("");

  const SECRET_PHASE = import.meta.env.VITE_SECRET_PHASE as string;

  const requiredPhrase = SECRET_PHASE;

  const showToast = (message: string, type: "success" | "error") => {
    setToastMessage(message);
    setToastType(type);
    setTimeout(() => setToastMessage(null), 5000);
  };

  const handleAuthAction = () => {
    if (isAuthenticated) {
      logout();
      showToast("You have been logged out successfully.", "success");
    } else {
      onToggleLoginModel();
    }
  };

  const handleAvatarClick = () => {
    setClickCount((prev) => {
      const newCount = prev + 1;
      if (newCount >= 10) {
        setIsModalOpen(true);
      }
      return newCount;
    });
  };

  const handlePhraseSubmit = () => {
    if (phrase.toLowerCase() === requiredPhrase.toLowerCase()) {
      setIsModalOpen(false);
      setClickCount(0);
      setShowDropdown(true);
      showToast("Access granted!", "success");
    } else {
      setError("Incorrect phrase. Please try again.");
    }
  };

  return (
    <>
      <nav className="bg-primary border-b border-secondary">
        <div className="w-full h-12 mx-auto px-4 flex items-center justify-between">
          <SidebarToggleButton onClick={onToggleSidebar} />
          <Logo
            imageSource="/assets/wichway-mini.svg"
            className="bg-transparent shadow-none rounded-none"
          />
          <div className="flex items-center gap-4">
            {showDropdown ? (
              <Dropdown
                arrowIcon={false}
                inline={true}
                label={
                  <div className="flex items-center gap-2 cursor-pointer">
                    <Avatar
                      img={user?.avatar || "/assets/avatars/avatar_1.svg"}
                      alt="User Avatar"
                      rounded={true}
                      status={isAuthenticated ? "online" : "offline"}
                      statusPosition="bottom-right"
                    >
                      <div className="font-medium text-sm">
                        {user?.username || ""}
                      </div>
                    </Avatar>
                  </div>
                }
              >
                {isAuthenticated ? (
                  <>
                    <Dropdown.Item icon={HiLogout} onClick={handleAuthAction}>
                      Logout
                    </Dropdown.Item>
                  </>
                ) : (
                  <>
                    <Dropdown.Item icon={HiLogin} onClick={onToggleLoginModel}>
                      Login
                    </Dropdown.Item>
                  </>
                )}
              </Dropdown>
            ) : (
              <div
                className="flex items-center gap-2 cursor-pointer"
                onClick={handleAvatarClick}
              >
                <Avatar
                  img={user?.avatar || "/assets/avatars/avatar_1.svg"}
                  alt="User Avatar"
                  rounded={true}
                  status={isAuthenticated ? "online" : "offline"}
                  statusPosition="bottom-right"
                >
                  <div className="font-medium text-sm">
                    {user?.username || ""}
                  </div>
                </Avatar>
              </div>
            )}
          </div>
        </div>
        {toastMessage && (
          <div className="fixed bottom-5 left-5">
            <Toast>
              <div
                className={`ml-3 text-sm font-normal ${
                  toastType === "success" ? "text-green-500" : "text-red-500"
                }`}
              >
                {toastMessage}
              </div>
            </Toast>
          </div>
        )}
      </nav>
      <Modal
        show={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        size="md"
        popup
      >
        <Modal.Header />
        <Modal.Body>
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900">
              Enter the required phrase
            </h3>
            <div className="mt-4">
              <input
                type="text"
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring"
                placeholder="Type the phrase"
                value={phrase}
                onChange={(e) => {
                  setPhrase(e.target.value);
                  setError(""); // Clear error when typing
                }}
              />
              {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
            </div>
            <div className="mt-6 flex justify-center gap-4">
              <Button color="success" onClick={handlePhraseSubmit}>
                Submit
              </Button>
              <Button color="gray" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </Modal.Body>
      </Modal>
    </>
  );
};

export default NavBar;
