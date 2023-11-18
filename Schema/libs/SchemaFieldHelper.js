import required from "../../libs/required";

class SchemaFieldHelper {
	singleton;

	constructor(singleton) {
		this.singleton = singleton;
	}

	__mapFieldsToMongooseResolver({
		fields = required`fields`,
		ModelTC = required`ModelTC`,
		type = required`type`,
	}) {
		return fields.reduce((result, fnTypeConfig) => {
			const { name, removeArgs, mongooseFnType, opts, pk } = fnTypeConfig;
			let mongooseFn = ModelTC.mongooseResolvers[mongooseFnType](
				opts,
				fnTypeConfig
			);

			const overrideResolver =
				this.singleton.SchemaOverridesHelper.findByName(name);

			if (overrideResolver) {
				const firstWrapResolve =
					(next) =>
					({ source, args, context, info }) => {
						return next(source, args, context, info);
					};
				if (pk) {
					const { queryWrapResolver, mutationWrapResolver } =
						this.singleton.SchemaOverridesHelper;
					const wrapResolver =
						type === "query" ? queryWrapResolver : mutationWrapResolver;
					mongooseFn = mongooseFn
						.setResolve(overrideResolver)
						.wrapResolve(firstWrapResolve)
						.wrapResolve(wrapResolver(fnTypeConfig));
				} else {
					mongooseFn = mongooseFn
						.setResolve(overrideResolver)
						.wrapResolve(firstWrapResolve);
				}
			}
			return Object.assign(result, {
				[name]: mongooseFn.removeArg(removeArgs),
			});
		}, {});
	}

	__getFields({
		modelName = required`modelName`,
		fnTypes = required`fnTypes`,
		configuration = required`configuration`,
	}) {
		return fnTypes
			.map((fnType) => {
				let fnTypeConfigs = configuration[fnType];
				if (!fnTypeConfigs) return;

				if (Array.isArray(fnTypeConfigs) === false)
					fnTypeConfigs = [fnTypeConfigs];

				return fnTypeConfigs
					.map((fnTypeConfig) => {
						const fieldNames = this.singleton.SchemaNameHelper.getFnNames({
							fnTypeConfig,
							modelName,
						});

						return fieldNames.map((fieldName) =>
							Object.assign(
								{},
								fnTypeConfig,
								{
									name: fieldName.value,
									mongooseFnType: fnType,
								},
								fieldName.overrideProperties
							)
						);
					})
					.flat();
			})
			.flat()
			.filter(Boolean);
	}

	addQueryFields({
		modelName = required`modelName`,
		ModelTC = required`ModelTC`,
		configuration = required`configuration`,
		fnTypes = [
			"findMany",
			"findOne",
			"findById",
			"findByIds",
			"pagination",
			"count",
			"dataLoader",
			"findOneByToken",
			"findManyByToken",
			"countByToken",
			"paginationByToken",
			"dataLoaderMany",
		],
	}) {
		const fields = this.__getFields({
			fnTypes,
			modelName,
			configuration,
		});

		const queries = this.__mapFieldsToMongooseResolver({
			fields,
			ModelTC,
			type: "query",
		});

		this.singleton.schemaComposer.Query.addFields(queries);
		this.singleton.SchemaDirectiveHelper.addDirectives({
			fields,
			Type: "Query",
		});
	}

	addMutationFields({
		modelName = required`modelName`,
		ModelTC = required`ModelTC`,
		configuration = required`configuration`,
		fnTypes = [
			"createOne",
			"updateOne",
			"updateOneByToken",
			"updateManyByToken",
			"createOneByToken",
			"createManyByToken",
			"removeOneByToken",
			"removeManyByToken",
			"removeOne",
			"createMany",
			"updateMany",
			"removeMany",
			"updateById",
			"removeById",
		],
	}) {
		const fields = this.__getFields({
			fnTypes,
			modelName,
			configuration,
		});

		const mutations = this.__mapFieldsToMongooseResolver({
			fields,
			ModelTC,
			type: "mutation",
		});

		this.singleton.schemaComposer.Mutation.addFields(mutations);
		this.singleton.SchemaDirectiveHelper.addDirectives({
			fields,
			Type: "Mutation",
		});
	}
}

export default SchemaFieldHelper;
