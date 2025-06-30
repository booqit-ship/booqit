
import { Geolocation } from '@capacitor/geolocation';

export const getLocation = async () => {
  const permission = await Geolocation.requestPermissions();
  if (permission.location === 'granted') {
    const coords = await Geolocation.getCurrentPosition();
    console.log('Current location:', coords);
    return coords;
  }
  throw new Error('Location permission denied');
};
