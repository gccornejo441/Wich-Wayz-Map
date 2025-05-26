import { useEffect, useMemo, useState } from "react";
import {
  ColumnDef,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  flexRender,
} from "@tanstack/react-table";
import { getDuplicateLocations } from "@/services/getDuplicateLocations";
import { Location } from "@/models/Location";
import { FaChevronUp, FaChevronDown } from "react-icons/fa";

const columnWidths = {
  id: "80px",
  street_address: "200px",
  city: "150px",
  state: "100px",
  latitude: "150px",
  longitude: "150px",
};

const SortingArrow = ({ isSortedDesc }: { isSortedDesc: boolean }) => (
  <div className="inline-flex text-primary">
    {!isSortedDesc ? <FaChevronDown size={14} /> : <FaChevronUp size={14} />}
  </div>
);

export const DuplicateLocationsTable = () => {
  const [data, setData] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 10;

  useEffect(() => {
    getDuplicateLocations()
      .then(setData)
      .catch((err) => console.error("Failed to load duplicates:", err))
      .finally(() => setLoading(false));
  }, []);

  const columns = useMemo<ColumnDef<Location>[]>(
    () => [
      { accessorKey: "id", header: "ID" },
      { accessorKey: "street_address", header: "Address" },
      { accessorKey: "city", header: "City" },
      { accessorKey: "state", header: "State" },
      { accessorKey: "latitude", header: "Latitude" },
      { accessorKey: "longitude", header: "Longitude" },
    ],
    [],
  );

  const table = useReactTable({
    data,
    columns,
    state: {},
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (loading)
    return <p className="p-4 text-dark">Checking for duplicates...</p>;
  if (data.length === 0)
    return <p className="p-4 text-dark">No duplicate locations found.</p>;

  return (
    <div className="mt-6 border-t border-primaryBorder bg-background p-4 rounded-lg shadow-card">
      <h3 className="text-xl font-semibold text-dark mb-2">
        ⚠️ Duplicate Locations
      </h3>

      <div className="overflow-x-auto rounded-lg border border-primaryBorder">
        <table className="w-full text-sm text-accent">
          <thead className="bg-secondary text-accent">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const width =
                    columnWidths[header.id as keyof typeof columnWidths];
                  return (
                    <th
                      key={header.id}
                      colSpan={header.colSpan}
                      className={
                        header.column.getCanSort()
                          ? "px-4 py-2 text-left font-semibold cursor-pointer select-none border border-primaryBorder"
                          : "px-4 py-2 text-left font-semibold border border-primaryBorder"
                      }
                      onClick={header.column.getToggleSortingHandler()}
                      style={{ width, maxWidth: width, minWidth: width }}
                    >
                      <div className="flex items-center gap-1">
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                        {header.column.getIsSorted() && (
                          <SortingArrow
                            isSortedDesc={
                              header.column.getIsSorted() === "desc"
                            }
                          />
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table
              .getRowModel()
              .rows.slice(
                currentPage * itemsPerPage,
                (currentPage + 1) * itemsPerPage,
              )
              .map((row) => (
                <tr
                  key={row.id}
                  className="hover:bg-lightGray border-b border-primaryBorder"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="px-4 py-2 text-dark font-medium"
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center mt-4 text-sm text-dark">
        <button
          disabled={currentPage === 0}
          className="text-primary disabled:opacity-50"
          onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 0))}
        >
          ← Previous
        </button>
        <span>
          Page {currentPage + 1} of {Math.ceil(data.length / itemsPerPage)}
        </span>
        <button
          disabled={(currentPage + 1) * itemsPerPage >= data.length}
          className="text-primary disabled:opacity-50"
          onClick={() => setCurrentPage((prev) => prev + 1)}
        >
          Next →
        </button>
      </div>
    </div>
  );
};
