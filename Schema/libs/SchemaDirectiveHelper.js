import required from "../../libs/required";

class SchemaDirectiveHelper {
	singleton;

	constructor(singleton) {
		this.singleton = singleton;
	}

	get directives() {
		return this.singleton.meta.directives;
	}

	addDirectives({ fields = required`fields`, Type = required`Type` }) {
		for (const directive of this.directives) {
			if (!directive.setFieldDirective) continue;
			fields.forEach((field) => {
				directive.setFieldDirective({
					schemaComposer: this.singleton.schemaComposer,
					Type,
					fieldName: field.name,
					...field,
				});
			});
		}
	}
}

export default SchemaDirectiveHelper;
