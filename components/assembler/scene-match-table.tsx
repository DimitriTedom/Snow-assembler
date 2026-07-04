import { Badge } from "@/components/ui/badge";
import type { SceneMatchSummary } from "@/lib/assembler/types";

function formatClock(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = (seconds % 60).toFixed(1).padStart(4, "0");
  return `${minutes}:${remainder}`;
}

export function SceneMatchTable({
  scenes,
  title,
  limit = 12,
}: {
  scenes: SceneMatchSummary[];
  title: string;
  limit?: number;
}) {
  const visible = scenes.slice(0, limit);

  return (
    <div className="rounded-xl border border-white/8 bg-secondary/30">
      <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        <Badge variant="secondary">{scenes.length} total</Badge>
      </div>
      <div className="max-h-72 overflow-auto">
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 bg-secondary/90 text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Scene</th>
              <th className="px-4 py-2 font-medium">Key</th>
              <th className="px-4 py-2 font-medium">Duration</th>
              <th className="px-4 py-2 font-medium">Image</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((scene) => (
              <tr key={scene.id} className="border-t border-white/5">
                <td className="px-4 py-2 font-mono text-accent">#{String(scene.id).padStart(2, "0")}</td>
                <td className="px-4 py-2 font-mono">{scene.match_key}</td>
                <td className="px-4 py-2">
                  {formatClock(scene.start)} → {formatClock(scene.end)} ({scene.duration}s)
                </td>
                <td className="px-4 py-2">
                  {scene.image ? (
                    <span className="text-emerald-400">{scene.image}</span>
                  ) : (
                    <span className="text-amber-400">missing</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {scenes.length > limit ? (
        <p className="border-t border-white/8 px-4 py-2 text-xs text-muted-foreground">
          Showing first {limit} of {scenes.length} scenes.
        </p>
      ) : null}
    </div>
  );
}