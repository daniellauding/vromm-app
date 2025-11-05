import { Region } from '../../types/maps';

const getCarouselItems = (routeData: any) => {
  const items = [];

  // Add map as first item if we have waypoints
  if (routeData?.waypoint_details?.length) {
    const waypoints = routeData.waypoint_details.map((wp) => ({
      latitude: wp.lat,
      longitude: wp.lng,
      title: wp.title,
      description: wp.description,
    }));

    const lats = waypoints.map((w) => w.latitude);
    const lngs = waypoints.map((w) => w.longitude);
    const region: Region = {
      latitude: (Math.min(...lats) + Math.max(...lats)) / 2,
      longitude: (Math.min(...lngs) + Math.max(...lngs)) / 2,
      latitudeDelta: Math.max(...lats) - Math.min(...lats) + 0.02,
      longitudeDelta: Math.max(...lngs) - Math.min(...lngs) + 0.02,
    };

    const routePath = waypoints.length > 2 ? waypoints : undefined;

    // Extract pins from route data
    const pins =
      routeData.pins && Array.isArray(routeData.pins)
        ? routeData.pins
            .map((pin: any) => ({
              latitude: pin.lat,
              longitude: pin.lng,
              title: pin.title,
              description: pin.description,
            }))
            .filter((pin) => pin.latitude && pin.longitude)
        : [];

    items.push({
      type: 'map',
      waypoints,
      region,
      routePath,
      showStartEndMarkers: true,
      pins,
    });
  }

  // Add media attachments
  const uniqueMedia =
    routeData?.media_attachments?.filter(
      (attachment, index, arr) =>
        arr.findIndex((a) => a.url === attachment.url && a.type === attachment.type) === index,
    ) || [];

  const validMedia = uniqueMedia.filter((attachment) => {
    const isValidUrl =
      attachment.url &&
      (attachment.url.startsWith('http://') ||
        attachment.url.startsWith('https://') ||
        attachment.url.startsWith('file://') ||
        attachment.url.startsWith('data:') ||
        attachment.url.startsWith('content://'));
    return isValidUrl;
  });

  validMedia.forEach((attachment) => {
    items.push({
      type: attachment.type,
      url: attachment.url,
      description: attachment.description,
    });
  });

  return items;
};

export { getCarouselItems };
