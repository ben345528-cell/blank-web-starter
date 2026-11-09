(() => {
  "use strict";

  const root = document.documentElement;
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

  function readStorage(key, fallback = "") {
    try {
      const value = localStorage.getItem(key);
      return value === null ? fallback : value;
    } catch {
      return fallback;
    }
  }

  function writeStorage(key, value) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  }

  function removeStorage(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  }

  // Theme
  const themeToggle = $("#themeToggle");
  const savedTheme = readStorage("paida-theme", "dark");
  if (savedTheme === "light") root.classList.add("light");

  function updateThemeButton() {
    if (!themeToggle) return;
    const lightMode = root.classList.contains("light");
    themeToggle.textContent = lightMode ? "☾" : "☼";
    themeToggle.setAttribute(
      "aria-label",
      lightMode ? "فعال‌کردن حالت تاریک" : "فعال‌کردن حالت روشن"
    );
  }

  updateThemeButton();
  themeToggle?.addEventListener("click", () => {
    root.classList.toggle("light");
    writeStorage("paida-theme", root.classList.contains("light") ? "light" : "dark");
    updateThemeButton();
  });

  // Toast messages
  const toast = $("#toast");
  let toastTimeout = null;

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("is-visible");
    window.clearTimeout(toastTimeout);
    toastTimeout = window.setTimeout(() => toast.classList.remove("is-visible"), 2600);
  }

  async function copyToClipboard(value) {
    if (!value) {
      showToast("چیزی برای کپی‌کردن وجود ندارد.");
      return false;
    }

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(value);
      } else {
        const temporary = document.createElement("textarea");
        temporary.value = value;
        temporary.setAttribute("readonly", "");
        temporary.style.position = "fixed";
        temporary.style.opacity = "0";
        document.body.appendChild(temporary);
        temporary.select();
        const copied = document.execCommand("copy");
        temporary.remove();
        if (!copied) throw new Error("Copy command failed");
      }
      showToast("با موفقیت کپی شد.");
      return true;
    } catch {
      showToast("کپی خودکار در این مرورگر در دسترس نیست.");
      return false;
    }
  }

  // Search and category filters
  const searchInput = $("#toolSearch");
  const toolCards = $$(".tool-card");
  const filterButtons = $$(".filter-chip");
  const visibleCount = $("#visibleCount");
  const emptyState = $("#emptyState");
  let activeFilter = "all";

  function normalizeText(value) {
    return String(value || "")
      .toLocaleLowerCase("fa")
      .replace(/[يى]/g, "ی")
      .replace(/ك/g, "ک")
      .trim();
  }

  function updateToolList() {
    const query = normalizeText(searchInput?.value || "");
    let visible = 0;

    toolCards.forEach(card => {
      const categoryMatches = activeFilter === "all" || card.dataset.category === activeFilter;
      const haystack = normalizeText(
        (card.dataset.search || "") + " " + (card.textContent || "")
      );
      const queryMatches = !query || haystack.includes(query);
      const show = categoryMatches && queryMatches;
      card.hidden = !show;
      if (show) visible += 1;
    });

    if (visibleCount) visibleCount.textContent = visible.toLocaleString("fa-IR");
    if (emptyState) emptyState.hidden = visible !== 0;
  }

  searchInput?.addEventListener("input", updateToolList);

  filterButtons.forEach(button => {
    button.addEventListener("click", () => {
      activeFilter = button.dataset.filter || "all";
      filterButtons.forEach(item => {
        const selected = item === button;
        item.classList.toggle("is-selected", selected);
        item.setAttribute("aria-pressed", String(selected));
      });
      updateToolList();
    });
  });

  $("#clearSearch")?.addEventListener("click", () => {
    if (searchInput) searchInput.value = "";
    activeFilter = "all";
    filterButtons.forEach(button => {
      const selected = button.dataset.filter === "all";
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    updateToolList();
    searchInput?.focus();
  });

  document.addEventListener("keydown", event => {
    const tag = event.target?.tagName?.toLowerCase();
    const typing = tag === "input" || tag === "textarea" || event.target?.isContentEditable;
    if (event.key === "/" && !typing && !$("#toolDialog")?.open) {
      event.preventDefault();
      searchInput?.focus();
    }
  });

  // Tool dialog and workspace switching
  const dialog = $("#toolDialog");
  const dialogTitle = $("#dialogTitle");
  const dialogCategory = $("#dialogCategory");
  const dialogIcon = $("#dialogIcon");
  const toolMetadata = {
    text: { title: "متن‌یار", category: "متن و نوشتار", icon: "Aa" },
    notes: { title: "یادداشت سریع", category: "بهره‌وری", icon: "✎" },
    json: { title: "مرتب‌ساز JSON", category: "توسعه", icon: "{ }" },
    timer: { title: "تایمر تمرکز", category: "بهره‌وری", icon: "◷" }
  };

  function openTool(toolId) {
    const metadata = toolMetadata[toolId];
    const panel = $("[data-panel='" + toolId + "']");
    if (!metadata || !panel || !dialog) return;

    $$("[data-panel]", dialog).forEach(item => { item.hidden = item !== panel; });
    if (dialogTitle) dialogTitle.textContent = metadata.title;
    if (dialogCategory) dialogCategory.textContent = metadata.category;
    if (dialogIcon) dialogIcon.textContent = metadata.icon;

    if (typeof dialog.showModal === "function") {
      if (!dialog.open) dialog.showModal();
    } else {
      dialog.setAttribute("open", "");
    }

    if (toolId === "text") updateTextStats();
    if (toolId === "notes") updateNoteStatus();
    if (toolId === "timer") updateTimerUI();
  }

  $$("[data-open]").forEach(button => {
    button.addEventListener("click", () => openTool(button.dataset.open));
  });

  $("#closeDialog")?.addEventListener("click", () => {
    if (dialog?.open && typeof dialog.close === "function") dialog.close();
    else dialog?.removeAttribute("open");
  });

  dialog?.addEventListener("click", event => {
    if (event.target === dialog) {
      if (typeof dialog.close === "function") dialog.close();
      else dialog.removeAttribute("open");
    }
  });

  // Text helper
  const textInput = $("#textInput");
  const charCount = $("#charCount");
  const wordCount = $("#wordCount");
  const lineCount = $("#lineCount");

  function updateTextStats() {
    const value = textInput?.value || "";
    const words = value.trim() ? value.trim().split(/\s+/u).length : 0;
    if (charCount) charCount.textContent = Array.from(value).length.toLocaleString("fa-IR");
    if (wordCount) wordCount.textContent = words.toLocaleString("fa-IR");
    if (lineCount) lineCount.textContent = (value ? value.split(/\r\n|\r|\n/).length : 0).toLocaleString("fa-IR");
  }

  textInput?.addEventListener("input", updateTextStats);
  $("#copyText")?.addEventListener("click", () => copyToClipboard(textInput?.value || ""));
  $("#cleanText")?.addEventListener("click", () => {
    if (!textInput) return;
    textInput.value = textInput.value
      .replace(/[ \t]+/g, " ")
      .replace(/[ \t]*\n[ \t]*/g, "\n")
      .trim();
    updateTextStats();
    showToast("فاصله‌های اضافی مرتب شدند.");
  });
  $("#clearText")?.addEventListener("click", () => {
    if (textInput) textInput.value = "";
    updateTextStats();
    textInput?.focus();
  });

  // Quick notes: saved only in this browser
  const noteEditor = $("#noteEditor");
  const noteStatus = $("#noteStatus");
  const noteLength = $("#noteLength");
  const NOTE_KEY = "paida-quick-note";
  let noteSaveTimeout = null;

  if (noteEditor) noteEditor.value = readStorage(NOTE_KEY, "");

  function updateNoteStatus(message) {
    if (noteLength) {
      noteLength.textContent = (noteEditor?.value.length || 0).toLocaleString("fa-IR") + " نویسه";
    }
    if (noteStatus && message) noteStatus.textContent = message;
    else if (noteStatus) noteStatus.textContent = "ذخیره‌شده در این مرورگر";
  }

  noteEditor?.addEventListener("input", () => {
    updateNoteStatus("در حال ذخیره...");
    window.clearTimeout(noteSaveTimeout);
    noteSaveTimeout = window.setTimeout(() => {
      const saved = writeStorage(NOTE_KEY, noteEditor.value);
      updateNoteStatus(saved ? "ذخیره شد" : "ذخیره‌سازی در این مرورگر در دسترس نیست");
    }, 220);
  });

  $("#clearNote")?.addEventListener("click", () => {
    if (!noteEditor) return;
    if (!window.confirm("یادداشت فعلی پاک شود؟")) return;
    window.clearTimeout(noteSaveTimeout);
    noteEditor.value = "";
    const removed = removeStorage(NOTE_KEY);
    updateNoteStatus(removed ? "یادداشت پاک شد" : "یادداشت از صفحه پاک شد");
    showToast("یادداشت پاک شد.");
  });

  // JSON formatter and validator
  const jsonInput = $("#jsonInput");
  const jsonOutput = $("#jsonOutput");

  function processJson(compact) {
    if (!jsonInput || !jsonOutput) return;
    const source = jsonInput.value.trim();
    if (!source) {
      jsonOutput.textContent = "ابتدا یک کد JSON وارد کن.";
      delete jsonOutput.dataset.copyable;
      return;
    }

    try {
      const parsed = JSON.parse(source);
      const formatted = JSON.stringify(parsed, null, compact ? 0 : 2);
      jsonOutput.textContent = formatted;
      jsonOutput.dataset.copyable = formatted;
      showToast("ساختار JSON معتبر است.");
    } catch (error) {
      jsonOutput.textContent = "JSON معتبر نیست: " + error.message;
      delete jsonOutput.dataset.copyable;
      showToast("ساختار JSON نیاز به بررسی دارد.");
    }
  }

  $("#formatJson")?.addEventListener("click", () => processJson(false));
  $("#minifyJson")?.addEventListener("click", () => processJson(true));
  $("#copyJson")?.addEventListener("click", () => {
    copyToClipboard(jsonOutput?.dataset.copyable || "");
  });

  // 25-minute focus timer
  const TIMER_TOTAL = 25 * 60;
  let timerRemaining = TIMER_TOTAL;
  let timerInterval = null;
  const timerDisplay = $("#timerDisplay");
  const timerState = $("#timerState");
  const timerProgress = $("#timerProgress");
  const timerStart = $("#timerStart");

  function updateTimerUI() {
    const minutes = Math.floor(timerRemaining / 60);
    const seconds = timerRemaining % 60;
    if (timerDisplay) {
      timerDisplay.textContent = String(minutes).padStart(2, "0") + ":" + String(seconds).padStart(2, "0");
    }
    if (timerState) {
      timerState.textContent = timerRemaining === 0
        ? "زمان تمام شد"
        : timerInterval
          ? "در حال تمرکز"
          : timerRemaining === TIMER_TOTAL ? "آماده‌ای؟" : "متوقف شده";
    }
    if (timerProgress) {
      const progress = ((TIMER_TOTAL - timerRemaining) / TIMER_TOTAL) * 100;
      timerProgress.style.width = Math.max(0, Math.min(100, progress)) + "%";
    }
    if (timerStart) {
      timerStart.textContent = timerInterval
        ? "توقف موقت"
        : timerRemaining === TIMER_TOTAL ? "شروع تمرکز" : "ادامه تمرکز";
    }
  }

  function pauseTimer() {
    if (timerInterval !== null) {
      window.clearInterval(timerInterval);
      timerInterval = null;
    }
    updateTimerUI();
  }

  timerStart?.addEventListener("click", () => {
    if (timerInterval !== null) {
      pauseTimer();
      return;
    }
    if (timerRemaining <= 0) {
      showToast("زمان تمام شده؛ تایمر را از نو شروع کن.");
      return;
    }
    timerInterval = window.setInterval(() => {
      timerRemaining = Math.max(0, timerRemaining - 1);
      updateTimerUI();
      if (timerRemaining === 0) {
        pauseTimer();
        showToast("آفرین! بازه تمرکزت به پایان رسید.");
      }
    }, 1000);
    updateTimerUI();
  });

  $("#timerReset")?.addEventListener("click", () => {
    pauseTimer();
    timerRemaining = TIMER_TOTAL;
    updateTimerUI();
    showToast("تایمر برای ۲۵ دقیقه آماده شد.");
  });

  // Footer year
  const year = $("#year");
  if (year) year.textContent = new Date().getFullYear().toLocaleString("fa-IR");

  updateToolList();
  updateTextStats();
  updateNoteStatus();
  updateTimerUI();
})();