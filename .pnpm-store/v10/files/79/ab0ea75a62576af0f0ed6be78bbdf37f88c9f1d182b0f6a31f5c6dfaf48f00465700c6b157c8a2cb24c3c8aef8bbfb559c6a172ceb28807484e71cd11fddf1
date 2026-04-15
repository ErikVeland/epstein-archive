# @exodus/bytes

[![](https://img.shields.io/npm/v/@exodus/bytes?style=flat-square)](https://npmjs.org/package/@exodus/bytes)
[![](https://img.shields.io/github/release/ExodusOSS/bytes?style=flat-square&logo=github)](https://github.com/ExodusOSS/bytes/releases)
[![](https://img.shields.io/npm/dm/@exodus/bytes?style=flat-square)](https://www.npmcharts.com/compare/@exodus/bytes?minimal=true)
[![](https://img.shields.io/npm/l/@exodus/bytes?style=flat-square&color=blue)](https://github.com/ExodusOSS/bytes/blob/HEAD/LICENSE)
[![](https://img.shields.io/github/check-runs/ExodusOSS/bytes/main?style=flat-square&logo=github)](https://github.com/ExodusOSS/bytes/actions/workflows/test.yml?query=branch%3Amain)

`Uint8Array` conversion to and from `base64`, `base32`, `base58`, `hex`, `utf8`, `utf16`, `bech32` and `wif`

And a [`TextEncoder` / `TextDecoder` polyfill](#textencoder--textdecoder-polyfill)

See [documentation](https://exodusoss.github.io/bytes/).

## Strict

Performs proper input validation, ensures no garbage-in-garbage-out

Tested in CI with [@exodus/test](https://github.com/ExodusMovement/test#exodustest) on:

[![Node.js](https://img.shields.io/badge/Node.js-338750?style=for-the-badge&logo=Node.js&logoColor=FFF)](https://nodejs.org/api/test.html)
[![Deno](https://img.shields.io/badge/Deno-121417?style=for-the-badge&logo=Deno&logoColor=FFF)](https://deno.com/)
[![Bun](https://img.shields.io/badge/Bun-F472B6?style=for-the-badge&logo=Bun&logoColor=FFF)](https://bun.sh/)
[![Electron](https://img.shields.io/badge/Electron-2F3242?style=for-the-badge&logo=Electron&logoColor=A2ECFB)](http://electronjs.org/)
[![workerd](https://img.shields.io/badge/workerd-F38020?style=for-the-badge&logo=cloudflareworkers&logoColor=FFF)](https://github.com/cloudflare/workerd)\
[![Chrome](https://img.shields.io/badge/Chrome-4285F4?style=for-the-badge&logo=GoogleChrome&logoColor=FFF)](https://www.chromium.org/Home/)
[![WebKit](https://img.shields.io/badge/WebKit-006CFF?style=for-the-badge&logo=Safari&logoColor=FFF)](http://webkit.org/)
[![Firefox](https://img.shields.io/badge/Firefox-FF7139?style=for-the-badge&logo=Firefox&logoColor=FFF)](https://github.com/mozilla-firefox)
[![Servo](https://img.shields.io/badge/Servo-009D9A?style=for-the-badge)](https://servo.org/)\
[![Hermes](https://img.shields.io/badge/Hermes-282C34?style=for-the-badge&logo=React)](https://hermesengine.dev)
[![V8](https://img.shields.io/badge/V8-4285F4?style=for-the-badge&logo=V8&logoColor=white)](https://v8.dev/docs/d8)
[![JavaScriptCore](https://img.shields.io/badge/JavaScriptCore-006CFF?style=for-the-badge)](https://docs.webkit.org/Deep%20Dive/JSC/JavaScriptCore.html)
[![SpiderMonkey](https://img.shields.io/badge/SpiderMonkey-FFD681?style=for-the-badge)](https://spidermonkey.dev/)\
[![QuickJS](https://img.shields.io/badge/QuickJS-E58200?style=for-the-badge)](https://github.com/quickjs-ng/quickjs)
[![XS](https://img.shields.io/badge/XS-0B307A?style=for-the-badge)](https://github.com/Moddable-OpenSource/moddable)
[![GraalJS](https://img.shields.io/badge/GraalJS-C74634?style=for-the-badge)](https://github.com/oracle/graaljs)

## Fast

* `10-20x` faster than `Buffer` polyfill
* `2-10x` faster than `iconv-lite`

The above was for the js fallback

It's up to `100x` when native impl is available \
e.g. in `utf8fromString` on Hermes / React Native or `fromHex` in Chrome

Also:
* `3-8x` faster than `bs58`
* `10-30x` faster than `@scure/base` (or `>100x` on Node.js <25)
* Faster in `utf8toString` / `utf8fromString` than `Buffer` or `TextDecoder` / `TextEncoder` on Node.js

See [Performance](./Performance.md) for more info

## TextEncoder / TextDecoder polyfill

```js
import { TextDecoder, TextEncoder } from '@exodus/bytes/encoding.js'
import { TextDecoderStream, TextEncoderStream } from '@exodus/bytes/encoding.js' // Requires Streams
```

Less than half the bundle size of [text-encoding](https://npmjs.com/text-encoding), [whatwg-encoding](https://npmjs.com/whatwg-encoding) or [iconv-lite](https://npmjs.com/iconv-lite) (gzipped or not).\
Also [much faster](#fast) than all of those.

> [!TIP]
> See also the [lite version](#lite-version) to get this down to 10 KiB gzipped.

Spec compliant, passing WPT and covered with extra tests.\
Moreover, tests for this library uncovered [bugs in all major implementations](https://docs.google.com/spreadsheets/d/1pdEefRG6r9fZy61WHGz0TKSt8cO4ISWqlpBN5KntIvQ/edit).\
Including all three major browser engines being wrong at UTF-8.\
See [WPT pull request](https://github.com/web-platform-tests/wpt/pull/56892).

It works correctly even in environments that have native implementations broken (that's all of them currently).\
Runs (and passes WPT) on Node.js built without ICU.

> [!NOTE]
> [Faster than Node.js native implementation on Node.js](https://github.com/nodejs/node/issues/61041#issuecomment-3649242024).
>
> The JS multi-byte version is as fast as native impl in Node.js and browsers, but (unlike them) returns correct results.
>
> For encodings where native version is known to be fast and correct, it is automatically used.\
> Some single-byte encodings are faster than native in all three major browser engines.

See [analysis table](https://docs.google.com/spreadsheets/d/1pdEefRG6r9fZy61WHGz0TKSt8cO4ISWqlpBN5KntIvQ/edit) for more info.

### Caveat: `TextDecoder` / `TextEncoder` APIs are lossy by default per spec

_These are only provided as a compatibility layer, prefer hardened APIs instead in new code._

 * `TextDecoder` can (and should) be used with `{ fatal: true }` option for all purposes demanding correctness / lossless transforms

 * `TextEncoder` does not support a fatal mode per spec, it always performs replacement.

   That is not suitable for hashing, cryptography or consensus applications.\
   Otherwise there would be non-equal strings with equal signatures and hashes — the collision is caused by the lossy transform of a JS string to bytes.
   Those also survive e.g. `JSON.stringify`/`JSON.parse` or being sent over network.

   Use strict APIs in new applications, see `utf8fromString` / `utf16fromString` below.\
   Those throw on non-well-formed strings by default.

### Lite version

Alternate exports exist that can help reduce bundle size, see comparison:

| import | size |
| - | - |
| [@exodus/bytes/encoding-browser.js](#exodusbytesencoding-browserjs-) | <sub>![](https://img.shields.io/bundlejs/size/@exodus/bytes/encoding-browser.js?style=flat-square)</sub> |
| [@exodus/bytes/encoding-lite.js](#exodusbytesencoding-litejs-) | <sub>![](https://img.shields.io/bundlejs/size/@exodus/bytes/encoding-lite.js?style=flat-square)</sub> |
| [@exodus/bytes/encoding.js](#exodusbytesencodingjs-) | <sub>![](https://img.shields.io/bundlejs/size/@exodus/bytes/encoding.js?style=flat-square)</sub> |
| `text-encoding` | <sub>![](https://img.shields.io/bundlejs/size/text-encoding?style=flat-square)</sub> |
| `iconv-lite` | <sub>![](https://img.shields.io/bundlejs/size/iconv-lite/lib/index.js?style=flat-square)</sub> |
| `whatwg-encoding` | <sub>![](https://img.shields.io/bundlejs/size/whatwg-encoding?style=flat-square)</sub> |

Libraries are advised to use single-purpose hardened `@exodus/bytes/utf8.js` / `@exodus/bytes/utf16.js` APIs for Unicode.

Applications (including React Native apps) are advised to load either `@exodus/bytes/encoding-lite.js` or `@exodus/bytes/encoding.js`
(depending on whether legacy multi-byte support is needed) and use that as a global polyfill.

#### `@exodus/bytes/encoding-lite.js`

If you don't need support for legacy multi-byte encodings.

Reduces the bundle size ~12x, while still keeping `utf-8`, `utf-16le`, `utf-16be` and all single-byte encodings specified by the spec.
The only difference is support for legacy multi-byte encodings.

See [the list of encodings](https://encoding.spec.whatwg.org/#names-and-labels).

This can be useful for example in React Native global TextDecoder polyfill,
if you are sure that you don't need legacy multi-byte encodings support.

#### `@exodus/bytes/encoding-browser.js`

Resolves to a tiny import in browser bundles, preferring native `TextDecoder` / `TextEncoder`.

For non-browsers (Node.js, React Native), loads a full implementation.

> [!NOTE]
> This is not the default behavior for `@exodus/bytes/encoding.js` because all major browser implementations have bugs,
> which `@exodus/bytes/encoding.js` fixes. Only use if you are ok with that.

## API

### @exodus/bytes/utf8.js <sub>![](https://img.shields.io/bundlejs/size/@exodus/bytes/utf8.js?style=flat-square)<sub>

UTF-8 encoding/decoding

```js
import { utf8fromString, utf8toString } from '@exodus/bytes/utf8.js'

// loose
import { utf8fromStringLoose, utf8toStringLoose } from '@exodus/bytes/utf8.js'
```

_These methods by design encode/decode BOM (codepoint `U+FEFF` Byte Order Mark) as-is._\
_If you need BOM handling or detection, use `@exodus/bytes/encoding.js`_

#### `utf8fromString(string, format = 'uint8')`

Encode a string to UTF-8 bytes (strict mode)

Throws on invalid Unicode (unpaired surrogates)

This is similar to the following snippet (but works on all engines):
```js
// Strict encode, requiring Unicode codepoints to be valid
if (typeof string !== 'string' || !string.isWellFormed()) throw new TypeError()
return new TextEncoder().encode(string)
```

#### `utf8fromStringLoose(string, format = 'uint8')`

Encode a string to UTF-8 bytes (loose mode)

Replaces invalid Unicode (unpaired surrogates) with replacement codepoints `U+FFFD`
per [WHATWG Encoding](https://encoding.spec.whatwg.org/) specification.

_Such replacement is a non-injective function, is irreversable and causes collisions.\
Prefer using strict throwing methods for cryptography applications._

This is similar to the following snippet (but works on all engines):
```js
// Loose encode, replacing invalid Unicode codepoints with U+FFFD
if (typeof string !== 'string') throw new TypeError()
return new TextEncoder().encode(string)
```

#### `utf8toString(arr)`

Decode UTF-8 bytes to a string (strict mode)

Throws on invalid UTF-8 byte sequences

This is similar to `new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(arr)`,
but works on all engines.

#### `utf8toStringLoose(arr)`

Decode UTF-8 bytes to a string (loose mode)

Replaces invalid UTF-8 byte sequences with replacement codepoints `U+FFFD`
per [WHATWG Encoding](https://encoding.spec.whatwg.org/) specification.

_Such replacement is a non-injective function, is irreversable and causes collisions.\
Prefer using strict throwing methods for cryptography applications._

This is similar to `new TextDecoder('utf-8', { ignoreBOM: true }).decode(arr)`,
but works on all engines.

### @exodus/bytes/utf16.js <sub>![](https://img.shields.io/bundlejs/size/@exodus/bytes/utf16.js?style=flat-square)<sub>

UTF-16 encoding/decoding

```js
import { utf16fromString, utf16toString } from '@exodus/bytes/utf16.js'

// loose
import { utf16fromStringLoose, utf16toStringLoose } from '@exodus/bytes/utf16.js'
```

_These methods by design encode/decode BOM (codepoint `U+FEFF` Byte Order Mark) as-is._\
_If you need BOM handling or detection, use `@exodus/bytes/encoding.js`_

#### `utf16fromString(string, format = 'uint16')`

Encode a string to UTF-16 bytes (strict mode)

Throws on invalid Unicode (unpaired surrogates)

#### `utf16fromStringLoose(string, format = 'uint16')`

Encode a string to UTF-16 bytes (loose mode)

Replaces invalid Unicode (unpaired surrogates) with replacement codepoints `U+FFFD`
per [WHATWG Encoding](https://encoding.spec.whatwg.org/) specification.

_Such replacement is a non-injective function, is irreversible and causes collisions.\
Prefer using strict throwing methods for cryptography applications._

#### `utf16toString(arr, format = 'uint16')`

Decode UTF-16 bytes to a string (strict mode)

Throws on invalid UTF-16 byte sequences

Throws on non-even byte length.

#### `utf16toStringLoose(arr, format = 'uint16')`

Decode UTF-16 bytes to a string (loose mode)

Replaces invalid UTF-16 byte sequences with replacement codepoints `U+FFFD`
per [WHATWG Encoding](https://encoding.spec.whatwg.org/) specification.

_Such replacement is a non-injective function, is irreversible and causes collisions.\
Prefer using strict throwing methods for cryptography applications._

Throws on non-even byte length.

### @exodus/bytes/single-byte.js <sub>![](https://img.shields.io/bundlejs/size/@exodus/bytes/single-byte.js?style=flat-square)</sub>

Decode / encode the legacy single-byte encodings according to the
[Encoding standard](https://encoding.spec.whatwg.org/)
([§9](https://encoding.spec.whatwg.org/#legacy-single-byte-encodings),
[§14.5](https://encoding.spec.whatwg.org/#x-user-defined)),
and [unicode.org](https://unicode.org/Public/MAPPINGS/ISO8859) `iso-8859-*` mappings.

```js
import { createSinglebyteDecoder, createSinglebyteEncoder } from '@exodus/bytes/single-byte.js'
import { windows1252toString, windows1252fromString } from '@exodus/bytes/single-byte.js'
import { latin1toString, latin1fromString } from '@exodus/bytes/single-byte.js'
```

> [!WARNING]
> This is a lower-level API for single-byte encodings.
> It might not match what you expect, as it supports both WHATWG and unicode.org encodings under
> different names, with the main intended usecase for the latter being either non-web or legacy contexts.
>
> For a safe WHATWG Encoding-compatible API, see `@exodus/bytes/encoding.js` import (and variants of it).
>
> Be sure to know what you are doing and check documentation when directly using encodings from this file.

Supports all single-byte encodings listed in the WHATWG Encoding standard:
`ibm866`, `iso-8859-2`, `iso-8859-3`, `iso-8859-4`, `iso-8859-5`, `iso-8859-6`, `iso-8859-7`, `iso-8859-8`,
`iso-8859-8-i`, `iso-8859-10`, `iso-8859-13`, `iso-8859-14`, `iso-8859-15`, `iso-8859-16`, `koi8-r`, `koi8-u`,
`macintosh`, `windows-874`, `windows-1250`, `windows-1251`, `windows-1252`, `windows-1253`, `windows-1254`,
`windows-1255`, `windows-1256`, `windows-1257`, `windows-1258`, `x-mac-cyrillic` and `x-user-defined`.

Also supports `iso-8859-1`, `iso-8859-9`, `iso-8859-11` as defined at
[unicode.org](https://unicode.org/Public/MAPPINGS/ISO8859)
(and all other `iso-8859-*` encodings there as they match WHATWG).

> [!NOTE]
> While all `iso-8859-*` encodings supported by the [WHATWG Encoding standard](https://encoding.spec.whatwg.org/) match
> [unicode.org](https://unicode.org/Public/MAPPINGS/ISO8859), the WHATWG Encoding spec doesn't support
> `iso-8859-1`, `iso-8859-9`, `iso-8859-11`, and instead maps them as labels to `windows-1252`, `windows-1254`, `windows-874`.\
> `createSinglebyteDecoder()` (unlike `TextDecoder` or `legacyHookDecode()`) does not do such mapping,
> so its results will differ from `TextDecoder` for those encoding names.

```js
> new TextDecoder('iso-8859-1').encoding
'windows-1252'
> new TextDecoder('iso-8859-9').encoding
'windows-1254'
> new TextDecoder('iso-8859-11').encoding
'windows-874'
> new TextDecoder('iso-8859-9').decode(Uint8Array.of(0x80, 0x81, 0xd0))
'€\x81Ğ' // this is actually decoded according to windows-1254 per TextDecoder spec
> createSinglebyteDecoder('iso-8859-9')(Uint8Array.of(0x80, 0x81, 0xd0))
'\x80\x81Ğ' // this is iso-8859-9 as defined at https://unicode.org/Public/MAPPINGS/ISO8859/8859-9.txt
```

All WHATWG Encoding spec [`windows-*` encodings](https://encoding.spec.whatwg.org/#windows-874) are supersets of
corresponding [unicode.org encodings](https://unicode.org/Public/MAPPINGS/VENDORS/MICSFT/WINDOWS/), meaning that
they encode/decode all the old valid (non-replacement) strings / byte sequences identically, but can also support
a wider range of inputs.

#### `createSinglebyteDecoder(encoding, loose = false)`

Create a decoder for a supported one-byte `encoding`, given its lowercased name `encoding`.

Returns a function `decode(arr)` that decodes bytes to a string.

#### `createSinglebyteEncoder(encoding, { mode = 'fatal' })`

Create an encoder for a supported one-byte `encoding`, given its lowercased name `encoding`.

Returns a function `encode(string)` that encodes a string to bytes.

In `'fatal'` mode (default), will throw on non well-formed strings or any codepoints which could
not be encoded in the target encoding.

#### `latin1toString(arr)`

Decode `iso-8859-1` bytes to a string.

There is no loose variant for this encoding, all bytes can be decoded.

Same as:
```js
const latin1toString = createSinglebyteDecoder('iso-8859-1')
```

> [!NOTE]
> This is different from `new TextDecoder('iso-8859-1')` and `new TextDecoder('latin1')`, as those
> alias to `new TextDecoder('windows-1252')`.

#### `latin1fromString(string)`

Encode a string to `iso-8859-1` bytes.

Throws on non well-formed strings or any codepoints which could not be encoded in `iso-8859-1`.

Same as:
```js
const latin1fromString = createSinglebyteEncoder('iso-8859-1', { mode: 'fatal' })
```

#### `windows1252toString(arr)`

Decode `windows-1252` bytes to a string.

There is no loose variant for this encoding, all bytes can be decoded.

Same as:
```js
const windows1252toString = createSinglebyteDecoder('windows-1252')
```

#### `windows1252fromString(string)`

Encode a string to `windows-1252` bytes.

Throws on non well-formed strings or any codepoints which could not be encoded in `windows-1252`.

Same as:
```js
const windows1252fromString = createSinglebyteEncoder('windows-1252', { mode: 'fatal' })
```

### @exodus/bytes/multi-byte.js <sub>![](https://img.shields.io/bundlejs/size/@exodus/bytes/multi-byte.js?style=flat-square)</sub>

Decode / encode the legacy multi-byte encodings according to the
[Encoding standard](https://encoding.spec.whatwg.org/)
([§10](https://encoding.spec.whatwg.org/#legacy-multi-byte-chinese-(simplified)-encodings),
[§11](https://encoding.spec.whatwg.org/#legacy-multi-byte-chinese-(traditional)-encodings),
[§12](https://encoding.spec.whatwg.org/#legacy-multi-byte-japanese-encodings),
[§13](https://encoding.spec.whatwg.org/#legacy-multi-byte-korean-encodings)).

```js
import { createMultibyteDecoder, createMultibyteEncoder } from '@exodus/bytes/multi-byte.js'
```

> [!WARNING]
> This is a lower-level API for legacy multi-byte encodings.
>
> For a safe WHATWG Encoding-compatible API, see `@exodus/bytes/encoding.js` import (and variants of it).
>
> Be sure to know what you are doing and check documentation when directly using encodings from this file.

Supports all legacy multi-byte encodings listed in the WHATWG Encoding standard:
`gbk`, `gb18030`, `big5`, `euc-jp`, `iso-2022-jp`, `shift_jis`, `euc-kr`.

#### `createMultibyteDecoder(encoding, loose = false)`

Create a decoder for a supported legacy multi-byte `encoding`, given its lowercased name `encoding`.

Returns a function `decode(arr, stream = false)` that decodes bytes to a string.

The returned function will maintain internal state while `stream = true` is used, allowing it to
handle incomplete multi-byte sequences across multiple calls.
State is reset when `stream = false` or when the function is called without the `stream` parameter.

#### `createMultibyteEncoder(encoding, { mode = 'fatal' })`

Create an encoder for a supported legacy multi-byte `encoding`, given its lowercased name `encoding`.

Returns a function `encode(string)` that encodes a string to bytes.

In `'fatal'` mode (default), will throw on non well-formed strings or any codepoints which could
not be encoded in the target encoding.

### @exodus/bytes/bigint.js <sub>![](https://img.shields.io/bundlejs/size/@exodus/bytes/bigint.js?style=flat-square)</sub>

Convert between BigInt and Uint8Array

```js
import { fromBigInt, toBigInt } from '@exodus/bytes/bigint.js'
```

#### `fromBigInt(bigint, { length, format = 'uint8' })`

Convert a BigInt to a Uint8Array or Buffer

The output bytes are in big-endian format.

Throws if the BigInt is negative or cannot fit into the specified length.

#### `toBigInt(arr)`

Convert a Uint8Array or Buffer to a BigInt

The bytes are interpreted as a big-endian unsigned integer.

### @exodus/bytes/hex.js <sub>![](https://img.shields.io/bundlejs/size/@exodus/bytes/hex.js?style=flat-square)</sub>

Implements Base16 from [RFC4648](https://datatracker.ietf.org/doc/html/rfc4648)
(no differences from [RFC3548](https://datatracker.ietf.org/doc/html/rfc4648)).

```js
import { fromHex, toHex } from '@exodus/bytes/hex.js'
```

#### `fromHex(string, format = 'uint8')`

Decode a hex string to bytes

Unlike `Buffer.from()`, throws on invalid input

#### `toHex(arr)`

Encode a `Uint8Array` to a lowercase hex string

### @exodus/bytes/base64.js <sub>![](https://img.shields.io/bundlejs/size/@exodus/bytes/base64.js?style=flat-square)</sub>

Implements base64 and base64url from [RFC4648](https://datatracker.ietf.org/doc/html/rfc4648)
(no differences from [RFC3548](https://datatracker.ietf.org/doc/html/rfc4648)).

```js
import { fromBase64, toBase64 } from '@exodus/bytes/base64.js'
import { fromBase64url, toBase64url } from '@exodus/bytes/base64.js'
import { fromBase64any } from '@exodus/bytes/base64.js'
```

#### `fromBase64(string, { format = 'uint8', padding = 'both' })`

Decode a base64 string to bytes

Operates in strict mode for last chunk, does not allow whitespace

#### `fromBase64url(string, { format = 'uint8', padding = false })`

Decode a base64url string to bytes

Operates in strict mode for last chunk, does not allow whitespace

#### `fromBase64any(string, { format = 'uint8', padding = 'both' })`

Decode either base64 or base64url string to bytes

Automatically detects the variant based on characters present

#### `toBase64(arr, { padding = true })`

Encode a `Uint8Array` to a base64 string (RFC 4648)

#### `toBase64url(arr, { padding = false })`

Encode a `Uint8Array` to a base64url string (RFC 4648)

### @exodus/bytes/base32.js <sub>![](https://img.shields.io/bundlejs/size/@exodus/bytes/base32.js?style=flat-square)</sub>

Implements base32 and base32hex from [RFC4648](https://datatracker.ietf.org/doc/html/rfc4648)
(no differences from [RFC3548](https://datatracker.ietf.org/doc/html/rfc4648)).

```js
import { fromBase32, toBase32 } from '@exodus/bytes/base32.js'
import { fromBase32hex, toBase32hex } from '@exodus/bytes/base32.js'
```

#### `fromBase32(string, { format = 'uint8', padding = 'both' })`

Decode a base32 string to bytes

Operates in strict mode for last chunk, does not allow whitespace

#### `fromBase32hex(string, { format = 'uint8', padding = 'both' })`

Decode a base32hex string to bytes

Operates in strict mode for last chunk, does not allow whitespace

#### `toBase32(arr, { padding = false })`

Encode a `Uint8Array` to a base32 string (RFC 4648)

#### `toBase32hex(arr, { padding = false })`

Encode a `Uint8Array` to a base32hex string (RFC 4648)

### @exodus/bytes/bech32.js <sub>![](https://img.shields.io/bundlejs/size/@exodus/bytes/bech32.js?style=flat-square)</sub>

Implements bech32 and bech32m from
[BIP-0173](https://github.com/bitcoin/bips/blob/master/bip-0173.mediawiki#specification)
and [BIP-0350](https://github.com/bitcoin/bips/blob/master/bip-0350.mediawiki#specification).

```js
import { fromBech32, toBech32 } from '@exodus/bytes/bech32.js'
import { fromBech32m, toBech32m } from '@exodus/bytes/bech32.js'
import { getPrefix } from '@exodus/bytes/bech32.js'
```

#### `getPrefix(string, limit = 90)`

Extract the prefix from a bech32 or bech32m string without full validation

This is a quick check that skips most validation.

#### `fromBech32(string, limit = 90)`

Decode a bech32 string to bytes

#### `toBech32(prefix, bytes, limit = 90)`

Encode bytes to a bech32 string

#### `fromBech32m(string, limit = 90)`

Decode a bech32m string to bytes

#### `toBech32m(prefix, bytes, limit = 90)`

Encode bytes to a bech32m string

### @exodus/bytes/base58.js <sub>![](https://img.shields.io/bundlejs/size/@exodus/bytes/base58.js?style=flat-square)</sub>

Implements [base58](https://www.ietf.org/archive/id/draft-msporny-base58-03.txt) encoding.

Supports both standard base58 and XRP variant alphabets.

```js
import { fromBase58, toBase58 } from '@exodus/bytes/base58.js'
import { fromBase58xrp, toBase58xrp } from '@exodus/bytes/base58.js'
```

#### `fromBase58(string, format = 'uint8')`

Decode a base58 string to bytes

Uses the standard Bitcoin base58 alphabet

#### `toBase58(arr)`

Encode a `Uint8Array` to a base58 string

Uses the standard Bitcoin base58 alphabet

#### `fromBase58xrp(string, format = 'uint8')`

Decode a base58 string to bytes using XRP alphabet

Uses the XRP variant base58 alphabet

#### `toBase58xrp(arr)`

Encode a `Uint8Array` to a base58 string using XRP alphabet

Uses the XRP variant base58 alphabet

### @exodus/bytes/base58check.js <sub>![](https://img.shields.io/bundlejs/size/@exodus/bytes/base58check.js?style=flat-square)</sub>

Implements [base58check](https://en.bitcoin.it/wiki/Base58Check_encoding) encoding.

```js
import { fromBase58check, toBase58check } from '@exodus/bytes/base58check.js'
import { fromBase58checkSync, toBase58checkSync } from '@exodus/bytes/base58check.js'
import { makeBase58check } from '@exodus/bytes/base58check.js'
```

On non-Node.js, requires peer dependency [@noble/hashes](https://www.npmjs.com/package/@noble/hashes) to be installed.

#### `async fromBase58check(string, format = 'uint8')`

Decode a base58check string to bytes asynchronously

Validates the checksum using double SHA-256

#### `async toBase58check(arr)`

Encode bytes to base58check string asynchronously

Uses double SHA-256 for checksum calculation

#### `fromBase58checkSync(string, format = 'uint8')`

Decode a base58check string to bytes synchronously

Validates the checksum using double SHA-256

#### `toBase58checkSync(arr)`

Encode bytes to base58check string synchronously

Uses double SHA-256 for checksum calculation

#### `makeBase58check(hashAlgo, hashAlgoSync)`

Create a base58check encoder/decoder with custom hash functions

### @exodus/bytes/wif.js <sub>![](https://img.shields.io/bundlejs/size/@exodus/bytes/wif.js?style=flat-square)</sub>

Wallet Import Format (WIF) encoding and decoding.

```js
import { fromWifString, toWifString } from '@exodus/bytes/wif.js'
import { fromWifStringSync, toWifStringSync } from '@exodus/bytes/wif.js'
```

On non-Node.js, requires peer dependency [@noble/hashes](https://www.npmjs.com/package/@noble/hashes) to be installed.

#### `async fromWifString(string[, version])`

Decode a WIF string to WIF data

Returns a promise that resolves to an object with `{ version, privateKey, compressed }`.

The optional `version` parameter validates the version byte.

Throws if the WIF string is invalid or version doesn't match.

#### `fromWifStringSync(string[, version])`

Decode a WIF string to WIF data (synchronous)

Returns an object with `{ version, privateKey, compressed }`.

The optional `version` parameter validates the version byte.

Throws if the WIF string is invalid or version doesn't match.

#### `async toWifString({ version, privateKey, compressed })`

Encode WIF data to a WIF string

#### `toWifStringSync({ version, privateKey, compressed })`

Encode WIF data to a WIF string (synchronous)

### @exodus/bytes/array.js <sub>![](https://img.shields.io/bundlejs/size/@exodus/bytes/array.js?style=flat-square)</sub>

TypedArray utils and conversions.

```js
import { typedView } from '@exodus/bytes/array.js'
```

#### `typedView(arr, format = 'uint8')`

Create a view of a TypedArray in the specified format (`'uint8'` or `'buffer'`)

> [!IMPORTANT]
> Does not copy data, returns a view on the same underlying buffer

### @exodus/bytes/encoding.js <sub>![](https://img.shields.io/bundlejs/size/@exodus/bytes/encoding.js?style=flat-square)</sub>

Implements the [Encoding standard](https://encoding.spec.whatwg.org/):
[TextDecoder](https://encoding.spec.whatwg.org/#interface-textdecoder),
[TextEncoder](https://encoding.spec.whatwg.org/#interface-textencoder),
[TextDecoderStream](https://encoding.spec.whatwg.org/#interface-textdecoderstream),
[TextEncoderStream](https://encoding.spec.whatwg.org/#interface-textencoderstream),
some [hooks](https://encoding.spec.whatwg.org/#specification-hooks).

```js
import { TextDecoder, TextEncoder } from '@exodus/bytes/encoding.js'
import { TextDecoderStream, TextEncoderStream } from '@exodus/bytes/encoding.js' // Requires Streams

// Hooks for standards
import { getBOMEncoding, legacyHookDecode, labelToName, normalizeEncoding } from '@exodus/bytes/encoding.js'
```

#### `new TextDecoder(label = 'utf-8', { fatal = false, ignoreBOM = false })`

[TextDecoder](https://encoding.spec.whatwg.org/#interface-textdecoder) implementation/polyfill.

Decode bytes to strings according to [WHATWG Encoding](https://encoding.spec.whatwg.org) specification.

#### `new TextEncoder()`

[TextEncoder](https://encoding.spec.whatwg.org/#interface-textencoder) implementation/polyfill.

Encode strings to UTF-8 bytes according to [WHATWG Encoding](https://encoding.spec.whatwg.org) specification.

#### `new TextDecoderStream(label = 'utf-8', { fatal = false, ignoreBOM = false })`

[TextDecoderStream](https://encoding.spec.whatwg.org/#interface-textdecoderstream) implementation/polyfill.

A [Streams](https://streams.spec.whatwg.org/) wrapper for `TextDecoder`.

Requires [Streams](https://streams.spec.whatwg.org/) to be either supported by the platform or
[polyfilled](https://npmjs.com/package/web-streams-polyfill).

#### `new TextEncoderStream()`

[TextEncoderStream](https://encoding.spec.whatwg.org/#interface-textencoderstream) implementation/polyfill.

A [Streams](https://streams.spec.whatwg.org/) wrapper for `TextEncoder`.

Requires [Streams](https://streams.spec.whatwg.org/) to be either supported by the platform or
[polyfilled](https://npmjs.com/package/web-streams-polyfill).

#### `labelToName(label)`

Implements [get an encoding from a string `label`](https://encoding.spec.whatwg.org/#concept-encoding-get).

Convert an encoding [label](https://encoding.spec.whatwg.org/#names-and-labels) to its name,
as a case-sensitive string.

If an encoding with that label does not exist, returns `null`.

All encoding names are also valid labels for corresponding encodings.

#### `normalizeEncoding(label)`

Convert an encoding [label](https://encoding.spec.whatwg.org/#names-and-labels) to its name,
as an ASCII-lowercased string.

If an encoding with that label does not exist, returns `null`.

This is the same as [`decoder.encoding` getter](https://encoding.spec.whatwg.org/#dom-textdecoder-encoding),
except that it:
 1. Supports [`replacement` encoding](https://encoding.spec.whatwg.org/#replacement) and its
    [labels](https://encoding.spec.whatwg.org/#ref-for-replacement%E2%91%A1)
 2. Does not throw for invalid labels and instead returns `null`

It is identical to:
```js
labelToName(label)?.toLowerCase() ?? null
```

All encoding names are also valid labels for corresponding encodings.

#### `getBOMEncoding(input)`

Implements [BOM sniff](https://encoding.spec.whatwg.org/#bom-sniff) legacy hook.

Given a `TypedArray` or an `ArrayBuffer` instance `input`, returns either of:
- `'utf-8'`, if `input` starts with UTF-8 byte order mark.
- `'utf-16le'`, if `input` starts with UTF-16LE byte order mark.
- `'utf-16be'`, if `input` starts with UTF-16BE byte order mark.
- `null` otherwise.

#### `legacyHookDecode(input, fallbackEncoding = 'utf-8')`

Implements [decode](https://encoding.spec.whatwg.org/#decode) legacy hook.

Given a `TypedArray` or an `ArrayBuffer` instance `input` and an optional `fallbackEncoding`
encoding [label](https://encoding.spec.whatwg.org/#names-and-labels),
sniffs encoding from BOM with `fallbackEncoding` fallback and then
decodes the `input` using that encoding, skipping BOM if it was present.

Notes:

- BOM-sniffed encoding takes precedence over `fallbackEncoding` option per spec.
  Use with care.
- Always operates in non-fatal [mode](https://encoding.spec.whatwg.org/#textdecoder-error-mode),
  aka replacement. It can convert different byte sequences to equal strings.

This method is similar to the following code, except that it doesn't support encoding labels and
only expects lowercased encoding name:

```js
new TextDecoder(getBOMEncoding(input) ?? fallbackEncoding).decode(input)
```

### @exodus/bytes/encoding-lite.js <sub>![](https://img.shields.io/bundlejs/size/@exodus/bytes/encoding-lite.js?style=flat-square)</sub>

The exact same exports as `@exodus/bytes/encoding.js` are also exported as
`@exodus/bytes/encoding-lite.js`, with the difference that the lite version does not load
multi-byte `TextDecoder` encodings by default to reduce bundle size ~12x.

```js
import { TextDecoder, TextEncoder } from '@exodus/bytes/encoding-lite.js'
import { TextDecoderStream, TextEncoderStream } from '@exodus/bytes/encoding-lite.js' // Requires Streams

// Hooks for standards
import { getBOMEncoding, legacyHookDecode, labelToName, normalizeEncoding } from '@exodus/bytes/encoding-lite.js'
```

The only affected encodings are: `gbk`, `gb18030`, `big5`, `euc-jp`, `iso-2022-jp`, `shift_jis`
and their [labels](https://encoding.spec.whatwg.org/#names-and-labels) when used with `TextDecoder`.

Legacy single-byte encodingds are loaded by default in both cases.

`TextEncoder` and hooks for standards (including `labelToName` / `normalizeEncoding`) do not have any behavior
differences in the lite version and support full range if inputs.

To avoid inconsistencies, the exported classes and methods are exactly the same objects.

```console
> lite = require('@exodus/bytes/encoding-lite.js')
[Module: null prototype] {
  TextDecoder: [class TextDecoder],
  TextDecoderStream: [class TextDecoderStream],
  TextEncoder: [class TextEncoder],
  TextEncoderStream: [class TextEncoderStream],
  getBOMEncoding: [Function: getBOMEncoding],
  labelToName: [Function: labelToName],
  legacyHookDecode: [Function: legacyHookDecode],
  normalizeEncoding: [Function: normalizeEncoding]
}
> new lite.TextDecoder('big5').decode(Uint8Array.of(0x25))
Uncaught:
Error: Legacy multi-byte encodings are disabled in /encoding-lite.js, use /encoding.js for full encodings range support

> full = require('@exodus/bytes/encoding.js')
[Module: null prototype] {
  TextDecoder: [class TextDecoder],
  TextDecoderStream: [class TextDecoderStream],
  TextEncoder: [class TextEncoder],
  TextEncoderStream: [class TextEncoderStream],
  getBOMEncoding: [Function: getBOMEncoding],
  labelToName: [Function: labelToName],
  legacyHookDecode: [Function: legacyHookDecode],
  normalizeEncoding: [Function: normalizeEncoding]
}
> full.TextDecoder === lite.TextDecoder
true
> new full.TextDecoder('big5').decode(Uint8Array.of(0x25))
'%'
> new lite.TextDecoder('big5').decode(Uint8Array.of(0x25))
'%'
```

### @exodus/bytes/encoding-browser.js <sub>![](https://img.shields.io/bundlejs/size/@exodus/bytes/encoding-browser.js?style=flat-square)<sub>

Same as `@exodus/bytes/encoding.js`, but in browsers instead of polyfilling just uses whatever the
browser provides, drastically reducing the bundle size (to less than 2 KiB gzipped).

```js
import { TextDecoder, TextEncoder } from '@exodus/bytes/encoding-browser.js'
import { TextDecoderStream, TextEncoderStream } from '@exodus/bytes/encoding-browser.js' // Requires Streams

// Hooks for standards
import { getBOMEncoding, legacyHookDecode, labelToName, normalizeEncoding } from '@exodus/bytes/encoding-browser.js'
```

Under non-browser engines (Node.js, React Native, etc.) a full polyfill is used as those platforms
do not provide sufficiently complete / non-buggy `TextDecoder` APIs.

> [!NOTE]
> Implementations in browsers [have bugs](https://docs.google.com/spreadsheets/d/1pdEefRG6r9fZy61WHGz0TKSt8cO4ISWqlpBN5KntIvQ/edit),
> but they are fixing them and the expected update window is short.\
> If you want to circumvent browser bugs, use full `@exodus/bytes/encoding.js` import.

### @exodus/bytes/whatwg.js <sub>![](https://img.shields.io/bundlejs/size/@exodus/bytes/whatwg.js?style=flat-square)</sub>

WHATWG helpers

```js
import '@exodus/bytes/encoding.js' // For full legacy multi-byte encodings support
import { percentEncodeAfterEncoding } from '@exodus/bytes/whatwg.js'
```

#### `percentEncodeAfterEncoding(encoding, input, percentEncodeSet, spaceAsPlus = false)`

Implements [percent-encode after encoding](https://url.spec.whatwg.org/#string-percent-encode-after-encoding)
per WHATWG URL specification.

> [!IMPORTANT]
> You must import `@exodus/bytes/encoding.js` for this API to accept legacy multi-byte encodings.

Encodings `utf16-le`, `utf16-be`, and `replacement` are not accepted.

[C0 control percent-encode set](https://url.spec.whatwg.org/#c0-control-percent-encode-set) is
always percent-encoded.

`percentEncodeSet` is an addition to that, and must be a string of unique increasing codepoints
in range 0x20 - 0x7e, e.g. `' "#<>'`.

This method accepts [DOMStrings](https://webidl.spec.whatwg.org/#idl-DOMString) and converts them
to [USVStrings](https://webidl.spec.whatwg.org/#idl-USVString).
This is different from e.g. `encodeURI` and `encodeURIComponent` which throw on surrogates:
```js
> percentEncodeAfterEncoding('utf8', '\ud800', ' "#$%&+,/:;<=>?@[\\]^`{|}') // component
'%EF%BF%BD'
> encodeURIComponent('\ud800')
Uncaught URIError: URI malformed
```

## Changelog

See [GitHub Releases](https://github.com/ExodusOSS/bytes/releases) tab

## License

[MIT](./LICENSE)
