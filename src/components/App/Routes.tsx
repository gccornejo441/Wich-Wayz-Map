import { Routes, Route } from "react-router-dom";
import MapBox from "../Map/MapBox";
import NotFound from "./NotFound";
import AddShop from "../Modal/AddShop";

function MainRoutes() {
  return (
    <Routes>
      <Route path="/" element={<MapBox />} />
      <Route path="*" element={<NotFound />} />
      <Route path="/add-a-shop" element={<AddShop />} />
    </Routes>
  );
}

export default MainRoutes;
