import { Button, Label, TextInput, Textarea } from "flowbite-react";
import { useState } from "react";
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

  const handleAdd = () => {
    onSubmit(name, description);
    setName("");
    setDescription("");
    onClose();
  };

  if (!isOpen) return null;

  const header = <h3 className="text-lg font-medium text-text-base dark:text-text-inverted">Add New Category</h3>;

  const footer = (
    <div className="flex justify-end space-x-2">
      <Button onClick={handleAdd}>Add</Button>
      <Button color="gray" onClick={onClose}>
        Cancel
      </Button>
    </div>
  );

  return (
    <ModalWrapper
      header={header}
      footer={footer}
      onClose={onClose}
      size="medium"
      className="bg-surface-light dark:bg-surface-darker p-6"
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