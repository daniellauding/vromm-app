export interface RecordedRouteData {
  waypoints: Array<{
    latitude: number;
    longitude: number;
    title: string;
    description: string;
  }>;
  name: string;
  description: string;
  searchCoordinates: string;
  routePath: Array<{
    latitude: number;
    longitude: number;
  }>;
  startPoint?: {
    latitude: number;
    longitude: number;
  };
  endPoint?: {
    latitude: number;
    longitude: number;
  };
}
