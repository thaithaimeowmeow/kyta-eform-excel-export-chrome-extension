

// --- TYPE COLORS ---
const TYPE_COLORS = {
  ocrDocument: "F2F2F2",
  qrCode: "F2F2F2",
  tab: "F2F2F2",
  tab_child: "F2F2F2",
  text: "F2F2F2",
  h1: "F2F2F2",
  h2: "F2F2F2",
  h3: "F2F2F2",
  bulleted_list: "F2F2F2",
  numbered_list: "F2F2F2",
  child_form: "FCE4D6",
  splitter: "F2DCDB",
  view_ewriter: "DDEBF7",
  buttonElement: "E2EFDA",
  textField_ticketName: "E4DFEC",
};

// --- HELPERS ---
function getHostApi(tab, serviceName, path) {
  const { protocol, hostname } = new URL(tab.url);
  return `${protocol}//${hostname}/services/${serviceName}/${path}`;
}


function parseEform(url) {
  const u = new URL(url);
  const id = u.pathname.split('/').at(-1);
  return id;
}


// --- JSON CLEAN ---
function cleanJsonInput(rawString) {
  // try {
  //   const startIndex = rawString.indexOf("[");
  //   const endIndex = rawString.lastIndexOf("]");
  //   if (startIndex === -1 || endIndex === -1) throw new Error("No JSON array found.");
  //   let jsonString = rawString.substring(startIndex, endIndex + 1);
  //   jsonString = jsonString.replace(/\\\\"/g, '\\"').replace(/\\"/g, '"').replace(/}(\s*){/g, "},$1{");
  //   return JSON.parse(jsonString);
  // } catch (err) {
  //   alert("JSON parse error: " + err.message);
  //   return null;
  // }

  if (rawString === null || rawString === undefined) return rawString;
  if (typeof rawString !== 'string') return rawString;

  let s = rawString.trim();

  try {
    return JSON.parse(s);
  } catch (e) { }

  if ((s[0] === '"' && s[s.length - 1] === '"') || (s[0] === "'" && s[s.length - 1] === "'")) {
    try {
      const inner = s.slice(1, -1)
        .replace(/\\"/g, '"')
        .replace(/\\'/g, "'")
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t');
      try {
        return JSON.parse(inner);
      } catch (e) {
        s = inner;
      }
    } catch (e) {
    }
  }

  s = s.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
  s = s.replace(/,+/g, ',');
  s = s.replace(/,\s*(?=[}\]])/g, '');
  s = s.replace(/(\[|{)\s*,/g, (m, p1) => p1);
  s = s.replace(/,\s*\]/g, ']');
  s = s.trim();

  try {
    return JSON.parse(s);
  } catch (e) {
    try {
      if (typeof require === 'function') {
        const JSON5 = require('json5');
        return JSON5.parse(s);
      }
    } catch (e2) {
    }
  }

  throw new Error('parseJson lỗi');
}

// --- FETCH ---
const fetchData = ({ api, method, payload = undefined, params = undefined, responseType = 'json', headers = null, retry = 0 }) => {
  if (typeof params === 'object' && Object.keys(params)?.length >= 0) {
    const queryParams = Object.entries(params)
      .map(([k, v]) => `${k}=${v}`)
      .join('&');
    api += `?${queryParams}`;
  }

  const getData = (retry) => {
    return new Promise(async (resolve, reject) => {
      try {
        let response;
        if (method === 'POST' || method === 'PUT') {
          response = await fetch(api, {
            method,
            body: JSON.stringify(payload || {}),
            headers: headers ?? { "Content-Type": "application/json" },
          });
        } else if (method === 'GET' || method === 'DELETE') {
          response = await fetch(api, {
            method,
            headers: headers ?? { "Content-Type": "application/json" },
          });
        }

        if (responseType === 'json') {
          const contentType = response.headers.get("content-type");
          if (contentType?.includes("application/json")) {
            resolve(await response.json());
          } else {
            resolve(null);
          }
        } else if (responseType === 'response') {
          resolve(response);
        } else if (responseType === 'text') {
          resolve(await response.text());
        }

      } catch (err) {
        if (retry > 0) return getData(retry - 1);
        else reject(err);
      }
    });
  };

  return getData(retry);
};



// --- FIND COMPONENTS ---
function findAllComponents(componentArray, resultsList) {
  if (!Array.isArray(componentArray)) return;
  // const excludedTypes = ["row", "columns", "divider"];
  const excludedTypes = ["row", "columns",];
  const valueAsLabelTypes = ["h1", "h2", "h3", "text"];

  for (const item of componentArray) {
    if (!item || typeof item.id !== "string") continue;

    if (!excludedTypes.includes(item.type)) {
      let finalLabel = item.label || "";
      if (valueAsLabelTypes.includes(item.type)) finalLabel = item.value || "";

      let isRequired = (item.validate && item.validate.required) ? "x" : "";
      let isDisplaying = (item.validate && item.display) ? "x" : "";

      let dropdownData = "";
      if (item.dropdownConfig && item.dropdownConfig.data) {
        if (item.dropdownConfig.data.url) dropdownData = item.dropdownConfig.data.url;
        else if (Array.isArray(item.dropdownConfig.data))
          dropdownData = item.dropdownConfig.data.map(opt => `(label: ${opt.label || "N/A"}, value: ${opt.value || "N/A"})`).join("\r\n");
      }

      resultsList.push({
        label: finalLabel,
        code: item.code || "",
        type: item.type || "",
        hashid: item.hashid || "",
        required: isRequired,
        display: isDisplaying,
        dropdownConfig: dropdownData,
        description: item.description || "",
        id: item.id,
      });
    }

    if (item.components && Array.isArray(item.components)) findAllComponents(item.components, resultsList);
  }
}

// --- COLUMN WIDTHS ---
function getColumnWidths(headers, data) {
  const colWidths = {};
  headers.forEach(h => colWidths[h] = h.length);
  data.forEach(row => {
    headers.forEach(header => {
      const value = row[header] ? row[header].toString() : "";
      const lines = value.split(/\r?\n/);
      const maxLen = Math.max(...lines.map(l => l.length));
      if (maxLen > colWidths[header]) colWidths[header] = maxLen;
    });
  });
  return headers.map(h => ({ wch: Math.max(10, Math.min(80, colWidths[h] + 2)) }));
}




async function getJsonForm(tab) {
  const cookies = await chrome.cookies.getAll({ url: tab.url });
  const TOKEN = cookies.find(c => c.name === 'access_token')?.value;

  const AUTH_HEADERS = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${TOKEN}`
  };
  const id = parseEform(tab.url);

  const res = await fetchData({
    api: getHostApi(tab, 'eform', `api/owner/form?formId=${id}`),
    headers: AUTH_HEADERS,
    method: 'GET',
    responseType: 'text',
  });

  const data = JSON.parse(res);
  return cleanJsonInput(data.jsonForm);
}

async function getCodeJson(tab) {
  // https://eform.sandbox.kytaplatform.com/services/eform/api/forms/000061bBIyIQWkVoodrFVXKM/code
  const cookies = await chrome.cookies.getAll({ url: tab.url });
  const TOKEN = cookies.find(c => c.name === 'access_token')?.value;

  const AUTH_HEADERS = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${TOKEN}`
  };
  const id = parseEform(tab.url);

  const res = await fetchData({
    api: getHostApi(tab, 'eform', `api/forms/${id}/code`),
    headers: AUTH_HEADERS,
    method: 'GET',
    responseType: 'text'
  });

  const data = JSON.parse(res);
  return cleanJsonInput(data);
}

async function downloadAllFiles(json) {
  for (const [filename, fileData] of Object.entries(json)) {
    const code = fileData.code;
    if (!code) continue;

    const blob = new Blob([code], { type: 'text/javascript' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${filename}.js`;
    a.click();
    URL.revokeObjectURL(a.href);

    // Small delay between downloads so browser doesn't block them
    await new Promise(r => setTimeout(r, 300));
  }
}

async function downloadAsZip(json, zipName = 'files.zip') {
  const zip = new JSZip();

  for (const [filename, fileData] of Object.entries(json)) {
    const code = fileData.code;
    if (!code) continue;
    zip.file(`${filename}.js`, code);
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = zipName;
  a.click();
  URL.revokeObjectURL(a.href);
}



// --- LOAD XLSX ---
function loadXLSX() {
  return new Promise((resolve, reject) => {
    if (window.XLSX) return resolve(window.XLSX);
    const script = document.createElement("script");
    script.src = chrome.runtime.getURL("xlsx.bundle.js");
    script.onload = () => resolve(window.XLSX);
    script.onerror = () => reject(new Error("Failed to load XLSX"));
    document.head.appendChild(script);
  });
}


// --- EXPORT EXCEL ---
async function exportToXLSX(formName, jsonForm) {

  const XLSX = await loadXLSX();

  const jsonData = cleanJsonInput(jsonForm);
  if (!jsonData) return;

  const dataToExport = [];
  findAllComponents(jsonData, dataToExport);
  if (dataToExport.length === 0) return;

  const HEADERS = ["label", "code", "type", "required", "display", "id", "hashid", "dropdownConfig", "description"];
  const ws = XLSX.utils.json_to_sheet(dataToExport, { header: HEADERS });
  ws["!cols"] = getColumnWidths(HEADERS, dataToExport);

  const range = XLSX.utils.decode_range(ws["!ref"]);

  // Header row
  for (let C = range.s.c; C <= range.e.c; C++) {
    const ref = XLSX.utils.encode_cell({ c: C, r: 0 });
    if (!ws[ref]) continue;
    ws[ref].s = {
      font: { bold: true },
      border: { bottom: { style: "medium", color: { rgb: "000000" } } },
    };
  }

  // Data rows
  for (let R = 1; R <= range.e.r; R++) {
    const rowType = dataToExport[R - 1]?.type ?? "";
    const bgColor = TYPE_COLORS[rowType] ?? (rowType.startsWith("textField") ? TYPE_COLORS.textField_ticketName : null);

    for (let C = range.s.c; C <= range.e.c; C++) {
      const ref = XLSX.utils.encode_cell({ c: C, r: R });
      if (!ws[ref]) ws[ref] = { v: "", t: "s" };
      ws[ref].s = {
        alignment: { wrapText: true, vertical: "top" },
        border: {
          top: { style: "thin", color: { rgb: "D4D4D4" } },
          bottom: { style: "thin", color: { rgb: "D4D4D4" } },
          left: { style: "thin", color: { rgb: "D4D4D4" } },
          right: { style: "thin", color: { rgb: "D4D4D4" } },
        },
        ...(bgColor && { fill: { patternType: "solid", fgColor: { rgb: bgColor } } }),
      };
    }
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "DanhSachComponent");
  XLSX.writeFile(wb, `${formName}.xlsx`);
}


// --- BUTTON ---
document.addEventListener('DOMContentLoaded', () => {

  document.getElementById('btn-excel').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    let jsonForm = await getJsonForm(tab)

    await exportToXLSX("Form", jsonForm)

  });


  document.getElementById('btn-code').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    let codeJson = await getCodeJson(tab)
    console.log(codeJson)
    // await downloadAllFiles(codeJson);

    await downloadAsZip(codeJson, 'my-files.zip');
  });


});
