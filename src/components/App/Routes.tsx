import { Routes, Route } from "react-router-dom";
import MapBox from "../Map/MapBox";
import NotFound from "./NotFound";

function MainRoutes() {
  return (
    <Routes>
      <Route path="/" element={<MapBox />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default MainRoutes;
