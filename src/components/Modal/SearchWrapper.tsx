import { Callback } from "../../types/dataTypes";
import SearchBar from "../Search/SearchBar";
import ModalWrapper from "./ModalWrapper";

interface SearchWrapperProps {
  onClose: Callback;
}

const SearchWrapper = ({ onClose }: SearchWrapperProps) => {
  return (
    <ModalWrapper size="large" onClose={onClose} showCloseButton={false}>
      <div className="max-w-3xl w-full mx-auto bg-white rounded-lg shadow-lg overflow-visible">
        <div className="flex items-center justify-between p-4 border-b border-secondary">
          <h3 className="text-lg font-semibold text-dark">Search</h3>
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
