// STUB del kernel WASM para el BUILD DE ESCRITORIO (vite --mode desktop).
// Anti-RE (F3): el .wasm con la matemática NO viaja en el bundle desktop — allí
// todos los cálculos van por IPC al binario nativo (comando `kernel_call`).
// Estas funciones jamás deben ejecutarse en escritorio; si algo las llama, es un
// bug de enrutado y debe fallar ruidosamente.

const stub = (name) => () => {
  throw new Error(`kernel WASM excluido del build de escritorio (${name} va por IPC)`)
}

export const bqs_calculate_row = stub('bqs_calculate_row')
export const bqs_calculate_row_imperial = stub('bqs_calculate_row_imperial')
export const compare_sources = stub('compare_sources')
export const density_tool = stub('density_tool')
export const vef_calculate = stub('vef_calculate')
export const sw_deduction = stub('sw_deduction')
export const pro_rata = stub('pro_rata')
export const sampling_levels = stub('sampling_levels')
export const custody_figure = stub('custody_figure')
export const draft_survey = stub('draft_survey')
export const hydrostatic_interpolate = stub('hydrostatic_interpolate')
export const reconcile_terminal = stub('reconcile_terminal')
export const lpg_custody = stub('lpg_custody')
export const costald_ctl = stub('costald_ctl')
export const lpg_vapor_correction = stub('lpg_vapor_correction')
export const blend_calculate = stub('blend_calculate')
export const movement_set_calculate = stub('movement_set_calculate')
export const kernel_version = stub('kernel_version')

// init(): no-op — no hay módulo que instanciar en escritorio.
export default function init() {
  return Promise.resolve()
}
