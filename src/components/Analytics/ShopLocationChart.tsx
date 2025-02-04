import { getShopsPerState, ShopCountByState } from "@/services/mapService";
import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const ShopLocationChart = () => {
  const [data, setData] = useState<ShopCountByState[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const result = await getShopsPerState();
      setData(result);
    };
    fetchData();
  }, []);

  return (
    <div style={{ height: "400px", width: "100%" }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="state" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="shop_count" fill="#8884d8" name="Number of Shops" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ShopLocationChart;