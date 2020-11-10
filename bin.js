#!/usr/bin/env node
'use strict';
const sade = require('sade');
const ghat = require('./lib');
const pkg = require('./package.json');

const prog = sade(pkg.name + ' <source>', true)
	.version(pkg.version)
	.describe(pkg.description)
	.example('fregante/ghatemplates/node')
	.example('fregante/ghatemplates/node --exclude jobs.Build --exclude jobs.Test')
	.example('fregante/ghatemplates/node/build.yml')
	.option('--exclude', 'Any part of the YAML file to be removed (can be repeated) specified as a dot.notation.path')
	.action((source, options) => {
		const command = process.argv.slice(2).join(' ');
		if (typeof options.exclude === 'string') {
			options.exclude = [options.exclude];
		} else if (!options.exclude) {
			options.exclude = [];
		}

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
