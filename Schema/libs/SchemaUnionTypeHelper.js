class SchemaUnionTypeHelper {
	singleton;

	constructor(singleton) {
		this.singleton = singleton;
	}

	get unions() {
		return this.singleton.meta.unions;
	}

	addResolveTypeToUnionTypes() {
		for (const union of this.unions) {
			const TC = this.singleton.schemaComposer.getAnyTC(union.name);
			TC.setResolveType(union.value.__resolveType);
		}
	}
}

export default SchemaUnionTypeHelper;
