export interface SharedFlightDto {
  id: number;
  date: string | null;
  origin: string | null;
  destination: string | null;
  tailNumber: string | null;
  otherPassengers: string[];
}

export interface SharedCommunicationDto {
  threadId: string;
  subject: string | null;
  messageCount: number;
  firstDate: string | null;
  lastDate: string | null;
}

export interface SharedClaimDto {
  id: string;
  predicate: string | null;
  objectText: string | null;
  subjectEntityId: string | null;
  objectEntityId: string | null;
  subjectName: string | null;
  objectName: string | null;
  documentCount: number;
}

export interface SharedDocumentDto {
  id: string;
  title: string;
  evidenceType: string | null;
  date: string | null;
  wordCount: number | null;
}

export interface ConnectionPathDto {
  hops: number;
  nodes: Array<{ id: string; name: string; type: string }>;
  edges: Array<{ source: string; target: string; type: string }>;
}

export interface ConnectionEntityDto {
  id: string;
  name: string;
  type: string;
}

export interface ConnectionDossierDto {
  entityA: ConnectionEntityDto;
  entityB: ConnectionEntityDto;
  signals: {
    flights: SharedFlightDto[];
    communications: SharedCommunicationDto[];
    path: ConnectionPathDto | null;
    claims: SharedClaimDto[];
    documents: SharedDocumentDto[];
  };
  summary: {
    flightCount: number;
    communicationCount: number;
    pathHops: number | null;
    claimCount: number;
    documentCount: number;
  };
}

export interface SemanticCapabilityDto {
  available: boolean;
  reason?: string;
  provider?: string;
  documentEmbeddings: number;
  entityEmbeddings: number;
  totalDocuments: number;
  totalEntities: number;
}
