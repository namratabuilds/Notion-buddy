export function Plant({
  growth = 0,
  health = 40,
  flowers = 0,
  buds = 0,
  compact = false,
}: {
  growth?: number;
  health?: number;
  flowers?: number;
  buds?: number;
  compact?: boolean;
}) {
  const leaves = Math.min(12, 4 + growth);
  return (
    <svg
      viewBox="0 0 420 390"
      className={`botanical-plant ${compact ? "compact" : ""} ${health < 50 && growth > 2 ? "drooping" : ""}`}
      role="img"
      aria-label={`Living plant with ${leaves} leaves and ${flowers} flowers`}
    >
      <ellipse cx="210" cy="358" rx="92" ry="12" className="plant-shadow" />
      <g className="plant-stems">
        <path d="M211 311 C202 267 221 226 207 183 C198 149 216 115 211 66" />
        <path d="M210 275 Q161 242 135 195" />
        <path d="M211 231 Q253 211 283 155" />
        <path d="M207 180 Q163 160 151 124" />
        <path d="M212 134 Q246 115 261 91" />
      </g>
      <g className="plant-leaves">
        {Array.from({ length: leaves }, (_, i) => {
          const spots = [
            [208, 267, -52],
            [213, 238, 35],
            [162, 235, -65],
            [245, 212, 40],
            [204, 200, -44],
            [277, 169, 34],
            [176, 164, -68],
            [210, 152, 38],
            [149, 135, -40],
            [239, 118, 47],
            [211, 102, -41],
            [260, 101, 32],
          ];
          const [x, y, r] = spots[i] || [210, 200, 0];
          return (
            <g key={i} transform={`translate(${x} ${y}) rotate(${r})`}>
              <path
                className={i % 3 === 0 ? "leaf-light" : "leaf-dark"}
                d="M0 0 C-34 -10 -40 -45 -12 -68 C10 -54 19 -28 0 0Z"
              />
              <path className="leaf-vein" d="M0 0 Q-12 -28 -12 -57" />
            </g>
          );
        })}
      </g>
      {Array.from({ length: Math.min(5, flowers) }, (_, i) => {
        const xy = [
          [211, 63],
          [135, 194],
          [284, 151],
          [150, 122],
          [263, 89],
        ][i] || [211, 63];
        return (
          <g
            key={i}
            transform={`translate(${xy[0]} ${xy[1]})`}
            className={i % 2 ? "flower-yellow" : "flower-pink"}
          >
            {Array.from({ length: 5 }, (_, j) => (
              <ellipse key={j} cx="0" cy="-12" rx="10" ry="16" transform={`rotate(${j * 72})`} />
            ))}
            <circle r="7" className="flower-center" />
          </g>
        );
      })}
      {Array.from({ length: Math.min(3, buds) }, (_, i) => (
        <g
          key={`bud-${i}`}
          transform={`translate(${[135, 284, 263][i] || 135} ${[194, 151, 89][i] || 194})`}
        >
          <ellipse rx="8" ry="12" className="flower-pink" />
          <path className="leaf-dark" d="M-8 3 Q0 15 8 3 L0 12Z" />
        </g>
      ))}
      <path className="pot-body" d="M163 306 L175 353 Q211 367 247 353 L259 306Z" />
      <path className="pot-rim" d="M158 301 Q209 289 264 301 L261 314 Q211 323 161 314Z" />
      <path className="pot-detail" d="M179 325 L183 346 M190 328 L193 350" />
    </svg>
  );
}
