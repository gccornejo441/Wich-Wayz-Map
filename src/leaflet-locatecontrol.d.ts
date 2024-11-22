import "leaflet";

declare module "leaflet" {
  namespace control {
    function locate(options?: L.ControlOptions): L.Control;
  }
}
