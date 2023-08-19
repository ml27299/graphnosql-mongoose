import required from "../../libs/required";

class SchemaConfigurationHelper {
	singleton;

	constructor(singleton) {
		this.singleton = singleton;
	}

	get configurations() {
		return this.singleton.meta.configurations;
	}

	/**
	 * Default configuration
	 *
	 * singular[Boolean]: sets query/mutation name to the singular form of the
	 * model name in which its based on. If false/undefined, it'll use its
	 * plural form.
	 *
	 * value[String]: the name of the mongoose resolver to map to
	 *
	 * name[String]: override generated name for query/mutation, will ignore
	 * prefix, suffix, and singular
	 *
	 * privileged[Boolean]: an extra function of the same name + "Privileged"
	 * as a suffix
	 *
	 * prefix[String]: added to the front of the query/mutation name
	 *
	 * suffix[String]: added to the end of the query/mutation name
	 *
	 * opts[Object]: options for the mongoose resolver
	 */
	get defaultConfigurationFnTypeMap() {
		const fnTypes = [
			{
				value: "findMany",
				authorization: false,
				name: false,
				privileged: false,
				prefix: false,
				suffix: false,
				singular: false,
				removeArgs: [],
				opts: { filter: { onlyIndexed: false }, sort: { multi: true } },
			},
			{
				value: "findByIds",
				authorization: false,
				name: false,
				privileged: false,
				prefix: false,
				suffix: "byIds",
				singular: false,
				removeArgs: [],
				opts: { lean: true, sort: { multi: true } },
			},
			{
				value: "pagination",
				authorization: false,
				name: false,
				privileged: false,
				prefix: "paginate",
				suffix: false,
				singular: false,
				removeArgs: [],
				opts: {},
			},
			{
				value: "count",
				authorization: false,
				name: false,
				privileged: false,
				prefix: "count",
				suffix: false,
				singular: false,
				removeArgs: [],
				opts: { filter: { onlyIndexed: false } },
			},
			{
				value: "dataLoaderMany",
				authorization: false,
				name: false,
				privileged: false,
				prefix: false,
				suffix: "dataLoader",
				singular: false,
				removeArgs: [],
				opts: {},
			},
			{
				value: "createMany",
				authorization: false,
				name: false,
				privileged: false,
				prefix: "create",
				suffix: false,
				singular: false,
				removeArgs: [],
				opts: {},
			},
			{
				value: "updateMany",
				authorization: false,
				name: false,
				privileged: false,
				prefix: "update",
				suffix: false,
				singular: false,
				removeArgs: [],
				opts: { filter: { onlyIndexed: false }, sort: { multi: true } },
			},
			{
				value: "removeMany",
				authorization: false,
				name: false,
				privileged: false,
				prefix: "remove",
				suffix: false,
				singular: false,
				removeArgs: [],
				opts: { filter: { onlyIndexed: false }, sort: { multi: true } },
			},
			{
				value: "findOne",
				authorization: false,
				name: false,
				privileged: false,
				prefix: false,
				suffix: false,
				singular: true,
				removeArgs: [],
				opts: { filter: { onlyIndexed: false }, sort: { multi: true } },
			},
			{
				value: "findById",
				authorization: false,
				name: false,
				privileged: false,
				prefix: false,
				suffix: "byId",
				singular: true,
				removeArgs: [],
				opts: { lean: true },
			},
			{
				value: "dataLoader",
				authorization: false,
				name: false,
				privileged: false,
				prefix: false,
				suffix: "dataLoader",
				singular: true,
				removeArgs: [],
				opts: {},
			},
			{
				value: "createOne",
				authorization: false,
				name: false,
				privileged: false,
				prefix: "create",
				suffix: false,
				singular: true,
				removeArgs: [],
				opts: {},
			},
			{
				value: "updateOne",
				authorization: false,
				name: false,
				privileged: false,
				prefix: "update",
				suffix: false,
				singular: true,
				removeArgs: [],
				opts: { filter: { onlyIndexed: false }, sort: { multi: true } },
			},
			{
				value: "updateMany",
				authorization: false,
				name: false,
				privileged: false,
				prefix: "update",
				suffix: false,
				singular: false,
				removeArgs: [],
				opts: { filter: { onlyIndexed: false }, sort: { multi: true } },
			},
			{
				value: "removeOne",
				authorization: false,
				name: false,
				privileged: false,
				prefix: "remove",
				suffix: false,
				singular: true,
				removeArgs: [],
				opts: { filter: { onlyIndexed: false }, sort: { multi: true } },
			},
			{
				value: "updateById",
				authorization: false,
				name: false,
				privileged: false,
				prefix: "update",
				suffix: "byId",
				singular: true,
				removeArgs: [],
				opts: {},
			},
			{
				value: "removeById",
				authorization: false,
				name: false,
				privileged: false,
				prefix: "remove",
				suffix: "byId",
				singular: true,
				removeArgs: [],
				opts: {},
			},
			{
				value: "findOneByToken",
				authorization: false,
				name: false,
				//key to target in the jwt token payload
				tk: undefined,
				//key to target in the model
				pk: undefined,
				privileged: false,
				prefix: false,
				suffix: "byToken",
				singular: true,
				removeArgs: [],
				opts: {},
			},
			{
				value: "findManyByToken",
				authorization: false,
				name: false,
				//key to target in the jwt token payload
				tk: undefined,
				//key to target in the model
				pk: undefined,
				privileged: false,
				prefix: false,
				suffix: "byToken",
				singular: false,
				removeArgs: [],
				opts: {},
			},
			{
				value: "paginationByToken",
				authorization: false,
				name: false,
				//key to target in the jwt token payload
				tk: undefined,
				//key to target in the model
				pk: undefined,
				privileged: false,
				prefix: "paginate",
				suffix: "ByToken",
				singular: false,
				removeArgs: [],
				opts: {},
			},
			{
				value: "countByToken",
				authorization: false,
				name: false,
				//key to target in the jwt token payload
				tk: undefined,
				//key to target in the model
				pk: undefined,
				privileged: false,
				prefix: "count",
				suffix: "ByToken",
				singular: false,
				removeArgs: [],
				opts: {},
			},
			{
				value: "updateOneByToken",
				authorization: false,
				name: false,
				//key to target in the jwt token payload
				tk: undefined,
				//key to target in the model
				pk: undefined,
				privileged: false,
				prefix: "update",
				suffix: "ByToken",
				singular: true,
				removeArgs: [],
				opts: {},
			},
			{
				value: "updateManyByToken",
				authorization: false,
				name: false,
				//key to target in the jwt token payload
				tk: undefined,
				//key to target in the model
				pk: undefined,
				privileged: false,
				prefix: "update",
				suffix: "ByToken",
				singular: false,
				removeArgs: [],
				opts: {},
			},
			{
				value: "createOneByToken",
				authorization: false,
				name: false,
				//key to target in the jwt token payload
				tk: undefined,
				//key to target in the model
				pk: undefined,
				privileged: false,
				prefix: "create",
				suffix: "ByToken",
				singular: true,
				removeArgs: [],
				opts: {},
			},
			{
				value: "createManyByToken",
				authorization: false,
				name: false,
				//key to target in the jwt token payload
				tk: undefined,
				//key to target in the model
				pk: undefined,
				privileged: false,
				prefix: "create",
				suffix: "ByToken",
				singular: false,
				removeArgs: [],
				opts: {},
			},
			{
				value: "removeOneByToken",
				authorization: false,
				name: false,
				//key to target in the jwt token payload
				tk: undefined,
				//key to target in the model
				pk: undefined,
				privileged: false,
				prefix: "remove",
				suffix: "ByToken",
				singular: true,
				removeArgs: [],
				opts: {},
			},
			{
				value: "removeManyByToken",
				authorization: false,
				name: false,
				//key to target in the jwt token payload
				tk: undefined,
				//key to target in the model
				pk: undefined,
				privileged: false,
				prefix: "remove",
				suffix: "ByToken",
				singular: false,
				removeArgs: [],
				opts: {},
			},
		];

		return fnTypes.reduce(
			(result, fnType) =>
				Object.assign(result, {
					[fnType.value]: fnType,
				}),
			{}
		);
	}

	getConfigurationByName(name = required`name`) {
		const configurationObj = this.configurations.find(
			(configuration) => configuration.name === name.toLowerCase()
		);

		const configuration = (configurationObj || {}).value;
		if (!configuration) return;

		for (const fnType in configuration) {
			if (Array.isArray(configuration[fnType]) === false)
				configuration[fnType] = Object.assign(
					{},
					this.defaultConfigurationFnTypeMap[fnType],
					configuration[fnType]
				);
			else
				configuration[fnType] = configuration[fnType].map((config) =>
					Object.assign({}, this.defaultConfigurationFnTypeMap[fnType], config)
				);
		}

		return configuration;
	}
}

export default SchemaConfigurationHelper;
