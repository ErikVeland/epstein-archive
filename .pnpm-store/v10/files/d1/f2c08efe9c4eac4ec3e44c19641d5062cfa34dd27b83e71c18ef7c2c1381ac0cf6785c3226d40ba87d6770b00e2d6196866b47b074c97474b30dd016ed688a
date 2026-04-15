import { split, toLower, toUpper } from "no-case";
export function pascalCase(input, options) {
    const lower = toLower(options?.locale);
    const upper = toUpper(options?.locale);
    return split(input, options)
        .map((word, index) => {
        const char0 = word[0];
        const initial = index > 0 && char0 >= "0" && char0 <= "9" ? "_" + char0 : upper(char0);
        return initial + lower(word.slice(1));
    })
        .join("");
}
//# sourceMappingURL=index.js.map