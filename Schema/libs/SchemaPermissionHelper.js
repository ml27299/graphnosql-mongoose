import { shield } from "graphql-shield";

class SchemaPermissionHelper {
	singleton;

	constructor(singleton) {
		this.singleton = singleton;
	}

	get permissions() {
		return this.singleton.meta.permissions.map(
			(permission) => permission.value
		);
	}

	generateShieldPermissions() {
		if (!this.permissions.length) {
			return {};
		}
		return shield(
			this.permissions.reduce(
				(result, permission) => Object.assign(result, permission),
				{ allowExternalErrors: true }
			)
		);
	}
}

export default SchemaPermissionHelper;
