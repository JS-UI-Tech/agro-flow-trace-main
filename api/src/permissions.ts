import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements, adminAc } from "better-auth/plugins/admin/access";

/**
 * AgroTrace RBAC. Resources map to the physical stages of agroprocessing;
 * the admin-plugin default statements (user management) are merged in so
 * the `administrator` role can manage users too.
 */
export const statement = {
  ...defaultStatements,
  supplier: ["create", "read", "update", "delete", "approve"],
  rawMaterial: ["create", "read", "update", "receive"],
  recipe: ["create", "read", "update"],
  batch: ["create", "read", "update", "start", "complete", "quarantine"],
  qc: ["read", "pass", "fail"],
  packaging: ["create", "read"],
  finishedGoods: ["read", "release"],
  dispatch: ["create", "read", "update"],
  recall: ["create", "read", "close"],
  waste: ["create", "read", "approve"],
  report: ["read", "export"],
  audit: ["read"],
} as const;

export const ac = createAccessControl(statement);

const all = <T extends readonly string[]>(xs: T) => [...xs] as unknown as T;

/** Full access across every resource, plus user administration. */
export const administrator = ac.newRole({
  ...adminAc.statements,
  supplier: all(statement.supplier),
  rawMaterial: all(statement.rawMaterial),
  recipe: all(statement.recipe),
  batch: all(statement.batch),
  qc: all(statement.qc),
  packaging: all(statement.packaging),
  finishedGoods: all(statement.finishedGoods),
  dispatch: all(statement.dispatch),
  recall: all(statement.recall),
  waste: all(statement.waste),
  report: all(statement.report),
  audit: all(statement.audit),
});

export const production_supervisor = ac.newRole({
  rawMaterial: ["read"],
  recipe: ["create", "read", "update"],
  batch: ["create", "read", "update", "start", "complete", "quarantine"],
  qc: ["read"],
  packaging: ["create", "read"],
  finishedGoods: ["read"],
  report: ["read", "export"],
  audit: ["read"],
});

export const floor_operator = ac.newRole({
  rawMaterial: ["read", "receive"],
  recipe: ["read"],
  batch: ["read", "update"],
  packaging: ["create", "read"],
  finishedGoods: ["read"],
});

export const qc_officer = ac.newRole({
  rawMaterial: ["read"],
  batch: ["read", "quarantine"],
  qc: ["read", "pass", "fail"],
  finishedGoods: ["read", "release"],
  report: ["read"],
  audit: ["read"],
});

export const storekeeper = ac.newRole({
  rawMaterial: ["create", "read", "receive"],
  finishedGoods: ["read"],
  waste: ["create", "read"],
  report: ["read"],
});

export const dispatch_sales = ac.newRole({
  finishedGoods: ["read"],
  dispatch: ["create", "read", "update"],
  report: ["read", "export"],
});

export const auditor = ac.newRole({
  supplier: ["read"],
  rawMaterial: ["read"],
  recipe: ["read"],
  batch: ["read"],
  qc: ["read"],
  packaging: ["read"],
  finishedGoods: ["read"],
  dispatch: ["read"],
  recall: ["read"],
  waste: ["read"],
  report: ["read", "export"],
  audit: ["read"],
});

export const roles = {
  administrator,
  production_supervisor,
  floor_operator,
  qc_officer,
  storekeeper,
  dispatch_sales,
  auditor,
};

export type AgroRole = keyof typeof roles;
export const ROLE_NAMES = Object.keys(roles) as AgroRole[];
