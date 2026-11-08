import React, { useEffect, useState } from 'react';
import Icon from './Icon';
import { SEO } from './SEO';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@client/design-system/lib';
import { entityShareDetails } from '@shared/entityShare';
import s from './EntityProfileShare.module.css';

interface Props {
  entity: { id: string | number; fullName?: string; primaryRole?: string };
}

export function EntityProfileShare({ entity }: Props) {
  const details = entityShareDetails(entity);
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setFile(null);
    setMessage('');
  }, [entity.id]);

  const prepareImage = async () => {
    if (file || loading) return;
    setLoading(true);
    try {
      const response = await fetch(
        `/api/entities/${encodeURIComponent(String(entity.id))}/share-image`,
      );
      if (!response.ok || !response.headers.get('content-type')?.startsWith('image/png'))
        throw new Error('Image unavailable');
      setFile(
        new File([await response.blob()], `epstein-profile-${entity.id}.png`, {
          type: 'image/png',
        }),
      );
    } catch {
      setMessage('Could not prepare the image. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const download = () => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    setMessage('Image saved.');
  };

  const share = async (image: boolean) => {
    try {
      if (image && file) {
        if (navigator.share && navigator.canShare?.({ files: [file] })) {
          await navigator.share({ title: details.title, text: details.url, files: [file] });
        } else download();
      } else if (!image) {
        if (navigator.share)
          await navigator.share({ title: details.title, text: details.title, url: details.url });
        else {
          await navigator.clipboard.writeText(details.url);
          setMessage('Profile link copied.');
        }
      }
    } catch (error) {
      if (!(error instanceof Error && error.name === 'AbortError'))
        setMessage('Sharing failed. Use Copy profile link or Download image.');
    }
  };

  return (
    <div className={s.share}>
      <SEO {...details} canonical={details.url} />
      <DropdownMenu
        onOpenChange={(open) => {
          if (open) void prepareImage();
        }}
      >
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" aria-label={`Share ${entity.fullName || 'profile'}`}>
            <Icon name="Share2" size="sm" />
            <span>Share</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onSelect={() => {
              void share(false);
            }}
          >
            <Icon name="Link" size="sm" />
            Share profile link
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => {
              void navigator.clipboard
                .writeText(details.url)
                .then(() => setMessage('Profile link copied.'))
                .catch(() => setMessage('Could not copy the link.'));
            }}
          >
            <Icon name="Copy" size="sm" />
            Copy profile link
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!file}
            onSelect={() => {
              void share(true);
            }}
          >
            <Icon name="Share2" size="sm" />
            {loading ? 'Preparing image…' : 'Share profile image'}
          </DropdownMenuItem>
          <DropdownMenuItem disabled={!file} onSelect={download}>
            <Icon name="Download" size="sm" />
            Download image
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <span className={s.status} role="status">
        {message}
      </span>
    </div>
  );
}
