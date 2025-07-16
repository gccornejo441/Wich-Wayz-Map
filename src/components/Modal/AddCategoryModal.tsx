import { Button, Label, TextInput, Textarea } from "flowbite-react";
import { useEffect, useState } from "react";
import ModalWrapper from "./ModalWrapper";

export default function AddCategoryModal({
  isOpen,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string, desc: string) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const [isMounted, setIsMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsMounted(true);
      setTimeout(() => setIsVisible(true), 10);
    } else {
      setIsVisible(false);
      setTimeout(() => setIsMounted(false), 300); 
    }
  }, [isOpen]);

  const handleAdd = () => {
    onSubmit(name, description);
    setName("");
    setDescription("");
    onClose();
  };

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  if (!isMounted) return null;

  const header = (
    <h3 className="text-lg font-medium text-text-base dark:text-text-inverted">
      Add New Category
    </h3>
  );

  const footer = (
    <div className="flex justify-end space-x-2">
      <Button onClick={handleAdd}>Add</Button>
      <Button color="gray" onClick={handleClose}>
        Cancel
      </Button>
    </div>
  );

  return (
    <ModalWrapper
      header={header}
      footer={footer}
      onClose={handleClose}
      size="medium"
      className="bg-surface-light dark:bg-surface-darker p-6"
      isVisible={isVisible}
    >
      <div className="space-y-4">
        <div>
          <Label htmlFor="name" value="Category Name" />
          <TextInput
            id="name"
            placeholder="e.g. Cuban"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="desc" value="Description" />
          <Textarea
            id="desc"
            placeholder="Optional"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </div>
    </ModalWrapper>
  );
}
