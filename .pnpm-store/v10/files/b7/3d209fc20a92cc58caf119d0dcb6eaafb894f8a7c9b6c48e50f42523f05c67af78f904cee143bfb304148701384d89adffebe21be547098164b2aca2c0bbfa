import { b as ConstraintOptions, M as MigrationOptions } from '../../migrationOptions-BgtOZlq1.js';
import { R as Reversible, N as Name } from '../../generalTypes-BlKhVJMl.js';
import { DropConstraintOptions } from './dropConstraint.js';
import '../../logger.js';
import '../../utils/createTransformer.js';

type CreateConstraintFn = (tableName: Name, constraintName: string | null, constraintExpressionOrOptions: (ConstraintOptions & DropConstraintOptions) | string) => string;
type CreateConstraint = Reversible<CreateConstraintFn>;
declare function addConstraint(mOptions: MigrationOptions): CreateConstraint;

export { type CreateConstraint, type CreateConstraintFn, addConstraint };
