import esbuild from 'esbuild';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

const outputFile = join(tmpdir(), 'stock-blocks-market-stats.test.cjs');
const obsidianStub = fileURLToPath(new URL('./tests/obsidian-stub.ts', import.meta.url));

await esbuild.build({
	entryPoints: ['tests/market-stats.test.ts'],
	bundle: true,
	platform: 'node',
	format: 'cjs',
	target: 'node18',
	outfile: outputFile,
	logLevel: 'silent',
	plugins: [{
		name: 'obsidian-test-stub',
		setup(build) {
			build.onResolve({ filter: /^obsidian$/ }, () => ({ path: obsidianStub }));
		}
	}]
});

const child = spawn(process.execPath, ['--test', outputFile], {
	stdio: 'inherit'
});

const exitCode = await new Promise((resolve, reject) => {
	child.once('error', reject);
	child.once('exit', code => resolve(code ?? 1));
});

if (exitCode !== 0) {
	process.exitCode = exitCode;
}
