// static/js/editor-injector.js (Versión Capa Única Blindada)
(function () {
  let selectedElement = null;
  let activeParentContainer = null;
  let currentFilePath = "";
  let currentElementId = "";
  let currentChildTag = "";
  let currentChildIndex = 0;
  let isEditing = false;

  const style = document.createElement("style");
  style.innerHTML = `
        [data-editable]:hover, [data-editable] *:hover { outline: 2px dashed #3b82f6 !important; cursor: pointer; outline-offset: -1px; }
        .editor-selected { outline: 2px solid #2563eb !important; outline-offset: -1px; }
    `;
  document.head.appendChild(style);

  const sidebar = document.getElementById("visual-editor-sidebar");
  if (!sidebar) return;

  const classInput = sidebar.querySelector("#ed-class-input");
  const fileInfo = sidebar.querySelector("#ed-file-info");
  const saveBtn = sidebar.querySelector("#ed-save-btn");
  const statusMsg = sidebar.querySelector("#ed-status-msg");

  function sortMasterCssClasses(classString) {
    if (!classString) return "";
    const classes = classString
      .split(" ")
      .map((c) => c.trim())
      .filter(Boolean);
    const estructura = [],
      dimensiones = [],
      espaciados = [],
      visuales = [];
    classes.forEach((cls) => {
      const cleanCls = cls.toLowerCase();
      if (/^(p|m)[a-z-]*:/.test(cleanCls)) espaciados.push(cls);
      else if (/^(w|h|max-w|min-w|max-h|min-h):/.test(cleanCls)) dimensiones.push(cls);
      else if (/^(d|flex|jc|ai|gap|grid|cols|rows|inline):/.test(cleanCls)) estructura.push(cls);
      else visuales.push(cls);
    });
    return [...estructura, ...dimensiones, ...espaciados, ...visuales].join(" ");
  }

  function applyMultitoneHighlight() {
    let text = classInput.innerText.trim();
    if (!text) return;

    text = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    const highlighted = text.replace(/([a-zA-Z0-9\-\(\)\.\,\/]+:)([a-zA-Z0-9\-\|\.\,\%\#\(\)\@\:\>]+)/g, function (match, prefix, value) {
      const cleanPrefix = prefix.trim().toLowerCase();
      if (/^(p|m)[a-z-]*:$/.test(cleanPrefix)) return `<span class="mcss-spacing">${prefix}</span><span class="mcss-value">${value}</span>`;
      if (/^(w|h|max-w|min-w|max-h|min-h):$/.test(cleanPrefix)) return `<span class="mcss-dimension">${prefix}</span><span class="mcss-value">${value}</span>`;
      if (/^(d|flex|jc|ai|gap|grid|cols|rows|inline):$/.test(cleanPrefix)) return `<span class="mcss-struct">${prefix}</span><span class="mcss-value">${value}</span>`;
      return `<span class="mcss-prefix">${prefix}</span><span class="mcss-value">${value}</span>`;
    });

    classInput.innerHTML = highlighted;
    isEditing = false;
  }

  classInput.addEventListener("focus", function () {
    if (!isEditing) {
      isEditing = true;
      const rawText = classInput.innerText;
      classInput.innerHTML = "";
      classInput.innerText = rawText;
    }
  });

  classInput.addEventListener("blur", function () {
    const cleanOrdered = sortMasterCssClasses(classInput.innerText.trim());
    classInput.innerHTML = "";
    classInput.innerText = cleanOrdered;
    applyMultitoneHighlight();
  });

  function updateEditorWithElement(element, parent) {
    if (selectedElement) selectedElement.classList.remove("editor-selected");
    selectedElement = element;
    activeParentContainer = parent;
    selectedElement.classList.add("editor-selected");

    const meta = activeParentContainer.getAttribute("data-editable").split(":");
    currentFilePath = meta[0];
    currentElementId = meta[1];

    if (selectedElement === activeParentContainer) {
      currentChildTag = "";
      currentChildIndex = 0;
      fileInfo.innerText = currentElementId;
    } else {
      currentChildTag = selectedElement.tagName.toLowerCase();
      const allSameTypeInParent = Array.from(activeParentContainer.querySelectorAll(currentChildTag));
      currentChildIndex = allSameTypeInParent.indexOf(selectedElement);
      fileInfo.innerText = `${currentElementId} > ${currentChildTag} [${currentChildIndex}]`;
    }

    let sortedClasses = sortMasterCssClasses(selectedElement.className.replace("editor-selected", "").trim());

    classInput.innerHTML = "";
    classInput.innerText = sortedClasses;
    applyMultitoneHighlight();

    sidebar.style.right = "20px";
  }

  document.addEventListener(
    "click",
    function (e) {
      const parentTarget = e.target.closest("[data-editable]");
      if (!parentTarget) {
        if (!e.target.closest("#visual-editor-sidebar")) {
          sidebar.style.right = "-480px";
          if (selectedElement) selectedElement.classList.remove("editor-selected");
          selectedElement = null;
          activeParentContainer = null;
        }
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      updateEditorWithElement(e.target, parentTarget);
    },
    true,
  );

  document.addEventListener("keydown", function (e) {
    if (!selectedElement || !activeParentContainer) return;
    if (document.activeElement === classInput) return;

    if (e.key === "ArrowDown") {
      const firstChild = selectedElement.firstElementChild;
      if (firstChild) {
        e.preventDefault();
        updateEditorWithElement(firstChild, activeParentContainer);
      }
    } else if (e.key === "ArrowUp") {
      if (selectedElement !== activeParentContainer) {
        e.preventDefault();
        updateEditorWithElement(selectedElement.parentElement, activeParentContainer);
      }
    }
  });

  classInput.addEventListener("input", function () {
    if (!selectedElement) return;
    selectedElement.className = (classInput.innerText.trim() + " editor-selected").trim();
  });

  saveBtn.addEventListener("click", function () {
    if (!selectedElement) return;
    statusMsg.innerText = "Guardando en plantilla...";
    statusMsg.style.color = "#1e293b";

    const cleanOrderedClasses = sortMasterCssClasses(classInput.innerText.trim());
    classInput.innerHTML = "";
    classInput.innerText = cleanOrderedClasses;
    applyMultitoneHighlight();

    const payload = {
      filePath: currentFilePath,
      elementId: currentElementId,
      childTag: currentChildTag,
      childIndex: currentChildIndex,
      newClasses: cleanOrderedClasses,
    };

    fetch("http://localhost:3000/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          statusMsg.innerText = "✓ ¡Plantilla guardada ordenada!";
          statusMsg.style.color = "#16a34a";
          setTimeout(() => {
            statusMsg.innerText = "";
          }, 3000);
        } else {
          statusMsg.innerText = `❌ Error: ${data.error}`;
          statusMsg.style.color = "#dc2626";
        }
      })
      .catch((err) => {
        statusMsg.innerText = "❌ Error de comunicación.";
        statusMsg.style.color = "#dc2626";
      });
  });

  classInput.addEventListener("keydown", function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
      e.preventDefault();
      saveBtn.click();
      sidebar.style.right = "-480px";
      if (selectedElement) selectedElement.classList.remove("editor-selected");
      selectedElement = null;
      activeParentContainer = null;
    }
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      if (sidebar.style.right === "0px" || sidebar.style.right === "20px") {
        e.preventDefault();
        if (selectedElement && classInput) {
          window.location.reload();
          return;
        }
        sidebar.style.right = "-480px";
        if (selectedElement) selectedElement.classList.remove("editor-selected");
        selectedElement = null;
        activeParentContainer = null;
      }
    }
  });
})();
