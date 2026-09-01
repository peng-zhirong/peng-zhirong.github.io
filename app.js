(() => {
  "use strict";

  document.documentElement.classList.add("has-js");
  const chinese = document.documentElement.lang.startsWith("zh");
  const words = chinese ? {
    requestCv: "索取简历", downloadCv: "下载简历", copied: "已复制邮箱",
    copySuccess: "邮箱地址已复制到剪贴板。", copyFallback: "请选中邮箱地址复制",
    copyUnavailable: "暂时无法访问剪贴板，请选中上方邮箱地址复制。",
    dark: "切换为深色背景", light: "切换为浅色背景", theme: "深色背景"
  } : {
    requestCv: "Request CV", downloadCv: "Download CV", copied: "Email copied",
    copySuccess: "Email address copied to clipboard.", copyFallback: "Select the email to copy",
    copyUnavailable: "Clipboard access is unavailable. Select the email address above to copy it.",
    dark: "Switch to dark background", light: "Switch to light background", theme: "Dark background"
  };

  const menuButton = document.querySelector(".menu-toggle");
  const navigation = document.querySelector(".main-nav");
  menuButton.hidden = false;
  const closeMenu = () => {
    menuButton.setAttribute("aria-expanded", "false");
    navigation.classList.remove("is-open");
  };
  menuButton.addEventListener("click", () => {
    const expanded = menuButton.getAttribute("aria-expanded") !== "true";
    menuButton.setAttribute("aria-expanded", String(expanded));
    navigation.classList.toggle("is-open", expanded);
    if (expanded) navigation.querySelector("a").focus();
  });
  navigation.addEventListener("click", event => {
    if (event.target.closest("a")) closeMenu();
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && menuButton.getAttribute("aria-expanded") === "true") {
      closeMenu();
      menuButton.focus();
    }
  });
  document.addEventListener("click", event => {
    if (!event.target.closest(".site-header")) closeMenu();
  });

  const languageLink = document.querySelector("[data-language-page]");
  const publications = [...document.querySelectorAll(".publication-item")];
  const filters = [...document.querySelectorAll("[data-filter]")];
  const publicationCount = document.getElementById("publication-count");
  const publicationToolbar = document.querySelector(".publication-toolbar");
  let currentFilter = "all";
  const pageLinks = [...document.querySelectorAll('a[href]')].filter(link => {
    const href = link.getAttribute("href");
    return !link.hasAttribute("data-language-page") && !href.startsWith("#") && !/^[a-z][a-z\d+.-]*:/i.test(href) && /\.html(?:[?#]|$)/.test(href);
  });
  pageLinks.forEach(link => link.dataset.route = link.getAttribute("href"));

  function updateLanguageLink() {
    if (!languageLink) return;
    languageLink.href = window.SitePreferences.pageHref(languageLink.dataset.languagePage, {
      hash: location.hash,
      filter: publications.length ? currentFilter : "all"
    });
  }

  function updateThemeControls() {
    const theme = window.SitePreferences.getTheme();
    const button = document.getElementById("theme-toggle");
    button.hidden = false;
    button.setAttribute("aria-checked", String(theme === "dark"));
    button.setAttribute("aria-label", words.theme);
    button.title = theme === "dark" ? words.light : words.dark;
    pageLinks.forEach(link => {
      link.href = window.SitePreferences.pageHref(link.dataset.route);
    });
    const fallback = document.getElementById("lattice-fallback");
    if (fallback) fallback.src = theme === "dark" ? fallback.dataset.darkSrc : fallback.dataset.lightSrc;
    updateLanguageLink();
  }
  document.getElementById("theme-toggle").addEventListener("click", () => {
    const theme = window.SitePreferences.getTheme() === "dark" ? "light" : "dark";
    window.SitePreferences.setTheme(theme);
    const url = new URL(location.href);
    url.searchParams.set("theme", theme);
    try { history.replaceState(null, "", url.href); } catch {}
  });
  window.addEventListener("themechange", updateThemeControls);
  window.addEventListener("hashchange", updateLanguageLink);

  function filterPublications(filter, reflectInUrl = false) {
    currentFilter = filter;
    let visibleCount = 0;
    publications.forEach(item => {
      const visible = filter === "all" || item.dataset.type === filter;
      item.hidden = !visible;
      if (visible) visibleCount += 1;
    });
    filters.forEach(button => button.setAttribute("aria-pressed", String(button.dataset.filter === filter)));
    publicationCount.textContent = chinese ? `显示 ${visibleCount} 项，共 ${publications.length} 项` : `${visibleCount} of ${publications.length} entries`;
    if (reflectInUrl) {
      const url = new URL(location.href);
      if (filter === "all") url.searchParams.delete("filter");
      else url.searchParams.set("filter", filter);
      const highlighted = publications.find(item => `#${item.id}` === url.hash);
      if (highlighted?.hidden) url.hash = "";
      try { history.replaceState(null, "", url.href); } catch {}
    }
    updateLanguageLink();
  }
  if (publicationToolbar && publicationCount) {
    publicationToolbar.hidden = false;
    filters.forEach(button => button.addEventListener("click", () => filterPublications(button.dataset.filter, true)));
    const revealLinkedPublication = () => {
      const target = publications.find(item => `#${item.id}` === location.hash);
      if (!target) return;
      if (target.hidden) filterPublications(target.dataset.type);
      requestAnimationFrame(() => target.scrollIntoView({ behavior: "instant", block: "start" }));
    };
    const requestedFilter = new URL(location.href).searchParams.get("filter");
    filterPublications(filters.some(button => button.dataset.filter === requestedFilter) ? requestedFilter : "all");
    revealLinkedPublication();
    window.addEventListener("hashchange", revealLinkedPublication);
    window.addEventListener("pageshow", event => {
      if (event.persisted) revealLinkedPublication();
    });
    window.addEventListener("popstate", () => {
      const requested = new URL(location.href).searchParams.get("filter");
      filterPublications(filters.some(button => button.dataset.filter === requested) ? requested : "all");
      revealLinkedPublication();
    });
  }

  const links = window.SITE_LINKS || {};
  const isHttpsUrl = value => {
    try { return new URL(value).protocol === "https:"; } catch { return false; }
  };
  document.querySelectorAll("[data-social-link]").forEach(link => {
    const value = links[link.dataset.socialLink];
    if (!isHttpsUrl(value)) return;
    const url = new URL(value);
    if (link.dataset.socialLink === "scholar") url.searchParams.set("hl", chinese ? "zh-CN" : "en");
    link.href = url.href;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.hidden = false;
  });
  const localCv = typeof links.cv === "string" && /^assets\/[a-zA-Z0-9_./-]+\.pdf$/.test(links.cv) && !links.cv.includes("..");
  document.querySelectorAll("[data-cv-link]").forEach(link => {
    link.querySelector("[data-cv-label]").textContent = words.requestCv;
    if (!localCv && !isHttpsUrl(links.cv)) return;
    link.href = localCv && chinese ? `../${links.cv}` : links.cv;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    if (localCv) link.setAttribute("download", "Zhirong_Peng_CV.pdf");
    link.querySelector("[data-cv-label]").textContent = words.downloadCv;
  });

  const copyButton = document.getElementById("copy-email");
  const copyLabel = document.getElementById("copy-email-label");
  const copyStatus = document.getElementById("copy-status");
  if (window.isSecureContext && navigator.clipboard?.writeText) {
    copyButton.hidden = false;
    copyButton.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText("zhirong.peng@connect.ust.hk");
        copyLabel.textContent = words.copied;
        copyStatus.textContent = words.copySuccess;
      } catch {
        copyLabel.textContent = words.copyFallback;
        copyStatus.textContent = words.copyUnavailable;
      }
    });
  }

  updateThemeControls();
  document.getElementById("copyright-year").textContent = String(new Date().getFullYear());
})();
