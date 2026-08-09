import type { EvaluatedOffer, OfferColor } from "./search-evaluation";

export type ResultSortKey =
  | "offer"
  | "reference"
  | "difference"
  | "deviation"
  | "title";

export type ResultSortDirection = "asc" | "desc";

export const DEFAULT_RESULT_SORT: {
  key: ResultSortKey;
  direction: ResultSortDirection;
} = {
  key: "deviation",
  direction: "asc",
};

const COLOR_ORDER: Record<OfferColor, number> = {
  green: 0,
  yellow: 1,
  orange: 2,
  red: 3,
  unknown: 4,
};

export function isResultSortKey(value: unknown): value is ResultSortKey {
  return ["offer", "reference", "difference", "deviation", "title"].includes(
    String(value),
  );
}

export function isResultSortDirection(
  value: unknown,
): value is ResultSortDirection {
  return value === "asc" || value === "desc";
}

function numericSortValue(offer: EvaluatedOffer, key: ResultSortKey) {
  if (key === "offer") return offer.priceCents;
  if (key === "reference") return offer.referenceCents;
  if (key === "difference") {
    return offer.differenceCents === null ? null : -offer.differenceCents;
  }
  if (key === "deviation") return offer.deviationPercent;
  return null;
}

function compareNullableNumbers(
  left: number | null,
  right: number | null,
  direction: ResultSortDirection,
) {
  if (left === null && right === null) return 0;
  if (left === null) return 1;
  if (right === null) return -1;
  return direction === "asc" ? left - right : right - left;
}

export function sortOffersInColorGroups(
  offers: EvaluatedOffer[],
  key: ResultSortKey,
  direction: ResultSortDirection,
) {
  return [...offers].sort((left, right) => {
    const colorComparison = COLOR_ORDER[left.color] - COLOR_ORDER[right.color];
    if (colorComparison) return colorComparison;

    const fieldComparison =
      key === "title"
        ? left.title.localeCompare(right.title, "de", {
            sensitivity: "base",
          }) * (direction === "asc" ? 1 : -1)
        : compareNullableNumbers(
            numericSortValue(left, key),
            numericSortValue(right, key),
            direction,
          );
    if (fieldComparison) return fieldComparison;

    return (
      left.title.localeCompare(right.title, "de", { sensitivity: "base" }) ||
      left.id.localeCompare(right.id)
    );
  });
}
