import required from "../../libs/required";
import jwt from "jsonwebtoken";
import { GraphQLEnumType } from "graphql";
import dot from "dot-object";
const Mode = new GraphQLEnumType({
	name: `EnumMode`,
	values: {
		set: {
			value: "set",
			description:
				"This mode will dot the record so that objects don't get overwritten, only the fields that are specified will be updated.",
		},
		classic: {
			value: "classic",
			description: "This mode will overwrite the record with the new record.",
		},
	},
});

const queryWrapResolver =
	(fnTypeConfig) =>
	(next) =>
	({ args, context, ...other }) => {
		const token = context.getToken();
		if (!token) return false;

		const payload = jwt.decode(token);
		const { pk, tk } = fnTypeConfig || {};

		function setArg(name, args) {
			if (Array.isArray(pk) && Array.isArray(tk)) {
				let supportedPks = [];
				for (const key of pk) {
					if (!args["pk"][key]) continue;
					supportedPks.push(key);
				}
				if (supportedPks.length === 0) {
					throw new Error(`No supported PKs found for ${name}`);
				}
				supportedPks.forEach((key, index) => {
					const v = dot.pick(tk[index], payload);
					if (v === undefined) return;
					args[name][key] = v;
				});
			} else {
				args[name][pk] = dot.pick(tk, payload);
			}
		}

		if (!args["filter"]) args["filter"] = {};
		setArg("filter", args);

		dot.object(args);

		return next({ args, context, ...other });
	};

const mutationWrapResolver =
	(fnTypeConfig) =>
	(next) =>
	({ args, context, ...other }) => {
		const token = context.getToken();
		if (!token) return false;

		const payload = jwt.decode(token);
		const { pk, tk } = fnTypeConfig || {};

		function setArg(name, args) {
			if (name && Array.isArray(args[name])) {
				args[name].forEach((record) => {
					setArg(null, record);
				});
				return;
			}
			if (Array.isArray(pk) && Array.isArray(tk)) {
				let supportedPks = [];
				for (const key of pk) {
					if (!args["pk"][key]) continue;
					supportedPks.push(key);
				}
				if (supportedPks.length === 0) {
					throw new Error(`No supported PKs found for ${name}`);
				}
				supportedPks.forEach((key, index) => {
					const v = dot.pick(tk[index], payload);
					if (v === undefined) return;
					!name ? (args[key] = v) : (args[name][key] = v);
				});
			} else {
				!name
					? (args[pk] = dot.pick(tk, payload))
					: (args[name][pk] = dot.pick(tk, payload));
			}
		}

		if (!args["filter"]) args["filter"] = {};
		setArg("filter", args);
		args["record"] && setArg("record", args);
		args["records"] && setArg("records", args);

		dot.object(args);

		return next({ args, context, ...other });
	};
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
			).wrapResolve((next) => (rp) => {
				if (!rp.projection) rp.projection = { "*": true };
				else if (rp.projection["*"] === undefined) rp.projection["*"] = true;
				return next(rp);
			});

			if (pk) {
				mongooseFn = mongooseFn.wrapResolve(
					type === "query"
						? queryWrapResolver(fnTypeConfig)
						: mutationWrapResolver(fnTypeConfig)
				);
			}
			const supportedSingularModeResolvers = ["updateOne", "updateById"];
			const supportedPluralModeResolvers = ["updateMany"];
			const supportedModeResolvers = [
				...supportedSingularModeResolvers,
				...supportedPluralModeResolvers,
			];
			if (supportedModeResolvers.includes(mongooseFnType)) {
				mongooseFn.addArgs({
					mode: {
						type: Mode,
						defaultValue: "set",
					},
				});
				mongooseFn = mongooseFn.wrapResolve((next) => ({ args, ...rest }) => {
					const { mode } = args;
					if (mode === "set") {
						dot.keepArray = true;
						if (supportedPluralModeResolvers.includes(mongooseFnType)) {
							args.records = args.records.map((record) => dot.dot(record));
						} else {
							args.record = dot.dot(args.record);
						}
						dot.keepArray = false;
					}
					return next({ args, ...rest });
				});
			}
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
