import { useEffect, useState } from "react";
import { HiSearch } from "react-icons/hi";
import { SearchShops } from "../../services/search";
import { useMap } from "../../context/mapContext";
import { IndexedDBShop } from "../../types/dataTypes";

// Limits the number of suggestions
const LIMIT = 5;

const SearchBar = () => {
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState<{ shop: IndexedDBShop }[]>([]);
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const { setCenter, setShopId, setZoom } = useMap();

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
    if (focusedIndex >= 0 && suggestions[focusedIndex]) {
      handleSuggestionClick(suggestions[focusedIndex].shop);
    } else if (search.trim() !== "" && suggestions.length > 0) {
      handleSuggestionClick(suggestions[0].shop);
    }
  };

  const handleSuggestionClick = (shop: IndexedDBShop) => {
    const location = shop.locations?.[0];
    if (location) {
      setCenter([location.latitude, location.longitude]);
      setZoom(16);
      setShopId(shop.id.toString());
    }
    setSearch(shop.name);
    setIsDropdownVisible(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isDropdownVisible) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setFocusedIndex((prevIndex) =>
          Math.min(prevIndex + 1, suggestions.length - 1),
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setFocusedIndex((prevIndex) => Math.max(prevIndex - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (focusedIndex >= 0 && suggestions[focusedIndex]) {
          handleSuggestionClick(suggestions[focusedIndex].shop);
        }
        break;
      case "Escape":
        setIsDropdownVisible(false);
        break;
      default:
        break;
    }
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
            onKeyDown={handleKeyDown}
            className="block w-full p-2 ps-12 text-sm text-dark border-gray-200 border rounded-lg bg-background focus:ring-2 focus:ring-primary focus:outline-none"
            placeholder="Search Shops"
            required
          />
        </div>

        {isDropdownVisible && suggestions.length > 0 && (
          <ul
            className="absolute z-10 w-[92%] mt-1 bg-white border border-gray-200 rounded-lg shadow-lg transition-opacity duration-300 ease-in-out"
            role="listbox"
          >
            {suggestions.map((result, index) => {
              const location = result.shop.locations?.[0];
              const address = location
                ? `${location.street_address || ""}, ${location.city || ""}`
                : "Address not available";

              return (
                <li
                  key={index}
                  role="option"
                  tabIndex={0}
                  aria-selected={focusedIndex === index}
                  onClick={() => handleSuggestionClick(result.shop)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSuggestionClick(result.shop);
                  }}
                  className={`px-4 py-2 cursor-pointer ${
                    focusedIndex === index
                      ? "bg-primary text-white"
                      : "hover:bg-primary hover:text-white hover:rounded-lg"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{result.shop.name}</span>
                    <span className="text-sm text-gray-400 truncate ml-2">
                      {address}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </form>
    </div>
  );
};

export default SearchBar;
