import { z } from 'zod';

export const propertyItemSchema = z.object({
  id: z.union([z.number(), z.string()]),
  pcn: z.string().optional(),
  owner_name_1: z.string().nullable().optional(),
  owner_name_2: z.string().nullable().optional(),
  street_name: z.string().nullable().optional(),
  site_address: z.string().nullable().optional(),
  total_tax_value: z.number().nullable().optional(),
  acres: z.number().nullable().optional(),
  property_use: z.string().nullable().optional(),
  year_built: z.number().nullable().optional(),
  bedrooms: z.number().nullable().optional(),
  full_bathrooms: z.number().nullable().optional(),
  half_bathrooms: z.number().nullable().optional(),
  stories: z.number().nullable().optional(),
  building_value: z.number().nullable().optional(),
  building_area: z.number().nullable().optional(),
  living_area: z.number().nullable().optional(),
  is_epstein_property: z.number().optional(),
  is_known_associate: z.number().optional(),
  linked_entity_id: z.number().nullable().optional(),
  address_source: z.string().nullable().optional(),
});

// Schema for GET /api/properties
export const propertiesListResponseSchema = z.object({
  properties: z.array(propertyItemSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  totalPages: z.number(),
});

// Schema for GET /api/properties/stats
export const propertyStatsResponseSchema = z.object({
  totalProperties: z.number(),
  epsteinProperties: z.number(),
  knownAssociateProperties: z.number(),
  avgTaxValue: z.number(),
  maxTaxValue: z.number(),
  propertyTypes: z.array(
    z.object({
      type: z.string().nullable(),
      count: z.number(),
    }),
  ),
});
