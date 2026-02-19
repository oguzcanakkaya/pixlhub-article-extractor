import express from "express";
import fetch from "node-fetch";
import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";

const app = express();
app.use(express.json());

app.post("/extract", async (req, res) => {
  try {
    const { url } = req.body; // PixlHub'dan gelen URL

    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
    });

    const html = await response.text();
    const dom = new JSDOM(html, { url });
    
    // 1. Görselleri Ayıkla (Readability temizlemeden önce yapmak daha sağlıklı olabilir)
    const images = Array.from(dom.window.document.querySelectorAll('img'))
      .map(img => img.src)
      .filter(src => src && src.startsWith('http')); // Sadece geçerli linkleri al

    // 2. Makaleyi Temizle
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article) {
      return res.status(400).json({ error: "Article could not be parsed" });
    }

    // PixlHub'a dönecek olan paket
    res.json({
      title: article.title,
      text: article.textContent.trim(),
      html_content: article.content,
      image_list: images, // Diziyi buraya ekledik
      main_image: article.excerpt || (images.length > 0 ? images[0] : null) // İlk resmi kapak resmi sayabiliriz
    });

  } catch (err) {
    res.status(500).json({ error: "Server Error: " + err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
