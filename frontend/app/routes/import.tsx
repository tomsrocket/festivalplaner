// provides type safety/inference
import type { Route } from "./+types/import";
import { useState, useEffect } from "react";

// renders after the loader is done
export default function Component({
  loaderData,
}: Route.ComponentProps) {
  const [files, setFiles] = useState<string[]>([]);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [selectedFile, setSelectedFile] = useState<{ key: string; name: string } | null>(null);
  const [parsedEvents, setParsedEvents] = useState<{ date: string; title: string }[]>([]);

  interface Event {
    date: string;
    title: string;
  }

  const parseMarkdownEvents = (content: string): Event[] => {
    const lines = content.split("\n");
    const events: Event[] = [];
    
    // Regex to match date patterns: "dd.mm." or "dd.mm.-dd.mm."
    const dateRegex = /^\|\s*(\d{2}\.\d{2}\.(?:-\d{2}\.\d{2}\.)?)\s*\|\s*(.+?)\s*\|/;

    lines.forEach((line) => {
      const match = line.match(dateRegex);
      if (match) {
        const date = match[1].trim();
        const title = match[2].trim();
        events.push({ date, title });
      }
    });

    return events;
  };

  const openFile = (fileKey: string, fileName: string) => {
    const content = localStorage.getItem(fileKey);
    if (!content) return;

    const events = parseMarkdownEvents(content);
    setSelectedFile({ key: fileKey, name: fileName });
    setParsedEvents(events);
  };

  const closeFile = () => {
    setSelectedFile(null);
    setParsedEvents([]);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = e.target.files;
    if (!uploadedFiles) return;

    let successCount = 0;
    let errorCount = 0;

    // Process each file
    Array.from(uploadedFiles).forEach((file) => {
      // Only accept markdown files
      if (!file.name.endsWith(".md")) {
        errorCount++;
        return;
      }

      const reader = new FileReader();

      reader.onload = (event) => {
        try {
          const content = event.target?.result as string;
          // Generate a unique key using filename and timestamp
          const storageKey = `markdown_${file.name}_${Date.now()}`;

          // Save to localStorage
          localStorage.setItem(storageKey, content);
          localStorage.setItem("markdown_index", 
            JSON.stringify([
              ...getMarkdownIndex(),
              { name: file.name, key: storageKey, uploadedAt: new Date().toISOString() }
            ])
          );

          setFiles((prev) => [...prev, file.name]);
          successCount++;

          if (successCount + errorCount === uploadedFiles.length) {
            setMessage({
              type: "success",
              text: `${successCount} Datei(en) erfolgreich hochgeladen${errorCount > 0 ? `, ${errorCount} ignoriert` : ""}`,
            });
          }
        } catch (error) {
          console.error("Fehler beim Speichern:", error);
          errorCount++;
          if (successCount + errorCount === uploadedFiles.length) {
            setMessage({
              type: "error",
              text: `Fehler: ${errorCount} Datei(en) konnten nicht gespeichert werden`,
            });
          }
        }
      };

      reader.onerror = () => {
        errorCount++;
        if (successCount + errorCount === uploadedFiles.length) {
          setMessage({
            type: "error",
            text: `Fehler beim Lesen der Datei: ${file.name}`,
          });
        }
      };

      reader.readAsText(file);
    });

    // Reset input
    e.target.value = "";
  };

  const getMarkdownIndex = () => {
    const index = localStorage.getItem("markdown_index");
    return index ? JSON.parse(index) : [];
  };

  const loadStoredFiles = () => {
    const index = getMarkdownIndex();
    setFiles(index.map((item: any) => item.name));
  };

  const deleteFile = (storageKey: string) => {
    localStorage.removeItem(storageKey);
    const index = getMarkdownIndex();
    const updatedIndex = index.filter((item: any) => item.key !== storageKey);
    localStorage.setItem("markdown_index", JSON.stringify(updatedIndex));
    loadStoredFiles();
  };

  const downloadFile = (storageKey: string, fileName: string) => {
    const content = localStorage.getItem(storageKey);
    if (!content) return;

    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Load stored files on component mount
  useEffect(() => {
    loadStoredFiles();
  }, []);

  return (
    <main className="container mt-4 mb-4">
      <div className="row">
        <div className="col-lg-8 offset-lg-2">
          <h1 className="mb-4">Markdown Dateien verwalten</h1>

          {/* Upload Section */}
          <div className="border border-2 border-dashed p-5 text-center mb-4 rounded">
            <label className="form-label" style={{ cursor: "pointer" }}>
              <div className="d-flex flex-column align-items-center gap-2">
                <svg
                  className="mb-2"
                  width="48"
                  height="48"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  style={{ color: "#999" }}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                <p className="fs-5 fw-semibold mb-0">
                  Markdown Dateien hochladen
                </p>
                <p className="small text-muted mb-0">
                  oder zum Durchsuchen klicken
                </p>
              </div>
              <input
                type="file"
                multiple
                accept=".md"
                onChange={handleFileUpload}
                className="d-none"
              />
            </label>
          </div>

          {/* Message */}
          {message && (
            <div
              className={`alert ${
                message.type === "success"
                  ? "alert-success"
                  : "alert-danger"
              } mb-4`}
            >
              {message.text}
            </div>
          )}

          {/* Stored Files List */}
          {files.length > 0 && (
            <div className="mb-4">
              <h2 className="mb-3">Gespeicherte Dateien ({files.length})</h2>
              <div className="list-group">
                {getMarkdownIndex().map((item: any) => (
                  <div
                    key={item.key}
                    className="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
                  >
                    <div className="flex-grow-1">
                      <button
                        onClick={() => openFile(item.key, item.name)}
                        className="btn btn-link p-0 text-start text-decoration-none fw-500"
                        style={{ textAlign: "left" }}
                      >
                        {item.name}
                      </button>
                      <div className="small text-muted mt-1">
                        {new Date(item.uploadedAt).toLocaleString("de-DE")}
                      </div>
                    </div>
                    <div className="ms-2 d-flex gap-2">
                      <button
                        onClick={() => downloadFile(item.key, item.name)}
                        className="btn btn-sm btn-primary"
                      >
                        Download
                      </button>
                      <button
                        onClick={() => deleteFile(item.key)}
                        className="btn btn-sm btn-danger"
                      >
                        Löschen
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Info Box */}
          <div className="alert alert-info mb-0">
            <strong>Hinweis:</strong> Alle hochgeladenen Dateien werden ausschließlich
            in Ihrem Browser gespeichert. Die Daten verlassen Ihren Rechner nicht.
          </div>

          {/* Events List Modal */}
          {selectedFile && (
            <div
              className="modal d-block"
              style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
              onClick={closeFile}
            >
              <div className="modal-dialog modal-lg" onClick={(e) => e.stopPropagation()}>
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title">{selectedFile.name}</h5>
                    <button
                      type="button"
                      className="btn-close"
                      onClick={closeFile}
                    ></button>
                  </div>

                  <div className="modal-body">
                    {parsedEvents.length > 0 ? (
                      <div>
                        <p className="small text-muted mb-3">
                          {parsedEvents.length} Termin{parsedEvents.length !== 1 ? "e" : ""} gefunden
                        </p>
                        <div className="table-responsive">
                          <table className="table table-striped table-hover">
                            <thead className="table-light">
                              <tr>
                                <th>Datum</th>
                                <th>Titel</th>
                              </tr>
                            </thead>
                            <tbody>
                              {parsedEvents.map((event, idx) => (
                                <tr key={idx}>
                                  <td className="fw-500">{event.date}</td>
                                  <td>{event.title}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-5">
                        <p className="text-muted">
                          Keine Termine gefunden. Überprüfen Sie das Markdown-Format.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}