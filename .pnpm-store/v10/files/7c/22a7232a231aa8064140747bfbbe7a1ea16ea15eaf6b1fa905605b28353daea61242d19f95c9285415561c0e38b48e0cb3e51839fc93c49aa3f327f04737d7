import { S as SequenceOptions, M as MigrationOptions } from '../../migrationOptions-BgtOZlq1.js';
import { N as Name } from '../../generalTypes-BlKhVJMl.js';
import '../../logger.js';
import '../../utils/createTransformer.js';

interface AlterSequenceOptions extends SequenceOptions {
    restart?: number | true;
}
type AlterSequence = (sequenceName: Name, sequenceOptions: AlterSequenceOptions) => string;
declare function alterSequence(mOptions: MigrationOptions): AlterSequence;

export { type AlterSequence, type AlterSequenceOptions, alterSequence };
