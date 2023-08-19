import required from "../../libs/required";
import dot from "dot-object";

class SchemaRelationHelper {
	singleton;

	constructor(singleton) {
		this.singleton = singleton;
	}

	__parseRelationPath(path = required`path`) {
		const pathArray = path.split(".");
		const pathIsNested = pathArray.length > 1;
		const pathChild = pathIsNested
			? pathArray[pathArray.length - 1]
			: undefined;
		const pathValue = pathIsNested
			? pathArray.slice(0, pathArray.length - 1).join(".")
			: pathArray[0];

		return {
			pathIsNested,
			pathValue,
			pathChild,
		};
	}

	__getRelationsFromModel(Model = required`Model`) {
		const schemaTypes = [];
		Model.schema.eachPath((path, type) => schemaTypes.push({ path, type }));

		const oneToManyNestedRelations = schemaTypes
			.filter(({ type }) => type.schema)
			.map(({ type, path }) => {
				return Object.keys(type.schema.paths)
					.filter((key) => type.schema.paths[key].options.ref)
					.filter((key) => type.schema.paths[key].instance === "Array")
					.map((key) => ({
						path: `${path}.${type.schema.paths[key].path}`,
						type: { options: type.schema.paths[key].options },
					}));
			})
			.flat();

		const oneToOneNestedRelations = schemaTypes
			.filter(({ type }) => type.schema)
			.map(({ type, path }) => {
				return Object.keys(type.schema.paths)
					.filter((key) => type.schema.paths[key].options.ref)
					.filter((key) => type.schema.paths[key].instance === "ObjectID")
					.map((key) => ({
						path: `${path}.${type.schema.paths[key].path}`,
						type: { options: type.schema.paths[key].options },
					}));
			})
			.flat();

		const relations = schemaTypes.filter(({ type }) => !!type.options.ref);
		const oneToManyRelations = relations
			.filter((relation) => relation.type.instance === "Array")
			.concat(oneToManyNestedRelations);
		const oneToOneRelations = relations
			.filter((relation) => relation.type.instance === "ObjectID")
			.concat(oneToOneNestedRelations);

		// if (Model.modelName === "providers")
		// 	console.log({ oneToManyRelations, oneToOneRelations });

		return { oneToManyRelations, oneToOneRelations };
	}

	__oneToOneRelationConfiguration({
		path = required`path`,
		targetModelTC = required`targetModelTC`,
	}) {
		return {
			resolver: () => targetModelTC.mongooseResolvers.findById(),
			prepareArgs: {
				_id: (source) => {
					return dot.pick(path, source);
				},
			},
			extensions: {
				projection: { _id: true, [path]: true },
			},
		};
	}

	__oneToManyRelationConfiguration({
		path = required`path`,
		targetModelTC = required`targetModelTC`,
	}) {
		return {
			resolver: () =>
				targetModelTC.mongooseResolvers
					.findMany()
					.wrapResolve((next) => ({ args, ...other }) => {
						if (!args.filter) args.filter = {};
						args.filter._id = { $in: args._ids };
						return next({ args, ...other });
					}),
			prepareArgs: {
				_ids: (source) => {
					return dot.pick(path, source);
				},
			},
			extensions: {
				projection: { _id: true, [path]: true },
			},
		};
	}

	__addRelationsToModelTC({
		$ = required`$`,
		ModelTC = required`ModelTC`,
		relations = [],
		relationConfiguration = required`relationConfiguration`,
	}) {
		relations.forEach(({ type, path }) => {
			const ModelName = Object.keys($).find(
				(name) => name.toLowerCase() === type.options.ref
			);
			const { ucFirstSingular } =
				this.singleton.SchemaNameHelper.parseName(ModelName);

			const targetModelTC =
				this.singleton.schemaComposer.getOTC(ucFirstSingular);

			const { pathIsNested, pathChild, pathValue } =
				this.__parseRelationPath(path);
			const parentModelTC = pathIsNested ? ModelTC.get(pathValue) : ModelTC;

			const targetPath = pathChild || pathValue;
			//console.log(parentModelTC.getTypeName());
			// if (parentModelTC.getTypeName() === "Answer") {
			// 	console.log({ pathChild });
			// 	console.log({ pathValue });
			// 	console.log("----------------");
			// }
			parentModelTC.addFields({
				[`${targetPath}MongoID`]: {
					type: "MongoID",
					resolve: (source) => {
						return source[targetPath];
					},
					extensions: {
						projection: { [targetPath]: true },
					},
				},
			});

			parentModelTC.addRelation(
				targetPath,
				relationConfiguration({
					targetModelTC,
					path: targetPath,
				})
			);

			// if (pathIsNested) {
			// 	pathValue.split(".")

			// 	ModelTC.setField(pathValue, parentModelTC);
			// }
		});
	}

	addRelationsFromModels($ = required`$`) {
		Object.keys($).forEach((name) => {
			const { ucFirstSingular } =
				this.singleton.SchemaNameHelper.parseName(name);
			const ModelTC = this.singleton.schemaComposer.getOTC(ucFirstSingular);

			const { oneToManyRelations, oneToOneRelations } =
				this.__getRelationsFromModel($[name]);

			this.__addRelationsToModelTC({
				$,
				ModelTC,
				relations: oneToManyRelations,
				relationConfiguration: this.__oneToManyRelationConfiguration,
			});

			this.__addRelationsToModelTC({
				$,
				ModelTC,
				relations: oneToOneRelations,
				relationConfiguration: this.__oneToOneRelationConfiguration,
			});
		});
	}
}

export default SchemaRelationHelper;
