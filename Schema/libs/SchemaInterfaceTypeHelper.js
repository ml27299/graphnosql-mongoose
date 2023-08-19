class SchemaAbstractTypeHelper {
	singleton;

	constructor(singleton) {
		this.singleton = singleton;
	}

	get interfaces() {
		return this.singleton.meta.interfaces;
	}

	addResolveTypeToInterfaceTypes() {
		for (const inter of this.interfaces) {
			const TC = this.singleton.schemaComposer.getAnyTC(inter.name);
			TC.setResolveType(inter.value.__resolveType);
		}
	}

	getInterfaceImplementations() {
		let response = [];
		this.singleton.schemaComposer.types.forEach((val) => {
			if (!val.getInterfacesTypes) return;
			const interfaces = val.getInterfacesTypes();
			if (interfaces.length > 0) response.push(val);
		});
		return response;
	}

	extendInterfaceImplementationTypeResolvers() {
		const imps = this.getInterfaceImplementations().map((val) => ({
			typeName: val.getTypeName(),
			interfaceTypeNames: val
				.getInterfaces()
				.map((inter) => inter.getTypeName()),
		}));

		const resolvers = imps.reduce((result, imp) => {
			const interfaces = this.interfaces.filter(({ name }) =>
				imp.interfaceTypeNames.includes(name)
			);
			if (interfaces.length === 0) return result;
			result[imp.typeName] = interfaces.reduce(
				(result, { value }) => Object.assign(result, value),
				{}
			);
			delete result[imp.typeName].__resolveType;
			return result;
		}, {});

		this.singleton.schemaComposer.addResolveMethods(resolvers);
	}
}

export default SchemaAbstractTypeHelper;
