const fs = require('mz/fs');
const download = require('download');
const request = require('request');
const mkpath = require('mkpath');
const path = require('path');
const promiseLimit = require('promise-limit');
const limit = promiseLimit(5);
const dateFormat = require('dateformat');

function getPadUris(baseUri, pads, formats) {
	// Modified from https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Global_Objects/Array/Reduce
	const flatten = arr => arr.reduce((a, b) => a.concat(b), []);

	return flatten(pads.map(pad =>
		formats.map(format => {
			let padName = pad.preferredName || pad;
			let actualPadName = pad.name || pad;
			return [baseUri + actualPadName + '/export/' + format, padName + '/' + actualPadName + '.' + format];
		})
	));
}

fs.readFile('pads.json', 'utf8').then(data => JSON.parse(data))
	.then(settings =>
		[settings, getPadUris(settings.baseUri, settings.pads, settings.formats)]
	)
	.then(([settings, uris]) => {
		let timestamp = dateFormat(Date.now(), 'dd.mm.yyyy_HH-MM');
		return [settings, uris.map(uri => [uri[0], settings.outputDir + '/' + timestamp + '/' + uri[1]])];
	})
	.then(([settings, uris]) => {
		return Promise.all(uris.map(([uri, filePath]) => {
			return limit(() => {
				mkpath.sync(path.dirname(filePath));
				let stream = fs.createWriteStream(filePath);
				console.log('[...] ' + uri);
				stream.once('finish', () => console.log('[x] ' + uri));
				return download(uri).pipe(stream);
			});
		}));
	})
	.catch(error => console.log(error));
