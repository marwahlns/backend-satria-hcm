
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.22.0
 * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
 */
Prisma.prismaVersion = {
  client: "5.22.0",
  engine: "605197351a3c8bdd595af2d2a9bc3025bca48ea2"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`NotFoundError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable',
  Snapshot: 'Snapshot'
});

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  name: 'name',
  email: 'email',
  email_verified_at: 'email_verified_at',
  password: 'password',
  accessed_app: 'accessed_app',
  role_id: 'role_id',
  is_blocked: 'is_blocked',
  is_active: 'is_active',
  token: 'token',
  phone: 'phone',
  email_sf: 'email_sf',
  superior: 'superior',
  section_code: 'section_code',
  section: 'section',
  divid: 'divid',
  companyid: 'companyid',
  dept: 'dept',
  department: 'department',
  division: 'division',
  title: 'title',
  worklocation_code: 'worklocation_code',
  worklocation_name: 'worklocation_name',
  worklocation_lat_long: 'worklocation_lat_long',
  personal_number: 'personal_number',
  csfield10: 'csfield10',
  company_name: 'company_name',
  photo: 'photo',
  grade: 'grade',
  remember_token: 'remember_token',
  latlon_distance: 'latlon_distance',
  section_code_sap: 'section_code_sap',
  section_sap: 'section_sap',
  department_code_sap: 'department_code_sap',
  department_sap: 'department_sap',
  division_code_sap: 'division_code_sap',
  division_sap: 'division_sap',
  pos_code_sap: 'pos_code_sap',
  company_id_sap: 'company_id_sap',
  company_name_sap: 'company_name_sap',
  worklocation_code_sap: 'worklocation_code_sap',
  worklocation_name_sap: 'worklocation_name_sap',
  worklocation_lat_long_sap: 'worklocation_lat_long_sap',
  created_at: 'created_at',
  updated_at: 'updated_at'
};

exports.Prisma.Ms_leave_typesScalarFieldEnum = {
  id: 'id',
  title: 'title',
  days: 'days',
  created_by: 'created_by',
  created_at: 'created_at',
  updated_by: 'updated_by',
  updated_at: 'updated_at',
  is_deleted: 'is_deleted'
};

exports.Prisma.Trx_leavesScalarFieldEnum = {
  id: 'id',
  user: 'user',
  dept: 'dept',
  leave_type_id: 'leave_type_id',
  status_id: 'status_id',
  start_date: 'start_date',
  end_date: 'end_date',
  total_leave_days: 'total_leave_days',
  leave_reason: 'leave_reason',
  accept_to: 'accept_to',
  accepted: 'accepted',
  accepted_date: 'accepted_date',
  accepted_remark: 'accepted_remark',
  approve_to: 'approve_to',
  approved: 'approved',
  approved_date: 'approved_date',
  approved_remark: 'approved_remark',
  rejected: 'rejected',
  rejected_date: 'rejected_date',
  rejected_remark: 'rejected_remark',
  canceled: 'canceled',
  canceled_date: 'canceled_date',
  canceled_remark: 'canceled_remark',
  flag_leaves: 'flag_leaves',
  created_by: 'created_by',
  created_at: 'created_at',
  updated_by: 'updated_by',
  updated_at: 'updated_at'
};

exports.Prisma.Ms_shiftScalarFieldEnum = {
  id: 'id',
  id_shift_sap: 'id_shift_sap',
  code: 'code',
  name: 'name',
  in_time: 'in_time',
  out_time: 'out_time',
  gt_before_in: 'gt_before_in',
  gt_after_in: 'gt_after_in',
  gt_before_out: 'gt_before_out',
  gt_after_out: 'gt_after_out',
  flag_shift: 'flag_shift',
  created_by: 'created_by',
  created_at: 'created_at',
  updated_by: 'updated_by',
  updated_at: 'updated_at',
  is_deleted: 'is_deleted'
};

exports.Prisma.Ms_shift_groupScalarFieldEnum = {
  id: 'id',
  id_shift_group_sap: 'id_shift_group_sap',
  code: 'code',
  nama: 'nama',
  flag_shift: 'flag_shift',
  created_by: 'created_by',
  created_at: 'created_at',
  updated_by: 'updated_by',
  updated_at: 'updated_at',
  is_deleted: 'is_deleted'
};

exports.Prisma.Ms_detail_shift_groupScalarFieldEnum = {
  id: 'id',
  index_day: 'index_day',
  code: 'code',
  id_shift_group: 'id_shift_group',
  id_shift: 'id_shift',
  created_by: 'created_by',
  created_at: 'created_at',
  updated_by: 'updated_by',
  updated_at: 'updated_at'
};

exports.Prisma.Mst_deptScalarFieldEnum = {
  id: 'id',
  nama: 'nama',
  depthead_nrp: 'depthead_nrp',
  depthead_name: 'depthead_name',
  depthead_email: 'depthead_email',
  div_code: 'div_code',
  div_name: 'div_name',
  divhead_nrp: 'divhead_nrp',
  divhead_name: 'divhead_name',
  divhead_email: 'divhead_email',
  company_id: 'company_id',
  company_name: 'company_name'
};

exports.Prisma.Mst_divisionScalarFieldEnum = {
  id: 'id',
  divid: 'divid',
  div_inv: 'div_inv',
  nama: 'nama',
  divhead_nrp: 'divhead_nrp',
  divhead_name: 'divhead_name',
  divheaed_email: 'divheaed_email',
  company_id: 'company_id',
  company_name: 'company_name',
  position: 'position',
  created_by: 'created_by',
  created_at: 'created_at',
  updated_at: 'updated_at',
  updated_by: 'updated_by'
};

exports.Prisma.SysdiagramsScalarFieldEnum = {
  name: 'name',
  principal_id: 'principal_id',
  diagram_id: 'diagram_id',
  version: 'version',
  definition: 'definition'
};

exports.Prisma.Trx_ovtScalarFieldEnum = {
  id: 'id',
  user: 'user',
  dept: 'dept',
  shift: 'shift',
  status_id: 'status_id',
  check_in_ovt: 'check_in_ovt',
  check_out_ovt: 'check_out_ovt',
  note_ovt: 'note_ovt',
  accept_to: 'accept_to',
  accepted: 'accepted',
  accepted_date: 'accepted_date',
  accepted_remark: 'accepted_remark',
  approve_to: 'approve_to',
  approved: 'approved',
  approved_date: 'approved_date',
  approved_remark: 'approved_remark',
  rejected: 'rejected',
  rejected_date: 'rejected_date',
  rejected_remark: 'rejected_remark',
  canceled: 'canceled',
  canceled_date: 'canceled_date',
  canceled_remark: 'canceled_remark',
  created_by: 'created_by',
  created_at: 'created_at',
  updated_by: 'updated_by',
  updated_at: 'updated_at'
};

exports.Prisma.Trx_shift_empScalarFieldEnum = {
  id: 'id',
  code: 'code',
  id_user: 'id_user',
  id_shift_group: 'id_shift_group',
  valid_from: 'valid_from',
  valid_to: 'valid_to',
  created_by: 'created_by',
  created_at: 'created_at',
  updated_by: 'updated_by',
  updated_at: 'updated_at',
  is_deleted: 'is_deleted'
};

exports.Prisma.Trx_official_travelScalarFieldEnum = {
  id: 'id',
  user: 'user',
  effective_date: 'effective_date',
  start_date: 'start_date',
  end_date: 'end_date',
  total_leave_days: 'total_leave_days',
  purpose: 'purpose',
  destination_city: 'destination_city',
  status_id: 'status_id',
  accept_to: 'accept_to',
  accepted: 'accepted',
  accepted_date: 'accepted_date',
  accepted_remark: 'accepted_remark',
  approve_to: 'approve_to',
  approved: 'approved',
  approved_date: 'approved_date',
  approved_remark: 'approved_remark',
  rejected: 'rejected',
  rejected_date: 'rejected_date',
  rejected_remark: 'rejected_remark',
  canceled: 'canceled',
  canceled_date: 'canceled_date',
  canceled_remark: 'canceled_remark',
  created_by: 'created_by',
  created_at: 'created_at',
  updated_by: 'updated_by',
  updated_at: 'updated_at'
};

exports.Prisma.Trx_mutationScalarFieldEnum = {
  id: 'id',
  user: 'user',
  effective_date: 'effective_date',
  reason: 'reason',
  status_id: 'status_id',
  accept_to: 'accept_to',
  accepted: 'accepted',
  accepted_date: 'accepted_date',
  accepted_remark: 'accepted_remark',
  approve_to: 'approve_to',
  approved: 'approved',
  approved_date: 'approved_date',
  approved_remark: 'approved_remark',
  rejected: 'rejected',
  rejected_date: 'rejected_date',
  rejected_remark: 'rejected_remark',
  canceled: 'canceled',
  canceled_date: 'canceled_date',
  canceled_remark: 'canceled_remark',
  created_by: 'created_by',
  created_at: 'created_at',
  updated_by: 'updated_by',
  updated_at: 'updated_at'
};

exports.Prisma.Trx_resignScalarFieldEnum = {
  id: 'id',
  user: 'user',
  effective_date: 'effective_date',
  reason: 'reason',
  status_id: 'status_id',
  accept_to: 'accept_to',
  accepted: 'accepted',
  accepted_date: 'accepted_date',
  accepted_remark: 'accepted_remark',
  approve_to: 'approve_to',
  approved: 'approved',
  approved_date: 'approved_date',
  approved_remark: 'approved_remark',
  rejected: 'rejected',
  rejected_date: 'rejected_date',
  rejected_remark: 'rejected_remark',
  canceled: 'canceled',
  canceled_date: 'canceled_date',
  canceled_remark: 'canceled_remark',
  created_by: 'created_by',
  created_at: 'created_at',
  updated_by: 'updated_by',
  updated_at: 'updated_at'
};

exports.Prisma.User_detailScalarFieldEnum = {
  id: 'id',
  user_id: 'user_id',
  nrp: 'nrp',
  name: 'name',
  email: 'email',
  marital_status: 'marital_status',
  gender: 'gender',
  birth_date: 'birth_date',
  address: 'address',
  address_coordinate: 'address_coordinate',
  plant: 'plant',
  join_date: 'join_date',
  end_date: 'end_date',
  status: 'status',
  klasifikasi: 'klasifikasi',
  vendor: 'vendor',
  created_by: 'created_by',
  created_at: 'created_at',
  updated_by: 'updated_by',
  updated_at: 'updated_at'
};

exports.Prisma.Ms_worklocationScalarFieldEnum = {
  worklocation_id: 'worklocation_id',
  worklocation_code: 'worklocation_code',
  worklocation_name: 'worklocation_name',
  worklocation_lat_long: 'worklocation_lat_long',
  created_at: 'created_at',
  updated_at: 'updated_at',
  is_deleted: 'is_deleted'
};

exports.Prisma.Ms_klasifikasiScalarFieldEnum = {
  id: 'id',
  name: 'name',
  created_by: 'created_by',
  created_at: 'created_at',
  updated_by: 'updated_by',
  updated_at: 'updated_at'
};

exports.Prisma.Ms_subcontScalarFieldEnum = {
  id: 'id',
  code: 'code',
  name: 'name',
  created_by: 'created_by',
  created_at: 'created_at',
  updated_by: 'updated_by',
  updated_at: 'updated_at'
};

exports.Prisma.Mst_plantScalarFieldEnum = {
  id: 'id',
  section_code: 'section_code',
  worklocation_code: 'worklocation_code',
  dept: 'dept',
  dept_level: 'dept_level',
  company_code: 'company_code',
  plant: 'plant',
  plant_name: 'plant_name',
  postcode: 'postcode',
  city: 'city',
  name: 'name',
  created_by: 'created_by',
  created_at: 'created_at',
  updated_by: 'updated_by',
  updated_at: 'updated_at'
};

exports.Prisma.Ms_marital_statusScalarFieldEnum = {
  id: 'id',
  code: 'code',
  ket: 'ket',
  created_by: 'created_by',
  created_at: 'created_at',
  updated_by: 'updated_by',
  updated_at: 'updated_at'
};

exports.Prisma.Trx_leave_quotaScalarFieldEnum = {
  id: 'id',
  id_user: 'id_user',
  leaves_type_id: 'leaves_type_id',
  valid_from: 'valid_from',
  valid_to: 'valid_to',
  leaves_quota: 'leaves_quota',
  used_leave: 'used_leave',
  leave_balance: 'leave_balance',
  is_active: 'is_active',
  is_deleted: 'is_deleted',
  created_at: 'created_at',
  updated_at: 'updated_at'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};


exports.Prisma.ModelName = {
  User: 'User',
  ms_leave_types: 'ms_leave_types',
  trx_leaves: 'trx_leaves',
  ms_shift: 'ms_shift',
  ms_shift_group: 'ms_shift_group',
  ms_detail_shift_group: 'ms_detail_shift_group',
  mst_dept: 'mst_dept',
  mst_division: 'mst_division',
  sysdiagrams: 'sysdiagrams',
  trx_ovt: 'trx_ovt',
  trx_shift_emp: 'trx_shift_emp',
  trx_official_travel: 'trx_official_travel',
  trx_mutation: 'trx_mutation',
  trx_resign: 'trx_resign',
  user_detail: 'user_detail',
  ms_worklocation: 'ms_worklocation',
  ms_klasifikasi: 'ms_klasifikasi',
  ms_subcont: 'ms_subcont',
  mst_plant: 'mst_plant',
  ms_marital_status: 'ms_marital_status',
  trx_leave_quota: 'trx_leave_quota'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
