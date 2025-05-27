import { useCallback, useEffect, useState } from "react";
import FilterForm from "./FilterForm";
import { ShopFilters } from "@/types/shopFilter";
import { filterShops } from "@/services/filterShops";

const PAGE_SIZE = 10;

interface ShopResult {
    id: number;
    name: string;
    city: string;
    state: string;
    country: string;
    upvotes: number;
    downvotes: number;
}

const ShopResults = () => {
    const [filters, setFilters] = useState<ShopFilters>({});
    const [shops, setShops] = useState<ShopResult[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [total, setTotal] = useState(0);

    const loadShops = useCallback(async () => {
        const result = await filterShops(filters);
        setTotal(result.length);
        const start = (currentPage - 1) * PAGE_SIZE;
        setShops(result.slice(start, start + PAGE_SIZE));
    }, [filters, currentPage]);

    useEffect(() => {
        setCurrentPage(1);
    }, [filters]);

    useEffect(() => {
        loadShops();
    }, [loadShops]);

    const totalPages = Math.ceil(total / PAGE_SIZE);

    return (
        <div className="space-y-4">
            <FilterForm value={filters} onChange={setFilters} />

            <div>
                {shops.map((shop) => (
                    <div key={shop.id} className="p-3 bg-gray-50 border rounded">
                        <h3 className="font-bold">{shop.name}</h3>
                        <p>{shop.city}, {shop.state} — {shop.country}</p>
                        <p>{shop.upvotes} upvotes / {shop.downvotes} downvotes</p>
                    </div>
                ))}
            </div>

            {/* Pagination */}
            <div className="flex justify-center gap-4 mt-4">
                <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => p - 1)}
                >
                    Prev
                </button>
                <span>Page {currentPage} / {totalPages}</span>
                <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => p + 1)}
                >
                    Next
                </button>
            </div>
        </div>
    );
};

export default ShopResults;
