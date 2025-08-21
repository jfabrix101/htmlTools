let sourceDirHandle = null;
let destDirHandle = null;

document.getElementById("pickSource").addEventListener("click", async () => {
  sourceDirHandle = await window.showDirectoryPicker();
  document.getElementById("sourceLabel").textContent = sourceDirHandle.name;
  checkReady();
});

document.getElementById("pickDest").addEventListener("click", async () => {
  destDirHandle = await window.showDirectoryPicker();
  document.getElementById("destLabel").textContent = destDirHandle.name;
  checkReady();
});

function checkReady() {
  document.getElementById("copyBtn").disabled = !(sourceDirHandle && destDirHandle);
}

// Ricorsivamente raccoglie tutti i file nella cartella e sottocartelle
async function getAllFiles(dirHandle, pathPrefix = '') {
  let files = [];
  for await (const [name, handle] of dirHandle.entries()) {
    const relativePath = pathPrefix + name;
    if (handle.kind === 'file') {
      files.push({ handle, relativePath });
    } else if (handle.kind === 'directory') {
      const subFiles = await getAllFiles(handle, relativePath + '/');
      files = files.concat(subFiles);
    }
  }
  return files;
}

document.getElementById("copyBtn").addEventListener("click", async () => {
  document.getElementById("result").textContent = "";
  const progressBar = document.getElementById("progressBar");
  progressBar.style.width = "0%";
  progressBar.textContent = "0%";

  const files = await getAllFiles(sourceDirHandle);
  const total = files.length;
  let copied = 0;
  let skipped = 0;

  for (let i = 0; i < total; i++) {
    const { handle, relativePath } = files[i];
    const file = await handle.getFile();
    const name = file.name;
    const ext = name.split('.').pop().toUpperCase();
    const date = new Date(file.lastModified);
    const yyyyMMdd = date.toISOString().slice(0, 10).replace(/-/g, "");
    const newName = `${yyyyMMdd}-${name}`;

    const dateFolder = await getOrCreateSubfolder(destDirHandle, yyyyMMdd);
    const extFolder = await getOrCreateSubfolder(dateFolder, ext);

    const exists = await fileExists(extFolder, newName);
    if (exists) {
      skipped++;
    } else {
      const destFileHandle = await extFolder.getFileHandle(newName, { create: true });
      const writable = await destFileHandle.createWritable();
      await writable.write(await file.arrayBuffer());
      await writable.close();
      copied++;
    }

    // Progress update
    const percent = Math.round(((i + 1) / total) * 100);
    progressBar.style.width = percent + "%";
    progressBar.textContent = percent + "%";
  }

  document.getElementById("result").innerText =
    `✅ Copiati: ${copied}, ⚠️ Saltati (già esistenti): ${skipped}, Totale: ${total}`;
});

// Utility per creare o ottenere una sottocartella
async function getOrCreateSubfolder(parent, name) {
  return await parent.getDirectoryHandle(name, { create: true });
}

// Verifica se un file con quel nome esiste
async function fileExists(folderHandle, fileName) {
  try {
    await folderHandle.getFileHandle(fileName);
    return true;
  } catch {
    return false;
  }
}

function checkBrowser() {
  const ua = navigator.userAgent.toLowerCase();
  
  // Verifica se è Chrome (ma non Edge o Opera, che usano lo stesso motore)
  const isChrome = ua.includes("chrome") && !ua.includes("edg") && !ua.includes("opr");

  if (!isChrome) {
    alert("Questa applicazione funzina SOLO con Google Chrome.");
  }
}

// Esegui al caricamento della pagina
window.onload = checkBrowser;
