export * from './platform.js'

const Buffer = /* @__PURE__ */ (() => globalThis.Buffer)()

export function assert(condition, msg) {
  if (!condition) throw new Error(msg)
}

export function assertU8(arg) {
  if (!(arg instanceof Uint8Array)) throw new TypeError('Expected an Uint8Array')
}

// On arrays in heap (<= 64) it's cheaper to copy into a pooled buffer than lazy-create the ArrayBuffer storage
export const toBuf = (x) =>
  x.byteLength <= 64 && x.BYTES_PER_ELEMENT === 1
    ? Buffer.from(x)
    : Buffer.from(x.buffer, x.byteOffset, x.byteLength)

export const E_STRING = 'Input is not a string'
export const E_STRICT_UNICODE = 'Input is not well-formed Unicode'
