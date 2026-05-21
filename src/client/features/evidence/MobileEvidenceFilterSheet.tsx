import Icon from '@client/components/common/Icon';
import { Button, Flex, LqText, Select, Stack } from '@client/design-system/lib';
import { SheetDialog } from '@client/components/common/SheetDialog';
import styles from './EvidenceFilters.module.css';

type SortBy = 'relevance' | 'mentions' | 'redflag_asc' | 'redflag_desc' | 'name';

interface FilterOptions {
  redFlagRatings: { value: number; label: string }[];
  sortByOptions: { value: string; label: string }[];
}

interface MobileEvidenceFilterSheetProps {
  open: boolean;
  onClose: () => void;
  minRedFlagRating: number;
  onMinRedFlagRatingChange: (value: number) => void;
  maxRedFlagRating: number;
  onMaxRedFlagRatingChange: (value: number) => void;
  sortBy: SortBy;
  onSortByChange: (value: SortBy) => void;
  showRedFlagOnly: boolean;
  onShowRedFlagOnlyChange: (value: boolean) => void;
  filterOptions: FilterOptions;
  onReset: () => void;
}

export function MobileEvidenceFilterSheet({
  open,
  onClose,
  minRedFlagRating,
  onMinRedFlagRatingChange,
  maxRedFlagRating,
  onMaxRedFlagRatingChange,
  sortBy,
  onSortByChange,
  showRedFlagOnly,
  onShowRedFlagOnlyChange,
  filterOptions,
  onReset,
}: MobileEvidenceFilterSheetProps) {
  return (
    <SheetDialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
      title="Advanced Filters"
      footer={
        <>
          <Button variant="secondary" size="md" grow onClick={onReset} type="button">
            Reset
          </Button>
          <Button variant="primary" size="md" grow onClick={onClose} type="button">
            Apply
          </Button>
        </>
      }
    >
      <Stack gap="lg">
        <Stack gap="xs">
          <LqText variant="small" weight="bold" color="muted">
            Rating Threshold
          </LqText>
          <Flex align="center" gap="sm">
            <Select
              size="sm"
              value={minRedFlagRating}
              onChange={(e) => onMinRedFlagRatingChange(Number(e.target.value))}
              options={filterOptions.redFlagRatings.map((r) => ({
                value: r.value,
                label: r.label,
              }))}
            />
            <LqText variant="xs" color="muted" className={styles.separatorText}>
              to
            </LqText>
            <Select
              size="sm"
              value={maxRedFlagRating}
              onChange={(e) => onMaxRedFlagRatingChange(Number(e.target.value))}
              options={filterOptions.redFlagRatings.map((r) => ({
                value: r.value,
                label: r.label,
              }))}
            />
          </Flex>
        </Stack>

        <Stack gap="xs">
          <LqText variant="small" weight="bold" color="muted">
            Correlation Order
          </LqText>
          <Select
            size="sm"
            value={sortBy}
            onChange={(e) => onSortByChange(e.target.value as SortBy)}
            options={filterOptions.sortByOptions}
          />
        </Stack>

        <Stack gap="xs">
          <LqText variant="small" weight="bold" color="muted">
            Intelligence Focus
          </LqText>
          <Button
            variant={showRedFlagOnly ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => onShowRedFlagOnlyChange(!showRedFlagOnly)}
            className={styles.fullWidthBtn}
          >
            <Icon name="Flag" size="sm" />
            {showRedFlagOnly ? 'Flagged Intelligence Only' : 'Include All Observations'}
          </Button>
        </Stack>
      </Stack>
    </SheetDialog>
  );
}
