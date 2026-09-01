(() => {
  "use strict";

  const root = document.documentElement;
  const storageKey = "zhirong-peng-theme";
  const validTheme = value => value === "light" || value === "dark";
  let savedTheme;
  try { savedTheme = localStorage.getItem(storageKey); } catch {}
  const requestedTheme = new URL(location.href).searchParams.get("theme");
  const initialTheme = validTheme(requestedTheme) ? requestedTheme : validTheme(savedTheme) ? savedTheme : "light";

  function applyTheme(theme, persist = true) {
    if (!validTheme(theme)) return;
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
    if (persist) {
      try { localStorage.setItem(storageKey, theme); } catch {}
    }
    const color = document.querySelector('meta[name="theme-color"]');
    if (color) color.content = theme === "dark" ? "#151f19" : "#f7f7f2";
    window.dispatchEvent(new CustomEvent("themechange", { detail: theme }));
  }

  applyTheme(initialTheme, false);
  window.SitePreferences = Object.freeze({
    getTheme: () => root.dataset.theme,
    setTheme: theme => applyTheme(theme),
    pageHref: (href, options = {}) => {
      const url = new URL(href, location.href);
      url.searchParams.set("theme", root.dataset.theme);
      if (options.hash !== undefined) url.hash = options.hash;
      if (options.filter && options.filter !== "all") url.searchParams.set("filter", options.filter);
      return url.href;
    }
  });
})();
