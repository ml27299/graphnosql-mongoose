import required from "../../libs/required";

export default class SchemaOverridesHelper {
	singleton;

	constructor(singleton) {
		this.singleton = singleton;
	}

	get resolvers() {
		return this.singleton.meta.overrides;
	}

	get queryWrapResolver() {
		return this.singleton.meta.extensions?.find(
			({ name }) => name === "queryWrapResolver"
		)?.value;
	}

	get mutationWrapResolver() {
		return this.singleton.meta.extensions?.find(
			({ name }) => name === "mutationWrapResolver"
		)?.value;
	}

	findByName(name = required`name`) {
		const resolve = this.resolvers.find((resolver) => resolver.name === name);
		return resolve?.value;
	}
}
