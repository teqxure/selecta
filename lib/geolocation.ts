export interface GeolocationResult {
  lat: number;
  lng: number;
  accuracy: number;
}

function describeGeolocationError(error: GeolocationPositionError): string {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return "Location access is blocked — allow it for this site in your browser settings and try again.";
    case error.POSITION_UNAVAILABLE:
      return "Your device couldn't determine a location — check that location services are turned on for your browser.";
    case error.TIMEOUT:
      return "Finding your location took too long — try again.";
    default:
      return "Couldn't get your location.";
  }
}

/**
 * A single explicit position request, never a background `watchPosition`.
 * A first attempt asks for a high-accuracy (GPS) fix; most desktops have
 * no GPS chip, so that alone reliably times out even though a coarser
 * network/Wi-Fi-based fix is available — the fallback retries with relaxed
 * accuracy/timeout instead of just failing outright.
 */
export function getCurrentPositionWithFallback(): Promise<GeolocationResult> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Your browser doesn't support location."));
      return;
    }

    const toResult = (position: GeolocationPosition): GeolocationResult => ({
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      accuracy: position.coords.accuracy,
    });

    navigator.geolocation.getCurrentPosition(
      (position) => resolve(toResult(position)),
      () => {
        navigator.geolocation.getCurrentPosition(
          (position) => resolve(toResult(position)),
          (error) => reject(new Error(describeGeolocationError(error))),
          { enableHighAccuracy: false, timeout: 15_000, maximumAge: 60_000 },
        );
      },
      { enableHighAccuracy: true, timeout: 8_000, maximumAge: 0 },
    );
  });
}
