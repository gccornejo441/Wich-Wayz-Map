import { useState } from "react";
import { useToast } from "../../context/toastContext";
import { getAllCategories } from "../../services/apiClient";
import { Category } from "../../services/apiClient";

const CategoriesList = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { addToast } = useToast();

  const handleShowCategories = async () => {
    setIsLoading(true);
    try {
      const fetchedCategories = await getAllCategories();
      setCategories(fetchedCategories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      addToast("Failed to fetch categories.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCategories = categories.filter((cat) =>
    cat.category_name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="mt-8 p-4 border rounded bg-white">
      <h3 className="text-xl font-semibold text-dark mb-4">Categories</h3>
      <button
        onClick={handleShowCategories}
        className="bg-primary text-white px-4 py-2 rounded mb-4"
      >
        Show Categories
      </button>

      {isLoading && <p>Loading categories...</p>}

      {!isLoading && categories.length === 0 && (
        <p>No categories loaded. Click the button above to load categories.</p>
      )}

      {!isLoading && categories.length > 0 && (
        <>
          <div className="mb-4 flex items-center space-x-2">
            <input
              type="text"
              placeholder="Search categories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border border-gray-300 rounded p-2 flex-1"
            />
          </div>

          <div className="max-h-64 overflow-y-auto border-t border-secondary">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-secondary sticky top-0 bg-white z-10">
                  <th className="text-left p-2 text-dark font-medium">ID</th>
                  <th className="text-left p-2 text-dark font-medium">
                    Category Name
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredCategories.map((cat) => (
                  <tr
                    key={cat.id}
                    className="border-b border-secondary hover:bg-gray-50"
                  >
                    <td className="p-2 text-sm text-dark">{cat.id}</td>
                    <td className="p-2 text-sm text-dark">
                      {cat.category_name}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredCategories.length === 0 && (
              <p className="p-2 text-sm text-dark">
                No categories match your search.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default CategoriesList;
