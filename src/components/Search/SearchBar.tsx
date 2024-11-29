import { useEffect, useState } from "react";
import { HiSearch } from "react-icons/hi";
import { SearchShops } from "../../services/search";
import { useMap } from "../../context/mapContext";
import { IndexedDBShop } from "../../types/dataTypes";

// Limit the number of suggestions
const LIMIT = 5;

const SearchBar = () => {
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState<{ shop: IndexedDBShop }[]>([]);
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);

  const { setCenter } = useMap();

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (search.trim() !== "") {
        try {
          const results = await SearchShops(search);
          setSuggestions(results.slice(0, LIMIT));
          setIsDropdownVisible(true);
        } catch (error) {
          console.error("Error fetching suggestions:", error);
        }
      } else {
        setSuggestions([]);
        setIsDropdownVisible(false);
      }
    };

    fetchSuggestions();
  }, [search]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (search.trim() !== "" && suggestions.length > 0) {
      const shop = suggestions[0].shop;
      const location = shop.locations?.[0];
      if (location) {
        setCenter([location.latitude, location.longitude]);
      }
      setIsDropdownVisible(false);
    }
  };

  const handleSuggestionClick = (shop: IndexedDBShop) => {
    const location = shop.locations?.[0];
    if (location) {
      setCenter([location.latitude, location.longitude]);
    }
    setSearch(shop.name);

    setIsDropdownVisible(false);
  };

  return (
    <div className="relative w-full p-3">
      <form className="w-full p-3" onSubmit={handleSubmit}>
        <label
          htmlFor="search"
          className="mb-2 text-sm font-medium text-primary sr-only"
        >
          Search
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
            <HiSearch className="w-5 h-5 text-secondary" aria-hidden="true" />
          </div>
          <input
            type="search"
            id="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="block w-full p-2 ps-12 text-sm text-dark border-gray-200 border rounded-lg bg-background focus:ring-0 focus:outline-none focus:border-primary font-sans"
            placeholder="Search Shops"
            required
          />
        </div>

        {isDropdownVisible && suggestions.length > 0 && (
          <ul className="absolute z-10 w-[92%] mt-1 bg-white border border-gray-200 rounded-lg shadow-lg transition-opacity duration-300 ease-in-out">
            {suggestions.map((result, index) => (
              <li
                key={index}
                className="px-4 py-2 hover:bg-primary hover:text-white hover:rounded-lg cursor-pointer"
                onClick={() => handleSuggestionClick(result.shop)}
              >
                {result.shop.name}
              </li>
            ))}
          </ul>
        )}
      </form>
    </div>
  );
};

export default SearchBar;
