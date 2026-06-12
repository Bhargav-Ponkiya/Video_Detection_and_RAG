// API client for the Document RAG backend.
// Base URL comes from VITE_API_URL (see .env.example). All errors are normalized
// into thrown Error objects carrying the server's { error } message when present.

const BASE_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:3000"
).replace(/\/$/, "");

/** Extract a useful message from a fetch Response, then throw. */
async function throwFromResponse(res) {
  let message = `Request failed (${res.status})`;
  try {
    const data = await res.json();
    if (data && data.error) message = data.error;
  } catch {
    // body wasn't JSON; keep the status-based message
  }
  const err = new Error(message);
  err.status = res.status;
  throw err;
}

async function parseJson(res) {
  if (!res.ok) await throwFromResponse(res);
  return res.json();
}

/** GET /api/health → { status, db, gemini } */
export async function getHealth() {
  const res = await fetch(`${BASE_URL}/api/health`);
  return parseJson(res);
}

/** GET /api/documents → { documents: [...] } */
export async function listDocuments() {
  const res = await fetch(`${BASE_URL}/api/documents`);
  const data = await parseJson(res);
  return data.documents || [];
}

/**
 * POST /api/documents (multipart). Uses XHR for upload progress.
 * @param {File} file
 * @param {(pct:number)=>void} [onProgress] 0..100
 * @returns {Promise<{id, filename, numChunks, mimeType}>}
 */
export function uploadDocument(file, onProgress) {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${BASE_URL}/api/documents`);

    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      };
    }

    xhr.onload = () => {
      let data = null;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        // non-JSON body
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(data || {});
      } else {
        const msg = (data && data.error) || `Upload failed (${xhr.status})`;
        const err = new Error(msg);
        err.status = xhr.status;
        reject(err);
      }
    };

    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(form);
  });
}

/** DELETE /api/documents/:id → { deleted: true } */
export async function deleteDocument(id) {
  const res = await fetch(
    `${BASE_URL}/api/documents/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
    },
  );
  return parseJson(res);
}

/**
 * POST /api/chat → { answer, sources: [...] }
 * @param {{question:string, documentId?:string|null, topK?:number}} params
 */
export async function askQuestion({ question, documentId = null, topK = 5 }) {
  const res = await fetch(`${BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, documentId, topK }),
  });
  return parseJson(res);
}

export { BASE_URL };
