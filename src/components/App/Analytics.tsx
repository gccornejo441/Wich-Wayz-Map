import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from "recharts";

import useShopAnalytics from "@/hooks/useShopAnalytics";
import { useTheme } from "@/hooks/useTheme";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#AF19FF"];

const Analytics = () => {
  const { shopStateData, shopCategoryData, loading } = useShopAnalytics();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const axisColor = isDark ? "#fff" : "#333";
  const gridColor = isDark ? "#555" : "#ccc";
  const tooltipBg = isDark ? "#1F2937" : "#fff";
  const tooltipText = isDark ? "#fff" : "#333";

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen text-text-base dark:text-text-inverted">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-light dark:bg-surface-dark p-6 mt-10">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-text-base dark:text-text-inverted">
          Wich Wayz Analytics
        </h1>
        <p className="text-text-muted dark:text-text-inverted/70">
          Explore shop distribution by state and category
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-surface-muted dark:bg-surface-darker p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4 text-text-base dark:text-text-inverted">
            Shops by State
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={shopStateData}>
              <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
              <XAxis
                dataKey="state"
                stroke={axisColor}
                tick={{ fill: axisColor }}
              />
              <YAxis stroke={axisColor} tick={{ fill: axisColor }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: tooltipBg,
                  border: "none",
                  color: tooltipText,
                }}
              />
              <Bar dataKey="shop_count" fill="#0088FE" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-surface-muted dark:bg-surface-darker p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4 text-text-base dark:text-text-inverted">
            Shops by Category
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={shopCategoryData}
                dataKey="shop_count"
                nameKey="category"
                cx="50%"
                cy="50%"
                outerRadius={100}
                fill="#8884d8"
                label
              >
                {shopCategoryData.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: tooltipBg,
                  border: "none",
                  color: tooltipText,
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
