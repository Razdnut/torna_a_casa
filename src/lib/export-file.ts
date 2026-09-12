import { Capacitor } from "@capacitor/core";

export async function exportFile(name: string, blob: Blob): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    const [{ Filesystem, Directory }, { Share }] = await Promise.all([
      import("@capacitor/filesystem"),
      import("@capacitor/share"),
    ]);
    const data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Impossibile preparare il file"));
      reader.onload = () => resolve(String(reader.result).split(",")[1]);
      reader.readAsDataURL(blob);
    });
    const { uri } = await Filesystem.writeFile({
      path: `shared/${name}`,
      data,
      directory: Directory.Cache,
      recursive: true,
    });
    await Share.share({
      title: name,
      files: [uri],
      dialogTitle: "Salva o condividi il file",
    });
    return;
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
