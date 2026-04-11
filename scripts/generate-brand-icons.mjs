import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const src = path.join(
  process.env.LOGO_SRC ||
    "C:/Users/hp/.cursor/projects/c-Users-hp-Desktop-PROJECTS-E-COMMERCE/assets/c__Users_hp_Desktop_PROJECTS_E-COMMERCE_logo_1-01.png",
);
const pub = path.join(root, "public");
const icons = path.join(pub, "icons");
const white = { r: 255, g: 255, b: 255, alpha: 1 };

async function main() {
  if (!fs.existsSync(src)) {
    console.error("Logo not found:", src);
    process.exit(1);
  }
  fs.mkdirSync(icons, { recursive: true });
  const base = sharp(src);
  await base
    .clone()
    .resize(192, 192, { fit: "contain", background: white })
    .png()
    .toFile(path.join(icons, "icon-192.png"));
  await base
    .clone()
    .resize(512, 512, { fit: "contain", background: white })
    .png()
    .toFile(path.join(icons, "icon-512.png"));
  await base
    .clone()
    .resize(32, 32, { fit: "contain", background: white })
    .png()
    .toFile(path.join(pub, "favicon.png"));
  console.log("Wrote public/icons/icon-192.png, icon-512.png, public/favicon.png");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
