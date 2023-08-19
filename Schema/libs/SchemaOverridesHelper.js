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
		return queryWrapResolver;
	}

	get mutationWrapResolver() {
		return mutationWrapResolver;
	}

	findByName(name = required`name`) {
		const resolve = this.resolvers.find((resolver) => resolver.name === name);
		return resolve?.value;
	}
}
