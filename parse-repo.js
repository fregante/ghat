// Extracted from degit
// TODO: Export from degitto instead
const supported = new Set(['github', 'gitlab', 'bitbucket', 'git.sr.ht']);

class DegitError extends Error {
	constructor(message, options) {
		super(message);
		Object.assign(this, options);
	}
}

module.exports = function parse(src) {
	const match = /^(?:(?:https:\/\/)?([^:/]+\.[^:/]+)\/|git@([^:/]+)[:/]|([^/]+):)?([^/\s]+)\/([^/\s#]+)(?:((?:\/[^/\s#]+)+))?\/?(?:#(.+))?/.exec(
		src
	);
	if (!match) {
		throw new DegitError(`could not parse ${src}`, {
			code: 'BAD_SRC'
		});
	}

	const site = (match[1] || match[2] || match[3] || 'github').replace(
		/\.(com|org)$/,
		''
	);
	if (!supported.has(site)) {
		throw new DegitError(
			'degit supports GitHub, GitLab, Sourcehut and BitBucket',
			{
				code: 'UNSUPPORTED_HOST'
			}
		);
	}

	const user = match[4];
	const name = match[5].replace(/\.git$/, '');
	const subdir = match[6];
	const ref = match[7] || 'HEAD';

	const domain = `${site}.${
		site === 'bitbucket' ? 'org' : (site === 'git.sr.ht' ? '' : 'com')
	}`;
	const url = `https://${domain}/${user}/${name}`;
	const ssh = `git@${domain}:${user}/${name}`;

	const mode = supported.has(site) ? 'tar' : 'git';

	return {site, user, name, ref, url, ssh, subdir, mode};
};
