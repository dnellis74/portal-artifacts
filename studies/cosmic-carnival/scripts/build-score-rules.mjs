import ts from 'typescript';
import { readFile, writeFile } from 'node:fs/promises';
const source = await readFile(new URL('../src/game/waves.ts', import.meta.url), 'utf8');
const output = ts.transpileModule(source, { compilerOptions: { target:ts.ScriptTarget.ES2022, module:ts.ModuleKind.ES2022 } }).outputText;
await writeFile(new URL('../../../services/leaderboards/src/cosmic-waves.js', import.meta.url), '// Generated from studies/cosmic-carnival/src/game/waves.ts by the game build.\n'+output);
