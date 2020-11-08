#!/usr/bin/env node
'use strict';
const meow = require('meow');
const ghat = require('.');

const cli = meow(`
	Usage
	  $ ghat <source>

	Examples
	  $ ghat fregante/ghat/templates/node
`);

if (cli.input.length === 0) {
	cli.showHelp();
} else {
	ghat(cli.input[0], cli.flags).catch(error => {
		if (error instanceof ghat.InputError) {
			console.error('❌', error.message);
			cli.showHelp();
		} else {
			throw error;
		}
	});
}
