import {
	filterHelper,
	sortHelper,
	limitHelper,
	skipHelper,
	projectionHelper,
	prepareNestedAliases,
} from "graphql-compose-mongoose/lib/resolvers/helpers";

export const count = (model, args = {}) => {
	const aliases = prepareNestedAliases(model.schema);
	const params = {
		model,
		args,
		query: model.find(),
	};
	filterHelper(params, aliases);
	if (params.query.countDocuments) {
		// mongoose 5.2.0 and above
		return params.query.countDocuments();
	} else {
		// mongoose 5 and below
		return params.query.count();
	}
};

export const findMany = (model, args = {}) => {
	const aliases = prepareNestedAliases(model.schema);
	const params = {
		model,
		query: model.find({}),
		args,
	};

	filterHelper(params, aliases);
	sortHelper(params);
	limitHelper(params);
	skipHelper(params);
	projectionHelper(params, aliases);

	return params.query.lean();
};

export const findOne = (model, args = {}) => {
	const aliases = prepareNestedAliases(model.schema);
	const params = {
		model,
		query: model.findOne({}),
		args,
	};

	filterHelper(params, aliases);
	sortHelper(params);
	limitHelper(params);
	skipHelper(params);
	projectionHelper(params, aliases);

	return params.query;
};

export const removeOne = (model, args = {}) => {
	const aliases = prepareNestedAliases(model.schema);
	const params = {
		model,
		query: model.findOneAndDelete({}),
		args,
	};

	filterHelper(params, aliases);
	sortHelper(params);
	projectionHelper(params, aliases);

	return params.query;
};
