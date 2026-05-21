import Icon from '@client/components/common/Icon';
import { Button, Switch } from '@client/design-system/lib';
import styles from './EmailClient.module.css';

type EmailSettingsModalProps = {
  showYahooPostMortem: boolean;
  showEmptyBodies: boolean;
  onClose: () => void;
  onToggleSetting: (setting: 'showYahooPostMortem' | 'showEmptyBodies', value: boolean) => void;
};

export function EmailSettingsModal({
  showYahooPostMortem,
  showEmptyBodies,
  onClose,
  onToggleSetting,
}: EmailSettingsModalProps) {
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContainer} onClick={(event) => event.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Settings</h2>
          <Button unstyled type="button" className={styles.modalCloseBtn} onClick={onClose}>
            <Icon name="X" size="lg" />
          </Button>
        </div>
        <div className={styles.modalContent}>
          <div className={styles.sectionTitle}>YAHOO INBOX</div>

          <div className={styles.settingRow}>
            <Switch
              checked={showYahooPostMortem}
              onCheckedChange={(checked) => onToggleSetting('showYahooPostMortem', checked)}
              aria-label="Show Yahoo emails after August 15, 2019"
              className={styles.settingsSwitch}
            />
            <div className={styles.settingTexts}>
              <span className={styles.settingLabel}>Show Yahoo emails after August 15, 2019</span>
              <span className={styles.settingSubtitle}>
                Nearly all newsletters and spam, but potentially interesting
              </span>
            </div>
          </div>

          <div className={styles.settingsSpacer} />

          <div className={styles.settingRow}>
            <Switch
              checked={showEmptyBodies}
              onCheckedChange={(checked) => onToggleSetting('showEmptyBodies', checked)}
              aria-label="Show emails with empty or fully redacted bodies"
              className={styles.settingsSwitch}
            />
            <div className={styles.settingTexts}>
              <span className={styles.settingLabel}>
                Show emails with empty or fully redacted bodies
              </span>
              <span className={styles.settingSubtitle}>
                Emails where the content is blank or completely redacted
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
