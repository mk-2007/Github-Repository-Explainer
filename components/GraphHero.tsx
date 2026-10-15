"use client";

// A stylized (non-real) dependency graph used purely as the hero's
// ambient signature — nodes light up mint in sequence, echoing the
// product's actual core feature (the topologically-ordered walkthrough)
// rather than being generic decoration.

const NODES: { x: number; y: number }[] = [
  { x: 60, y: 200 },
  { x: 60, y: 300 },
  { x: 220, y: 120 },
  { x: 220, y: 240 },
  { x: 220, y: 360 },
  { x: 400, y: 80 },
  { x: 400, y: 200 },
  { x: 400, y: 320 },
  { x: 400, y: 420 },
  { x: 580, y: 150 },
  { x: 580, y: 280 },
  { x: 740, y: 100 },
  { x: 740, y: 220 },
  { x: 740, y: 340 },
];

const EDGES: [number, number][] = [
  [0, 2], [0, 3], [1, 3], [1, 4],
  [2, 5], [2, 6], [3, 6], [3, 7], [4, 7], [4, 8],
  [6, 9], [7, 9], [7, 10], [8, 10],
  [9, 11], [9, 12], [10, 12], [10, 13],
];

const STAGGER = 0.35; // seconds between each node lighting up
const CYCLE = NODES.length * STAGGER + 2;

export default function GraphHero() {
  return (
    <svg
      viewBox="0 0 800 500"
      className="graph-hero"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <style>{`
        .graph-hero { width: 100%; height: 100%; }
        .edge {
          stroke: #262c3a;
          stroke-width: 1.5;
        }
        .node {
          fill: #171c28;
          stroke: #2c3342;
          stroke-width: 1.5;
        }
        .node.lit {
          animation: light ${CYCLE}s ease-in-out infinite;
        }
        @keyframes light {
          0%, 96% { fill: #171c28; stroke: #2c3342; }
          2%, 8% { fill: #1a3329; stroke: #6ee7b7; filter: drop-shadow(0 0 6px rgba(110,231,183,0.6)); }
          14% { fill: #171c28; stroke: #2c3342; filter: none; }
        }
      `}</style>
      {EDGES.map(([a, b], i) => (
        <line
          key={i}
          x1={NODES[a].x}
          y1={NODES[a].y}
          x2={NODES[b].x}
          y2={NODES[b].y}
          className="edge"
        />
      ))}
      {NODES.map((n, i) => (
        <circle
          key={i}
          cx={n.x}
          cy={n.y}
          r={10}
          className="node lit"
          style={{ animationDelay: `${i * STAGGER}s` }}
        />
      ))}
    </svg>
  );
}
