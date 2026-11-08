import sharp from 'sharp';

function escapeXml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[character] ||
      character,
  );
}

function lines(value: string, length: number, maximum: number): string[] {
  const chunks = value.trim().match(new RegExp(`.{1,${length}}(?:\\s|$)|.{1,${length}}`, 'gu')) || [
    'Archive profile',
  ];
  const result = chunks.slice(0, maximum).map((line) => line.trim());
  if (chunks.length > maximum) result[maximum - 1] = `${result[maximum - 1].slice(0, -1)}…`;
  return result;
}

export async function renderEntityShareImage(
  entity: { id: string | number; fullName: string; primaryRole?: string },
  portraitPath?: string | null,
): Promise<Buffer> {
  let portrait: Buffer | undefined;
  if (portraitPath) {
    try {
      portrait = await sharp(portraitPath, { limitInputPixels: 40000000 })
        .rotate()
        .resize(320, 390, { fit: 'cover', position: 'attention' })
        .png()
        .toBuffer();
    } catch {
      portrait = undefined;
    }
  }
  const nameLines = lines(entity.fullName, 25, 3);
  const roleLines = lines(
    entity.primaryRole && entity.primaryRole !== 'Unknown' ? entity.primaryRole : 'Archive profile',
    43,
    2,
  );
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
        <rect width="1200" height="630" fill="#111820"/>
        <rect x="0" y="0" width="1200" height="8" fill="#d6b775"/>
        <text x="56" y="66" fill="#d6b775" font-family="sans-serif" font-size="23" letter-spacing="4">THE EPSTEIN FILES</text>
        <rect x="56" y="106" width="320" height="390" rx="8" fill="#253440"/>
        <text x="216" y="308" text-anchor="middle" fill="#b7c6d2" font-family="sans-serif" font-size="30">Portrait unavailable</text>
        <text x="424" y="138" fill="#b7c6d2" font-family="sans-serif" font-size="18" letter-spacing="3">ARCHIVE PROFILE</text>
        ${nameLines.map((line, i) => `<text x="424" y="${210 + i * 58}" fill="#f4f0e9" font-family="sans-serif" font-weight="bold" font-size="46">${escapeXml(line)}</text>`).join('')}
        ${roleLines.map((line, i) => `<text x="424" y="${230 + nameLines.length * 58 + i * 32}" fill="#d6b775" font-family="sans-serif" font-size="25">${escapeXml(line)}</text>`).join('')}
        <text x="424" y="477" fill="#b7c6d2" font-family="sans-serif" font-size="22">Documents · References · Source evidence</text>
        <path d="M56 528 H1144" stroke="#40505c"/>
        <text x="56" y="565" fill="#f4f0e9" font-family="sans-serif" font-size="24">epstein.academy/entity/${escapeXml(String(entity.id))}</text>
        <text x="56" y="603" fill="#b7c6d2" font-family="sans-serif" font-size="19">Inclusion or mention in the archive does not establish wrongdoing.</text>
    </svg>`;
  const card = sharp(Buffer.from(svg));
  if (portrait) card.composite([{ input: portrait, left: 56, top: 106 }]);
  return card.png().toBuffer();
}
