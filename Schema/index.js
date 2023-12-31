import * as path from "path";
import { composeMongoose } from "graphql-compose-mongoose";
import { print } from "graphql";
import { mkdirSync, writeFileSync, existsSync } from "fs";

import {
	SchemaComposer,
	ScalarTypeComposer,
	isSomeInputTypeComposer,
} from "graphql-compose";
import { applyMiddleware } from "graphql-middleware";
import required from "../libs/required";
import GraphQLJSON from "graphql-type-json";
import { DateTimeTypeDefinition } from "graphql-scalars";

import SchemaConfigurationHelper from "./libs/SchemaConfigurationHelper";
import SchemaDirectiveHelper from "./libs/SchemaDirectiveHelper";
import SchemaFieldHelper from "./libs/SchemaFieldHelper";
import SchemaNameHelper from "./libs/SchemaNameHelper";
import SchemaPermissionHelper from "./libs/SchemaPermissionHelper";
import SchemaRelationHelper from "./libs/SchemaRelationHelper";
import SchemaDescriptionHelper from "./libs/SchemaDescriptionHelper";
import SchemaOverridesHelper from "./libs/SchemaOverridesHelper";
import SchemaMiddlewareHelper from "./libs/SchemaMiddlewareHelper";
import SchemaUnionTypeHelper from "./libs/SchemaUnionTypeHelper";
import SchemaInterfaceTypeHelper from "./libs/SchemaInterfaceTypeHelper";

const { NODE_ENV } = process.env;

class Schema {
	schemaComposer;
	value;

	constructor({
		directives = [],
		unions = [],
		interfaces = [],
		middlewares = [],
		configurations = [],
		permissions = [],
		descriptions = [],
		overrides = [],
		extensions = [],
		definitions = [],
		mutations = [],
		queries = [],
		resolvers = [],
	}) {
		this.definitions = definitions;
		this.mutations = mutations;
		this.queries = queries;
		this.resolvers = resolvers;
		this.meta = {
			directives,
			unions,
			interfaces,
			middlewares,
			configurations,
			permissions,
			descriptions,
			overrides,
			extensions,
		};

		this.schemaComposer = new SchemaComposer();

		this.SchemaConfigurationHelper = new SchemaConfigurationHelper(this);
		this.SchemaDirectiveHelper = new SchemaDirectiveHelper(this);
		this.SchemaFieldHelper = new SchemaFieldHelper(this);
		this.SchemaNameHelper = new SchemaNameHelper(this);
		this.SchemaPermissionHelper = new SchemaPermissionHelper(this);
		this.SchemaRelationHelper = new SchemaRelationHelper(this);
		this.SchemaDescriptionHelper = new SchemaDescriptionHelper(this);
		this.SchemaMiddlewareHelper = new SchemaMiddlewareHelper(this);
		this.SchemaUnionTypeHelper = new SchemaUnionTypeHelper(this);
		this.SchemaOverridesHelper = new SchemaOverridesHelper(this);
		this.SchemaInterfaceTypeHelper = new SchemaInterfaceTypeHelper(this);
	}

	__defineCustomOperations() {
		const Query = this.queries.reduce((result, query) => {
			return Object.assign({}, result, {
				[query.name]: query.value,
			});
		}, {});

		const Mutation = this.mutations.reduce((result, mutation) => {
			return Object.assign({}, result, {
				[mutation.name]: mutation.value,
			});
		}, {});

		const Resolver = this.resolvers.reduce((result, resolver) => {
			const targetType = resolver.name.split(".")[0];
			const field = resolver.name.split(".")[1];
			if (!result[targetType]) result[targetType] = {};
			if (field) result[targetType][field] = resolver.value;
			else result[targetType] = resolver.value;
			return result;
		}, {});

		this.schemaComposer.addResolveMethods({
			Query,
			Mutation,
			...Resolver,
		});
	}

	__defineDirectives() {
		this.SchemaDirectiveHelper.directives.forEach(({ definition }) => {
			this.schemaComposer.addDirective(definition);
		});
	}

	__addDirectives(schema = required`schema`) {
		this.SchemaDirectiveHelper.directives.forEach(
			({ transformer, definition, name }) => {
				schema = transformer(schema, name);
			}
		);
		return schema;
	}

	__addOperationsFromModels($ = required`$`) {
		Object.keys($).forEach((name) => {
			const { ucFirstSingular } = this.SchemaNameHelper.parseName(name);
			const ModelTC = this.schemaComposer.getOTC(ucFirstSingular);
			const configuration =
				this.SchemaConfigurationHelper.getConfigurationByName(name, $[name]);

			if (!ModelTC || !configuration) return;

			const addFieldParams = {
				modelName: name,
				configuration,
				ModelTC,
			};

			this.SchemaFieldHelper.addQueryFields(addFieldParams);
			this.SchemaFieldHelper.addMutationFields(addFieldParams);
		});
	}

	__replaceSort(ModelTC = required`ModelTC`) {
		for (const mongooseResolverName in ModelTC.mongooseResolvers) {
			const mongooseResolver = ModelTC.mongooseResolvers[mongooseResolverName];

			ModelTC.mongooseResolvers[mongooseResolverName] = (opts) => {
				const mR = mongooseResolver(opts);
				if (mR.hasArg("sort") === false) return mR;

				return mR
					.removeArg("sort")
					.addArgs({
						sort: {
							type: GraphQLJSON,
						},
					})
					.wrapResolve((next) => ({ args, beforeQuery, ...other }) => {
						beforeQuery = (query) => {
							if (args.sort) query.sort(args.sort);
						};
						return next({ args, beforeQuery, ...other });
					});
			};
		}
	}

	__replaceDateByModelTC(ModelTC = required`ModelTC`) {
		ModelTC.getFieldNames()
			.filter(
				(name) =>
					ModelTC.getFieldTypeName(name) === "Date" ||
					ModelTC.getFieldTypeName(name) === "Date!"
			)
			.forEach((name) => {
				ModelTC.setField(
					name,
					ScalarTypeComposer.create(DateTimeTypeDefinition, this.schemaComposer)
				);
			});
	}

	__replaceDate() {
		function replace(TC, schemaComposer) {
			for (const name of TC.getFieldNames()) {
				if (
					TC.getFieldTypeName(name) === "Date" ||
					TC.getFieldTypeName(name) === "Date!"
				) {
					TC.setField(
						name,
						ScalarTypeComposer.create(DateTimeTypeDefinition, schemaComposer)
					);
				} else if (
					TC.getFieldTypeName(name) === "[Date]" ||
					TC.getFieldTypeName(name) === "[Date!]"
				) {
					TC.setField(name, [
						ScalarTypeComposer.create(DateTimeTypeDefinition, schemaComposer),
					]);
				} else {
					const nextTC = TC.getFieldTC(name);
					if (nextTC === TC) continue;
					if (!isSomeInputTypeComposer(nextTC)) continue;
					if (!nextTC.getFieldNames) continue;
					if (!nextTC.getFieldTypeName) continue;
					replace(nextTC, schemaComposer);
				}
			}
		}

		const OTCTypes = ["Query", "Mutation"];
		for (const OTCType of OTCTypes) {
			const OTC = this.schemaComposer[OTCType];
			for (const name of OTC.getFieldNames()) {
				if (name === "_empty") continue;
				const fieldArgNames = OTC.getFieldArgNames(name);
				for (const fieldArgName of fieldArgNames) {
					const TC = OTC.getFieldArgTC(name, fieldArgName);
					if (!TC.getFieldNames) continue;
					if (!TC.getFieldTypeName) continue;
					replace(TC, this.schemaComposer);
				}
			}
		}
	}

	__seedTypesFromModels($ = required`$`) {
		return Object.keys($).map((name) => {
			const { ucFirstSingular } = this.SchemaNameHelper.parseName(name);

			const ModelTC = composeMongoose($[name], {
				name: ucFirstSingular,
				schemaComposer: this.schemaComposer,
			});

			this.__replaceSort(ModelTC);
			this.__replaceDateByModelTC(ModelTC);

			for (const extension of this.meta.extensions) {
				ModelTC.mongooseResolvers[extension.name] = extension.value(ModelTC);
			}
		});
	}

	__alphabetizeFields() {
		this.schemaComposer.types.forEach((val) => {
			if (!val.getFieldNames) return;
			const typeFieldNames = val.getFieldNames();
			typeFieldNames.sort(function (a, b) {
				if (a < b) {
					return -1;
				}
				if (a > b) {
					return 1;
				}
				return 0;
			});
			val.reorderFields(typeFieldNames);
		});
	}

	addScalers(scalars = required`scalars`) {
		Object.keys(scalars).forEach((name) => {
			this.schemaComposer.addTypeDefs(`scalar ${name}`);
		});

		this.schemaComposer.addResolveMethods({
			...scalars,
		});
	}

	markup({ outputPath } = {}) {
		if (!outputPath) outputPath = path.resolve("markup");
		const queriesOutputPath = path.resolve(outputPath, "queries");
		const mutationsOutputPath = path.resolve(outputPath, "mutations");

		if (!existsSync(outputPath)) mkdirSync(outputPath);
		if (!existsSync(queriesOutputPath)) mkdirSync(queriesOutputPath);
		if (!existsSync(mutationsOutputPath)) mkdirSync(mutationsOutputPath);

		const filePaths = [];
		for (const key of ["Query", "Mutation"]) {
			const operationNames = this.schemaComposer[key].getFieldNames();
			for (const operationName of operationNames) {
				const obj = { name: operationName, args: [] };
				const argNames =
					this.schemaComposer[key].getFieldArgNames(operationName);
				for (const argName of argNames) {
					const argTypeName = this.schemaComposer[key].getFieldArgTypeName(
						operationName,
						argName
					);
					obj.args.push({
						name: argName,
						type: argTypeName,
					});
				}
				if (key === "Query") {
					var filePath = `${queriesOutputPath}/${operationName}.json`;
				}
				if (key === "Mutation") {
					var filePath = `${mutationsOutputPath}/${operationName}.json`;
				}
				writeFileSync(filePath, JSON.stringify(obj, null, 2));
				filePaths.push({
					operationName,
					filePath: filePath.replace(outputPath, "."),
				});
			}
		}

		const jsFileStr = `
			export default {
				${filePaths
					.sort((a, b) => a.operationName.localeCompare(b.operationName))
					.map(
						({ operationName, filePath }) =>
							`\n${operationName}: () => import("${filePath}")\r`
					)}
			}
		`;

		writeFileSync(`${outputPath}/index.js`, jsFileStr);
	}

	generate($ = required`$`) {
		if (this.value) return this.value;

		this.__seedTypesFromModels($);
		this.__addOperationsFromModels($);

		this.__defineDirectives();

		this.definitions.forEach((definition) => {
			this.schemaComposer.addTypeDefs(print(definition));
		});
		this.SchemaInterfaceTypeHelper.extendInterfaceImplementationTypeResolvers();

		this.__defineCustomOperations();

		this.SchemaUnionTypeHelper.addResolveTypeToUnionTypes();
		this.SchemaInterfaceTypeHelper.addResolveTypeToInterfaceTypes();

		this.__replaceDate();

		this.SchemaRelationHelper.addRelationsFromModels($);
		if (NODE_ENV !== "production") {
			this.SchemaDescriptionHelper.addDescriptions();
			this.__alphabetizeFields();
		}

		const interfaceTypes =
			this.SchemaInterfaceTypeHelper.getInterfaceImplementations();

		this.value = this.schemaComposer.buildSchema({
			keepUnusedTypes: false,
			types: interfaceTypes.length > 0 ? interfaceTypes : undefined,
		});
		this.value = this.__addDirectives(this.value);
		const middleware = this.SchemaMiddlewareHelper.generateMiddleware();
		if (!this.value._mutationType) delete middleware.Mutation;
		if (!this.value._queryType) delete middleware.Query;
		return applyMiddleware(
			this.value,
			middleware
			//this.SchemaPermissionHelper.generateShieldPermissions()
		);
	}
}

export default Schema;
