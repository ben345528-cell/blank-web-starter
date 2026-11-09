const root = document.documentElement;
const themeToggle = document.querySelector("#themeToggle");
const savedTheme = localStorage.getItem("starter-theme");

if (savedTheme === "light") root.classList.add("light");

themeToggle?.addEventListener("click", () => {
  root.classList.toggle("light");
  const theme = root.classList.contains("light") ? "light" : "dark";
  localStorage.setItem("starter-theme", theme);
  themeToggle.textContent = theme === "light" ? "☾" : "☼";
  themeToggle.setAttribute("aria-label", theme === "light" ? "فعال‌کردن حالت تاریک" : "فعال‌کردن حالت روشن");
});

if (root.classList.contains("light") && themeToggle) {
  themeToggle.textContent = "☾";
  themeToggle.setAttribute("aria-label", "فعال‌کردن حالت تاریک");
}

const year = document.querySelector("#year");
if (year) year.textContent = new Date().getFullYear();