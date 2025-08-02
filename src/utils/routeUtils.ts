export interface RecordingStats {
  distance: string;
  duration: string;
  drivingTime: string;
  maxSpeed: string;
  avgSpeed: string;
}

/**
 * Parse recording stats from route description
 * Expected format: "Recorded drive - Distance: 0.01 km, Duration: 00:17, Driving Time: 00:17, Max Speed: 2.2 km/h, Avg Speed: 0.0 km/h"
 */
export function parseRecordingStats(description: string): RecordingStats | null {
  if (!description || !description.includes('Recorded drive')) {
    return null;
  }

  try {
    // Extract stats using regex patterns
    const distanceMatch = description.match(/Distance:\s*([0-9.]+\s*km)/);
    const durationMatch = description.match(/Duration:\s*([0-9:]+)/);
    const drivingTimeMatch = description.match(/Driving Time:\s*([0-9:]+)/);
    const maxSpeedMatch = description.match(/Max Speed:\s*([0-9.]+\s*km\/h)/);
    const avgSpeedMatch = description.match(/Avg Speed:\s*([0-9.]+\s*km\/h)/);

    if (!distanceMatch || !durationMatch || !drivingTimeMatch || !maxSpeedMatch || !avgSpeedMatch) {
      return null;
    }

    return {
      distance: distanceMatch[1],
      duration: durationMatch[1],
      drivingTime: drivingTimeMatch[1],
      maxSpeed: maxSpeedMatch[1],
      avgSpeed: avgSpeedMatch[1],
    };
  } catch (error) {
    console.error('Error parsing recording stats:', error);
    return null;
  }
}

/**
 * Check if a route is a recorded route
 */
export function isRecordedRoute(route: any): boolean {
  return (
    route?.description?.includes('Recorded drive') ||
    route?.drawing_mode === 'record' ||
    (route?.metadata &&
      typeof route.metadata === 'object' &&
      route.metadata.actualDrawingMode === 'record')
  );
}

/**
 * Format recording stats for display
 */
export function formatRecordingStatsDisplay(stats: RecordingStats) {
  return [
    { label: 'Distance', value: stats.distance, icon: 'map' },
    { label: 'Total Duration', value: stats.duration, icon: 'clock' },
    { label: 'Driving Time', value: stats.drivingTime, icon: 'play' },
    { label: 'Max Speed', value: stats.maxSpeed, icon: 'zap' },
    { label: 'Avg Speed', value: stats.avgSpeed, icon: 'trending-up' },
  ];
}
