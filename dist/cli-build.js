import { isObjectWithValue } from "./util.js";
import { n as CANDLE_HELP_FOOTER, o as CANDLE_VERSION, t as CANDLE_BUILD_USAGE } from "./a/usage-D3mF7Sn9.js";
import "./a/hooks-DwcgAoO1.js";
import { createHot } from "./hot.js";
import { ensureJsxHooksRegistered } from "./jsx.js";
import { a as findInputFile, c as tryStat, i as iterContent, o as listEmptyDirectories, s as listFiles } from "./a/tree-DT9xIPou.js";
import * as NodeFS$1 from "node:fs";
import * as NodePath$1 from "node:path";
import * as NodeUtil from "node:util";
//#region cli/build.ts
if (import.meta.main) main(process.argv.slice(2));
async function main(args) {
	const { values, positionals } = NodeUtil.parseArgs({
		args,
		options: {
			help: {
				short: "?",
				type: "boolean"
			},
			version: { type: "boolean" },
			output: {
				short: "o",
				type: "string",
				default: "./dist"
			},
			delete: {
				short: "d",
				type: "boolean",
				default: false
			},
			jsx: {
				short: "j",
				type: "string",
				default: "candle/jsx"
			},
			verbose: {
				short: "v",
				type: "boolean",
				default: false
			},
			watch: {
				short: "w",
				type: "boolean",
				default: false
			}
		},
		allowPositionals: true
	});
	if (values.help) {
		process.stderr.write([CANDLE_BUILD_USAGE, CANDLE_HELP_FOOTER].join("\n"));
		process.exitCode = 2;
	} else if (values.version) {
		process.stderr.write(CANDLE_VERSION);
		process.exitCode = 2;
	} else {
		const inputArg = positionals[0] ?? "src";
		const input = await findInputFile(inputArg);
		if (!input) return printUsageError(`Failed to find input file from ${JSON.stringify(inputArg)}.`);
		await run({
			input,
			output: values.output,
			deleteFiles: values.delete,
			jsx: values.jsx,
			verbose: values.verbose,
			watch: values.watch
		});
	}
}
async function run(options) {
	const { input, output, deleteFiles, verbose, watch } = options;
	if (options.jsx) ensureJsxHooksRegistered({ jsxImportSource: options.jsx });
	let hot;
	if (watch) hot = createHot(import.meta);
	await writeTree(import(input));
	if (hot) hot.accept(input, async (mod) => writeTree(mod));
	async function writeTree(root) {
		const oldFiles = new Set(await listFiles(output));
		if (oldFiles.size > 100) throw new Error(`Safety check: found too many files in the output directory`);
		for await (const file of iterContent(root, "")) {
			oldFiles.delete(file.name);
			const segments = file.name.split(NodePath$1.sep).filter((s) => s);
			for (let i = 0; i < segments.length; i++) {
				const curr = segments.slice(0, i).join(NodePath$1.sep);
				let info = await tryStat(NodePath$1.join(output, curr));
				if (info?.isFile()) {
					oldFiles.add(await renameToDeleted(curr));
					info = null;
				}
				if (!info) {
					if (verbose) console.log("+d", curr);
					await NodeFS$1.promises.mkdir(NodePath$1.join(output, curr));
				} else if (!info?.isDirectory()) throw new Error(`Unsupported file type in output directory: ${JSON.stringify(file.name)}`);
			}
			const path = NodePath$1.join(output, file.name);
			let info = await tryStat(path);
			if (info?.isDirectory()) {
				oldFiles.add(await renameToDeleted(file.name));
				info = null;
			}
			if (info && !info.isFile()) throw new Error(`Unsupported file type in output directory: ${JSON.stringify(file.name)}`);
			let changed = true;
			if (info?.size === file.data.byteLength) {
				if ((await NodeFS$1.promises.readFile(path)).equals(file.data)) changed = false;
			}
			if (verbose) if (!changed) console.log(" f", file.name);
			else if (info) console.log("=f", file.name);
			else console.log("+f", file.name);
			if (changed) await NodeFS$1.promises.writeFile(path, file.data);
		}
		if (deleteFiles) {
			if (oldFiles.size > 100) throw new Error(`Safety check: found too many files in the output directory`);
			for (const file of oldFiles) {
				if (verbose) console.log("-f", file);
				await NodeFS$1.promises.unlink(NodePath$1.join(output, file));
			}
			for (const dir of await listEmptyDirectories(output)) {
				if (verbose) console.log("-d", dir);
				await NodeFS$1.promises.rmdir(NodePath$1.join(output, dir));
			}
		}
	}
	async function renameToDeleted(name) {
		for (let i = 0; i < 100; i++) {
			const curr = `${name}.del${i || ""}`;
			try {
				await NodeFS$1.promises.rename(NodePath$1.join(output, name), NodePath$1.join(output, curr));
				return curr;
			} catch (err) {
				if (isObjectWithValue(err, "code", "EEXIST")) {} else throw err;
			}
		}
		throw new Error(`Too many conflicts trying to delete ${JSON.stringify(name)}`);
	}
}
function printUsageError(...message) {
	process.stderr.write("".concat(...message, `\nTry 'candle build --help' for more information.\n`));
	process.exitCode = 1;
}
//#endregion
export { main, printUsageError };
