'use strict';
const fs = require('fs/promises');
const del = require('del');
const path = require('path');
const yaml = require('js-yaml');
const degit = require('degit');
const chalk = require('chalk');
const globby = require('globby');
const mkdirp = require('mkdirp');
const {outdent} = require('outdent');

const temporaryDirectory = '.ghat-temp';
const commitRegex = /^found matching commit hash: ([\da-f]{40})$/;

async function applyTemplate(filename, source) {
	let templateContent = fs.readFile(path.join(temporaryDirectory, filename), 'utf8');
	const localWorkflowPath = path.join('.github/workflows', path.basename(filename));
	let env;
	const localWorkflowContent = await fs.readFile(localWorkflowPath, 'utf8').catch(() => undefined);
	if (localWorkflowContent) {
		const localData = yaml.safeLoad(localWorkflowContent);
		if (localData.env) {
			const templateData = yaml.safeLoad(await templateContent);
			env = Object.assign({}, templateData.env, localData.env);
			delete templateData.env;
			templateContent = yaml.safeDump(templateData);
		}
	}

	await fs.writeFile(localWorkflowPath, outdent`
		# Generated by \`npx ghat ${source}\`
		${env ? yaml.safeDump({env}) : ''}
		# DO NOT EDIT BELOW${env ? '' : ', but you can specify the `env` property ABOVE'}

		${await templateContent}`, 'utf8'
	);
}

async function getWorkflows() {
	// Expect to find workflows in the specified folder or "workflow template repo"
	const local = await globby('*.yml', {
		cwd: temporaryDirectory
	});
	if (local.length > 0) {
		return local;
	}

	// If not, the user probably wants to copy workflows from a regular repo
	return globby('.github/workflows/*.yml', {
		cwd: temporaryDirectory
	});
}

async function ghat(source) {
	const getter = degit(source, {
		force: true,
		verbose: true
	});
	let commit;

	getter.on('info', event => {
		const commitMatch = commitRegex.exec(event.message);
		if (commitMatch) {
			commit = commitMatch[1];
			console.log('got', commit);
			return;
		}

		console.error(chalk.cyan(`> ${event.message.replace('options.', '--')}`));
	});

	getter.on('warn', event => {
		console.error(
			chalk.magenta(`! ${event.message.replace('options.', '--')}`)
		);
	});

	const parsedPath = getter.repo.subdir && path.parse(getter.repo.subdir);
	await del(temporaryDirectory);
	await getter.clone(path.join(temporaryDirectory, (parsedPath?.ext ? parsedPath.base : '')));

	const templates = await getWorkflows();
	if (templates.length === 0) {
		throw new Error('No workflows found in ' + source);
	}

	mkdirp.sync('.github/workflows');
	await Promise.all(templates.map(template => applyTemplate(template, source)));
	await del(temporaryDirectory);
}

module.exports = ghat;
