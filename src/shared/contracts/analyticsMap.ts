import { z } from 'zod';
const latitude = z
  .union([z.number(), z.string().min(1)])
  .transform(Number)
  .pipe(z.number().finite().min(-90).max(90));
const longitude = z
  .union([z.number(), z.string().min(1)])
  .transform(Number)
  .pipe(z.number().finite().min(-180).max(180));
export const mapLocationSchema = z.object({
  id: z.union([z.number().int().positive(), z.string().regex(/^\d+$/)]),
  label: z.string(),
  lat: latitude,
  lng: longitude,
  type: z.string(),
});
export const mapLocationsSchema = z.array(mapLocationSchema);
export const airportLocationsSchema = z.record(
  z.string(),
  z.object({ lat: latitude, lng: longitude, city: z.string() }),
);
