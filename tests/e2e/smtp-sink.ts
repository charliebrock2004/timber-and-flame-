/**
 * Stand-in for Gmail during tests: accepts mail on SMTP_PORT and writes each
 * message to MAIL_DIR as JSON. If MAIL_DIR/FAIL exists every message is
 * rejected, simulating an email outage.
 */
import fs from "node:fs";
import path from "node:path";
import { SMTPServer } from "smtp-server";
import { simpleParser } from "mailparser";
import { MAIL_DIR, SMTP_PORT } from "./env";

fs.rmSync(MAIL_DIR, { recursive: true, force: true });
fs.mkdirSync(MAIL_DIR, { recursive: true });

new SMTPServer({
  secure: false,
  authOptional: true,
  disabledCommands: ["STARTTLS"],
  onAuth: (auth, _s, cb) => cb(null, { user: auth.username }),
  onData(stream, _s, cb) {
    if (fs.existsSync(path.join(MAIL_DIR, "FAIL"))) {
      stream.resume();
      stream.on("end", () => cb(Object.assign(new Error("Simulated email outage"), { responseCode: 451 })));
      return;
    }
    simpleParser(stream).then((m) => {
      const to = Array.isArray(m.to) ? m.to.map((a) => a.text).join(", ") : (m.to?.text ?? "");
      const file = path.join(MAIL_DIR, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`);
      fs.writeFileSync(file, JSON.stringify({ to, replyTo: m.replyTo?.text, subject: m.subject, text: m.text, html: m.html }));
      cb();
    }, cb);
  },
}).listen(SMTP_PORT, "127.0.0.1", () => console.log(`SMTP sink listening on ${SMTP_PORT}`));
