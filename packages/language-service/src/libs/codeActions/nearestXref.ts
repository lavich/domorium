/** A transposition and a doubled character each cost two. See #249. */
const MAX_DISTANCE = 2;

/**
 * The candidate the reader would have written, or nothing. Applying a
 * replacement attaches one record to another and the document then validates
 * clean, so a tie must yield nothing rather than a guess.
 */
export function nearestXref(
  xref: string,
  candidates: string[],
): string | undefined {
  let nearest: string | undefined;
  let nearestDistance = MAX_DISTANCE + 1;
  let tied = false;

  for (const candidate of candidates) {
    // The limit is the best distance rather than one below it, so a candidate
    // equal to the best is still measured and the tie is seen.
    const distance = distanceAtMost(
      xref,
      candidate,
      Math.min(nearestDistance, MAX_DISTANCE),
    );
    if (distance === undefined || distance === 0) {
      continue;
    }
    if (distance < nearestDistance) {
      nearest = candidate;
      nearestDistance = distance;
      tied = false;
    } else if (distance === nearestDistance) {
      tied = true;
    }
  }

  return tied ? undefined : nearest;
}

function distanceAtMost(
  left: string,
  right: string,
  limit: number,
): number | undefined {
  if (Math.abs(left.length - right.length) > limit) {
    return undefined;
  }

  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let row = 1; row <= left.length; row += 1) {
    const current = [row];
    let rowMinimum = row;
    for (let column = 1; column <= right.length; column += 1) {
      const substitution =
        previous[column - 1] + (left[row - 1] === right[column - 1] ? 0 : 1);
      current[column] = Math.min(
        substitution,
        previous[column] + 1,
        current[column - 1] + 1,
      );
      rowMinimum = Math.min(rowMinimum, current[column]);
    }
    // Every alignment through this row already costs more than the limit, so
    // the candidate cannot beat it however the remaining rows go.
    if (rowMinimum > limit) {
      return undefined;
    }
    previous = current;
  }

  const distance = previous[right.length];
  return distance <= limit ? distance : undefined;
}
