import { useEffect, useState } from "react";
import { FiPlus, FiX } from "react-icons/fi";
import { useSaved } from "@context/savedContext";
import { useToast } from "@context/toastContext";
import { CollectionVisibility } from "@models/Collection";

interface CollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  shopId: number;
}

const CollectionModal = ({ isOpen, onClose, shopId }: CollectionModalProps) => {
  const {
    collections,
    createCollection,
    addShopToCollection,
    removeShopFromCollection,
  } = useSaved();
  const { addToast } = useToast();

  const [newName, setNewName] = useState("");
  const [visibility, setVisibility] = useState<CollectionVisibility>("private");
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setNewName("");
      setVisibility("private");
      setBusyId(null);
      setCreating(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isInCollection = (collectionId: number) =>
    collections.some(
      (c) => c.id === collectionId && (c.shopIds || []).includes(shopId),
    );

  const handleCreate = async () => {
    const trimmed = newName.trim();
    if (!trimmed) {
      addToast("Enter a name for the list", "error");
      return;
    }
    setCreating(true);
    try {
      const created = await createCollection({
        name: trimmed,
        visibility,
      });
      await addShopToCollection(created.id, shopId);
      addToast("List created and shop added", "success");
      setNewName("");
      setVisibility("private");
    } catch (error) {
      console.error("Failed to create collection:", error);
      addToast("Could not create list", "error");
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (collectionId: number) => {
    setBusyId(collectionId);
    try {
      if (isInCollection(collectionId)) {
        await removeShopFromCollection(collectionId, shopId);
        addToast("Removed from list", "success");
      } else {
        await addShopToCollection(collectionId, shopId);
        addToast("Added to list", "success");
      }
    } catch (error) {
      console.error("Failed to toggle collection membership:", error);
      addToast("Could not update list", "error");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white dark:bg-surface-darker rounded-xl shadow-2xl border border-surface-muted dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-text-base dark:text-text-inverted">
            Add to list
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close collection modal"
            className="p-2 rounded-lg hover:bg-surface-muted dark:hover:bg-surface-dark"
          >
            <FiX />
          </button>
        </div>

        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="Create new list"
              className="flex-1 rounded-lg border border-surface-muted dark:border-gray-700 bg-white dark:bg-surface-dark px-3 py-2 text-sm text-text-base dark:text-text-inverted focus:outline-none focus:ring-2 focus:ring-brand-secondary"
            />
            <select
              value={visibility}
              onChange={(event) =>
                setVisibility(event.target.value as CollectionVisibility)
              }
              className="rounded-lg border border-surface-muted dark:border-gray-700 bg-white dark:bg-surface-dark px-2 py-2 text-xs text-text-base dark:text-text-inverted"
            >
              <option value="private">Private</option>
              <option value="unlisted">Unlisted</option>
              <option value="public">Public</option>
            </select>
            <button
              type="button"
              onClick={handleCreate}
              disabled={creating}
              className="px-3 py-2 rounded-lg bg-brand-primary text-white text-sm font-semibold hover:bg-brand-secondary hover:text-text-base disabled:opacity-60"
            >
              {creating ? (
                "Saving..."
              ) : (
                <span className="flex items-center gap-1">
                  <FiPlus />
                  Create
                </span>
              )}
            </button>
          </div>

          <div className="border-t border-surface-muted dark:border-gray-700 pt-3">
            {collections.length === 0 ? (
              <p className="text-sm text-text-muted dark:text-text-inverted/70">
                No lists yet. Create one to save this shop.
              </p>
            ) : (
              <ul className="divide-y divide-surface-muted dark:divide-gray-700">
                {collections.map((collection) => {
                  const isMember = isInCollection(collection.id);
                  const disabled = busyId === collection.id;
                  return (
                    <li
                      key={collection.id}
                      className="py-2 flex items-center justify-between"
                    >
                      <div>
                        <div className="text-sm font-semibold text-text-base dark:text-text-inverted">
                          {collection.name}
                        </div>
                        <div className="text-[11px] uppercase tracking-wide text-text-muted dark:text-text-inverted/60">
                          {collection.visibility} •{" "}
                          {collection.shopCount ??
                            collection.shopIds?.length ??
                            0}{" "}
                          shops
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => handleToggle(collection.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                          isMember
                            ? "bg-surface-muted dark:bg-surface-dark text-text-base dark:text-text-inverted border-surface-muted"
                            : "bg-brand-primary text-white border-brand-primary"
                        } disabled:opacity-60`}
                      >
                        {isMember ? "Remove" : "Add"}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CollectionModal;
