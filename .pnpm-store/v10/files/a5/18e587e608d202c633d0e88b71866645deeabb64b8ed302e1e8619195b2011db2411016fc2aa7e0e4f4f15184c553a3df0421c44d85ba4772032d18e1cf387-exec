/**
 * @license
 * Copyright 2019 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
process.on('unhandledRejection', ex => {
    throw ex;
});
// Used for logging the number of snippets that have been found.
let snippetCount = 0;
// Used for counting the number of errors that have been found.
let errorCount = 0;
/**
 * Parse and evaluate snippets for the src/index.ts from where this script is
 * run.
 * @param tf The TensorFlow.js module to use when evaluating snippets. If used
 *     outside core, this should be a union of core and the separate package.
 *     This is unused here but is used in eval() of the snippets.
 */
// tslint:disable-next-line:no-any
export async function parseAndEvaluateSnippets(tf) {
    const index = path.join(process.cwd(), 'src/index.ts');
    const tsconfigPath = path.join(process.cwd(), 'tsconfig.json');
    // Use the same compiler options that we use to compile the library
    // here.
    const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
    delete tsconfig.compilerOptions.moduleResolution;
    const program = ts.createProgram([index], tsconfig.compilerOptions);
    const checker = program.getTypeChecker();
    for (const sourceFile of program.getSourceFiles()) {
        if (!sourceFile.isDeclarationFile) {
            const children = sourceFile.getChildren();
            for (let i = 0; i < children.length; i++) {
                await visit(tf, checker, children[i], sourceFile);
            }
        }
    }
    if (errorCount === 0) {
        console.log(`Parsed and evaluated ${snippetCount} snippets successfully.`);
    }
    else {
        console.log(`Evaluated ${snippetCount} snippets with ${errorCount} errors.`);
        process.exit(1);
    }
}
async function visit(
// tslint:disable-next-line:no-any
tf, checker, node, sourceFile) {
    const children = node.getChildren();
    for (let i = 0; i < children.length; i++) {
        await visit(tf, checker, children[i], sourceFile);
    }
    if (ts.isClassDeclaration(node) || ts.isFunctionDeclaration(node) ||
        ts.isMethodDeclaration(node) || ts.isInterfaceDeclaration(node)) {
        const symbol = checker.getSymbolAtLocation(node.name);
        const jsdoc = getJSDocTag(symbol);
        if (jsdoc == null) {
            return;
        }
        // Ignore snippets of methods that have been marked with ignoreCI.
        if (jsdoc['ignoreCI']) {
            return;
        }
        const documentation = symbol.getDocumentationComment(checker);
        if (documentation == null) {
            return;
        }
        for (let i = 0; i < documentation.length; i++) {
            const doc = documentation[i];
            const re = /```js.*?```/gs;
            const matches = re.exec(doc.text);
            if (matches == null) {
                return;
            }
            for (let k = 0; k < matches.length; k++) {
                snippetCount++;
                const match = matches[k];
                const lines = match.split('\n');
                const evalLines = [];
                for (let j = 0; j < lines.length; j++) {
                    let line = lines[j];
                    if (line.startsWith('```js')) {
                        line = line.substring('```js'.length);
                    }
                    if (line.endsWith('```')) {
                        line = line.substring(0, line.length - '```'.length);
                    }
                    line = line.trim();
                    if (line.startsWith('*')) {
                        line = line.substring(1).trim();
                    }
                    evalLines.push(line);
                }
                const srcCode = evalLines.join('\n');
                const evalString = `(async () => {${srcCode}})()`;
                const oldLog = console.log;
                const oldWarn = console.warn;
                const reportError = (e) => {
                    oldLog();
                    oldLog(`Error executing snippet for ${symbol.name} at ${sourceFile.fileName}`);
                    oldLog();
                    oldLog(`\`\`\`js${srcCode}\`\`\``);
                    oldLog();
                    console.error(e);
                    errorCount++;
                };
                // Overrwrite console.log so we don't spam the console.
                console.log = (msg) => { };
                console.warn = (msg) => { };
                try {
                    await eval(evalString);
                }
                catch (e) {
                    reportError(e);
                }
                console.log = oldLog;
                console.warn = oldWarn;
            }
        }
    }
}
function getJSDocTag(symbol) {
    const tags = symbol.getJsDocTags();
    for (let i = 0; i < tags.length; i++) {
        const jsdocTag = tags[i];
        if (jsdocTag.name === 'doc' && jsdocTag.text != null) {
            if (jsdocTag.text.length !== 1) {
                throw new Error('Expected exactly one jsdoc SymbolDisplayPart but got'
                    + ` ${jsdocTag.text.length} instead: ${jsdocTag.text}`);
            }
            const text = jsdocTag.text[0].text.trim();
            const json = convertDocStringToDocInfoObject(text);
            return json;
        }
    }
    return null;
}
function convertDocStringToDocInfoObject(docString) {
    const jsonString = docString.replace(/([a-zA-Z0-9]+):/g, '"$1":').replace(/\'/g, '"');
    return JSON.parse(jsonString);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3RmanMtY29yZS9zY3JpcHRzL3Rlc3Rfc25pcHBldHMvdXRpbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7Ozs7Ozs7O0dBZUc7QUFFSCxPQUFPLEtBQUssRUFBRSxNQUFNLElBQUksQ0FBQztBQUN6QixPQUFPLEtBQUssSUFBSSxNQUFNLE1BQU0sQ0FBQztBQUM3QixPQUFPLEtBQUssRUFBRSxNQUFNLFlBQVksQ0FBQztBQUVqQyxPQUFPLENBQUMsRUFBRSxDQUFDLG9CQUFvQixFQUFFLEVBQUUsQ0FBQyxFQUFFO0lBQ3BDLE1BQU0sRUFBRSxDQUFDO0FBQ1gsQ0FBQyxDQUFDLENBQUM7QUFFSCxnRUFBZ0U7QUFDaEUsSUFBSSxZQUFZLEdBQUcsQ0FBQyxDQUFDO0FBQ3JCLCtEQUErRDtBQUMvRCxJQUFJLFVBQVUsR0FBRyxDQUFDLENBQUM7QUFFbkI7Ozs7OztHQU1HO0FBQ0gsa0NBQWtDO0FBQ2xDLE1BQU0sQ0FBQyxLQUFLLFVBQVUsd0JBQXdCLENBQUMsRUFBTztJQUNwRCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFBRSxjQUFjLENBQUMsQ0FBQztJQUN2RCxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFBRSxlQUFlLENBQUMsQ0FBQztJQUUvRCxtRUFBbUU7SUFDbkUsUUFBUTtJQUNSLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLFlBQVksQ0FBQyxZQUFZLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQztJQUVuRSxPQUFPLFFBQVEsQ0FBQyxlQUFlLENBQUMsZ0JBQWdCLENBQUM7SUFDakQsTUFBTSxPQUFPLEdBQUcsRUFBRSxDQUFDLGFBQWEsQ0FBQyxDQUFDLEtBQUssQ0FBQyxF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cEQsSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7Z0JBQzlCLE1BQU0sSUFBSSxLQUFLLENBQUMsc0RBQXNEO3NCQUNsRSxJQUFJLFFBQVEsQ0FBQyxJQUFJLENBQUMsTUFBTSxhQUFhLFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDO2FBQzNEO1lBQ0QsTUFBTSxJQUFJLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDMUMsTUFBTSxJQUFJLEdBQUcsK0JBQStCLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDbkQsT0FBTyxJQUFJLENBQUM7U0FDYjtLQUNGO0lBQ0QsT0FBTyxJQUFJLENBQUM7QUFDZCxDQUFDO0FBRUQsU0FBUywrQkFBK0IsQ0FBQyxTQUFpQjtJQUN4RCxNQUFNLFVBQVUsR0FDWixTQUFTLENBQUMsT0FBTyxDQUFDLGtCQUFrQixFQUFFLE9BQU8sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDdkUsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQ2hDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAxOSBHb29nbGUgTExDLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICovXG5cbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxucHJvY2Vzcy5vbigndW5oYW5kbGVkUmVqZWN0aW9uJywgZXggPT4ge1xuICB0aHJvdyBleDtcbn0pO1xuXG4vLyBVc2VkIGZvciBsb2dnaW5nIHRoZSBudW1iZXIgb2Ygc25pcHBldHMgdGhhdCBoYXZlIGJlZW4gZm91bmQuXG5sZXQgc25pcHBldENvdW50ID0gMDtcbi8vIFVzZWQgZm9yIGNvdW50aW5nIHRoZSBudW1iZXIgb2YgZXJyb3JzIHRoYXQgaGF2ZSBiZWVuIGZvdW5kLlxubGV0IGVycm9yQ291bnQgPSAwO1xuXG4vKipcbiAqIFBhcnNlIGFuZCBldmFsdWF0ZSBzbmlwcGV0cyBmb3IgdGhlIHNyYy9pbmRleC50cyBmcm9tIHdoZXJlIHRoaXMgc2NyaXB0IGlzXG4gKiBydW4uXG4gKiBAcGFyYW0gdGYgVGhlIFRlbnNvckZsb3cuanMgbW9kdWxlIHRvIHVzZSB3aGVuIGV2YWx1YXRpbmcgc25pcHBldHMuIElmIHVzZWRcbiAqICAgICBvdXRzaWRlIGNvcmUsIHRoaXMgc2hvdWxkIGJlIGEgdW5pb24gb2YgY29yZSBhbmQgdGhlIHNlcGFyYXRlIHBhY2thZ2UuXG4gKiAgICAgVGhpcyBpcyB1bnVzZWQgaGVyZSBidXQgaXMgdXNlZCBpbiBldmFsKCkgb2YgdGhlIHNuaXBwZXRzLlxuICovXG4vLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tYW55XG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcGFyc2VBbmRFdmFsdWF0ZVNuaXBwZXRzKHRmOiBhbnkpIHtcbiAgY29uc3QgaW5kZXggPSBwYXRoLmpvaW4ocHJvY2Vzcy5jd2QoKSwgJ3NyYy9pbmRleC50cycpO1xuICBjb25zdCB0c2NvbmZpZ1BhdGggPSBwYXRoLmpvaW4ocHJvY2Vzcy5jd2QoKSwgJ3RzY29uZmlnLmpzb24nKTtcblxuICAvLyBVc2UgdGhlIHNhbWUgY29tcGlsZXIgb3B0aW9ucyB0aGF0IHdlIHVzZSB0byBjb21waWxlIHRoZSBsaWJyYXJ5XG4gIC8vIGhlcmUuXG4gIGNvbnN0IHRzY29uZmlnID0gSlNPTi5wYXJzZShmcy5yZWFkRmlsZVN5bmModHNjb25maWdQYXRoLCAndXRmOCcpKTtcblxuICBkZWxldGUgdHNjb25maWcuY29tcGlsZXJPcHRpb25zLm1vZHVsZVJlc29sdXRpb247XG4gIGNvbnN0IHByb2dyYW0gPSB0cy5jcmVhdGVQcm9ncmFtKFtpbmRleF0sIHRzY29uZmlnLmNvbXBpbGVyT3B0aW9ucyk7XG5cbiAgY29uc3QgY2hlY2tlciA9IHByb2dyYW0uZ2V0VHlwZUNoZWNrZXIoKTtcblxuICBmb3IgKGNvbnN0IHNvdXJjZUZpbGUgb2YgcHJvZ3JhbS5nZXRTb3VyY2VGaWxlcygpKSB7XG4gICAgaWYgKCFzb3VyY2VGaWxlLmlzRGVjbGFyYXRpb25GaWxlKSB7XG4gICAgICBjb25zdCBjaGlsZHJlbiA9IHNvdXJjZUZpbGUuZ2V0Q2hpbGRyZW4oKTtcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgY2hpbGRyZW4ubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgYXdhaXQgdmlzaXQodGYsIGNoZWNrZXIsIGNoaWxkcmVuW2ldLCBzb3VyY2VGaWxlKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBpZiAoZXJyb3JDb3VudCA9PT0gMCkge1xuICAgIGNvbnNvbGUubG9nKGBQYXJzZWQgYW5kIGV2YWx1YXRlZCAke3NuaXBwZXRDb3VudH0gc25pcHBldHMgc3VjY2Vzc2Z1bGx5LmApO1xuICB9IGVsc2Uge1xuICAgIGNvbnNvbGUubG9nKFxuICAgICAgICBgRXZhbHVhdGVkICR7c25pcHBldENvdW50fSBzbmlwcGV0cyB3aXRoICR7ZXJyb3JDb3VudH0gZXJyb3JzLmApO1xuICAgIHByb2Nlc3MuZXhpdCgxKTtcbiAgfVxufVxuXG5hc3luYyBmdW5jdGlvbiB2aXNpdChcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tYW55XG4gICAgdGY6IGFueSwgY2hlY2tlcjogdHMuVHlwZUNoZWNrZXIsIG5vZGU6IHRzLk5vZGUsXG4gICAgc291cmNlRmlsZTogdHMuU291cmNlRmlsZSkge1xuICBjb25zdCBjaGlsZHJlbiA9IG5vZGUuZ2V0Q2hpbGRyZW4oKTtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBjaGlsZHJlbi5sZW5ndGg7IGkrKykge1xuICAgIGF3YWl0IHZpc2l0KHRmLCBjaGVja2VyLCBjaGlsZHJlbltpXSwgc291cmNlRmlsZSk7XG4gIH1cblxuICBpZiAodHMuaXNDbGFzc0RlY2xhcmF0aW9uKG5vZGUpIHx8IHRzLmlzRnVuY3Rpb25EZWNsYXJhdGlvbihub2RlKSB8fFxuICAgICAgdHMuaXNNZXRob2REZWNsYXJhdGlvbihub2RlKSB8fCB0cy5pc0ludGVyZmFjZURlY2xhcmF0aW9uKG5vZGUpKSB7XG4gICAgY29uc3Qgc3ltYm9sID0gY2hlY2tlci5nZXRTeW1ib2xBdExvY2F0aW9uKG5vZGUubmFtZSk7XG4gICAgY29uc3QganNkb2MgPSBnZXRKU0RvY1RhZyhzeW1ib2wpO1xuICAgIGlmIChqc2RvYyA9PSBudWxsKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIC8vIElnbm9yZSBzbmlwcGV0cyBvZiBtZXRob2RzIHRoYXQgaGF2ZSBiZWVuIG1hcmtlZCB3aXRoIGlnbm9yZUNJLlxuICAgIGlmIChqc2RvY1snaWdub3JlQ0knXSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IGRvY3VtZW50YXRpb24gPSBzeW1ib2wuZ2V0RG9jdW1lbnRhdGlvbkNvbW1lbnQoY2hlY2tlcik7XG4gICAgaWYgKGRvY3VtZW50YXRpb24gPT0gbnVsbCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGRvY3VtZW50YXRpb24ubGVuZ3RoOyBpKyspIHtcbiAgICAgIGNvbnN0IGRvYyA9IGRvY3VtZW50YXRpb25baV07XG4gICAgICBjb25zdCByZSA9IC9gYGBqcy4qP2BgYC9ncztcbiAgICAgIGNvbnN0IG1hdGNoZXMgPSByZS5leGVjKGRvYy50ZXh0KTtcbiAgICAgIGlmIChtYXRjaGVzID09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBmb3IgKGxldCBrID0gMDsgayA8IG1hdGNoZXMubGVuZ3RoOyBrKyspIHtcbiAgICAgICAgc25pcHBldENvdW50Kys7XG5cbiAgICAgICAgY29uc3QgbWF0Y2ggPSBtYXRjaGVzW2tdO1xuICAgICAgICBjb25zdCBsaW5lcyA9IG1hdGNoLnNwbGl0KCdcXG4nKTtcbiAgICAgICAgY29uc3QgZXZhbExpbmVzOiBzdHJpbmdbXSA9IFtdO1xuICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IGxpbmVzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgbGV0IGxpbmUgPSBsaW5lc1tqXTtcbiAgICAgICAgICBpZiAobGluZS5zdGFydHNXaXRoKCdgYGBqcycpKSB7XG4gICAgICAgICAgICBsaW5lID0gbGluZS5zdWJzdHJpbmcoJ2BgYGpzJy5sZW5ndGgpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAobGluZS5lbmRzV2l0aCgnYGBgJykpIHtcbiAgICAgICAgICAgIGxpbmUgPSBsaW5lLnN1YnN0cmluZygwLCBsaW5lLmxlbmd0aCAtICdgYGAnLmxlbmd0aCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGxpbmUgPSBsaW5lLnRyaW0oKTtcbiAgICAgICAgICBpZiAobGluZS5zdGFydHNXaXRoKCcqJykpIHtcbiAgICAgICAgICAgIGxpbmUgPSBsaW5lLnN1YnN0cmluZygxKS50cmltKCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGV2YWxMaW5lcy5wdXNoKGxpbmUpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3Qgc3JjQ29kZSA9IGV2YWxMaW5lcy5qb2luKCdcXG4nKTtcbiAgICAgICAgY29uc3QgZXZhbFN0cmluZyA9IGAoYXN5bmMgKCkgPT4geyR7c3JjQ29kZX19KSgpYDtcblxuICAgICAgICBjb25zdCBvbGRMb2cgPSBjb25zb2xlLmxvZztcbiAgICAgICAgY29uc3Qgb2xkV2FybiA9IGNvbnNvbGUud2FybjtcblxuICAgICAgICBjb25zdCByZXBvcnRFcnJvciA9IChlOiBzdHJpbmd8RXJyb3IpID0+IHtcbiAgICAgICAgICBvbGRMb2coKTtcbiAgICAgICAgICBvbGRMb2coYEVycm9yIGV4ZWN1dGluZyBzbmlwcGV0IGZvciAke3N5bWJvbC5uYW1lfSBhdCAke1xuICAgICAgICAgICAgICBzb3VyY2VGaWxlLmZpbGVOYW1lfWApO1xuICAgICAgICAgIG9sZExvZygpO1xuICAgICAgICAgIG9sZExvZyhgXFxgXFxgXFxganMke3NyY0NvZGV9XFxgXFxgXFxgYCk7XG4gICAgICAgICAgb2xkTG9nKCk7XG5cbiAgICAgICAgICBjb25zb2xlLmVycm9yKGUpO1xuICAgICAgICAgIGVycm9yQ291bnQrKztcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBPdmVycndyaXRlIGNvbnNvbGUubG9nIHNvIHdlIGRvbid0IHNwYW0gdGhlIGNvbnNvbGUuXG4gICAgICAgIGNvbnNvbGUubG9nID0gKG1zZzogc3RyaW5nKSA9PiB7fTtcbiAgICAgICAgY29uc29sZS53YXJuID0gKG1zZzogc3RyaW5nKSA9PiB7fTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBhd2FpdCBldmFsKGV2YWxTdHJpbmcpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgcmVwb3J0RXJyb3IoZSk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc29sZS5sb2cgPSBvbGRMb2c7XG4gICAgICAgIGNvbnNvbGUud2FybiA9IG9sZFdhcm47XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbmludGVyZmFjZSBKU0RvYyB7XG4gIG5hbWVzcGFjZT86IHN0cmluZztcbiAgaWdub3JlQ0k/OiBib29sZWFuO1xufVxuXG5mdW5jdGlvbiBnZXRKU0RvY1RhZyhzeW1ib2w6IHRzLlN5bWJvbCk6IEpTRG9jIHtcbiAgY29uc3QgdGFncyA9IHN5bWJvbC5nZXRKc0RvY1RhZ3MoKTtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCB0YWdzLmxlbmd0aDsgaSsrKSB7XG4gICAgY29uc3QganNkb2NUYWcgPSB0YWdzW2ldO1xuICAgIGlmIChqc2RvY1RhZy5uYW1lID09PSAnZG9jJyAmJiBqc2RvY1RhZy50ZXh0ICE9IG51bGwpIHtcbiAgICAgIGlmIChqc2RvY1RhZy50ZXh0Lmxlbmd0aCAhPT0gMSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0V4cGVjdGVkIGV4YWN0bHkgb25lIGpzZG9jIFN5bWJvbERpc3BsYXlQYXJ0IGJ1dCBnb3QnXG4gICAgICAgICAgKyBgICR7anNkb2NUYWcudGV4dC5sZW5ndGh9IGluc3RlYWQ6ICR7anNkb2NUYWcudGV4dH1gKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHRleHQgPSBqc2RvY1RhZy50ZXh0WzBdLnRleHQudHJpbSgpO1xuICAgICAgY29uc3QganNvbiA9IGNvbnZlcnREb2NTdHJpbmdUb0RvY0luZm9PYmplY3QodGV4dCk7XG4gICAgICByZXR1cm4ganNvbjtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIG51bGw7XG59XG5cbmZ1bmN0aW9uIGNvbnZlcnREb2NTdHJpbmdUb0RvY0luZm9PYmplY3QoZG9jU3RyaW5nOiBzdHJpbmcpOiBKU0RvYyB7XG4gIGNvbnN0IGpzb25TdHJpbmcgPVxuICAgICAgZG9jU3RyaW5nLnJlcGxhY2UoLyhbYS16QS1aMC05XSspOi9nLCAnXCIkMVwiOicpLnJlcGxhY2UoL1xcJy9nLCAnXCInKTtcbiAgcmV0dXJuIEpTT04ucGFyc2UoanNvblN0cmluZyk7XG59XG4iXX0=