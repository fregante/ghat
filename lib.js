'use strict';
const fs = require('fs/promises');
const path = require('path');
const yaml = require('js-yaml');
const degit = require('degit');
const tempy = require('tempy');
const globby = require('globby');
const mkdirp = require('mkdirp');
const dotProp = require('dot-prop');
const {outdent} = require('outdent');

class InputError extends Error {}

async function loadYamlFile(path) {
	const string = await fs.readFile(path, 'utf8').catch(() => '');
	return {
		string,
		parsed: string ? yaml.safeLoad(string) : {}
	};
}

async function applyTemplate({filename, temporaryDirectory, exclude, command}) {
	const localWorkflowPath = path.join('.github/workflows', path.basename(filename));
	const remoteWorkflowPath = path.join(temporaryDirectory, filename);
	const [local, remote] = await Promise.all([
		loadYamlFile(localWorkflowPath),
		loadYamlFile(remoteWorkflowPath)
	]);

	let env;
	// If either env object exist, we need to merge them and move them to the top
	if (local.parsed?.env || remote.parsed.env) {
		// Merge env objects, allowing the local to override the remote
		env = {...remote.parsed.env, ...local.parsed?.env};

		// Hide remote env object so it can be displayed on the top later
		delete remote.parsed.env;

		// Update workflow string, only now that is necessary
		remote.string = yaml.safeDump(remote.parsed, {noCompatMode: true});
	}

	if (exclude.length > 0) {
		for (const path of exclude) {
			dotProp.delete(remote.parsed, path);
		}

		remote.string = yaml.safeDump(remote.parsed, {noCompatMode: true});
	}

	await fs.writeFile(localWorkflowPath, outdent`
		${env ? yaml.safeDump({env}) : 'env:'}
		# DO NOT EDIT BELOW - use \`npx ghat ${command}\`

		${await remote.string}`
	);
}

async function getWorkflows(cwd) {
	// Expect to find workflows in the specified folder or "workflow template repo"
	const local = await globby('*.+(yml|yaml)', {cwd});
	if (local.length > 0) {
		return local;
	}

	// If not, the user probably wants to copy workflows from a regular repo
	return globby('.github/workflows/*.+(yml|yaml)', {cwd});
}

async function ghat(source, {exclude, command}) {
	if (!source) {
		throw new InputError('No source was specified');
	}

	const getter = degit(source, {
		force: true,
		verbose: true
	});

	return tempy.directory.task(async temporaryDirectory => {
		const file = getter.repo.subdir && path.parse(getter.repo.subdir);

		// If `source` points to a file, .clone() must receive a path to the file
		await getter.clone(file?.ext ? path.join(temporaryDirectory, file.base) : temporaryDirectory);

		const templates = await getWorkflows(temporaryDirectory);
		if (templates.length === 0) {
			throw new InputError('No workflows found in ' + source);
		}

		mkdirp.sync('.github/workflows');
		await Promise.all(templates.map(filename => applyTemplate({filename, temporaryDirectory, exclude, command})));
	});
}

module.exports = ghat;
module.exports.InputError = InputError;
