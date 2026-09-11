import type { SitePath } from "./paths";
import {
  CARD_HEIGHT,
  CARD_WIDTH,
  cardOf,
  SHOT_HEIGHT,
  SHOT_WIDTH,
  shotsOf,
  type Shot,
} from "./shots";

/**
 * The poster is a second element rather than the `<video>`'s own: CSS can hide
 * a video for a reader who asked for stillness, but it cannot pause one.
 */
function Frame({ shot }: { shot: Shot }) {
  const src = `/shots/${shot.name}`;
  const size = { width: SHOT_WIDTH, height: SHOT_HEIGHT };

  if (!shot.motion) {
    return (
      <img
        {...size}
        src={`${src}.webp`}
        alt={shot.alt}
        loading="lazy"
        decoding="async"
        className="block w-full"
      />
    );
  }

  return (
    <>
      <video
        {...size}
        poster={`${src}.webp`}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-label={shot.alt}
        className="block w-full motion-reduce:hidden"
      >
        <source src={`${src}.webm`} type="video/webm" />
        <source src={`${src}.mp4`} type="video/mp4" />
      </video>
      <img
        {...size}
        src={`${src}.webp`}
        alt={shot.alt}
        decoding="async"
        className="hidden w-full motion-reduce:block"
      />
    </>
  );
}

const frame = {
  background: "var(--mock-surface)",
  border: "1px solid var(--mock-line)",
};

export function PlaceWindow({ path }: { path: SitePath }) {
  const [first] = shotsOf(path);
  if (!first) {
    return null;
  }

  return (
    <div className="editor-mock overflow-hidden rounded-xl" style={frame}>
      <img
        width={SHOT_WIDTH}
        height={SHOT_HEIGHT}
        src={`/shots/${first.name}.webp`}
        alt={first.alt}
        loading="lazy"
        decoding="async"
        className="block w-full"
      />
    </div>
  );
}

export function PlaceDetail({ path }: { path: SitePath }) {
  const card = cardOf(path);
  if (!card) {
    return null;
  }

  return (
    <div className="editor-mock overflow-hidden rounded-xl" style={frame}>
      <img
        width={CARD_WIDTH}
        height={CARD_HEIGHT}
        src={`/shots/${card.name}.webp`}
        alt={card.alt}
        loading="lazy"
        decoding="async"
        className="block w-full"
      />
    </div>
  );
}

export function Photographs({ path, name }: { path: SitePath; name: string }) {
  const shots = shotsOf(path);
  if (shots.length === 0) {
    return null;
  }

  const group = `${name.toLowerCase().replace(/\W+/g, "-")}-frames`;

  return (
    <div>
      {shots.map((shot, index) => (
        <input
          key={shot.name}
          type="radio"
          name={group}
          id={`${shot.name}-pick`}
          defaultChecked={index === 0}
          aria-label={`Frame ${index + 1} of ${shots.length}: ${shot.caption}`}
          className="shots-pick sr-only"
        />
      ))}

      <div
        className="shots-window editor-mock overflow-hidden rounded-xl"
        style={frame}
      >
        <ol className="shots-track flex">
          {shots.map((shot, index) => (
            <li key={shot.name} className="w-full shrink-0">
              <figure>
                <Frame shot={shot} />
                <figcaption
                  className="flex items-baseline gap-2 px-3 py-2 text-[0.72rem] leading-snug"
                  style={{
                    borderTop: "1px solid var(--mock-line)",
                    color: "var(--mock-dim)",
                  }}
                >
                  <span className="font-mono">
                    {index + 1}/{shots.length}
                  </span>
                  <span>{shot.caption}</span>
                </figcaption>
              </figure>
            </li>
          ))}
        </ol>
      </div>

      <ol className="shots-dots mt-3 flex items-center justify-center gap-1.5">
        {shots.map((shot, index) => (
          <li key={shot.name}>
            <label
              htmlFor={`${shot.name}-pick`}
              className="flex size-7 cursor-pointer items-center justify-center rounded-full border font-mono text-[0.7rem] text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              {index + 1}
            </label>
          </li>
        ))}
      </ol>
    </div>
  );
}
