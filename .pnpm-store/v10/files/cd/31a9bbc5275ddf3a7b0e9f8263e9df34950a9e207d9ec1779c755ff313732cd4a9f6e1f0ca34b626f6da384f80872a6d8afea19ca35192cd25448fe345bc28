import { M as MigrationOptions } from '../../migrationOptions-BgtOZlq1.js';
import { R as Reversible, N as Name, T as Type } from '../../generalTypes-BlKhVJMl.js';
import { DropDomainOptions } from './dropDomain.js';
import { DomainOptions } from './shared.js';
import '../../logger.js';
import '../../utils/createTransformer.js';

interface CreateDomainOptions extends DomainOptions {
    collation?: string;
}
type CreateDomainFn = (domainName: Name, type: Type, domainOptions?: CreateDomainOptions & DropDomainOptions) => string;
type CreateDomain = Reversible<CreateDomainFn>;
declare function createDomain(mOptions: MigrationOptions): CreateDomain;

export { type CreateDomain, type CreateDomainFn, type CreateDomainOptions, createDomain };
