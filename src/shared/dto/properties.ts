export interface PropertyItemDto {
  id: number | string;
  pcn: string | null;
  ownerName1: string | null;
  ownerName2: string | null;
  streetName: string | null;
  siteAddress: string | null;
  totalTaxValue: number | null;
  acres: number | null;
  propertyUse: string | null;
  yearBuilt: number | null;
  bedrooms: number | null;
  fullBathrooms: number | null;
  halfBathrooms: number | null;
  stories: number | null;
  buildingValue: number | null;
  buildingArea: number | null;
  livingArea: number | null;
  isEpsteinProperty: boolean;
  isKnownAssociate: boolean;
  linkedEntityId: number | null;
  addressSource: string | null;
}

export interface PropertiesListResponseDto {
  properties: PropertyItemDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
