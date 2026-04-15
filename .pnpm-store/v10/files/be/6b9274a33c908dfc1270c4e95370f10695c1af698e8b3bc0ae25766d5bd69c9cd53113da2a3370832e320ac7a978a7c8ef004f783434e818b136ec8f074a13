import { M as MigrationOptions } from '../../migrationOptions-BgtOZlq1.js';
import { R as Reversible, N as Name } from '../../generalTypes-BlKhVJMl.js';
import { DropPolicyOptions } from './dropPolicy.js';
import { PolicyOptions } from './shared.js';
import '../../logger.js';
import '../../utils/createTransformer.js';

interface CreatePolicyOptionsEn {
    command?: 'ALL' | 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
}
type CreatePolicyOptions = CreatePolicyOptionsEn & PolicyOptions;
type CreatePolicyFn = (tableName: Name, policyName: string, policyOptions?: CreatePolicyOptions & DropPolicyOptions) => string;
type CreatePolicy = Reversible<CreatePolicyFn>;
declare function createPolicy(mOptions: MigrationOptions): CreatePolicy;

export { type CreatePolicy, type CreatePolicyOptions, type CreatePolicyOptionsEn, createPolicy };
