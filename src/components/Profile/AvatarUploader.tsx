import { useState } from "react";
import AvatarOptions from "../Avatar/AvatarOptions";
import Gravatar from "../Avatar/Gravatar";

export interface AvatarUploaderProps {
  avatarId: string | undefined;
  setAvatarId: (avatarId: string) => void;
  userEmail: string;
}

const AvatarUploader = ({
  avatarId,
  setAvatarId,
  userEmail,
}: AvatarUploaderProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [useGravatar, setUseGravatar] = useState<boolean>(
    avatarId === "gravatar",
  );

  const handleAvatarSelect = (avatar: string) => {
    if (avatar === "gravatar") {
      setAvatarId("gravatar");
      setUseGravatar(true);
    } else {
      setAvatarId(avatar);
      setUseGravatar(false);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="p-6 mx-auto bg-surface-light dark:bg-surface-dark text-text-base dark:text-text-inverted pb-4 border-b border-brand-secondary dark:border-brand-secondary">
      <h2 className="text-xl font-semibold mb-2">Public avatar</h2>
      <p className="text-sm text-text-muted dark:text-gray-400 mb-4">
        Choose an avatar from our collection or update your avatar at{" "}
        <a
          href="https://gravatar.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand-primary hover:underline"
        >
          gravatar.com
        </a>
      </p>

      <div className="flex items-center gap-4 mb-4">
        {useGravatar ? (
          <Gravatar email={userEmail} size="lg" alt="User Gravatar" />
        ) : avatarId ? (
          <img
            src={`/assets/avatars/${avatarId}.svg`}
            alt="Selected Avatar"
            className="w-24 h-24 rounded-full border border-gray-300 dark:border-gray-600"
          />
        ) : (
          <div className="w-24 h-24 bg-muted dark:bg-gray-700 rounded-full border border-gray-300 dark:border-gray-600 flex items-center justify-center">
            <span className="text-gray-400">No image</span>
          </div>
        )}

        <button
          onClick={() => setIsModalOpen(true)}
          className="mt-4 px-4 py-2 text-white bg-brand-primary hover:bg-brand-primary/90 dark:hover:bg-brand-primaryBorder rounded-lg transition-colors"
        >
          Choose Avatar
        </button>
      </div>

      <AvatarOptions
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelect={handleAvatarSelect}
        selectedAvatarId={avatarId}
      />
    </div>
  );
};

export default AvatarUploader;
