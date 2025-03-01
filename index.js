import express from "express";
import fs from "fs";
import path from "path";
import { parseFile } from "music-metadata"; // Named import kullanarak düzelt
import cors from "cors";

const app = express();
app.use(
  cors({
    origin: "http://localhost:5173", // React uygulamanızın çalıştığı portu buraya yazın
    methods: "GET",
    allowedHeaders: "Content-Type",
    credentials: true, // Tarayıcıda cookie veya kimlik doğrulama kullanılıyorsa
  })
);

const PORT = 3001;

// Müzik dosyalarının listesi
const musicFolder = path.resolve("musics"); // music klasörünün yolu
const musicFiles = fs
  .readdirSync(musicFolder)
  .filter((file) => file.endsWith(".mp3"));

let currentTrackIndex = 0; // Şu anda çalan şarkının index'i

// Müzik dosyasının bilgilerini almak için
const getMusicMetadata = async (filePath) => {
  const metadata = await parseFile(filePath); // parseFile fonksiyonunu named import ile çağır
  return {
    title: metadata.common.title || "Bilinmiyor", // Müzik adı
    artist: metadata.common.artist || "Bilinmiyor", // Sanatçı adı
    album: metadata.common.album || "Bilinmiyor", // Albüm adı
    albumArt: metadata.common.picture
      ? `data:image/jpeg;base64,${metadata.common.picture[0].data.toString(
          "base64"
        )}`
      : null, // Albüm resmi (varsa)
    duration: metadata.format.duration || 0, // Süre
  };
};

// Radyo stream endpoint'i
app.get("/stream", async (_req, res) => {
  const currentTrackPath = path.join(
    musicFolder,
    musicFiles[currentTrackIndex]
  );

  const stat = fs.statSync(currentTrackPath);

  // Müzik bilgilerini al
  const musicInfo = await getMusicMetadata(currentTrackPath);

  // Yayın için ses verisini gönder
  res.writeHead(200, {
    "Content-Type": "audio/mpeg",
    "Content-Length": stat.size,
    "Access-Control-Allow-Origin": "*", // CORS başlığı
  });

  const readStream = fs.createReadStream(currentTrackPath);
  readStream.pipe(res);

  // Sonraki şarkıya geçmek için index'i arttır
  currentTrackIndex = (currentTrackIndex + 1) % musicFiles.length;
});

// Metadata bilgilerini almak için ayrı bir endpoint
app.get("/music-info", async (req, res) => {
  const currentTrackPath = path.join(
    musicFolder,
    musicFiles[currentTrackIndex]
  );

  // Şu anki şarkının bilgilerini al
  const currentTrackInfo = await getMusicMetadata(currentTrackPath);

  // Önceki ve sonraki şarkılar
  const previousTrackIndex =
    (currentTrackIndex - 1 + musicFiles.length) % musicFiles.length;
  const nextTrackIndex = (currentTrackIndex + 1) % musicFiles.length;

  const previousTrackInfo = await getMusicMetadata(
    path.join(musicFolder, musicFiles[previousTrackIndex])
  );
  const nextTrackInfo = await getMusicMetadata(
    path.join(musicFolder, musicFiles[nextTrackIndex])
  );

  // Müzik bilgilerini JSON olarak gönder
  res.json({
    currentTrack: currentTrackInfo,
    previousTrack: previousTrackInfo,
    nextTrack: nextTrackInfo,
  });
});

// Başlangıçta bir şarkı çalmaya başla
app.listen(PORT, () =>
  console.log(`Stream API http://localhost:${PORT}/stream adresinde çalışıyor`)
);
