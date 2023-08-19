class SchemaMiddlewareHelper {
	singleton;

	constructor(singleton) {
		this.singleton = singleton;
	}

	get middleware() {
		return this.singleton.meta.middlewares;
	}

	generateMiddleware() {
		const Query = this.middleware
			.filter((middleware) =>
				this.singleton.schemaComposer.Query.hasField(
					middleware.name + this.singleton.SchemaNameHelper.ext
				)
			)
			.reduce(
				(result, middleware) =>
					Object.assign(result, {
						[middleware.name + this.singleton.SchemaNameHelper.ext]:
							middleware.value,
					}),
				{}
			);

		const Mutation = this.middleware
			.filter((middleware) =>
				this.singleton.schemaComposer.Mutation.hasField(
					middleware.name + this.singleton.SchemaNameHelper.ext
				)
			)
			.reduce(
				(result, middleware) =>
					Object.assign(result, {
						[middleware.name + this.singleton.SchemaNameHelper.ext]:
							middleware.value,
					}),
				{}
			);

		return {
			Mutation,
			Query,
		};
	}
}

export default SchemaMiddlewareHelper;
