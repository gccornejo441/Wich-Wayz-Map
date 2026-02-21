import React, { useEffect, useMemo, useState } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { getDuplicateLocations } from "@/services/getDuplicateLocations";
import { Location } from "@/models/Location";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";

const cx = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

const columnWidths: Record<
  keyof Pick<
    Location,
    "id" | "street_address" | "city" | "state" | "latitude" | "longitude"
  >,
  string
> = {
  id: "80px",
  street_address: "260px",
  city: "160px",
  state: "100px",
  latitude: "150px",
  longitude: "150px",
};

function Button({
  variant = "secondary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
}) {
  return (
    <button
      {...props}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-60",
        variant === "primary"
          ? "bg-brand-primary text-white hover:bg-brand-primaryHover"
          : "border border-black/10 bg-white text-text-base hover:bg-black/5 dark:border-white/10 dark:bg-surface-dark dark:text-text-inverted dark:hover:bg-white/10",
        props.className,
      )}
    />
  );
}

function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[140px] items-center justify-center rounded-xl border border-dashed border-black/10 bg-black/[0.02] p-6 text-center dark:border-white/15 dark:bg-white/[0.03]">
      <div>
        <div className="mx-auto mb-3 h-10 w-10 rounded-xl bg-black/10 dark:bg-white/10" />
        <p className="text-sm font-semibold text-text-base dark:text-text-inverted">
          {title}
        </p>
        {description ? (
          <p className="mt-1 text-sm text-text-muted dark:text-white/70">
            {description}
          </p>
        ) : null}
        {action ? (
          <div className="mt-4 flex justify-center">{action}</div>
        ) : null}
      </div>
    </div>
  );
}

function LoadingBlock({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-black/5 bg-black/[0.02] p-4 dark:border-white/10 dark:bg-white/[0.03]">
      <div className="space-y-3">
        <div className="h-4 w-2/5 rounded bg-black/10 dark:bg-white/10" />
        <div className="h-9 w-full rounded bg-black/10 dark:bg-white/10" />
        <div className="h-9 w-full rounded bg-black/10 dark:bg-white/10" />
        <div className="h-9 w-full rounded bg-black/10 dark:bg-white/10" />
      </div>
      <p className="mt-3 text-sm text-text-muted dark:text-white/70">{label}</p>
    </div>
  );
}

function SortIndicator({ dir }: { dir: "asc" | "desc" | false }) {
  if (!dir) return <span className="inline-block w-4" aria-hidden="true" />;
  return (
    <span className="inline-flex w-4 items-center justify-center text-brand-primary">
      {dir === "desc" ? <FaChevronUp size={14} /> : <FaChevronDown size={14} />}
    </span>
  );
}

export const DuplicateLocationsTable = () => {
  const [data, setData] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 10;

  const totalPages = Math.max(1, Math.ceil(data.length / itemsPerPage));

  const refresh = async () => {
    setLoading(true);
    try {
      const res = await getDuplicateLocations();
      setData(res);
      setCurrentPage(0);
    } catch (err) {
      console.error("Failed to load duplicates:", err);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const columns = useMemo<ColumnDef<Location>[]>(
    () => [
      { accessorKey: "id", header: "ID" },
      { accessorKey: "street_address", header: "Address" },
      { accessorKey: "city", header: "City" },
      { accessorKey: "state", header: "State" },
      {
        accessorKey: "latitude",
        header: "Latitude",
        cell: (info) => {
          const v = info.getValue<number | null>();
          return v == null ? "—" : v.toFixed(6);
        },
      },
      {
        accessorKey: "longitude",
        header: "Longitude",
        cell: (info) => {
          const v = info.getValue<number | null>();
          return v == null ? "—" : v.toFixed(6);
        },
      },
    ],
    [],
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const pageRows = table
    .getRowModel()
    .rows.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage);

  const canPrev = currentPage > 0;
  const canNext = currentPage + 1 < totalPages;

  if (loading) {
    return <LoadingBlock label="Checking for duplicates…" />;
  }

  if (data.length === 0) {
    return (
      <EmptyState
        title="No duplicate locations found"
        description="If duplicates exist, they'll appear here for review."
        action={
          <Button type="button" variant="secondary" onClick={refresh}>
            Refresh
          </Button>
        }
      />
    );
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-semibold text-text-base shadow-sm dark:border-white/10 dark:bg-surface-dark dark:text-text-inverted">
          Total: <span className="ml-1">{data.length}</span>
        </div>
        <Button type="button" variant="secondary" onClick={refresh}>
          Refresh
        </Button>
      </div>

      <div>
        <div className="overflow-x-auto rounded-xl border border-black/5 dark:border-white/10">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-black/[0.03] text-xs font-semibold uppercase tracking-wide text-black/60 dark:bg-white/[0.04] dark:text-white/60">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const width =
                      columnWidths[header.id as keyof typeof columnWidths] ||
                      "160px";

                    const isSortable = header.column.getCanSort();
                    const sortDir = header.column.getIsSorted();

                    return (
                      <th
                        key={header.id}
                        colSpan={header.colSpan}
                        style={{ width, minWidth: width, maxWidth: width }}
                        className="px-4 py-3 text-left"
                      >
                        {header.isPlaceholder ? null : isSortable ? (
                          <button
                            type="button"
                            onClick={header.column.getToggleSortingHandler()}
                            className="inline-flex items-center gap-2 rounded-md px-1 py-0.5 text-left hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 dark:hover:bg-white/10 dark:focus:ring-brand-primary/25"
                            aria-label={`Sort by ${String(
                              header.column.columnDef.header,
                            )}`}
                          >
                            <span>
                              {flexRender(
                                header.column.columnDef.header,
                                header.getContext(),
                              )}
                            </span>
                            <SortIndicator dir={sortDir} />
                          </button>
                        ) : (
                          <div className="inline-flex items-center gap-2">
                            <span>
                              {flexRender(
                                header.column.columnDef.header,
                                header.getContext(),
                              )}
                            </span>
                            <SortIndicator dir={false} />
                          </div>
                        )}
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>

            <tbody>
              {pageRows.map((row) => (
                <tr
                  key={row.id}
                  className="border-t border-black/5 hover:bg-black/[0.02] dark:border-white/10 dark:hover:bg-white/[0.03]"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="px-4 py-3 text-text-base dark:text-text-inverted"
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

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
          <div className="text-text-muted dark:text-white/70">
            Page <span className="font-semibold">{currentPage + 1}</span> of{" "}
            <span className="font-semibold">{totalPages}</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 0))}
              disabled={!canPrev}
              aria-label="Previous page"
            >
              Previous
            </Button>

            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                setCurrentPage((p) => Math.min(p + 1, totalPages - 1))
              }
              disabled={!canNext}
              aria-label="Next page"
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};
