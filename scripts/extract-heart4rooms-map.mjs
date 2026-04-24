import fs from "node:fs";

const p = "src/app/surveys/heart4rooms/heart4SurveySteps.tsx";
const s = fs.readFileSync(p, "utf8");
const outPath = process.argv[2] || "src/lib/heart4rooms-map.json";

const questions = {};
const qRe =
  /<div className="text-sm font-semibold text-foreground">ข้อ\s+(\d+)<\/div>[\s\S]*?<p className="mt-2 text-sm text-foreground">([\s\S]*?)<\/p>/g;
let m;
while ((m = qRe.exec(s))) {
  const n = Number(m[1]);
  const txt = m[2].replace(/\s+/g, " ").trim();
  questions[`q${n}`] = txt;
}

const choices = {};
const rrRe = /name="q(\d+)"[\s\S]*?options=\{\[([\s\S]*?)\]\}/g;
while ((m = rrRe.exec(s))) {
  const q = `q${m[1]}`;
  const block = m[2];
  const om = {};
  const oRe = /\{\s*v:\s*"([^"]+)"\s*,\s*label:\s*"([^"]+)"\s*\}/g;
  let o;
  while ((o = oRe.exec(block))) {
    om[o[1]] = o[2];
  }
  if (Object.keys(om).length) choices[q] = { ...(choices[q] ?? {}), ...om };
}

const manRe =
  /<input[\s\S]*?name="q(\d+)"[\s\S]*?choice:\s*"([^"]+)"[\s\S]*?>[\s\S]*?<span>([^<]+)<\/span>/g;
while ((m = manRe.exec(s))) {
  const q = `q${m[1]}`;
  const code = m[2];
  const label = m[3].replace(/\s+/g, " ").trim();
  choices[q] = choices[q] ?? {};
  choices[q][code] = choices[q][code] ?? label;
}

// Extract checkbox (multi) labels: toggleMulti("qX_methods","i") pairs with label="i. ...".
const multi = {};
const checkRe = /toggleMulti\("([^"]+)",\s*"([^"]+)"\)[\s\S]*?label="([^"]+)"/g;
while ((m = checkRe.exec(s))) {
  const key = m[1];
  const code = m[2];
  const label = m[3].replace(/\s+/g, " ").trim();
  multi[key] = multi[key] ?? {};
  multi[key][code] = multi[key][code] ?? label;
}

const payload = { questions, choices, multi };
fs.mkdirSync(outPath.split("/").slice(0, -1).join("/"), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(payload, null, 2) + "\n", "utf8");
process.stdout.write(outPath);


