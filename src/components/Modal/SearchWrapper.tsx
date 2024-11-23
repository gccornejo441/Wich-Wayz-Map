import SearchBar from "../Search/SearchBar";
import ModalWrapper from "./ModalWrapper";

interface SearchWrapperProps {
  onClose: () => void;
}

const SearchWrapper = ({ onClose }: SearchWrapperProps) => {
  return (
    <ModalWrapper>
      <div className="max-w-3xl w-full mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-secondary">
          <h3 className="text-lg font-semibold text-dark">
            Search
          </h3>
          <button
            onClick={onClose}
            className="text-dark hover:bg-accent/10 rounded-lg text-sm w-8 h-8 flex items-center justify-center"
          >
            <span className="sr-only">Close modal</span>✕
          </button>
        </div>
        <SearchBar />
      </div>
    </ModalWrapper>
  );
};

export default SearchWrapper;
