export const VLM_VERIFIED_PHOTOGRAPH_STATUSES = ['verified', 'source_verified'] as const;

export interface VlmMediaEligibilityInput {
  fileType: string | null;
  verificationStatus: string | null;
  metadata: Record<string, unknown> | null;
}

function metadataString(metadata: Record<string, unknown> | null, key: string): string {
  const value = metadata?.[key];
  return typeof value === 'string' ? value : '';
}

export function isVerifiedPhotographForVlm(input: VlmMediaEligibilityInput): boolean {
  return (
    input.fileType?.toLowerCase().startsWith('image/') === true &&
    metadataString(input.metadata, 'visual_classification') === 'probable_photograph' &&
    VLM_VERIFIED_PHOTOGRAPH_STATUSES.includes(
      input.verificationStatus as (typeof VLM_VERIFIED_PHOTOGRAPH_STATUSES)[number],
    ) &&
    metadataString(input.metadata, 'source_file_status') !== 'missing'
  );
}

export function verifiedPhotographForVlmWhereSql(alias: string): string {
  if (!/^[a-z_][a-z0-9_]*$/i.test(alias)) {
    throw new Error(`Invalid SQL alias: ${alias}`);
  }
  return `${alias}.file_type LIKE 'image/%'
    AND ${alias}.metadata_json->>'visual_classification' = 'probable_photograph'
    AND ${alias}.verification_status IN ('verified', 'source_verified')
    AND COALESCE(${alias}.metadata_json->>'source_file_status', '') <> 'missing'`;
}
