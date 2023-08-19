import { shield } from "graphql-shield";

class SchemaPermissionHelper {
	singleton;

	constructor(singleton) {
		this.singleton = singleton;
	}

	get permissions() {
		return this.singleton.meta.permissions;
	}

	generateShieldPermissions() {
		return shield(
			this.permissions.reduce(
				(result, permission) => Object.assign(result, permission),
				{}
			)
		);
	}
}

export default SchemaPermissionHelper;
