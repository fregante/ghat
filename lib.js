'use strict';
const os = require('os');
const fs = require('fs/promises');
const path = require('path');
const yaml = require('js-yaml');
const degit = require('degitto');
const dotProp = require('dot-prop');
const {outdent} = require('outdent');
const splitOnFirst = require('split-on-first');

const getRepoUrl = require('./parse-repo.js');

class InputError extends Error {}

const settingsParser = /# FILE GENERATED WITH: npx ghat (?<source>[^\n]+).+\n# OPTIONS: (?<options>\{[^\n]+\})\s*\n/s;

async function loadYamlFile(path) {
	const string = await fs.readFile(path, 'utf8').catch(() => '');
	return {
		string,
		parsed: string ? yaml.load(string) : {}
	};
}

async function findYamlFiles(cwd, ...sub) {
	try {
		const contents = await fs.readdir(path.join(cwd, ...sub));
		return contents
			.filter(filename => /\.ya?ml$/.test(filename))
			.map(filename => path.join(...sub, filename));
	} catch (error) {
		if (error.message.startsWith('ENOENT')) {
			return [];
		}

		throw error;
	}
}

async function getWorkflows(directory) {
	// Expect to find workflows in the specified folder or "workflow template repo"
	const local = await findYamlFiles(directory);
	if (local.length > 0) {
		return local;
	}

	// If not, the user probably wants to copy workflows from a regular repo
	return findYamlFiles(directory, '.github/workflows');
}

async function getExisting() {
	const existing = [];
	for (const workflowPath of await findYamlFiles('.', '.github/workflows')) {
		const contents = await fs.readFile(workflowPath, 'utf8');
		const ghatConfig = contents.match(settingsParser);
		if (ghatConfig) {
			existing.push({
				path: workflowPath,
				source: ghatConfig.groups.source,
				options: JSON.parse(ghatConfig.groups.options)
			});
		}
	}

	return existing;
}

async function ghat(source, {exclude, set}) {
	if (!source) {
		const existing = await getExisting();
		if (existing) {
			console.log(
				'Updating existing workflows:',
				'\n' + existing.map(({path}) => '- ' + path).join('\n')
			);
		} else {
			throw new InputError('No source was specified and no existing ghat workflows were found in this repository');
		}

		await Promise.all(existing.map(({source, options}) => ghat(source, options)));

		return;
	}


	const getter = degit(source, {
		force: true,
		verbose: true
	});

	const temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'ghat-'));
	const file = getter.repo.subdir && path.parse(getter.repo.subdir);

	// If `source` points to a file, .clone() must receive a path to the file
	const destination = file?.ext ? path.join(temporaryDirectory, file.base) : temporaryDirectory;
	await getter.clone(destination);

	const templates = await getWorkflows(temporaryDirectory);
	if (templates.length === 0) {
		throw new InputError('No workflows found in ' + source);
	}

	await fs.mkdir('.github/workflows', {recursive: true});

	const applyTemplate = async filename => {
		const localWorkflowPath = path.join('.github/workflows', path.basename(filename));
		const remoteWorkflowPath = path.join(temporaryDirectory, filename);
		const [local, remote] = await Promise.all([
			loadYamlFile(localWorkflowPath),
			loadYamlFile(remoteWorkflowPath)
		]);

		let needsUpdate = false;

		// Merge ENV objects if any, allowing the local to override the remote
		const env = {...remote.parsed.env, ...local.parsed?.env};

		// If the remote has any ENVs, they need to be dropped
		if (remote.parsed.env && Object.keys(remote.parsed.env).length > 0) {
			delete remote.parsed.env;
			needsUpdate = true;
		}

		if (exclude && exclude.length > 0) {
			for (const path of exclude) {
				dotProp.delete(remote.parsed, path);
			}

			needsUpdate = true;
		} else {
			exclude = undefined;
		}

		if (set && set.length > 0) {
			for (const setting of set) {
				const [path, value] = splitOnFirst(setting, '=');
				dotProp.set(remote.parsed, path, yaml.load(value));
			}

			needsUpdate = true;
		} else {
			set = undefined;
		}

		if (needsUpdate) {
			remote.string = yaml.dump(remote.parsed, {noCompatMode: true});
		}

		const comments = [
			`FILE GENERATED WITH: npx ghat ${source}`,
			`SOURCE: ${getRepoUrl(source).url}`
		];

		if (exclude || set) {
			comments.push(
				`OPTIONS: ${JSON.stringify({exclude, set})}`
			);
		}

		await fs.writeFile(localWorkflowPath, outdent`
			${yaml.dump({env})}
			${comments.map(line => '# ' + line).join('\n')}

			${await remote.string}`
		);
	};

	await Promise.all(templates.map(filename => applyTemplate(filename)));
}

module.exports = ghat;
module.exports.InputError = InputError;
