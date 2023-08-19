import required from "../../libs/required";
import dot from "dot-object";

class SchemaDescriptionHelper {
	singleton;

	constructor(singleton) {
		this.singleton = singleton;
	}

	get descriptions() {
		return this.singleton.meta.descriptions;
	}

	__parseFieldName(fieldName = required`fieldName`) {
		let subFieldName;

		const fieldNameArray = fieldName.split(".");
		fieldNameArray.pop();

		if (fieldNameArray.length > 1) {
			subFieldName = fieldNameArray.pop();
		}

		return { fieldName: fieldNameArray.join("."), subFieldName };
	}

	__addOTCDescription({
		OTC = required`OTC`,
		description = required`description`,
	}) {
		const OTCFields = OTC.getFields();

		for (const OTCField in OTCFields) {
			const ChildOTCName = OTCFields[OTCField].type.getTypeName();
			const target = this.descriptions.find(
				({ name }) => name === ChildOTCName
			);
			if (!target) continue;
			OTC.extendField(OTCField, { description: target.value.description });
		}

		OTC.setDescription(description);
	}

	__addOTCFieldDescriptionsFromProperties({
		OTC = required`OTC`,
		properties = required`properties`,
	}) {
		const dotProperties = dot.dot(properties);
		for (const dotFieldName in dotProperties) {
			const propertyDescription = dotProperties[dotFieldName];
			const fieldDescription = Array.isArray(propertyDescription)
				? propertyDescription.join("\n\n")
				: propertyDescription;

			const { fieldName, subFieldName } = this.__parseFieldName(dotFieldName);

			if (subFieldName) {
				if (!OTC.hasField(subFieldName)) continue;
				OTC.get(fieldName).extendField(subFieldName, {
					description: fieldDescription,
				});
			} else {
				if (!OTC.hasField(fieldName)) continue;
				OTC.extendField(fieldName, {
					description: fieldDescription,
				});
			}
		}
	}
	__addMainTypesDescriptions() {
		for (const description of this.descriptions) {
			const queryOTC = this.singleton.schemaComposer.getOTC("Query");
			const mutationOTC = this.singleton.schemaComposer.getOTC("Mutation");

			const { description: modelDescription, properties } = description.value;

			if (queryOTC.hasField(description.name)) {
				const des = queryOTC.getField(description.name).description;
				queryOTC.extendField(description.name, {
					description: des ? `${des} - ${modelDescription}` : modelDescription,
				});
			} else if (mutationOTC.hasField(description.name)) {
				const des = mutationOTC.getField(description.name).description;
				mutationOTC.extendField(description.name, {
					description: des ? `${des} - ${modelDescription}` : modelDescription,
				});
			}
		}
	}

	__addAuthorizationDescriptions() {
		const { Query, Mutation } = this.singleton.schemaComposer;
		for (const Type of [Query, Mutation]) {
			const fieldNames = Type.getFieldNames();
			for (const fieldName of fieldNames) {
				const description = Type.getField(fieldName).description;
				let directive = Type.getFieldDirectiveByName(fieldName, "auth");
				if (!directive) directive = { requires: "ANY" };
				Type.extendField(fieldName, {
					description: description
						? `${description}\n\n\rAuthorization: ${directive.requires}`
						: `Authorization: ${directive.requires}`,
				});
			}
		}
	}

	__addOverrideDescription() {
		const { Query, Mutation } = this.singleton.schemaComposer;
		for (const Type of [Query, Mutation]) {
			const fieldNames = Type.getFieldNames();
			for (const fieldName of fieldNames) {
				const customResolver =
					this.singleton.SchemaOverridesHelper.findByName(fieldName);
				const description = Type.getField(fieldName).description;
				if (!customResolver) {
					Type.extendField(fieldName, {
						description: `${description}\n\n\rOverridden: false`,
					});
					continue;
				}
				Type.extendField(fieldName, {
					description: `${description}\n\n\rOverridden: true`,
				});
			}
		}
	}

	__addTypesDescriptions() {
		for (const description of this.descriptions) {
			if (!this.singleton.schemaComposer.isObjectType(description.name))
				continue;

			const OTC = this.singleton.schemaComposer.getOTC(description.name);
			const { description: modelDescription, properties } = description.value;

			this.__addOTCDescription({ OTC, description: modelDescription });
			if (properties)
				this.__addOTCFieldDescriptionsFromProperties({ OTC, properties });
		}
	}

	addDescriptions() {
		this.__addTypesDescriptions();
		this.__addMainTypesDescriptions();
		this.__addAuthorizationDescriptions();
		this.__addOverrideDescription();
	}
}

export default SchemaDescriptionHelper;
