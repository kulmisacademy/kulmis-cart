/* Legacy reference — theme is applied via SSR cookie + lib/server-theme.ts (see lib/theme-cookie.ts). */
(function () {
  try {
    var k = "kulmiscart-theme";
    var t = localStorage.getItem(k);
    if (t !== "light" && t !== "dark" && t !== "system") t = "system";
    var d =
      t === "dark" || (t === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    if (d) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  } catch {
    /* ignore */
  }
})();
