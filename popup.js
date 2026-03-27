let currentPilgrimCount = 2;

function createPilgrimCard(index, data = {}) {
  const num = index + 1;
  const card = document.createElement("div");
  card.className = "pilgrim-card";
  card.dataset.index = index;

  // Use datalist so user can pick a suggestion OR type the exact TTD value
  card.innerHTML = `
    <datalist id="genderList-${index}">
      <option value="Male"></option><option value="Female"></option><option value="Transgender"></option>
    </datalist>
    <datalist id="idProofList-${index}">
      <option value="Aadhaar Card"></option><option value="Aadhar Card"></option>
      <option value="PAN Card"></option><option value="Passport"></option>
      <option value="Voter ID"></option><option value="Driving License"></option>
      <option value="Ration Card"></option><option value="Bank Passbook"></option>
    </datalist>
    <div class="pilgrim-card-title" style="--num:'${num}'">Pilgrim ${num}</div>
    <div class="pilgrim-row">
      <div class="form-group">
        <label>Name <span class="req">*</span></label>
        <input type="text" class="p-name" placeholder="Full name" value="${data.name || ""}" />
      </div>
      <div class="form-group">
        <label>Age <span class="req">*</span></label>
        <input type="number" class="p-age" placeholder="Age" min="1" max="120" value="${data.age || ""}" />
      </div>
    </div>
    <div class="pilgrim-row">
      <div class="form-group">
        <label>Gender <span class="req">*</span></label>
        <input type="text" class="p-gender" list="genderList-${index}"
          placeholder="e.g. Male" value="${data.gender || ""}" autocomplete="off" />
      </div>
      <div class="form-group">
        <label>ID Proof Type <span class="req">*</span></label>
        <input type="text" class="p-idproof" list="idProofList-${index}"
          placeholder="e.g. Aadhaar Card" value="${data.idProof || ""}" autocomplete="off" />
      </div>
    </div>
    <div class="form-group">
      <label>ID Proof Number <span class="req">*</span></label>
      <input type="text" class="p-idnumber" placeholder="Enter ID number" value="${data.idNumber || ""}" />
    </div>
  `;

  return card;
}

function renderPilgrims(count, savedPilgrims = []) {
  const container = document.getElementById("pilgrimsContainer");
  container.innerHTML = "";
  for (let i = 0; i < count; i++) {
    container.appendChild(createPilgrimCard(i, savedPilgrims[i] || {}));
  }
}

function collectPilgrimData() {
  const cards = document.querySelectorAll(".pilgrim-card");
  return Array.from(cards).map(card => ({
    name: card.querySelector(".p-name").value.trim(),
    age: card.querySelector(".p-age").value.trim(),
    gender: card.querySelector(".p-gender").value,
    idProof: card.querySelector(".p-idproof").value,
    idNumber: card.querySelector(".p-idnumber").value.trim()
  }));
}

function showStatus(msg, isError = false) {
  const el = document.getElementById("statusMsg");
  el.textContent = msg;
  el.className = "status-msg" + (isError ? " error" : "");
  setTimeout(() => { el.textContent = ""; el.className = "status-msg"; }, 2500);
}

function loadData() {
  const storageApi = typeof browser !== "undefined" ? browser.storage : chrome.storage;
  storageApi.local.get(["generalDetails", "pilgrims", "pilgrimCount", "settings"], (data) => {
    const g = data.generalDetails || {};
    document.getElementById("email").value = g.email || "";
    document.getElementById("city").value = g.city || "";
    document.getElementById("state").value = g.state || "";
    document.getElementById("country").value = g.country || "India";
    document.getElementById("pincode").value = g.pincode || "";

    currentPilgrimCount = data.pilgrimCount || 2;
    document.getElementById("pilgrimCount").value = currentPilgrimCount;
    renderPilgrims(currentPilgrimCount, data.pilgrims || []);

    const s = data.settings || {};
    document.getElementById("autofillEnabled").checked = s.autofillEnabled !== false;
    document.getElementById("autoTrigger").checked = s.autoTrigger !== false;
    document.getElementById("showNotification").checked = s.showNotification !== false;
  });
}

function saveData() {
  const generalDetails = {
    email: document.getElementById("email").value.trim(),
    city: document.getElementById("city").value.trim(),
    state: document.getElementById("state").value.trim(),
    country: document.getElementById("country").value.trim(),
    pincode: document.getElementById("pincode").value.trim()
  };

  const pilgrims = collectPilgrimData();
  const pilgrimCount = currentPilgrimCount;

  const settings = {
    autofillEnabled: document.getElementById("autofillEnabled").checked,
    autoTrigger: document.getElementById("autoTrigger").checked,
    showNotification: document.getElementById("showNotification").checked
  };

  const storageApi = typeof browser !== "undefined" ? browser.storage : chrome.storage;
  storageApi.local.set({ generalDetails, pilgrims, pilgrimCount, settings }, () => {
    showStatus("✓ Saved!");
  });
}

function triggerFill() {
  const tabsApi = typeof browser !== "undefined" ? browser.tabs : chrome.tabs;
  const scriptingApi = typeof browser !== "undefined" ? browser.scripting : chrome.scripting;

  tabsApi.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) return;
    const tab = tabs[0];
    if (!tab.url || !tab.url.includes("ttdevasthanams.ap.gov.in")) {
      showStatus("Not on TTD website", true);
      return;
    }
    scriptingApi.executeScript({
      target: { tabId: tab.id },
      func: () => {
        window.dispatchEvent(new CustomEvent("ttd-autofill-trigger"));
      }
    }, () => {
      showStatus("Fill triggered!");
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  loadData();

  // Tab switching
  document.querySelectorAll(".tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById("tab-" + tab.dataset.tab).classList.add("active");
    });
  });

  // Pilgrim count change
  document.getElementById("pilgrimCount").addEventListener("change", (e) => {
    const newCount = parseInt(e.target.value, 10);
    const existingData = collectPilgrimData();
    currentPilgrimCount = newCount;
    renderPilgrims(newCount, existingData);
  });

  // Save button
  document.getElementById("saveBtn").addEventListener("click", saveData);

  // Trigger fill
  document.getElementById("triggerFill").addEventListener("click", triggerFill);

  // Debug: show detected fields
  document.getElementById("debugBtn").addEventListener("click", () => {
    const tabsApi = typeof browser !== "undefined" ? browser.tabs : chrome.tabs;
    const scriptingApi = typeof browser !== "undefined" ? browser.scripting : chrome.scripting;
    const debugOut = document.getElementById("debugOutput");

    tabsApi.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) return;
      const tab = tabs[0];
      if (!tab.url || !tab.url.includes("ttdevasthanams.ap.gov.in")) {
        debugOut.style.display = "block";
        debugOut.textContent = "Not on the TTD website.\nNavigate to ttdevasthanams.ap.gov.in first.";
        return;
      }
      scriptingApi.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const inputs = Array.from(document.querySelectorAll("input:not([type='hidden'])"));
          const selects = Array.from(document.querySelectorAll("select"));
          const labels = Array.from(document.querySelectorAll("label"));
          const pageText = document.body.innerText.toLowerCase();
          const hasForm = ["pilgrim", "photo id", "general details", "darshan"]
            .filter(kw => pageText.includes(kw));

          // Check for open autocomplete overlays
          const overlayOpts = Array.from(document.querySelectorAll(
            ".cdk-overlay-container .mat-option, .cdk-overlay-container .mat-mdc-option, " +
            ".cdk-overlay-container [role='option'], [role='listbox'] [role='option']"
          ));

          let out = `URL: ${location.href}\n`;
          out += `Form keywords found: ${hasForm.join(", ") || "none"}\n\n`;

          if (overlayOpts.length > 0) {
            out += `⚡ OPEN DROPDOWN OPTIONS (${overlayOpts.length}) — copy these exact texts:\n`;
            overlayOpts.forEach((el, i) => {
              out += `  "${el.textContent.trim()}"\n`;
            });
            out += "\n";
          } else {
            out += `ℹ️ No dropdown open. Click a Gender or ID Type field first, THEN press debug.\n\n`;
          }

          out += `INPUTS (${inputs.length}):\n`;
          inputs.forEach((el, i) => {
            out += `  ${i + 1}. type=${el.type} name="${el.name}" value="${el.value}"\n`;
          });
          out += `\nSELECTS (${selects.length}): ${selects.length === 0 ? "none" : ""}\n`;
          selects.forEach((el, i) => {
            out += `  ${i + 1}. name="${el.name}" options=[${Array.from(el.options).map(o => o.text).join(", ")}]\n`;
          });
          out += `\nLABELS:\n`;
          labels.slice(0, 20).forEach((el, i) => {
            out += `  ${i + 1}. "${el.textContent.trim()}"\n`;
          });
          return out;
        }
      }, (results) => {
        debugOut.style.display = "block";
        if (results && results[0] && results[0].result) {
          debugOut.textContent = results[0].result;
        } else {
          debugOut.textContent = "Could not get page info. Try reloading the page.";
        }
      });
    });
  });

  // Clear data
  document.getElementById("clearData").addEventListener("click", () => {
    if (confirm("This will clear all your saved details. Are you sure?")) {
      const storageApi = typeof browser !== "undefined" ? browser.storage : chrome.storage;
      storageApi.local.clear(() => {
        loadData();
        showStatus("Data cleared");
      });
    }
  });
});
