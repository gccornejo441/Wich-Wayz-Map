import { useState, useEffect } from "react";
import ModalWrapper from "../Modal/ModalWrapper";
import { Callback } from "../../types/dataTypes";

export const avatarOptions: AvatarOption[] = Array.from(
  { length: 20 },
  (_, i) => ({
    id: `avatar_${i + 1}`,
    src: `/assets/avatars/avatar_${i + 1}.svg`,
  }),
);

interface AvatarOptionsProps {
  isOpen: boolean;
  onClose: Callback;
  onSelect: (avatarId: string) => void;
  selectedAvatarId: string | undefined;
}

export interface AvatarOption {
  id: string;
  src: string;
}

const AvatarOptions = ({
  isOpen,
  onClose,
  onSelect,
  selectedAvatarId,
}: AvatarOptionsProps) => {
  const [avatars, setAvatars] = useState<AvatarOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);

      const timeout = setTimeout(() => {
        setAvatars([
          { id: "gravatar", src: "/assets/avatars/gravatar_logo.png" },
          ...avatarOptions,
        ]);
        setLoading(false);
      }, 500);

      return () => clearTimeout(timeout);
    }
  }, [isOpen]);

  return isOpen ? (
    <ModalWrapper className="bg-white">
      <div className="p-4">
        <h2 className="text-lg font-semibold text-dark mb-4">
          Select an Avatar
        </h2>

        {loading ? (
          <div className="flex justify-center items-center mb-4">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-4 mb-4">
            {avatars.map(({ id, src }) => (
              <button
                key={id}
                onClick={() => onSelect(id)}
                className="focus:outline-none"
              >
                <div
                  className={`w-20 h-20 rounded-full border-2 ${
                    selectedAvatarId === id
                      ? "border-primary"
                      : "border-transparent"
                  } hover:border-primary transition-colors`}
                >
                  <img
                    src={src}
                    alt={`Avatar ${id === "gravatar" ? "Gravatar" : id}`}
                    className="w-full h-full rounded-full"
                  />
                  {id === "gravatar" && (
                    <div className="text-xs text-center text-gray-500">
                      Gravatar
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="flex justify-end space-x-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-primary bg-background border border-primary rounded-lg hover:bg-gray-200 transition-colors mt-2"
          >
            Cancel
          </button>
        </div>
      </div>
    </ModalWrapper>
  ) : null;
};

export default AvatarOptions;
