import { useMemo, useState } from 'react';
import Icon from './Icon';
import styles from './ShareCitationBar.module.css';

interface ShareCitationBarProps {
  title: string;
  citation: string;
  url?: string;
  sourceUrl?: string;
}

async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', 'true');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}

export function ShareCitationBar({ title, citation, url, sourceUrl }: ShareCitationBarProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const shareUrl = url || window.location.href;
  const shareText = useMemo(() => `${title}\n${shareUrl}`, [shareUrl, title]);

  const handleCopy = async (label: string, text: string) => {
    await copyText(text);
    setCopied(label);
    window.setTimeout(() => setCopied(null), 1600);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      await navigator.share({ title, text: title, url: shareUrl });
      return;
    }
    await handleCopy('link', shareUrl);
  };

  return (
    <div className={styles.bar}>
      <button className={styles.button} type="button" onClick={handleNativeShare}>
        <Icon name="Share2" size="sm" />
        Share
      </button>
      <button className={styles.button} type="button" onClick={() => handleCopy('link', shareUrl)}>
        <Icon name="Link" size="sm" />
        Copy Link
      </button>
      <button
        className={styles.button}
        type="button"
        onClick={() => handleCopy('citation', citation)}
      >
        <Icon name="Quote" size="sm" />
        Copy Citation
      </button>
      <button
        className={styles.button}
        type="button"
        onClick={() => handleCopy('share', shareText)}
      >
        <Icon name="Clipboard" size="sm" />
        Copy Share Text
      </button>
      {sourceUrl && (
        <a className={styles.button} href={sourceUrl}>
          <Icon name="ExternalLink" size="sm" />
          Open Source
        </a>
      )}
      {copied && <span className={styles.copied}>Copied {copied}</span>}
    </div>
  );
}
