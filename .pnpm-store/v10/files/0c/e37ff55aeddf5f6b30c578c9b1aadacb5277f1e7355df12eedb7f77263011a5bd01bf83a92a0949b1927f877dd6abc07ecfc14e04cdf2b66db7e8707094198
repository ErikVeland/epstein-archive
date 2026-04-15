/**
 * Represents a string that should not be escaped when used in a query.
 *
 * This will be used in `pgm.func` to create unescaped strings.
 */
declare class PgLiteral {
    /**
     * Creates a new `PgLiteral` instance.
     *
     * @param str The string value.
     * @returns The new `PgLiteral` instance.
     */
    static create(str: string): PgLiteral;
    /**
     * Indicates that this object is a `PgLiteral`.
     */
    readonly literal = true;
    /**
     * Value of the literal.
     */
    readonly value: string;
    /**
     * Creates a new `PgLiteral` instance.
     *
     * @param value The string value.
     */
    constructor(value: string);
    /**
     * Returns the string value.
     *
     * @returns The string value.
     */
    toString(): string;
}
type PgLiteralValue = PublicPart<PgLiteral>;
/**
 * Checks if the given value is a `PgLiteral`.
 *
 * @param val The value to check.
 * @returns `true` if the value is a `PgLiteral`, or `false` otherwise.
 */
declare function isPgLiteral(val: unknown): val is PgLiteral;

/**
 * Type that provides auto-suggestions but also any string.
 *
 * @see https://github.com/microsoft/TypeScript/issues/29729#issuecomment-471566609
 */
type LiteralUnion<TSuggested extends TBase, TBase = string> = TSuggested | (TBase & {
    zz_IGNORE_ME?: never;
});
type PublicPart<T> = {
    [K in keyof T]: T[K];
};
type Nullable<T> = {
    [P in keyof T]: T[P] | null;
};
type Value = null | boolean | string | number | PgLiteral | PgLiteralValue | Value[];
type Type = string | {
    type: string;
};
type Name = string | {
    schema?: string;
    name: string;
};
interface IfNotExistsOption {
    ifNotExists?: boolean;
}
interface IfExistsOption {
    ifExists?: boolean;
}
interface CascadeOption {
    cascade?: boolean;
}
type DropOptions = IfExistsOption & CascadeOption;
/**
 * A function that returns a normal SQL statement or an array of SQL statements.
 *
 * The array is useful for operations that need to return multiple SQL statements like an additional `COMMENT`.
 */
type OperationFn = (...args: any[]) => string | string[];
/**
 * A function that returns a normal SQL statement or an array of SQL statements.
 *
 * The array is useful for operations that need to return multiple SQL statements like an additional `COMMENT`.
 *
 * The `reverse` property is a function that takes the same arguments and try to infer the reverse SQL statement with that.
 */
type Operation = OperationFn & {
    /**
     * Reverse the operation if provided.
     */
    reverse?: OperationFn;
};
/**
 * A function that returns a normal SQL statement or an array of SQL statements.
 *
 * The array is useful for operations that need to return multiple SQL statements like an additional `COMMENT`.
 *
 * The `reverse` property is a function that takes the same arguments and try to infer the reverse SQL statement with that.
 */
type Reversible<TFunction extends (...args: any[]) => string | string[]> = TFunction & {
    /**
     * Reverse the operation.
     *
     * Needs to be the same function definition, because it takes the same
     * arguments and try to infer the reverse SQL statement with that.
     */
    reverse: TFunction;
};

export { type CascadeOption as C, type DropOptions as D, type IfExistsOption as I, type LiteralUnion as L, type Name as N, type Operation as O, type PublicPart as P, type Reversible as R, type Type as T, type Value as V, type IfNotExistsOption as a, type Nullable as b, type OperationFn as c, PgLiteral as d, type PgLiteralValue as e, isPgLiteral as i };
