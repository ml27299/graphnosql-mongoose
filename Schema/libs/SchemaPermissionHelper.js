import { shield } from "graphql-shield";
const { NODE_ENV } = process.env;
class SchemaPermissionHelper {
	singleton;
	allowExternalErrors;
	constructor(singleton, { allowExternalErrors }) {
		this.singleton = singleton;
		this.allowExternalErrors = allowExternalErrors;
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
				{}
			),
			{ allowExternalErrors: this.allowExternalErrors }
		);
	}
}

export default SchemaPermissionHelper;
