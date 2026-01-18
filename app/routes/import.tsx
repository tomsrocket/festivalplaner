// provides type safety/inference
import type { Route } from "./+types/import";
import { useState, useEffect } from "react";

// renders after the loader is done
export default function Component({
  loaderData,
}: Route.ComponentProps) {
  const [files, setFiles] = useState<string[]>([]);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

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
    <main className="container mx-auto p-4 max-w-2xl">
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Markdown Dateien verwalten</h1>

        {/* Upload Section */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition">
          <label className="cursor-pointer">
            <div className="flex flex-col items-center gap-2">
              <svg
                className="w-12 h-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              <p className="text-lg font-semibold text-gray-700">
                Markdown Dateien hochladen
              </p>
              <p className="text-sm text-gray-500">
                oder zum Durchsuchen klicken
              </p>
            </div>
            <input
              type="file"
              multiple
              accept=".md"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`p-4 rounded-lg ${
              message.type === "success"
                ? "bg-green-100 text-green-800 border border-green-300"
                : "bg-red-100 text-red-800 border border-red-300"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Stored Files List */}
        {files.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-xl font-semibold">Gespeicherte Dateien ({files.length})</h2>
            <div className="space-y-2">
              {getMarkdownIndex().map((item: any) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {item.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(item.uploadedAt).toLocaleString("de-DE")}
                    </p>
                  </div>
                  <div className="flex gap-2 ml-2">
                    <button
                      onClick={() => downloadFile(item.key, item.name)}
                      className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition"
                    >
                      Download
                    </button>
                    <button
                      onClick={() => deleteFile(item.key)}
                      className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition"
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
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-gray-700">
            <strong>Hinweis:</strong> Alle hochgeladenen Dateien werden ausschließlich
            in Ihrem Browser gespeichert. Die Daten verlassen Ihren Rechner nicht.
          </p>
        </div>
      </div>
    </main>
  );
}