import profiles from './pacTrackProfiles.json';

export function pacTrackProfileForEntity(
  entity: { id?: string | number; fullName?: string } | null,
): string | null {
  if (!entity?.id || !entity.fullName) return null;
  const normalise = (value: string) => value.trim().toLocaleLowerCase();
  const match = profiles.find(
    (profile) =>
      profile.entityId === String(entity.id) &&
      normalise(profile.entityName) === normalise(entity.fullName ?? ''),
  );
  return match?.pacTrackUrl ?? null;
}
