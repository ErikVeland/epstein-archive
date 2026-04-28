import type { PropertyItemDto, PropertiesListResponseDto } from '@shared/dto/properties';

interface PropertyRowInput {
  id?: unknown;
  pcn?: unknown;
  ownerName1?: unknown;
  owner_name_1?: unknown;
  ownerName2?: unknown;
  owner_name_2?: unknown;
  streetName?: unknown;
  street_name?: unknown;
  siteAddress?: unknown;
  site_address?: unknown;
  totalTaxValue?: unknown;
  total_tax_value?: unknown;
  acres?: unknown;
  propertyUse?: unknown;
  property_use?: unknown;
  yearBuilt?: unknown;
  year_built?: unknown;
  bedrooms?: unknown;
  fullBathrooms?: unknown;
  full_bathrooms?: unknown;
  halfBathrooms?: unknown;
  half_bathrooms?: unknown;
  stories?: unknown;
  buildingValue?: unknown;
  building_value?: unknown;
  buildingArea?: unknown;
  building_area?: unknown;
  livingArea?: unknown;
  living_area?: unknown;
  isEpsteinProperty?: unknown;
  is_epstein_property?: unknown;
  isKnownAssociate?: unknown;
  is_known_associate?: unknown;
  linkedEntityId?: unknown;
  linked_entity_id?: unknown;
  addressSource?: unknown;
  address_source?: unknown;
}

interface PropertiesListInput {
  properties?: PropertyRowInput[];
  total?: unknown;
  page?: unknown;
  pageSize?: unknown;
  page_size?: unknown;
  totalPages?: unknown;
  total_pages?: unknown;
}

const asNullableNumber = (value: unknown): number | null => {
  if (value == null) return null;
  const n = Number(value);
  return isNaN(n) ? null : n;
};

const asNullableString = (value: unknown): string | null => {
  if (value == null) return null;
  return String(value);
};

export const mapPropertyItemDto = (row: PropertyRowInput): PropertyItemDto => ({
  id: row.id != null ? (typeof row.id === 'number' ? row.id : String(row.id)) : 0,
  pcn: asNullableString(row.pcn),
  ownerName1: asNullableString(row.ownerName1 ?? row.owner_name_1),
  ownerName2: asNullableString(row.ownerName2 ?? row.owner_name_2),
  streetName: asNullableString(row.streetName ?? row.street_name),
  siteAddress: asNullableString(row.siteAddress ?? row.site_address),
  totalTaxValue: asNullableNumber(row.totalTaxValue ?? row.total_tax_value),
  acres: asNullableNumber(row.acres),
  propertyUse: asNullableString(row.propertyUse ?? row.property_use),
  yearBuilt: asNullableNumber(row.yearBuilt ?? row.year_built),
  bedrooms: asNullableNumber(row.bedrooms),
  fullBathrooms: asNullableNumber(row.fullBathrooms ?? row.full_bathrooms),
  halfBathrooms: asNullableNumber(row.halfBathrooms ?? row.half_bathrooms),
  stories: asNullableNumber(row.stories),
  buildingValue: asNullableNumber(row.buildingValue ?? row.building_value),
  buildingArea: asNullableNumber(row.buildingArea ?? row.building_area),
  livingArea: asNullableNumber(row.livingArea ?? row.living_area),
  isEpsteinProperty: Boolean(row.isEpsteinProperty ?? row.is_epstein_property),
  isKnownAssociate: Boolean(row.isKnownAssociate ?? row.is_known_associate),
  linkedEntityId: asNullableNumber(row.linkedEntityId ?? row.linked_entity_id),
  addressSource: asNullableString(row.addressSource ?? row.address_source),
});

export const mapPropertiesListResponseDto = (
  result: PropertiesListInput,
): PropertiesListResponseDto => ({
  properties: Array.isArray(result.properties) ? result.properties.map(mapPropertyItemDto) : [],
  total: Number(result.total || 0),
  page: Number(result.page || 1),
  pageSize: Number((result.pageSize ?? result.page_size) || 50),
  totalPages: Number((result.totalPages ?? result.total_pages) || 1),
});
