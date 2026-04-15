import { S as SequenceOptions, M as MigrationOptions } from '../../migrationOptions-BgtOZlq1.js';
import { R as Reversible, N as Name, a as IfNotExistsOption } from '../../generalTypes-BlKhVJMl.js';
import { DropSequenceOptions } from './dropSequence.js';
import '../../logger.js';
import '../../utils/createTransformer.js';

interface CreateSequenceOptions extends SequenceOptions, IfNotExistsOption {
    temporary?: boolean;
}
type CreateSequenceFn = (sequenceName: Name, sequenceOptions?: CreateSequenceOptions & DropSequenceOptions) => string;
type CreateSequence = Reversible<CreateSequenceFn>;
declare function createSequence(mOptions: MigrationOptions): CreateSequence;

export { type CreateSequence, type CreateSequenceFn, type CreateSequenceOptions, createSequence };
