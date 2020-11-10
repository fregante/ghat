#!/usr/bin/env node
'use strict';
const meow = require('meow');
const ghat = require('./lib');

const cli = meow(`
	Usage
	  $ ghat <source>

	Examples
	  $ ghat fregante/ghatemplates/node
	  $ ghat fregante/ghatemplates/node --exclude jobs.Build --exclude jobs.Test
	  $ ghat fregante/ghatemplates/node/build.yml

	Options:
	  --exclude <dot.notation.path>  Any part of the YAML file to be removed (can be repeated)
`, {
	flags: {
		exclude: {
			type: 'string',
			isMultiple: true
		}
	}
});

if (cli.input.length === 0) {
	cli.showHelp();
} else {
	const command = process.argv.slice(2).join(' ');
	ghat(cli.input[0], {...cli.flags, command}).catch(error => {
		if (error instanceof ghat.InputError) {
			console.error('❌', error.message);
			cli.showHelp();
		} else {
			throw error;
		}
	});
}
