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
      preview_image: routeData.preview_image,
    });
  } else if (routeData?.preview_image) {
    items.push({
      type: 'image',
      url: routeData.preview_image,
    });
  }

  // Add media attachments - matching web app validation (RouteDetailModal.tsx)
  const uniqueMedia =
    routeData?.media_attachments?.filter(
      (attachment, index, arr) =>
        arr.findIndex((a) => a.url === attachment.url && a.type === attachment.type) === index,
    ) || [];

  const validMedia = uniqueMedia.filter((attachment) => {
    if (!attachment?.url) return false;

    // Only allow valid media types (image, video, youtube)
    if (!attachment.type || !['image', 'video', 'youtube'].includes(attachment.type)) {
      return false;
    }

    // Only allow http/https URLs - file:// and content:// can't load on other devices
    const isValidUrl =
      attachment.url.startsWith('http://') || attachment.url.startsWith('https://');
    if (!isValidUrl) return false;

    // Skip if this is the same as the preview_image (avoid duplication)
    if (routeData.preview_image && attachment.url === routeData.preview_image) return false;

    return true;
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
