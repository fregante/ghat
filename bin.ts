#!/usr/bin/env node
'use strict';
const sade = require('sade');
const ghat = require('./lib');
const pkg = require('./package.json');

const prog = sade(pkg.name + ' [source]', true);

prog
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
	.option('--verbatim', 'Downloads the workflows without making any changes whatsoever')
	.action(async (source: string, options: Record<string, string | string[] | boolean>) => {
		try {
			await ghat(source, options);
		} catch (error) {
			if (error instanceof ghat.InputError) {
				console.error('❌', error.message);
				process.exit(1);
			} else {
				throw error;
			}
		}
	})
	.parse(process.argv);
