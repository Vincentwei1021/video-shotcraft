// mailtm.mjs — mail.tm 临时邮箱助手（REST API，无依赖）
// 用法：
//   node scripts/mailtm.mjs create            # 新建随机邮箱，凭据写 out/mailtm.json
//   node scripts/mailtm.mjs poll              # 轮询收件箱，打印最新邮件文本/提取的验证码与链接
//   node scripts/mailtm.mjs read <id>         # 读指定邮件完整内容
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const work = path.resolve(here, '..');
const CRED = path.join(work, 'out', 'mailtm.json');
const BASE = process.env.MAILTM_BASE || 'https://api.mail.tm';

const api = async (p, opts = {}, token) => {
  const res = await fetch(BASE + p, {
    ...opts,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`${p} → ${res.status} ${await res.text()}`);
  return res.json();
};

const cmd = process.argv[2];

if (cmd === 'create') {
  const domains = await api('/domains?page=1');
  const domain = (domains['hydra:member'] || domains.member || [])[0]?.domain;
  if (!domain) throw new Error('no mail.tm domain available');
  const address = `youart${Math.random().toString(36).slice(2, 10)}@${domain}`;
  const password = 'Xz' + Math.random().toString(36).slice(2, 14) + '9!';
  await api('/accounts', { method: 'POST', body: JSON.stringify({ address, password }) });
  // 账号创建是异步的，token 立刻取可能 401——重试
  let token = null;
  for (let i = 0; i < 6 && !token; i++) {
    await new Promise((r) => setTimeout(r, 2500));
    try {
      token = (await api('/token', { method: 'POST', body: JSON.stringify({ address, password }) })).token;
    } catch (e) {
      if (i === 5) throw e;
    }
  }
  fs.mkdirSync(path.dirname(CRED), { recursive: true });
  fs.writeFileSync(CRED, JSON.stringify({ address, password, token, base: BASE }, null, 2));
  console.log(JSON.stringify({ address }));
} else if (cmd === 'poll' || cmd === 'read') {
  const cred = JSON.parse(fs.readFileSync(CRED, 'utf8'));
  let token = cred.token;
  const refresh = async () => {
    token = (await api('/token', { method: 'POST', body: JSON.stringify({ address: cred.address, password: cred.password }) })).token;
  };
  if (cmd === 'poll') {
    const deadline = Date.now() + 120000;
    while (Date.now() < deadline) {
      let list;
      try {
        list = await api('/messages?page=1', {}, token);
      } catch {
        await refresh();
        continue;
      }
      const msgs = list['hydra:member'] || list.member || [];
      if (msgs.length) {
        const m = msgs[0];
        const full = await api(`/messages/${m.id}`, {}, token);
        const textBody = full.text || (Array.isArray(full.html) ? full.html.join('\n') : full.html) || '';
        const clean = textBody.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
        const code = (clean.match(/\b(\d{4,8})\b/) || [])[1] || null;
        const links = [...new Set((textBody.match(/https?:\/\/[^\s"'<>\])]+/g) || []))];
        console.log(JSON.stringify({ id: m.id, from: m.from?.address, subject: m.subject, code, links, text: clean.slice(0, 1200) }, null, 2));
        process.exit(0);
      }
      await new Promise((r) => setTimeout(r, 4000));
    }
    console.log(JSON.stringify({ timeout: true }));
    process.exit(2);
  } else {
    const full = await api(`/messages/${process.argv[3]}`, {}, token);
    console.log(JSON.stringify(full, null, 2).slice(0, 4000));
  }
} else {
  console.log('usage: mailtm.mjs create|poll|read <id>');
  process.exit(1);
}
