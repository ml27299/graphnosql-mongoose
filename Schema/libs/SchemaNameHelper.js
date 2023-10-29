import required from "../../libs/required";
import pluralize from "pluralize";

class SchemaNameHelper {
	singleton;
	ext = "";

	constructor(singleton) {
		this.singleton = singleton;
	}

	parseName(name = "") {
		if (!name) return {};

		function breakNameByCapitalLetters(name) {
			const wordIndexes = name
				.split("")
				.map((l, i) => (l === l.toUpperCase() ? i : undefined))
				.filter((l) => l !== undefined);
			if (wordIndexes.length === 0) return [name];
			const words = wordIndexes.map((wordIndex, i) =>
				name.substring(
					wordIndex,
					wordIndexes.length - 1 > i ? wordIndexes[i + 1] : undefined
				)
			);

			const wordLengths = [];
			return words.reduce((result, word) => {
				wordLengths.push(word.length);
				if (result.length === 0) return [word];

				if (wordLengths.length - 2 > -1) {
					const lastWordLength = wordLengths[wordLengths.length - 2];
					if (word.length === 1 && lastWordLength === 1) {
						result[result.length - 1] += word;
						return result;
					}
				}

				return [...result, word];
			}, []);
		}

		function containsUppercaseOnly(str) {
			return /^[A-Z]+$/.test(str);
		}

		function ucFirst(name) {
			return `${name[0].toUpperCase()}${name.substring(1)}`;
		}

		const ogName = name;
		const words = breakNameByCapitalLetters(ogName).map((word, i) =>
			i > 0
				? ucFirst(word)
				: containsUppercaseOnly(word)
				? word
				: word.toLowerCase()
		);

		const pluralName = words.map(pluralize.plural).join("");
		const singularName = words.map(pluralize.singular).join("");

		const ogLowerCase = ogName.toLowerCase();
		const pluralLowerCase = pluralName.toLowerCase();
		const singularLowerCase = singularName.toLowerCase();

		const ucFirstOg = ucFirst(ogName);
		const ucFirstPlural = ucFirst(pluralName);
		const ucFirstSingular = ucFirst(singularName);

		return {
			pluralName,
			singularName,
			ogName,
			ogLowerCase,
			ucFirstOg,
			pluralLowerCase,
			singularLowerCase,
			ucFirstPlural,
			ucFirstSingular,
		};
	}

	getFnNames({
		fnTypeConfig = required`fnTypeConfig`,
		modelName = required`modelName`,
	}) {
		const { singular } = fnTypeConfig || {};
		const { privileged, name: customName } = fnTypeConfig;
		const name = customName || modelName;

		const { ucFirstPlural, ucFirstSingular, singularName, pluralName } =
			this.parseName(name);

		const prefix = fnTypeConfig.prefix || "";
		const suffix = this.parseName(fnTypeConfig.suffix).ucFirstOg || "";

		let finalName;
		if (customName) {
			finalName = customName;
		} else if (singular) {
			finalName = prefix
				? `${prefix}${ucFirstSingular}${suffix}`
				: `${singularName}${suffix}`;
		} else {
			finalName = prefix
				? `${prefix}${ucFirstPlural}${suffix}`
				: `${pluralName}${suffix}`;
		}

		return [
			{ value: finalName, overrideProperties: { privileged: false } },
			privileged && {
				value: `${finalName}Privileged`,
				overrideProperties: { privileged },
			},
		]
			.filter(Boolean)
			.map(({ value, ...other }) => ({
				value: `${value}${this.ext}`,
				...other,
			}));
	}
}

export default SchemaNameHelper;
