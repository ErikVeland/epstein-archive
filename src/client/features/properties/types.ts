export interface Property {
  id: number;
  pcn: string;
  owner_name_1: string | null;
  owner_name_2: string | null;
  street_name: string | null;
  site_address: string | null;
  total_tax_value: number | null;
  acres: number | null;
  property_use: string | null;
  year_built: number | null;
  bedrooms: number | null;
  full_bathrooms: number | null;
  half_bathrooms: number | null;
  stories: number | null;
  building_value: number | null;
  building_area: number | null;
  living_area: number | null;
  is_epstein_property: number;
  is_known_associate: number;
  linked_entity_id: number | null;
  address_source: 'original' | 'name_derived' | null;
}

export interface PropertyStats {
  totalProperties: number;
  epsteinProperties: number;
  knownAssociateProperties: number;
  avgTaxValue: number;
  maxTaxValue: number;
  propertyTypes: { type: string; count: number }[];
}

export interface ValueDistribution {
  range: string;
  count: number;
  min: number;
  max: number;
}

export interface TopOwner {
  owner_name: string;
  property_count: number;
  total_value: number;
}
