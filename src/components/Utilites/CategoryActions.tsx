import { useState } from "react";

interface CategoryActionsProps {
  categoryName: string;
  setCategoryName: (name: string) => void;
  description: string;
  setDescription: (description: string) => void;
  handleAddCategory: (categoryName: string, description: string) => void;
  handleDownloadCategories: () => void;
}

const CategoryActions = ({
  categoryName,
  setCategoryName,
  handleAddCategory,
  handleDownloadCategories,
}: CategoryActionsProps) => {
  const [description, setDescription] = useState("");

  const handleSubmit = () => {
    handleAddCategory(categoryName, description);
    setCategoryName("");
    setDescription("");
  };

  return (
    <div>
      <div className="mt-8 p-4 border rounded bg-white">
        <h3 className="text-xl font-semibold text-dark mb-4">
          Add a New Category
        </h3>
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <input
              type="text"
              className="border border-gray-300 rounded p-2 flex-1"
              placeholder="Enter category name"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
            />
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              className="border border-gray-300 rounded p-2 flex-1"
              placeholder="Enter category description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <button
            onClick={handleSubmit}
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
  );
};

export default CategoryActions;
