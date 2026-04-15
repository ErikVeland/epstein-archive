import { M as MigrationOptions } from '../../migrationOptions-BgtOZlq1.js';
import { N as Name } from '../../generalTypes-BlKhVJMl.js';
import { DomainOptions } from './shared.js';
import '../../logger.js';
import '../../utils/createTransformer.js';

interface AlterDomainOptions extends DomainOptions {
    allowNull?: boolean;
}
type AlterDomain = (domainName: Name, domainOptions: AlterDomainOptions) => string;
declare function alterDomain(mOptions: MigrationOptions): AlterDomain;

export { type AlterDomain, type AlterDomainOptions, alterDomain };
