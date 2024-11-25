import { useState } from "react";
import { FiSearch } from "react-icons/fi";
import { SearchShops } from "../../services/search";
import { Shop } from "../../services/shopLocation";

const SearchBar = () => {
  const [search, setSearch] = useState("");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (search.trim() !== "") {
      const results = SearchShops(search) as Promise<{ shop: Shop }[]>;
      console.log(results);
    }
  };

  return (
    <form className="w-full p-3" onSubmit={handleSubmit}>
      <label
        htmlFor="search"
        className="mb-2 text-sm font-medium text-primary sr-only"
      >
        Search
      </label>
      <div className="relative">
        <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
          <FiSearch className="w-5 h-5 text-secondary" aria-hidden="true" />
        </div>
        <input
          type="search"
          id="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="block w-full p-2 ps-12 text-sm text-dark  border-gray-200 border rounded-lg bg-background  focus:ring-0 focus:outline-none focus:border-primary font-sans "
          placeholder="Search Shops"
          required
        />
      </div>
    </form>
  );
};

export default SearchBar;
