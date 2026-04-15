class PgLiteral {
  /**
   * Creates a new `PgLiteral` instance.
   *
   * @param str The string value.
   * @returns The new `PgLiteral` instance.
   */
  static create(str) {
    return new PgLiteral(str);
  }
  /**
   * Indicates that this object is a `PgLiteral`.
   */
  literal = true;
  /**
   * Value of the literal.
   */
  value;
  /**
   * Creates a new `PgLiteral` instance.
   *
   * @param value The string value.
   */
  constructor(value) {
    this.value = value;
  }
  /**
   * Returns the string value.
   *
   * @returns The string value.
   */
  toString() {
    return this.value;
  }
}
function isPgLiteral(val) {
  return val instanceof PgLiteral || typeof val === "object" && val !== null && "literal" in val && val.literal === true;
}
export {
  PgLiteral,
  isPgLiteral
};
