const fs = require('fs');
const async = require('async');

const WordPOS = require('wordpos');
const wordpos = new WordPOS();

const dsv = require('d3-dsv');

// https://wordnet.princeton.edu/documentation/wninput5wn
const pointer_types = require('./pointer_types.json');

const pointers = require('./samples/pointers.json');
const synsets = require('./samples/cream.json');

let flatten = function(array) {
	let output = [];
	for (let i = 0; i < array.length; i += 1) {
		if (Array.isArray(array[i])) {
			output = output.concat(flatten(array[i]));
		} else {
			output.push(array[i]);
		}
	}
	return output;
}

let flattenOnce = function(array) {
	let output = [];
	for (let i = 0; i < array.length; i += 1) {
		if (Array.isArray(array[i])) {
			output = output.concat(array[i]);
		} else {
			output.push(array[i]);
		}
	}
	return output;
}

function getSample(word) {
	wordpos.lookupNoun(word).then(synsets => {
		fs.writeFileSync(`./samples/${ word }.json`, JSON.stringify(synsets, null, 2));		
	});
}

// return a promise getting a word's synsets
async function getWord(word) {
	return promise = new Promise((resolve, reject) => {
		wordpos.lookupNoun(word).then(synsets => {
			resolve(synsets);
		});
	});
}

// return a Promise getting a pointer
async function getSynsetFromPointer(pointer) {
	return wordpos.seek(pointer.synsetOffset, pointer.pos).then(synset => {
		return synset;
	});
}

async function addResultFromPointer(result, pointer) {
	let newResult = JSON.parse(JSON.stringify(result));
	return wordpos.seek(pointer.synsetOffset, pointer.pos).then(synset => {
		newResult.chain.push(synset.lemma.replace(/_/g, " "));
		newResult.next = synset;
		return newResult;
		// return [[result, synset.lemma], synset.synsetOffset, synset.pos];
	});
}


// For a single synset (many words return several if there are alternate meanings),
// find the pointers of a given type and return the words and their synsets
async function getPointersFromResult(result, pointer_type) {
	return new Promise((resolve, reject) => {
		let symbol = pointer_types[pointer_type];

		if (!result.next) {
			resolve(result);
		}

		/*
		if (!result || !result[1] || !result[1].ptrs) {
			// result[1] = "EOL";
			resolve(result);
			return;
		}
		*/

		let pointers = result.next.ptrs.filter(d => {
			return d.pointerSymbol === symbol;
		});

		if (pointers.length == 0) {
			result.next = null;
			resolve(result);
		}

		let promises = pointers.map(pointer => {
			// return getSynsetFromPointer(origin, d);
			return addResultFromPointer(result, pointer);
		});

		resolve(Promise.all(promises));
	});
}

async function getPointersFromResults(results, pointer_type) {
	return new Promise((resolve, reject) => {
		let promises = results.map(result => {
			return getPointersFromResult(result, pointer_type);
		});

		resolve(Promise.all(promises));
	});
}

async function followChain(word, pointer_type) {
	let syns = await getWord(word);

	let results = syns.map(syn => {
		return {
			chain: [syn.lemma],
			next: syn
		}
	});

	let remaining = 1;
	let count = 0;
	let headers = [];

	while (remaining > 0) {
		//headers.push("word" + count);
		results = await getPointersFromResults(results, "hyponym");
		results = flattenOnce(results);
		remaining = results.filter(d => d.next).length;
		console.log(results.length, remaining);
		// fs.writeFileSync("./results/" + word + count + ".json", JSON.stringify(results, null, 2));
		count += 1;
	}

	results = results.map(d => d.chain);
	let csv = results.map(result => {
		let chain = {};
		for (let c = 0; c < result.length; c += 1) {
			chain["word" + c] = result[c];
		}
		return chain;
	});

	fs.writeFileSync("./results/" + word + ".csv", dsv.csvFormat(csv));
};


followChain("molecule", "hyponym");
