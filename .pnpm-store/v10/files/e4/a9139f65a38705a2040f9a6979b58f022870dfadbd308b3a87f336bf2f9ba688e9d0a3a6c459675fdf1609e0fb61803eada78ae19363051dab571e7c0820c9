/**
 * React statics that should not be hoisted
 */
const REACT_STATICS = {
  childContextTypes: true,
  contextType: true,
  contextTypes: true,
  defaultProps: true,
  displayName: true,
  getDefaultProps: true,
  getDerivedStateFromError: true,
  getDerivedStateFromProps: true,
  mixins: true,
  propTypes: true,
  type: true,
} ;

/**
 * Known JavaScript function statics that should not be hoisted
 */
const KNOWN_STATICS = {
  name: true,
  length: true,
  prototype: true,
  caller: true,
  callee: true,
  arguments: true,
  arity: true,
} ;

/**
 * Statics specific to ForwardRef components
 */
const FORWARD_REF_STATICS = {
  $$typeof: true,
  render: true,
  defaultProps: true,
  displayName: true,
  propTypes: true,
} ;

/**
 * Statics specific to Memo components
 */
const MEMO_STATICS = {
  $$typeof: true,
  compare: true,
  defaultProps: true,
  displayName: true,
  propTypes: true,
  type: true,
} ;

/**
 * Inlined react-is utilities
 * We only need to detect ForwardRef and Memo types
 */
const ForwardRefType = Symbol.for('react.forward_ref');
const MemoType = Symbol.for('react.memo');

/**
 * Check if a component is a Memo component
 */
function isMemo(component) {
  return (
    typeof component === 'object' && component !== null && (component ).$$typeof === MemoType
  );
}

/**
 * Map of React component types to their specific statics
 */
const TYPE_STATICS = {};
TYPE_STATICS[ForwardRefType] = FORWARD_REF_STATICS;
TYPE_STATICS[MemoType] = MEMO_STATICS;

/**
 * Get the appropriate statics object for a given component
 */
function getStatics(component) {
  // React v16.11 and below
  if (isMemo(component)) {
    return MEMO_STATICS;
  }

  // React v16.12 and above
  const componentType = (component ).$$typeof;
  return (componentType && TYPE_STATICS[componentType]) || REACT_STATICS;
}

const defineProperty = Object.defineProperty.bind(Object);
const getOwnPropertyNames = Object.getOwnPropertyNames.bind(Object);
const getOwnPropertySymbols = Object.getOwnPropertySymbols?.bind(Object);
const getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor.bind(Object);
const getPrototypeOf = Object.getPrototypeOf.bind(Object);
const objectPrototype = Object.prototype;

/**
 * Copies non-react specific statics from a child component to a parent component.
 * Similar to Object.assign, but copies all static properties from source to target,
 * excluding React-specific statics and known JavaScript statics.
 *
 * @param targetComponent - The component to copy statics to
 * @param sourceComponent - The component to copy statics from
 * @param excludelist - An optional object of keys to exclude from hoisting
 * @returns The target component with hoisted statics
 */
function hoistNonReactStatics

(targetComponent, sourceComponent, excludelist) {
  if (typeof sourceComponent !== 'string') {
    // Don't hoist over string (html) components
    if (objectPrototype) {
      const inheritedComponent = getPrototypeOf(sourceComponent);

      if (inheritedComponent && inheritedComponent !== objectPrototype) {
        hoistNonReactStatics(targetComponent, inheritedComponent);
      }
    }

    let keys = getOwnPropertyNames(sourceComponent);

    if (getOwnPropertySymbols) {
      keys = keys.concat(getOwnPropertySymbols(sourceComponent));
    }

    const targetStatics = getStatics(targetComponent);
    const sourceStatics = getStatics(sourceComponent);

    for (const key of keys) {
      // Use key directly - String(key) throws for Symbols if minified to '' + key (#18966)
      if (
        !KNOWN_STATICS[key ] &&
        true &&
        !sourceStatics?.[key ] &&
        !targetStatics?.[key ] &&
        !getOwnPropertyDescriptor(targetComponent, key) // Don't overwrite existing properties
      ) {
        const descriptor = getOwnPropertyDescriptor(sourceComponent, key);

        if (descriptor) {
          try {
            // Avoid failures from read-only properties
            defineProperty(targetComponent, key, descriptor);
          } catch (_e) {
            // Silently ignore errors
          }
        }
      }
    }
  }

  return targetComponent;
}

export { hoistNonReactStatics };
//# sourceMappingURL=hoist-non-react-statics.js.map
