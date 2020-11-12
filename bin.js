#!/usr/bin/env node
'use strict';
const sade = require('sade');
const ghat = require('./lib');
const pkg = require('./package.json');

function normalizeFlagArray(options, flag) {
	if (typeof options[flag] === 'string') {
		options[flag] = [options[flag]];
	} else if (!options[flag]) {
		options[flag] = [];
	}
}

const prog = sade(pkg.name + ' <source>', true)
	.version(pkg.version)
	.describe(pkg.description)
	.example('fregante/ghatemplates/node')
	.example('fregante/ghatemplates/node --exclude jobs.Build --exclude jobs.Test')
	.example('fregante/ghatemplates/node --set on=push')
	.example('fregante/ghatemplates/node --set \'jobs.Test.container=node:12.15\'')
	.example('fregante/ghatemplates/node-multi --set jobs.build.strategy.matrix.node-version=\\[8.x,10.x\\]')
	.example('fregante/ghatemplates/node/build.yml ')
	.option('--exclude', 'Any part of the YAML file to be removed (can be repeated)')
	.option('--set', 'Value to add (can be repeated). The value is interpreted as YAML/JSON. Writing JSON on the CLI is tricky, so you might want to wrap the whole flag value')
	.action((source, options) => {
		const command = process.argv.slice(2).join(' ');
		normalizeFlagArray(options, 'exclude');
		normalizeFlagArray(options, 'set');

		ghat(source, {...options, command}).catch(error => {
			if (error instanceof ghat.InputError) {
				console.error('❌', error.message);
				prog.help();
			} else {
				throw error;
			}
		});
	})
	.parse(process.argv);
