/**
 * EID Registry Types and Interfaces
 * Defines the schema for EID classification and registry
 */
/**
 * EID classification type
 * Binary representation: [is_rad][is_experiment]
 * 00 = Neither (invalid)
 * 01 = Experiment only
 * 10 = RAD only
 * 11 = Both RAD and Experiment
 */
export var EIDType;
(function (EIDType) {
    EIDType[EIDType["EXPERIMENT_ONLY"] = 1] = "EXPERIMENT_ONLY";
    EIDType[EIDType["RAD_ONLY"] = 2] = "RAD_ONLY";
    EIDType[EIDType["RAD_AND_EXPERIMENT"] = 3] = "RAD_AND_EXPERIMENT"; // 11
})(EIDType || (EIDType = {}));
/**
 * EID status in the system
 */
export var EIDStatus;
(function (EIDStatus) {
    EIDStatus["TESTING"] = "testing";
    EIDStatus["LIVE"] = "live";
    EIDStatus["OLD"] = "old";
})(EIDStatus || (EIDStatus = {}));
//# sourceMappingURL=types.js.map