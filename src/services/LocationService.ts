
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

export interface LocationResult {
  lat: number;
  lng: number;
  accuracy?: number;
  timestamp: number;
  isHighAccuracy: boolean;
}

export interface LocationServiceCallbacks {
  onLocationUpdate: (location: LocationResult) => void;
  onError: (error: string) => void;
  onPermissionDenied: () => void;
}

class LocationService {
  private callbacks: LocationServiceCallbacks | null = null;
  private watchId: string | null = null;
  private lastKnownLocation: LocationResult | null = null;
  private highAccuracyReceived = false;

  // Check if location permissions are granted
  async checkPermissions(): Promise<boolean> {
    try {
      const permissions = await Geolocation.checkPermissions();
      return permissions.location === 'granted';
    } catch (error) {
      console.error('Error checking location permissions:', error);
      return false;
    }
  }

  // Request location permissions
  async requestPermissions(): Promise<boolean> {
    try {
      const permissions = await Geolocation.requestPermissions();
      return permissions.location === 'granted';
    } catch (error) {
      console.error('Error requesting location permissions:', error);
      return false;
    }
  }

  // Fast location fetching (like Google Maps)
  async startLocationFetching(callbacks: LocationServiceCallbacks) {
    this.callbacks = callbacks;
    this.highAccuracyReceived = false;

    // Step 1: Check permissions
    const hasPermission = await this.checkPermissions();
    if (!hasPermission) {
      const granted = await this.requestPermissions();
      if (!granted) {
        this.callbacks.onPermissionDenied();
        return;
      }
    }

    // Step 2: Get last known location (fast)
    try {
      const lastKnown = await this.getLastKnownLocation();
      if (lastKnown) {
        this.lastKnownLocation = lastKnown;
        this.callbacks.onLocationUpdate(lastKnown);
      }
    } catch (error) {
      console.log('No last known location available');
    }

    // Step 3: Start high accuracy location fetching
    this.startHighAccuracyTracking();
  }

  // Get last known location (cached/fast)
  private async getLastKnownLocation(): Promise<LocationResult | null> {
    try {
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: false,
        timeout: 3000, // Quick timeout for cached location
        maximumAge: 300000 // Accept location up to 5 minutes old
      });

      return {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp,
        isHighAccuracy: false
      };
    } catch (error) {
      console.log('Failed to get last known location:', error);
      return null;
    }
  }

  // Start high accuracy GPS tracking
  private async startHighAccuracyTracking() {
    try {
      // First, try to get a single high-accuracy position
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000, // 10 second timeout
        maximumAge: 0 // Don't accept cached location
      });

      const highAccuracyLocation: LocationResult = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp,
        isHighAccuracy: true
      };

      this.lastKnownLocation = highAccuracyLocation;
      this.highAccuracyReceived = true;
      this.callbacks?.onLocationUpdate(highAccuracyLocation);

      // Start watching for location changes
      this.startLocationWatch();
    } catch (error) {
      console.error('High accuracy location failed:', error);
      this.callbacks?.onError('Unable to fetch precise location');
      
      // If we have a last known location, that's better than nothing
      if (!this.lastKnownLocation) {
        this.callbacks?.onError('Location unavailable');
      }
    }
  }

  // Watch for location changes
  private async startLocationWatch() {
    try {
      this.watchId = await Geolocation.watchPosition({
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }, (position, err) => {
        if (err) {
          console.error('Location watch error:', err);
          return;
        }

        if (position) {
          const newLocation: LocationResult = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
            isHighAccuracy: true
          };

          this.lastKnownLocation = newLocation;
          this.callbacks?.onLocationUpdate(newLocation);
        }
      });
    } catch (error) {
      console.error('Failed to start location watch:', error);
    }
  }

  // Stop location tracking
  stopLocationTracking() {
    if (this.watchId) {
      Geolocation.clearWatch({ id: this.watchId });
      this.watchId = null;
    }
    this.callbacks = null;
  }

  // Get current cached location
  getCurrentLocation(): LocationResult | null {
    return this.lastKnownLocation;
  }

  // Check if high accuracy location has been received
  hasHighAccuracyLocation(): boolean {
    return this.highAccuracyReceived;
  }
}

export const locationService = new LocationService();
