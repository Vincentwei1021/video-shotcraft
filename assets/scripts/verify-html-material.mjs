// Fail-closed QA gate for A/B capture output.
// Usage: node verify-html-material.mjs <path-to-material-dir>
// Requires ffmpeg with the ssim filter. Updates qa/fidelity.json and exits 1 on failure.

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const materialDir = path.resolve(process.argv[2] ?? process.env.SHOTCRAFT_OUT_DIR ?? '.');
const qaDir = path.join(materialDir, 'qa');
const baseline = path.join(qaDir, 'baseline.png');
const offline = path.join(qaDir, 'offline.png');
const repeat = path.join(qaDir, 'offline-repeat.png');
const reportPath = path.join(qaDir, 'fidelity.json');

for (const file of [baseline, offline, repeat, reportPath]) {
  if (!fs.existsSync(file)) throw new Error(`missing gate input: ${file}`);
}

const hash = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const offlineHash = hash(offline);
const repeatHash = hash(repeat);
const deterministicPixelHash = offlineHash === repeatHash;

const ffmpeg = spawnSync('ffmpeg', [
  '-hide_banner', '-i', baseline, '-i', offline,
  '-lavfi', 'ssim', '-f', 'null', '-',
], {encoding: 'utf8'});
if (ffmpeg.error) throw ffmpeg.error;
const ffmpegOutput = `${ffmpeg.stdout ?? ''}\n${ffmpeg.stderr ?? ''}`;
const ssim = Number.parseFloat(ffmpegOutput.match(/All:([0-9.]+)/)?.[1] ?? 'NaN');

const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
const checks = {
  ssim: Number.isFinite(ssim) && ssim >= 0.98,
  bbox: Number.isFinite(report.bboxMaxDriftCssPx) && report.bboxMaxDriftCssPx <= 1,
  zeroNetwork: (report.externalRequests ?? []).length === 0,
  noCaptureIssues: (report.issues ?? []).length === 0,
  noConsoleErrors: (report.consoleErrors ?? []).length === 0,
  deterministicPixelHash,
};
const htmlSafe = Object.values(checks).every(Boolean);
const complete = {
  ...report,
  ssim,
  offlinePixelHash: offlineHash,
  repeatPixelHash: repeatHash,
  deterministicPixelHash,
  checks,
  htmlSafe,
  requiresFidelityMeasurement: false,
};
fs.writeFileSync(reportPath, JSON.stringify(complete, null, 2));
console.log(JSON.stringify({materialDir, ssim, bboxMaxDriftCssPx: report.bboxMaxDriftCssPx, checks, htmlSafe}, null, 2));
if (!htmlSafe) process.exitCode = 1;
