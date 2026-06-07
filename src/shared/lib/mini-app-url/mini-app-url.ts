export type MiniAppTab = "recipes" | "week" | "shop";

export function readActiveTabFromUrl(): MiniAppTab {
  if (typeof window === "undefined") {
    return "recipes";
  }

  const value = new URLSearchParams(window.location.search).get("tab");
  return isTab(value) ? value : "recipes";
}

export function readFamilyOpenFromUrl() {
  if (typeof window === "undefined") {
    return false;
  }

  return new URLSearchParams(window.location.search).get("screen") === "family";
}

export function updateMiniAppUrl(updateSearchParams: (searchParams: URLSearchParams) => void) {
  const url = new URL(window.location.href);
  updateSearchParams(url.searchParams);
  window.history.pushState(null, "", `${url.pathname}${url.search}${url.hash}`);
}

export function isTab(value: string | null): value is MiniAppTab {
  return value === "recipes" || value === "week" || value === "shop";
}
