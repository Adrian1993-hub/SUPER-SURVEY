/* tslint:disable */
/* eslint-disable */

/**
 * Compute one BQS tank row.
 *
 * `request_json` is a JSON-encoded `BqsRowRequestDTO` — the same string-in /
 * string-out contract as the Tauri `calculate_bqs_row` command. Returns a
 * JSON-encoded `BqsRowResponseDTO`. Calculation errors are reported *inside*
 * that response (`success: false`, `errors`); only malformed input JSON
 * produces the fallback envelope below.
 */
export function bqs_calculate_row(request_json: string): string;

/**
 * Compute one IMPERIAL BQS tank row (US-customary, 60 °F base): API gravity +
 * observed temperature + volume → VCF (Table 6A/6B) / WCF (Table 13) / barrels
 * / metric tons. `request_json` is a JSON `ImperialRowRequestDTO`; returns a
 * JSON `ImperialRowResponseDTO`. Same error convention as `bqs_calculate_row`.
 */
export function bqs_calculate_row_imperial(request_json: string): string;

/**
 * Compare custody figures (e.g. Vessel vs Barge vs BDN) against layered
 * tolerances and recommend a document (NONE / ISSUE_NOAD / ISSUE_LOP).
 *
 * `request_json` is a JSON-encoded `ComparisonRequestDTO`; returns a JSON
 * `ComparisonResponseDTO`. Same error convention as `bqs_calculate_row`.
 */
export function compare_sources(request_json: string): string;

/**
 * Density utilities: API ↔ ρ15, observed ρ@t ↔ ρ15, parcel blending.
 *
 * `request_json` is a JSON-encoded `DensityToolRequestDTO`; returns a JSON
 * `DensityToolResponseDTO`. Same error convention as `bqs_calculate_row`.
 */
export function density_tool(request_json: string): string;

/**
 * Kernel version string (for the UI to show which math built a number).
 */
export function kernel_version(): string;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly bqs_calculate_row: (a: number, b: number) => [number, number];
    readonly bqs_calculate_row_imperial: (a: number, b: number) => [number, number];
    readonly compare_sources: (a: number, b: number) => [number, number];
    readonly density_tool: (a: number, b: number) => [number, number];
    readonly kernel_version: () => [number, number];
    readonly __wbindgen_exn_store: (a: number) => void;
    readonly __externref_table_alloc: () => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
