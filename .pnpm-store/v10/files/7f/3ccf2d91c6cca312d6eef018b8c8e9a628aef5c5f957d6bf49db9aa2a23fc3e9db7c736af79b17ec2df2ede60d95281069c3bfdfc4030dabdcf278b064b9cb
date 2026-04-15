import { V as Value, L as LiteralUnion } from '../../generalTypes-BlKhVJMl.js';

interface FunctionParamType {
    mode?: 'IN' | 'OUT' | 'INOUT' | 'VARIADIC';
    name?: string;
    type: string;
    default?: Value;
}
type FunctionParam = string | FunctionParamType;
interface FunctionOptions {
    returns?: string;
    language: string;
    replace?: boolean;
    window?: boolean;
    behavior?: 'IMMUTABLE' | 'STABLE' | 'VOLATILE';
    security?: 'INVOKER' | 'DEFINER';
    onNull?: boolean;
    parallel?: 'UNSAFE' | 'RESTRICTED' | 'SAFE';
    set?: Array<{
        configurationParameter: string;
        value: LiteralUnion<'FROM CURRENT'>;
    }>;
}

export type { FunctionOptions, FunctionParam, FunctionParamType };
