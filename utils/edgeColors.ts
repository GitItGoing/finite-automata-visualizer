/**
 * Returns a consistent color for a given edge index.
 * Each edge gets a unique color from the palette (cycling for large graphs).
 */
const COLOR_PALETTE = [
    '#3b82f6', // blue
    '#10b981', // emerald
    '#f59e0b', // amber
    '#ef4444', // red
    '#8b5cf6', // violet
    '#ec4899', // pink
    '#14b8a6', // teal
    '#f97316', // orange
    '#6366f1', // indigo
    '#84cc16', // lime
    '#06b6d4', // cyan
    '#a855f7', // purple
    '#eab308', // yellow
    '#22c55e', // green
    '#d946ef', // fuchsia
    '#0ea5e9', // sky
    '#dc2626', // red-600
    '#9333ea', // purple-600
    '#059669', // emerald-600
    '#db2777', // pink-600
];

export function getEdgeColor(edgeIndex: number): string {
    return COLOR_PALETTE[edgeIndex % COLOR_PALETTE.length];
}
