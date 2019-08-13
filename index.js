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
	// if (result.hasOwnProperty("lemma")) {
	if (typeof result === "string") {
		result = [ [ result ] ];
	}

	if (!pointer) {
		pointer = {
			synsetOffset: result[1],
			pos: result[2]
		};
	}

	return wordpos.seek(pointer.synsetOffset, pointer.pos).then(synset => {
		result[0].push(synset.lemma);
		result[1] = synset.synsetOffset;
		result[2] = synset.pos;
		return result;
		// return [[result, synset.lemma], synset.synsetOffset, synset.pos];
	});
}


// For a single synset (many words return several if there are alternate meanings),
// find the pointers of a given type and return the words and their synsets
async function getPointersFromSynset(synset, pointer_type) {
	// let origin = synset.lemma;
	return new Promise((resolve, reject) => {
		// let origin = synset.lemma;
		let origin = synset.lemma;
		let symbol = pointer_types[pointer_type];
		let pointers = synset.ptrs.filter(d => {
			return d.pointerSymbol === symbol;
		});
		let results = [];

		if (pointers.length == 0) {
			resolve(null);
		}

		let promises = pointers.map(d => {
			// return getSynsetFromPointer(origin, d);
			return addResultFromPointer(origin, d);
		});

		resolve(Promise.all(promises));
	});
}

async function getPointersFromSynsets(synsets, pointer_type) {
	return new Promise((resolve, reject) => {
		let promises = synsets.map(d => {
			return getPointersFromSynset(d, pointer_type);
		});

		resolve(Promise.all(promises));
	});
}

async function getHyponyms(arg) {
	let syns = await getWord(arg);

	let r = await getPointersFromSynsets(syns, "hyponym");

	r = flattenOnce(r);

	console.log(r.length);

	fs.writeFileSync("./results/" + arg + ".json", JSON.stringify(r, null, 2));
};

async function expandHyponyms(arg) {
	let results = require("./results/" + arg + ".json");

	let syns = await getWord(arg);

	let r = await getPointersFromSynsets(syns, "hyponym");

	r = flattenOnce(r);

	console.log(r.length);

	fs.writeFileSync("./results/" + arg + ".json", JSON.stringify(r, null, 2));
};

getHyponyms("food");
