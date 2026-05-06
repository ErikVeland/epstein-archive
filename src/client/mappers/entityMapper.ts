import type { Person, Photo } from '@client/types';
import type { EntityListItemDto, EntityDetailDto } from '@shared/dto/entities';

export function mapEntityListItemToPerson(dto: EntityListItemDto): Person {
  return {
    id: dto.id,
    name: dto.name,
    fullName: dto.fullName,
    title: dto.fullName,
    role: dto.primaryRole,
    primaryRole: dto.primaryRole,
    secondaryRoles: dto.secondaryRoles,
    mentions: dto.mentions,
    files: dto.files,
    contexts: dto.contexts as Person['contexts'],
    evidenceTypes: dto.evidenceTypes,
    significantPassages: dto.significantPassages as Person['significantPassages'],
    likelihoodScore: dto.likelihoodScore,
    redFlagScore: dto.redFlagScore,
    redFlagRating: dto.redFlagRating,
    redFlagPeppers: dto.redFlagPeppers,
    redFlagDescription: dto.redFlagDescription,
    connectionsToEpstein: dto.connectionsToEpstein,
    photos: dto.photos as Photo[],
    bio: dto.bio,
    entityType: dto.entityType,
  };
}

export function mapEntityDetailToPerson(dto: EntityDetailDto): Person {
  return {
    id: dto.id,
    name: dto.name,
    fullName: dto.fullName,
    entityType: dto.entityType,
    primaryRole: dto.primaryRole,
    secondaryRoles: dto.secondaryRoles,
    mentions: dto.mentions,
    files: dto.files,
    contexts: dto.contexts as Person['contexts'],
    evidenceTypes: dto.evidenceTypes,
    likelihoodScore: dto.likelihoodScore,
    redFlagScore: dto.redFlagScore,
    redFlagRating: dto.redFlagRating,
    redFlagPeppers: dto.redFlagPeppers,
    redFlagDescription: dto.redFlagDescription,
    connectionsToEpstein: dto.connectionsToEpstein,
    fileReferences: dto.fileReferences as Person['fileReferences'],
    bio: dto.bio,
    birthDate: dto.birthDate ?? undefined,
    deathDate: dto.deathDate ?? undefined,
    photos: dto.photos as Photo[],
    significantPassages: dto.significantPassages as Person['significantPassages'],
    timelineEvents: dto.timelineEvents as Person['timelineEvents'],
    networkConnections: dto.networkConnections as Person['networkConnections'],
    blackBookEntries: dto.blackBookEntries as Person['blackBookEntries'],
    description: dto.description,
  };
}
